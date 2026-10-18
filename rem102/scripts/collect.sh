#!/usr/bin/env bash
# Pobiera PO KOLEI wszystkie pakiety informacji z urządzenia REM102 (lista z data/rem102-packages.tsv)
# i zapisuje wynik do plików, z których uzupełnia się dokumentację (build-docs.py).
# Wyłącznie zapytania ODCZYTOWE; zapytania zapisu/reset/reboot/konta są na liście zakazanych.
#
# Użycie (z katalogu głównego repozytorium):
#   REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/collect.sh
#   ... ./rem102/scripts/collect.sh --stdout      # JSON na stdout, bez plików (chyba że ustawisz REM_OUT_DIR)
#
# Wynik (domyślnie rem102/results/, albo $REM_OUT_DIR):
#   collected.json                  wszystko w jednym pliku (device, login, pakiety) – to wystarczy przekazać dalej
#   samples/<zakładka>/<id>.json    ten sam wynik rozbity na pakiety
#   collect.log                     log przebiegu (bez hasła)
#
# Zmienne: REM_HOST (192.168.128.1), REM_USER, REM_PASS (wymagane), REM_LOGIN_BODY, REM_OUT_DIR,
#          REM_TIMEOUT (10 s na zapytanie), REM_DELAY (przerwa między zapytaniami, s; domyślnie 0),
#          REM_TSV (inna lista pakietów), REM_BASE_URL (pełny adres bazowy, np. https://192.168.128.1:8443 lub http://host/prefix;
#          domyślnie http://$REM_HOST), REM_INSECURE=1 (akceptuj certyfikat self-signed)
# Wymaga: bash, curl, jq.
#
# Założenia (do potwierdzenia właśnie tym zbiorem danych – patrz pole "login" i "post_retry"):
#   - logowanie: POST /cgi-bin/mpc105.fcgi, query=120, pola username/pwd; ciasteczka CGIUSERNAME/CGIUSERLEVEL
#   - odczyty: GET; jeśli GET zawiedzie (kod != 2xx lub pusta odpowiedź), jednorazowo próbujemy POST
set -u

