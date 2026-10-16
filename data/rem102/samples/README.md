# Przechwycone odpowiedzi urządzenia / Captured device responses

Ten katalog jest **pusty celowo** – w repozytorium nie ma jeszcze żadnej odpowiedzi z prawdziwego urządzenia.
This directory is **empty on purpose** – no response from a real device is in the repository yet.

Uzupełnianie / Filling in (po podłączeniu do urządzenia / once connected):

```bash
REM_OUT_DIR=data/rem102/samples REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password \
  ./scripts/rem102-info.sh > /dev/null
python3 scripts/build-rem102-docs.py
```

Skrypt zapisuje `<tab>/<id>.json` (koperta z `http_status` i `body`) oraz `all.json`. Generator czyta tylko pliki `<tab>/<id>.json`
i wstawia je do `docs/rem102-api*.html` oraz sekcji „Przykłady odpowiedzi / Response examples” w `docs/rem102-info*.md`.
Przed zacommitowaniem sprawdź, czy odpowiedzi nie zawierają danych, których nie chcesz publikować (numery seryjne, adresy, hasła).
Check the responses for data you do not want to publish (serial numbers, addresses, passwords) before committing.
