# Wyniki zbierania z urządzenia / Results captured from the device

Tu trafiają wyniki `collect.cmd` / `collect.sh` / `collect.ps1`. W repozytorium nie ma jeszcze żadnej poprawnej odpowiedzi pakietu z prawdziwego urządzenia
(w `archive/` są zapisy wcześniejszych prób: probe, discover i zbieranie z błędem 404).
No usable package response from the real device is in the repository yet (`archive/` keeps earlier attempts).

Windows (PowerShell):

```powershell
cd C:\rem102\scripts
.\collect.cmd -DeviceHost 192.168.128.1 -Discover
.\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'hasło'
```

Linux / macOS / Git Bash:

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='hasło' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

Pliki / files:

- `collected.json` – wszystko w jednym pliku (`device`, `login`, pakiety) / everything in one file
- `samples/<tab>/<id>.json` – to samo rozbite na pakiety / the same split per package
- `collect.log` – log przebiegu, bez hasła / run log, no password
- `discover.json`, `discover.log` – z `-Discover` / from `-Discover`; `probe.json` – z `-Probe` / from `-Probe`

Generator (`rem102/scripts/build-docs.py`) czyta `samples/` albo `collected.json`. Odpowiedź `{"value":"fail"}` (wymagane logowanie) i błędy HTTP nie są przykładami.
Przed zacommitowaniem sprawdź, czy dane nie zawierają informacji, których nie chcesz publikować (numery seryjne, adresy, hasła).
Check the data for anything you do not want to publish (serial numbers, addresses, passwords) before committing.
