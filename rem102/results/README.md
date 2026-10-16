# Wyniki zbierania z urządzenia / Results captured from the device

Ten katalog jest **pusty celowo** – w repozytorium nie ma jeszcze żadnej odpowiedzi z prawdziwego urządzenia.
This directory is **empty on purpose** – no response from a real device is in the repository yet.

Uzupełnianie / Filling in (po podłączeniu do urządzenia / once connected):

```bash
REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

`collect.sh` zapisuje tutaj / writes here:

- `collected.json` – wszystko w jednym pliku (`device`, `login`, pakiety) / everything in one file
- `samples/<tab>/<id>.json` – to samo rozbite na pakiety / the same split per package
- `collect.log` – log przebiegu, bez hasła / run log, no password

Generator (`rem102/scripts/build-docs.py`) czyta `samples/` albo `collected.json` i wstawia dane do `rem102/docs/` oraz `rem102/index.html`.
Przed zacommitowaniem sprawdź, czy dane nie zawierają informacji, których nie chcesz publikować (numery seryjne, adresy, hasła).
Check the data for anything you do not want to publish (serial numbers, addresses, passwords) before committing.
