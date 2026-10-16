#!/usr/bin/env bash
# Skrót: te same odczyty co collect.sh, ale wynik (JSON) trafia na stdout.
#   REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/rem102-info.sh > rem102.json
# Z REM_OUT_DIR=./dump dodatkowo zapisuje collected.json, samples/<zakładka>/<id>.json i collect.log.
# Pełny opis zmiennych i założeń: rem102/scripts/collect.sh oraz rem102/docs/rem102-info.md
exec "$(dirname "${BASH_SOURCE[0]}")/collect.sh" --stdout "$@"
