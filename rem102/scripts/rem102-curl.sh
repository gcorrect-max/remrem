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

HDR="$(mktemp)"; OUT="$(mktemp)"
trap 'rm -f "$HDR" "$OUT"' EXIT

echo "== 1. login (level $LEVEL)"
printf '%s' "$PASS" | curl -sS -D "$HDR" -o "$OUT" -X POST "$BASE/cgi-bin/mpc105.cgi" \
     --data "query=120" --data "login=$LEVEL" --data-urlencode "pwd@-"
REPLY="$(cat "$OUT")"; echo "$REPLY"
VALUE="$(printf '%s' "$REPLY" | tr -d '\r\n' | sed -n 's/.*"value" *: *"\([^"]*\)".*/\1/p')"
# the session id comes from the Set-Cookie header (no cookie jar involved)
SID="$(tr -d '\r' < "$HDR" | sed -n 's/^[Ss]et-[Cc]ookie: *CGISESSID=\([^;]*\).*/\1/p' | head -1)"
if [ -z "$SID" ]; then
  if [ "$VALUE" = fail ]; then
    echo "Login rejected by the device (value=fail): wrong password for level $LEVEL. Every failed login is recorded in the device's event log, so do not retry blindly." >&2
  else
    echo "No CGISESSID cookie in the reply (value='$VALUE'). Response headers:" >&2; cat "$HDR" >&2
  fi
  exit 1
fi
COOKIE="Cookie: CGISESSID=$SID"

echo "== 2. device data (model, serial no., article no., ...)"
DEVICE="$(curl -sS -H "$COOKIE" "$BASE/cgi-bin/mpc105.cgi?query=302")"
echo "$DEVICE"
if command -v jq >/dev/null; then
  echo "-- summary"
  printf '%s' "$DEVICE" | jq -r '.[] | select(.tag=="devname" or .tag=="sn" or .tag=="pn" or .tag=="hostname") | "\(.label): \(.value)"' 2>/dev/null
fi

echo "== 3. software versions"
curl -sS -w '\n' -H "$COOKIE" "$BASE/cgi-bin/mpc105.cgi?query=301"

echo "== 4. logout"
curl -sS -w '\n' -H "$COOKIE" "$BASE/cgi-bin/mpc105j.cgi?query=122"
