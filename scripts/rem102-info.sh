#!/usr/bin/env bash
# Pełny odczyt informacji o urządzeniu REM102 (Home, Setup, Advanced, Monitoring + settings.json).
# Każdy pakiet informacji jest zwracany jako obiekt JSON. Wyłącznie zapytania ODCZYTOWE
# (pola "query" z plików Config/*.json) – żadnych "set", resetu, rebootu ani eksportu konfiguracji.
#
# Użycie:
#   REM_HOST=192.168.128.1 REM_USER=Admin REM_PASS='...' ./scripts/rem102-info.sh > rem102.json
#   REM_OUT_DIR=./dump ... ./scripts/rem102-info.sh   # dodatkowo osobny plik JSON na każdy pakiet
#
# Wymaga: bash, curl, jq. Opis formatu i przykłady: docs/rem102-info.md
#
# Założenia (do potwierdzenia w DevTools przeglądarki na stronie logowania urządzenia):
#   - logowanie: POST /cgi-bin/mpc105.fcgi, query=120, pola username/pwd (nazwy z modulesCfg.ts)
#   - urządzenie ustawia ciasteczka CGIUSERNAME / CGIUSERLEVEL, trzymane w cookie jar
#   - znak "~" w polu "query" z JSON-ów to separator parametrów, czyli "&" w prawdziwym żądaniu
set -u

command -v jq >/dev/null || { echo "Brak jq – zainstaluj (apt install jq / brew install jq)" >&2; exit 1; }

HOST="${REM_HOST:-192.168.128.1}"
USER_NAME="${REM_USER:?ustaw REM_USER}"
PASS="${REM_PASS:?ustaw REM_PASS}"
LOGIN_BODY="${REM_LOGIN_BODY:-query=120&username=${USER_NAME}&pwd=${PASS}}"
OUT_DIR="${REM_OUT_DIR:-}"

WORK="$(mktemp -d)"
JAR="$WORK/cookies.txt"
ENTRIES="$WORK/entries.ndjson"
: > "$ENTRIES"
trap 'rm -rf "$WORK"' EXIT

REM=/cgi-bin/rem.fcgi
MPC=/cgi-bin/mpc105.fcgi
ITEMS=/cgi-bin/items.fcgi
RTP=/cgi-bin/rtp.fcgi

# q <zakładka> <id> <cgi> <query> <opis>  – dopisuje jeden pakiet (JSON) do $ENTRIES
q() {
  local tab="$1" id="$2" cgi="$3" query="$4" label="$5" body="$WORK/body.tmp" code
  code="$(curl -sS --max-time 10 -b "$JAR" -G "http://${HOST}${cgi}" --data-raw "$query" \
          -o "$body" -w '%{http_code}')" || code=0
  [ -f "$body" ] || : > "$body"
  jq -cn --arg tab "$tab" --arg id "$id" --arg label "$label" --arg cgi "$cgi" \
         --arg query "$query" --arg code "$code" --rawfile body "$body" '
    { tab: $tab, id: $id, label: $label, cgi: $cgi, query: $query,
      http_status: ($code | tonumber),
      # odpowiedź jako JSON, jeśli się parsuje; w przeciwnym razie surowy tekst
      body: (try ($body | fromjson) catch (if $body == "" then null else $body end)) }' >> "$ENTRIES"
  rm -f "$body"
}

# --- logowanie ---
curl -sS --max-time 10 -c "$JAR" -X POST "http://${HOST}${MPC}" --data-raw "$LOGIN_BODY" >/dev/null
grep -q CGIUSER "$JAR" || echo "UWAGA: brak ciasteczek CGIUSER* – logowanie się nie powiodło (sprawdź REM_LOGIN_BODY)" >&2

# --- IDENTYFIKACJA: model / numer seryjny / numer artykułu / wersje ---
q identity device_settings   $MPC   "query=302" "Advanced > Information > Device Settings (model, serial no., article no.)"
q identity version           $MPC   "query=301" "Advanced > Information > Version (firmware/FPGA/DSP)"
q identity host              $MPC   "query=126" "settings.json > host (hostname)"
q identity auth_message      $MPC   "query=125" "settings.json > auth_message"
q identity meter_settings    $REM   "query=105" "Setup > Meter > Settings"
q identity dmeter_serial     $ITEMS "query=407" "Setup > DMeter > DMeter Serial Number"

# --- HOME ---
q home meter_status      $REM "query=10"  "Home > Summary > Meter Status"
q home emf_status        $REM "query=406" "Home > EMF channels > EMF Status"
q home emf_measures      $REM "query=407" "Home > EMF channels > EMF Measures"
q home emf_cebd          $REM "query=409" "Home > EMF channels > EMF CEBD"
q home dhs_memory        $REM "query=459" "Home > Data Download > DHS Memory"
q home digital_io        $REM "query=11"  "Home > Digital IO"
q home net_interfaces    $MPC "query=500" "Home > Networking > Interfaces"
q home net_services      $MPC "query=501" "Home > Networking > Services"

# --- SETUP ---
q setup channels_configuration $REM "query=100" "Setup > Meter > Channels Configuration"
for u in 1 2 3 4; do
  q setup "dcs_user_${u}" $REM "query=450&user=${u}" "Setup > DCS Users > DCS User ${u}"
