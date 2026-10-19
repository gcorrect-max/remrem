# Pliki WWW prawdziwego urządzenia / Web files of the real device

Pobrane z `http://192.168.128.1` trybem `collect.ps1 -Discover` (18–19.10.2026, serwer Boa/0.94.14rc21, projekt „REM-102”):
strona logowania, `Config/*.json` (menu), strony `*.html` i skrypty `Script/*.js` urządzenia (bez bibliotek jQuery, jqPlot i podobnych).
Downloaded from the device with `collect.ps1 -Discover`: the login page, the menu `Config/*.json`, the device's `*.html` pages and its own `Script/*.js` (third-party libraries left out).

To jest **źródło prawdy** dla listy zapytań (`rem102/scripts/build-packages.py` czyta `Config/*.json`) i dla formatu odpowiedzi
(`Script/globalFunc.js`, `iframe.js`, `iframeDB.js`, `tableMultiColPag.js`, ...). / This is the source of truth for the request list and for the response formats.
