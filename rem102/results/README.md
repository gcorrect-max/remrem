# Wyniki zbierania z urządzenia / Results captured from the device

**Uwaga / Note:** surowe wyniki (`collected.json`, `samples/`, `discover.json`, `probe.json`) mogą zawierać hasła z konfiguracji urządzenia (hosty FTP, APN) i są wyłączone z gita (`.gitignore`) oraz z archiwum zip. Śledzona kopia `collected.redacted.json` ma dane uwierzytelniające zastąpione `<redacted>`; generator czyta surowy plik, a gdy go nie ma – tę kopię, i zawsze usuwa dane uwierzytelniające z dokumentacji.
Raw results may contain passwords from the device configuration; they are git-ignored and left out of the zip. The tracked `collected.redacted.json` has credentials replaced with `<redacted>`.

Tu trafiają wyniki `collect.cmd` / `collect.sh` / `collect.ps1`. `collected.redacted.json` to pierwsze pełne zbieranie z prawdziwego urządzenia (19.10.2026, Super Admin); w `archive/` są zapisy wcześniejszych prób (probe, discover, zbieranie z błędem 404).
`collected.redacted.json` is the first full collection from the real device; `archive/` keeps earlier attempts.

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
