#!/usr/bin/env bash
# Pełny odczyt informacji o urządzeniu REM102 (zakładki Home, Monitoring, Setup, Advanced + settings.json)
# wyłącznie zapytania ODCZYTOWE (pola "query" z plików Config/*.json). Nie wywołuje żadnych "set".
#
# Użycie:
#   REM_HOST=192.168.128.1 REM_USER=Admin REM_PASS='...' ./scripts/rem102-info.sh > rem102.txt
#
# Założenia (do potwierdzenia w DevTools przeglądarki na stronie logowania urządzenia):
#   - logowanie: POST /cgi-bin/mpc105.fcgi, query=120, pola username/pwd (nazwy z modulesCfg.ts)
#   - urządzenie ustawia ciasteczka CGIUSERNAME / CGIUSERLEVEL, które trzymamy w cookie jar
#   - znak "~" w polu "query" z JSON-ów to separator parametrów, czyli "&" w prawdziwym żądaniu
set -u

HOST="${REM_HOST:-192.168.128.1}"
USER_NAME="${REM_USER:?ustaw REM_USER}"
PASS="${REM_PASS:?ustaw REM_PASS}"
LOGIN_BODY="${REM_LOGIN_BODY:-query=120&username=${USER_NAME}&pwd=${PASS}}"

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

REM=/cgi-bin/rem.fcgi
MPC=/cgi-bin/mpc105.fcgi
ITEMS=/cgi-bin/items.fcgi
RTP=/cgi-bin/rtp.fcgi

# q <cgi> <query> <opis>
q() {
  printf '\n===== %s  [%s?%s] =====\n' "$3" "$1" "$2"
  curl -sS --max-time 10 -b "$JAR" -G "http://${HOST}$1" --data-raw "$2"
  printf '\n'
}

# --- logowanie ---
curl -sS --max-time 10 -c "$JAR" -X POST "http://${HOST}${MPC}" --data-raw "$LOGIN_BODY" >/dev/null
grep -q CGIUSER "$JAR" || echo "UWAGA: brak ciasteczek CGIUSER* – logowanie się nie powiodło (sprawdź REM_LOGIN_BODY)" >&2

echo "##### IDENTYFIKACJA (model / numer seryjny / numer artykułu / wersje) #####"
q $MPC "query=302" "Advanced > Information > Device Settings (model, SN, nr artykułu)"
q $MPC "query=301" "Advanced > Information > Version (firmware/FPGA/DSP)"
q $MPC "query=126" "settings.json > host (nazwa hosta)"
q $MPC "query=125" "settings.json > auth_message"
q $REM "query=105" "Setup > Meter > Settings"
q $ITEMS "query=407" "Setup > DMeter > DMeter Serial Number"

echo; echo "##### HOME #####"
q $REM "query=10"  "Home > Summary > Meter Status"
q $REM "query=406" "Home > EMF channels > EMF Status"
q $REM "query=407" "Home > EMF channels > EMF Measures"
q $REM "query=409" "Home > EMF channels > EMF CEBD"
q $REM "query=459" "Home > Data Download > DHS Memory"
q $REM "query=11"  "Home > Digital IO"
q $MPC "query=500" "Home > Networking > Interfaces"
q $MPC "query=501" "Home > Networking > Services"

echo; echo "##### SETUP #####"
q $REM "query=100" "Setup > Meter > Channels Configuration"
for u in 1 2 3 4; do q $REM "query=450&user=${u}" "Setup > DCS User ${u}"; done
q $REM "query=452" "Setup > DCS Communication"
q $REM "query=457" "Setup > DCS Binding"
q $REM "query=455" "Setup > DCS Connection Test"
q $MPC "query=103" "Setup > Ethernet 0"
q $MPC "query=104" "Setup > Ethernet 1"
q $MPC "query=101" "Setup > Mobile Settings"
q $MPC "query=200" "Setup > DHCP Client"
q $MPC "query=201" "Setup > Services > Gateway & DNS"
q $MPC "query=202" "Setup > Services > Servers"
q $MPC "query=203" "Setup > Services > NTP Servers"
q $MPC "query=230" "Setup > Services > EMS Time Servers"
q $MPC "query=205" "Setup > Services > GPS"

echo; echo "##### ADVANCED #####"
q $MPC "query=303" "Advanced > RTC > Time Settings"
q $MPC "query=314" "Advanced > Information > Events"

echo; echo "##### MONITORING #####"
q $MPC "query=3"  "Monitoring > Network Interfaces > Ethernet 0"
q $MPC "query=4"  "Monitoring > Network Interfaces > Ethernet 1"
q $MPC "query=13" "Monitoring > Network Interfaces > Mobile"
q $MPC "query=16" "Monitoring > Network Interfaces > GPS"
for u in 1 2 3 4; do q $REM "query=461&user=${u}" "Monitoring > DCS Statistics > DCS User ${u}"; done
q $ITEMS "query=409" "Monitoring > DMeter Status"
q $RTP "query=441" "Monitoring > RTP100 Variables"
q $RTP "query=444" "Monitoring > RTP100 Files"
q $MPC "query=23" "Monitoring > Memory > NAND"
q $MPC "query=24" "Monitoring > Memory > NOR"
q $MPC "query=25" "Monitoring > Memory > RAM"
q $MPC "query=7"  "Monitoring > Other Devices > RTC"
q $MPC "query=8"  "Monitoring > Other Devices > FPGA"
q $MPC "query=9"  "Monitoring > Other Devices > FRAM"
q $MPC "query=10" "Monitoring > Other Devices > ADC"
q $MPC "query=11" "Monitoring > Other Devices > DSP"
q $MPC "query=12" "Monitoring > Other Devices > MVBCS"
q $MPC "query=17" "Monitoring > Other Devices > MODEM"

echo; echo "##### FLAGI DOSTĘPNOŚCI FUNKCJI (en_query) #####"
q $REM  "query=463"        "DCS włączony?"
q $REM  "query=462&user=1" "DCS User 1 włączony?"
q $REM  "query=420"        "DMeter (rem) włączony?"
q $ITEMS "query=400"       "DMeter (items) włączony?"
q $REM  "query=430"        "RTP100 włączony?"
q $MPC  "query=14"         "Modem/Mobile włączony?"
q $MPC  "query=15"         "GPS włączony?"
q $MPC  "query=18"         "DSP/Digital IO włączony?"
