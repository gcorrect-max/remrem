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
# Zmienne: REM_HOST (192.168.128.1), REM_PASS (wymagane), REM_USER ("User"/"Admin"/"Super Admin") albo REM_LEVEL (1/2/3),
#          REM_LOGIN_BODY (pełne ciało logowania, nadpisuje domyślne), REM_OUT_DIR,
#          REM_TIMEOUT (10 s na zapytanie), REM_DELAY (przerwa między zapytaniami, s; domyślnie 0),
#          REM_TSV (inna lista pakietów), REM_BASE_URL (pełny adres bazowy, np. https://192.168.128.1:8443 lub http://host/prefix;
#          domyślnie http://$REM_HOST), REM_INSECURE=1 (akceptuj certyfikat self-signed),
#          REM_LOGIN_TEST=1 (tylko jedna próba logowania, bez pobierania pakietów)
# Wymaga: bash, curl, jq.
#
# Logowanie tak, jak robi to strona urządzenia (Script/mainParent.js):
#   POST /cgi-bin/mpc105.cgi  query=120&login=<1|2|3>&pwd=<hasło>   (1 = User, 2 = Admin, 3 = Super Admin)
#   odpowiedź: JSON {"value":"fail"} przy złym haśle; ciasteczko sesji CGISESSID (poziom = 5. znak: A..D = 0..3)
# Odczyty: GET, odpowiedzi JSON; {"value":"fail"} oznacza "wymagane logowanie".
# Gdy GET zawiedzie (kod != 2xx lub pusta odpowiedź), jednorazowo próbujemy POST.
set -u

command -v jq >/dev/null || { echo "Brak jq – zainstaluj (apt install jq / brew install jq)" >&2; exit 1; }
command -v curl >/dev/null || { echo "Brak curl" >&2; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE="$(dirname "$HERE")"
TSV="${REM_TSV:-$BASE/data/rem102-packages.tsv}"
HOST="${REM_HOST:-192.168.128.1}"
USER_NAME="${REM_USER:-}"
PASS="${REM_PASS:?ustaw REM_PASS}"
LEVEL="${REM_LEVEL:-}"
if [ -z "$LEVEL" ]; then
  case "$(printf '%s' "$USER_NAME" | tr '[:upper:]' '[:lower:]' | tr -d ' ')" in
    1|user) LEVEL=1 ;; 2|admin) LEVEL=2 ;; 3|superadmin) LEVEL=3 ;;
    *) echo "Ustaw REM_LEVEL=1|2|3 albo REM_USER=\"User\"|\"Admin\"|\"Super Admin\"" >&2; exit 1 ;;
  esac
fi
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

# zapytania, których nigdy nie wysyłamy (zapis, reset, reboot, wylogowanie, zmiana hasła, upload, komendy RTP100)
DENY='query=(440|1982|402|401|122|121|1983|310|443|445)(&|$)'

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
LOGIN_PATH="/cgi-bin/mpc105.cgi"
log "== logowanie: POST ${BASE_URL}${LOGIN_PATH} (query=120, login=${LEVEL})"
: > "$WORK/resp.tmp"
if [ -n "${REM_LOGIN_BODY:-}" ]; then
  LOGIN_DATA=(--data-raw "$REM_LOGIN_BODY")
else
  LOGIN_DATA=(--data "query=120" --data "login=${LEVEL}" --data-urlencode "pwd=${PASS}")   # hasło kodowane jak w jQuery serialize()
fi
res="$(curl -sS ${CURL_X[@]+"${CURL_X[@]}"} --max-time "$TIMEOUT" -c "$JAR" -X POST "${BASE_URL}${LOGIN_PATH}" "${LOGIN_DATA[@]}" \
       -o "$WORK/resp.tmp" -w '%{http_code}\t%{content_type}')" || res=$'0\t'
F_CODE="${res%%$'\t'*}"; F_CTYPE="${res#*$'\t'}"
COOKIES="$(sed 's/^#HttpOnly_//' "$JAR" 2>/dev/null | grep -v '^#' | awk 'NF>=7{print $6"="$7}')"
SID="$(printf '%s\n' "$COOKIES" | sed -n 's/^CGISESSID=//p' | head -1)"
LEVEL_COOKIE=null
if [ "${#SID}" -gt 4 ]; then
  case "${SID:4:1}" in A) LEVEL_COOKIE=0 ;; B) LEVEL_COOKIE=1 ;; C) LEVEL_COOKIE=2 ;; D) LEVEL_COOKIE=3 ;; esac
