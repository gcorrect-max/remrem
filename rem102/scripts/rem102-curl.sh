#!/usr/bin/env bash
# REM-102: login -> read the device data -> logout, with plain curl calls.
#
# Usage:   ./rem102/scripts/rem102-curl.sh <user> <password> [host]
#   user   = User | Admin | Super Admin  (or the level 1 | 2 | 3)
#   host   = device address, default $REM_HOST or 192.168.128.1
# Example: ./rem102/scripts/rem102-curl.sh "Super Admin" 'my-password'
#
# The password is passed to curl through stdin, so it does not show up in the process list.
# Needs: bash, curl. With jq installed a short summary (model, serial no., article no.) is printed too.
#
# Calls (the device's own web page does the same, see Script/mainParent.js and Config/settings.json):
#   login   POST /cgi-bin/mpc105.cgi   query=120 & login=<level> & pwd=<password>   -> cookie CGISESSID
#   data    GET  /cgi-bin/mpc105.cgi?query=302   device settings: devname (model), sn, pn (article no.), hostname, MAC...
#           GET  /cgi-bin/mpc105.cgi?query=301   software versions
#   logout  GET  /cgi-bin/mpc105j.cgi?query=122  (taken from the page's scripts; not yet run against the device)
set -u

USER_ARG="${1:?usage: $0 <user: User|Admin|Super Admin|1|2|3> <password> [host]}"
PASS="${2:?usage: $0 <user> <password> [host]}"
HOST="${3:-${REM_HOST:-192.168.128.1}}"
BASE="http://${HOST}"

case "$(printf '%s' "$USER_ARG" | tr '[:upper:]' '[:lower:]' | tr -d ' ')" in
  1|user) LEVEL=1 ;; 2|admin) LEVEL=2 ;; 3|superadmin) LEVEL=3 ;;
  *) echo "Unknown user '$USER_ARG': use User, Admin, Super Admin or 1, 2, 3" >&2; exit 1 ;;
esac

JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

echo "== 1. login (level $LEVEL)"
printf '%s' "$PASS" | curl -sS -w '\n' -c "$JAR" -X POST "$BASE/cgi-bin/mpc105.cgi" \
     --data "query=120" --data "login=$LEVEL" --data-urlencode "pwd@-"
if ! grep -q CGISESSID "$JAR"; then
  echo "Login failed (no CGISESSID cookie). Check the password: every failed login is recorded in the device's event log." >&2
  exit 1
fi

echo "== 2. device data (model, serial no., article no., ...)"
DEVICE="$(curl -sS -b "$JAR" "$BASE/cgi-bin/mpc105.cgi?query=302")"
echo "$DEVICE"
if command -v jq >/dev/null; then
  echo "-- summary"
  printf '%s' "$DEVICE" | jq -r '.[] | select(.tag=="devname" or .tag=="sn" or .tag=="pn" or .tag=="hostname") | "\(.label): \(.value)"' 2>/dev/null
fi

echo "== 3. software versions"
curl -sS -w '\n' -b "$JAR" "$BASE/cgi-bin/mpc105.cgi?query=301"

echo "== 4. logout"
curl -sS -w '\n' -b "$JAR" "$BASE/cgi-bin/mpc105j.cgi?query=122"