done
q setup dcs_communication $REM "query=452" "Setup > DCS Communication"
q setup dcs_binding      $REM "query=457" "Setup > DCS Binding"
q setup dcs_conn_test    $REM "query=455" "Setup > DCS Binding > Connection Test"
q setup ethernet_0       $MPC "query=103" "Setup > Ethernet Interfaces > Ethernet 0"
q setup ethernet_1       $MPC "query=104" "Setup > Ethernet Interfaces > Ethernet 1"
q setup mobile_settings  $MPC "query=101" "Setup > Mobile Interface > Mobile Settings"
q setup dhcp_client      $MPC "query=200" "Setup > DHCP > Client Settings"
q setup gateway_dns      $MPC "query=201" "Setup > Services > Gateway & DNS"
q setup servers          $MPC "query=202" "Setup > Services > Servers"
q setup ntp_servers      $MPC "query=203" "Setup > Services > NTP Servers"
q setup ems_time_servers $MPC "query=230" "Setup > Services > EMS Time Servers"
q setup gps              $MPC "query=205" "Setup > Services > GPS"

# --- ADVANCED ---
q advanced rtc_time $MPC "query=303" "Advanced > RTC > Time Settings"
q advanced events   $MPC "query=314" "Advanced > Information > Events"

# --- MONITORING ---
q monitoring eth_0          $MPC   "query=3"  "Monitoring > Network Interfaces > Ethernet 0"
q monitoring eth_1          $MPC   "query=4"  "Monitoring > Network Interfaces > Ethernet 1"
q monitoring mobile         $MPC   "query=13" "Monitoring > Network Interfaces > Mobile"
q monitoring gps            $MPC   "query=16" "Monitoring > Network Interfaces > GPS"
for u in 1 2 3 4; do
  q monitoring "dcs_stats_user_${u}" $REM "query=461&user=${u}" "Monitoring > DCS Statistics > DCS User ${u}"
done
q monitoring dmeter_status  $ITEMS "query=409" "Monitoring > DMeter Status"
q monitoring rtp100_vars    $RTP   "query=441" "Monitoring > RTP100 Variables"
q monitoring rtp100_files   $RTP   "query=444" "Monitoring > RTP100 Files"
q monitoring mem_nand       $MPC   "query=23" "Monitoring > Memory > NAND"
q monitoring mem_nor        $MPC   "query=24" "Monitoring > Memory > NOR"
q monitoring mem_ram        $MPC   "query=25" "Monitoring > Memory > RAM"
q monitoring dev_rtc        $MPC   "query=7"  "Monitoring > Other Devices > RTC"
q monitoring dev_fpga       $MPC   "query=8"  "Monitoring > Other Devices > FPGA"
q monitoring dev_fram       $MPC   "query=9"  "Monitoring > Other Devices > FRAM"
q monitoring dev_adc        $MPC   "query=10" "Monitoring > Other Devices > ADC"
q monitoring dev_dsp        $MPC   "query=11" "Monitoring > Other Devices > DSP"
q monitoring dev_mvbcs      $MPC   "query=12" "Monitoring > Other Devices > MVBCS"
q monitoring dev_modem      $MPC   "query=17" "Monitoring > Other Devices > MODEM"

# --- FLAGI DOSTĘPNOŚCI FUNKCJI (en_query) ---
q features dcs           $REM   "query=463"        "DCS enabled?"
q features dcs_user_1    $REM   "query=462&user=1" "DCS User 1 enabled?"
q features dcs_user_2    $REM   "query=462&user=2" "DCS User 2 enabled?"
q features dcs_user_3    $REM   "query=462&user=3" "DCS User 3 enabled?"
q features dcs_user_4    $REM   "query=462&user=4" "DCS User 4 enabled?"
q features dmeter_rem    $REM   "query=420"        "DMeter (rem) enabled?"
q features dmeter_items  $ITEMS "query=400"        "DMeter (items) enabled?"
q features rtp100        $REM   "query=430"        "RTP100 enabled?"
q features mobile        $MPC   "query=14"         "Modem/Mobile enabled?"
q features gps           $MPC   "query=15"         "GPS enabled?"
q features dsp_digitalio $MPC   "query=18"         "DSP/Digital IO enabled?"

# --- składanie wyniku: { device, <tab>: { <id>: pakiet, ... }, ... } ---
RESULT="$WORK/result.json"
jq -s --arg host "$HOST" --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" '
  reduce .[] as $e ({device: {host: $host, collected_at: $ts}};
                    setpath([$e.tab, $e.id]; ($e | del(.tab, .id))))' "$ENTRIES" > "$RESULT"

cat "$RESULT"

# --- opcjonalnie: osobny plik JSON na każdy pakiet ---
if [ -n "$OUT_DIR" ]; then
  mkdir -p "$OUT_DIR"
  cp "$RESULT" "$OUT_DIR/all.json"
  while IFS= read -r line; do
    tab="$(jq -r .tab <<<"$line")"; id="$(jq -r .id <<<"$line")"
    mkdir -p "$OUT_DIR/$tab"
    jq 'del(.tab, .id)' <<<"$line" > "$OUT_DIR/$tab/$id.json"
  done < "$ENTRIES"
  echo "Zapisano pakiety w: $OUT_DIR" >&2
fi