fi
LOGIN_VALUE="$(jq -r 'try (fromjson | .value) catch ""' "$WORK/resp.tmp" 2>/dev/null || true)"
[ -z "$LOGIN_VALUE" ] && LOGIN_VALUE="$(jq -Rrs 'try (fromjson | .value // "") catch ""' "$WORK/resp.tmp" 2>/dev/null || true)"
LOGIN_OK=false
[ -n "$SID" ] && [[ "$F_CODE" =~ ^2 ]] && [ "$(printf '%s' "$LOGIN_VALUE" | tr '[:upper:]' '[:lower:]')" != fail ] && LOGIN_OK=true
LOGIN_JSON="$(resp_json | jq -c --argjson ok "$LOGIN_OK" --arg cookies "$COOKIES" --arg value "$LOGIN_VALUE" \
    --argjson lreq "$LEVEL" --argjson lcookie "$LEVEL_COOKIE" '
  . + { ok: $ok, value: (if $value == "" then null else $value end),
        cookie_names: ($cookies | split("\n") | map(select(length>0) | split("=")[0])),
        level_requested: $lreq, level_from_cookie: $lcookie }')"
if [ "$LOGIN_OK" = true ]; then
  log "   OK (HTTP ${F_CODE}, value=${LOGIN_VALUE}); ciasteczka: $(jq -r '.cookie_names | join(", ")' <<<"$LOGIN_JSON"); poziom z ciasteczka: ${LEVEL_COOKIE}"
else
  log "   UWAGA: logowanie nie powiodło się (HTTP ${F_CODE}, value=${LOGIN_VALUE}). Sprawdź hasło: każde nieudane logowanie jest zapisywane w dzienniku zdarzeń urządzenia."
fi
if [ -n "${REM_LOGIN_TEST:-}" ]; then log "== tylko test logowania (REM_LOGIN_TEST): nic więcej nie pobrano"; exit 0; fi

# ---------- pakiety, po kolei ----------
TOTAL="$(tail -n +2 "$TSV" | tr -d '\r' | grep -c .)"
N=0; OK=0; BAD=0; AUTHFAIL=0; SKIPPED=0
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
  if jq -e '(.body | type == "object") and ((.body.value // "") | ascii_downcase) == "fail" and ((.body.reference // "login") | ascii_downcase) == "login"' <<<"$entry" >/dev/null 2>&1; then AUTHFAIL=$((AUTHFAIL+1)); note="${note}  WYMAGANE LOGOWANIE (value=fail)"
  elif [[ "$code" =~ ^2 ]]; then OK=$((OK+1)); else BAD=$((BAD+1)); fi
  log "[$N/$TOTAL] $name  HTTP ${code}  ${bytes} B${note}"
  [ "$DELAY" != 0 ] && sleep "$DELAY"
done < <(tail -n +2 "$TSV" | tr -d '\r' | grep . | cut -f2,3,4,7,11)

# ---------- składanie wyniku: { device, login, <zakładka>: { <id>: pakiet } } ----------
RESULT="$WORK/collected.json"
jq -s --arg host "$BASE_URL" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" --argjson login "$LOGIN_JSON" \
      --argjson total "$TOTAL" --argjson ok "$OK" --argjson auth "$AUTHFAIL" --argjson bad "$BAD" --argjson skipped "$SKIPPED" '
  reduce .[] as $e ({device: {base_url: $host, collected_at: $ts, script: "collect.sh",
                              packages_total: $total, packages_ok: $ok, packages_login_required: $auth, packages_failed: $bad, packages_skipped: $skipped},
                     login: $login};
                    setpath([$e.tab, $e.id]; ($e | del(.tab, .id))))' "$ENTRIES" > "$RESULT"

log "== gotowe: ${OK} z ${TOTAL} pakietów zwróciło dane, ${AUTHFAIL} wymaga logowania, ${BAD} z błędem, ${SKIPPED} pominiętych"

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