command -v jq >/dev/null || { echo "Brak jq – zainstaluj (apt install jq / brew install jq)" >&2; exit 1; }
command -v curl >/dev/null || { echo "Brak curl" >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$(dirname "$HERE")"
TSV="${REM_TSV:-$BASE/data/rem102-packages.tsv}"
HOST="${REM_HOST:-192.168.128.1}"
USER_NAME="${REM_USER:?ustaw REM_USER}"
PASS="${REM_PASS:?ustaw REM_PASS}"
LOGIN_BODY="${REM_LOGIN_BODY:-query=120&username=${USER_NAME}&pwd=${PASS}}"
BASE_URL="${REM_BASE_URL:-http://${HOST}}"; BASE_URL="${BASE_URL%/}"
CURL_X=(); [ -n "${REM_INSECURE:-}" ] && CURL_X=(-k)
TIMEOUT="${REM_TIMEOUT:-10}"
DELAY="${REM_DELAY:-0}"

STDOUT=0
[ "${1:-}" = "--stdout" ] && STDOUT=1
OUT_DIR="${REM_OUT_DIR:-}"
[ -z "$OUT_DIR" ] && [ "$STDOUT" = 0 ] && OUT_DIR="$BASE/results"

[ -f "$TSV" ] || { echo "Brak pliku z listą pakietów: $TSV" >&2; exit 1; }

WORK="$(mktemp -d)"
JAR="$WORK/cookies.txt"
ENTRIES="$WORK/entries.ndjson"
LOG="$WORK/collect.log"
: > "$ENTRIES"; : > "$LOG"
trap 'rm -rf "$WORK"' EXIT

# zapytania, których nigdy nie wysyłamy (zapis, reset, reboot, konta, komendy RTP100/DMeter)
DENY='query=(440|1982|402|122|121|1983|410|442|443|445)(&|$)'

log() { printf '%s\n' "$*" >&2; printf '%s\n' "$*" >> "$LOG"; }

# fetch <GET|POST> <cgi> <query>  -> F_CODE, F_CTYPE; ciało odpowiedzi w $WORK/resp.tmp
fetch() {
  local method="$1" cgi="$2" query="$3" res
  : > "$WORK/resp.tmp"
  if [ "$method" = GET ]; then
    res="$(curl -sS ${CURL_X[@]+"${CURL_X[@]}"} --max-time "$TIMEOUT" -b "$JAR" -G "${BASE_URL}${cgi}" --data-raw "$query" \
           -o "$WORK/resp.tmp" -w '%{http_code}\t%{content_type}')" || res=$'0\t'
  else
    res="$(curl -sS ${CURL_X[@]+"${CURL_X[@]}"} --max-time "$TIMEOUT" -b "$JAR" -X POST "${BASE_URL}${cgi}" --data-raw "$query" \
           -o "$WORK/resp.tmp" -w '%{http_code}\t%{content_type}')" || res=$'0\t'
  fi
  F_CODE="${res%%$'\t'*}"
  F_CTYPE="${res#*$'\t'}"
}

# resp_json -> {http_status, content_type, body}; body = JSON jeśli się parsuje, inaczej tekst, puste = null
resp_json() {
  jq -cn --rawfile body "$WORK/resp.tmp" --arg code "$F_CODE" --arg ctype "$F_CTYPE" '
    { http_status: ($code | tonumber),
      content_type: (if $ctype == "" then null else $ctype end),
      body: (try ($body | fromjson) catch (if $body == "" then null else $body end)) }'
}

# ---------- logowanie ----------
log "== logowanie: POST ${BASE_URL}/cgi-bin/mpc105.fcgi (query=120), użytkownik: ${USER_NAME}"
: > "$WORK/resp.tmp"
res="$(curl -sS ${CURL_X[@]+"${CURL_X[@]}"} --max-time "$TIMEOUT" -c "$JAR" -X POST "${BASE_URL}/cgi-bin/mpc105.fcgi" --data-raw "$LOGIN_BODY" \
       -o "$WORK/resp.tmp" -w '%{http_code}\t%{content_type}')" || res=$'0\t'
F_CODE="${res%%$'\t'*}"; F_CTYPE="${res#*$'\t'}"
LOGIN_OK=false
grep -q CGIUSER "$JAR" 2>/dev/null && LOGIN_OK=true
COOKIES="$(sed 's/^#HttpOnly_//' "$JAR" 2>/dev/null | grep -v '^#' | awk 'NF>=7{print $6"="$7}')"
LOGIN_JSON="$(resp_json | jq -c --argjson ok "$LOGIN_OK" --arg cookies "$COOKIES" '
  . + { ok: $ok,
        cookie_names: ($cookies | split("\n") | map(select(length>0) | split("=")[0])),
        user_level: ($cookies | split("\n") | map(select(startswith("CGIUSERLEVEL="))) | (.[0] // null) | if . then sub("CGIUSERLEVEL=";"") else null end) }')"
if [ "$LOGIN_OK" = true ]; then
  log "   OK (HTTP ${F_CODE}); ciasteczka: $(jq -r '.cookie_names | join(", ")' <<<"$LOGIN_JSON")"
else
  log "   UWAGA: brak ciasteczek CGIUSER* (HTTP ${F_CODE}) – logowanie mogło się nie udać; sprawdź REM_LOGIN_BODY. Kontynuuję."
fi

# ---------- pakiety, po kolei ----------
TOTAL="$(tail -n +2 "$TSV" | tr -d '\r' | grep -c .)"
N=0; OK=0; BAD=0; SKIPPED=0
log "== pobieranie ${TOTAL} pakietów (lista: ${TSV})"
while IFS=$'\t' read -r name tab id request label; do
  N=$((N+1))
  cgi="${request%%\?*}"; query="${request#*\?}"
  if [[ "$query" =~ $DENY ]]; then
    log "[$N/$TOTAL] $name  POMINIĘTO (lista zakazanych zapytań)"; SKIPPED=$((SKIPPED+1)); continue
  fi
  fetch GET "$cgi" "$query"
  bytes="$(wc -c < "$WORK/resp.tmp" | tr -d ' ')"
  entry="$(resp_json)"
  note=""
  if [[ ! "$F_CODE" =~ ^2 ]] || [ "$bytes" = 0 ]; then
    fetch POST "$cgi" "$query"
    entry="$(jq -c --argjson p "$(resp_json)" '. + {post_retry: $p}' <<<"$entry")"
    note="  (GET zawiódł; POST: HTTP ${F_CODE})"
  fi
  entry="$(jq -cn --arg tab "$tab" --arg id "$id" --arg label "$label" --arg cgi "$cgi" --arg query "$query" \
                  --argjson e "$entry" '{tab:$tab, id:$id, label:$label, cgi:$cgi, query:$query} + $e')"
  printf '%s\n' "$entry" >> "$ENTRIES"
  code="$(jq -r .http_status <<<"$entry")"
  if [[ "$code" =~ ^2 ]]; then OK=$((OK+1)); else BAD=$((BAD+1)); fi
  log "[$N/$TOTAL] $name  HTTP ${code}  ${bytes} B${note}"
  [ "$DELAY" != 0 ] && sleep "$DELAY"
done < <(tail -n +2 "$TSV" | tr -d '\r' | grep . | cut -f2,3,4,7,11)

# ---------- składanie wyniku: { device, login, <zakładka>: { <id>: pakiet } } ----------
RESULT="$WORK/collected.json"
jq -s --arg host "$HOST" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson login "$LOGIN_JSON" \
      --argjson total "$TOTAL" --argjson ok "$OK" --argjson bad "$BAD" --argjson skipped "$SKIPPED" '
  reduce .[] as $e ({device: {host: $host, collected_at: $ts, script: "collect.sh",
                              packages_total: $total, packages_http_2xx: $ok, packages_failed: $bad, packages_skipped: $skipped},
                     login: $login};
                    setpath([$e.tab, $e.id]; ($e | del(.tab, .id))))' "$ENTRIES" > "$RESULT"

log "== gotowe: ${OK} z ${TOTAL} pakietów zwróciło HTTP 2xx, ${BAD} z błędem, ${SKIPPED} pominiętych"

[ "$STDOUT" = 1 ] && cat "$RESULT"

if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR/samples"
  cp "$RESULT" "$OUT_DIR/collected.json"
  while IFS= read -r line; do
    t="$(jq -r .tab <<<"$line")"; i="$(jq -r .id <<<"$line")"
    mkdir -p "$OUT_DIR/samples/$t"
    jq 'del(.tab, .id)' <<<"$line" > "$OUT_DIR/samples/$t/$i.json"
  done < "$ENTRIES"
  cp "$LOG" "$OUT_DIR/collect.log"
  echo "Zapisano: $OUT_DIR/collected.json, $OUT_DIR/samples/, $OUT_DIR/collect.log" >&2
  echo "Dalej: python3 rem102/scripts/build-docs.py  (uzupełnia dokumentację z tych plików)" >&2
fi
