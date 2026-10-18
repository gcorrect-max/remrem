# Pliki WWW prawdziwego urządzenia / Web files of the real device

Pobrane z `http://192.168.128.1` trybem `collect.ps1 -Discover` (18.10.2026, serwer Boa/0.94.14rc21, projekt „REM-102”).
Downloaded from the device with `collect.ps1 -Discover`. To jest **źródło prawdy** dla listy zapytań: `rem102/scripts/build-packages.py`
czyta `Config/*.json` i tworzy `rem102/data/rem102-packages.tsv`. / This is the source of truth for the request list.

Pominięto `Script/jquery.js` i `Script/jquery.cookie.js` (biblioteki) – pełny zapis jest w `results/archive/discover-2026-10-18.json`.
