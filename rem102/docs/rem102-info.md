# REM-102 – CGI API (odczyt)

> Wersja angielska: [`rem102-info_en.md`](rem102-info_en.md) · HTML: [`rem102-api.html`](rem102-api.html) · strona główna: [`../index.html`](../index.html)

## Wprowadzenie

Opis zapytań CGI, którymi interfejs WWW urządzenia **REM-102** (serwer Boa, strona producenta HaslerRail) pobiera dane. Lista pochodzi z plików, które urządzenie samo udostępnia (`Config/*.json`), odczytanych skryptem `collect.ps1 -Discover`. Uwzględnione są wyłącznie zapytania odczytowe.

> **Status.** Logowanie, nazwy CGI, ciasteczko sesji i poziomy dostępu pochodzą ze skryptów strony urządzenia (`Script/mainParent.js`, `Script/globalFunc.js`). Skrypty zbierające sprawdzono na atrapie serwera, nie na prawdziwych odpowiedziach. **Treści odpowiedzi poszczególnych pakietów nie znamy jeszcze** – patrz sekcja „Przykłady odpowiedzi”.

Adres bazowy: `http://<HOST>` (domyślnie `192.168.128.1`, port 80). Urządzenie udostępnia cztery pliki CGI:

| Plik CGI | Zakres |
|---|---|
| `/cgi-bin/mpc105.cgi` | platforma: logowanie, sieć, GPS, modem, RTC, pamięci, informacje o urządzeniu |
| `/cgi-bin/mpc105j.cgi` | wylogowanie |
| `/cgi-bin/rem.cgi` | miernik: kanały A/B, energia, archiwa, konfiguracja |
| `/cgi-bin/rtp.cgi` | RTP100 |

## Podstawowe informacje – pełna sekwencja curl

Poziom Super Admin (`login=3`), hasło `password` (wpisz własne). Kroki 2–6 zwracają model, numer seryjny, numer artykułu i pozostałe dane identyfikacyjne oraz podstawową konfigurację.

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# 1. logowanie jako Super Admin (login=3); hasło kodowane jak w formularzu
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" \
     --data "query=120" --data "login=3" --data-urlencode "pwd=password"
cat "$JAR"    # powinno być widoczne ciasteczko CGISESSID

# 2. model, numer seryjny, numer artykułu i pozostałe dane urządzenia (Advanced > Information > Device Settings)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302"

# 3. wersje oprogramowania (Advanced > Information > Version)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=301"

# 4. ustawienia miernika (Setup > Meter > Settings)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=105"

# 5. konfiguracja kanałów (Setup > Meter > Channels Configuration)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=100"

# 6. stan Ethernet 0 (Monitoring > Network Interfaces)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=3"

# 7. wylogowanie (opcjonalnie)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105j.cgi?query=122"
rm -f "$JAR"
```

Wszystko jednym poleceniem (bez wylogowania), z nagłówkiem przed każdą odpowiedzią:

```bash
HOST=192.168.128.1; JAR=$(mktemp)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" --data "query=120" --data "login=3" --data-urlencode "pwd=password"
for r in mpc105.cgi?query=302 mpc105.cgi?query=301 rem.cgi?query=105 rem.cgi?query=100; do
  printf '\n== %s ==\n' "$r"
  curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/$r"
done; rm -f "$JAR"
```

Uwagi: `--data-urlencode` koduje hasło tak, jak robi to formularz strony (znaki `@`, `!`, `&` są bezpieczne). W PowerShellu `curl` jest aliasem `Invoke-WebRequest`: używaj `curl.exe` albo skryptu `collect.cmd` (patrz „Skrypty”). Zła para poziom/hasło zwraca `{"value":"fail"}`.

## Logowanie i poziomy dostępu

Logowanie wykonuje formularz strony (`Script/mainParent.js`): `POST /cgi-bin/mpc105.cgi` z polami formularza:

| Pole | Znaczenie |
|---|---|
| `query` | zawsze `120` (z `Config/settings.json`, typ `LoginOnStart`) |
| `login` | poziom: `1` = User, `2` = Admin, `3` = Super Admin (nie nazwa użytkownika) |
| `pwd` | hasło, kodowane URL |
| `change` | zaznaczone tylko przy zmianie hasła |

- Odpowiedź to JSON z polem `value`: `"fail"` = złe hasło, `"change"` = trzeba zmienić hasło, inna wartość = zalogowano.
- Sesję niesie ciasteczko `CGISESSID`; poziom odczytuje strona z 5. znaku wartości (`A`..`D` = 0..3).
- Wylogowanie: `GET /cgi-bin/mpc105j.cgi?query=122`, strona kasuje ciasteczko.
- Strona pokazuje pozycję menu, gdy `show_level` ≤ poziom użytkownika; zapis wymaga `write_level`.
- Według skryptów strony odpowiedź `{"value":"fail"}` na zapytanie odczytowe oznacza „Needed Authentication”.

## Konwencje

- Zapytania odczytowe to `GET <cgi>?<query>`, odpowiedzi są w JSON (strona używa `$.getJSON`).
- W plikach menu parametry zapytań bywają rozdzielone znakiem `~` (np. `query=7~block_offset=10240~…`). W tabeli pakietów zapisano je jako `&`; to założenie, patrz „Założenia”.
- Pola `en_cgi`/`en_query` w menu sprawdzają, czy moduł jest włączony – to pakiety z zakładki Features.
- Pola `set`, `set1`, `set2` zapisują konfigurację – **nie są** używane.

## Format wyniku skryptów

Skrypty zbierające zwracają jeden obiekt JSON: `device` (metadane), `login` (wynik logowania) i klucz na zakładkę z pakietami po `id`.

```json
{
  "device": { "base_url": "http://192.168.128.1", "collected_at": "<czas UTC>", "packages_total": 66 },
  "login": { "http_status": 200, "ok": true, "value": "<odpowiedź>", "level_requested": 3, "level_from_cookie": 3 },
  "advanced": {
    "information_device_settings": {
      "label": "Advanced > Information > Device Settings",
      "cgi": "/cgi-bin/mpc105.cgi",
      "query": "query=302",
      "http_status": 200,
      "content_type": "<nagłówek>",
      "body": "<odpowiedź urządzenia – do uzupełnienia po podłączeniu>"
    }
  }
}
```

| Pole | Opis |
|---|---|
| `label` | ścieżka w menu WWW |
| `cgi`, `query` | dokładnie to, co poszło do urządzenia |
| `http_status` | kod HTTP; `0` = brak odpowiedzi HTTP (pole `error` podaje powód) |
| `content_type`, `server` | nagłówki odpowiedzi |
| `body` | JSON, jeśli odpowiedź się parsuje; inaczej tekst; `null` gdy pusta |
| `post_retry` | tylko gdy GET zawiódł: wynik jednorazowej próby POST |

Błąd jednego pakietu nie przerywa zbierania pozostałych.

## Pakiety

### Home (`home`)

Odczyty miernika: kanały A i B, energia, wejścia/wyjścia cyfrowe, archiwa, sieć.

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `home.summary_meter_status` | `/cgi-bin/rem.cgi?query=7&block_offset=10240&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=17&string_size=32` | 0 |  |
| `home.ch_a_energy` | `/cgi-bin/rem.cgi?query=7&block_offset=11264&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` | 0 |  |
| `home.ch_a_measures` | `/cgi-bin/rem.cgi?query=106&channel=0` | 0 | W menu to samo zapytanie służy też do zapisu (set); skrypt wysyła tylko odczyt. |
| `home.ch_b_energy` | `/cgi-bin/rem.cgi?query=7&block_offset=12288&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` | 0 |  |
| `home.ch_b_measures` | `/cgi-bin/rem.cgi?query=106&channel=1` | 0 | W menu to samo zapytanie służy też do zapisu (set); skrypt wysyła tylko odczyt. |
| `home.digital_io` | `/cgi-bin/rem.cgi?query=7&block_offset=13312&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=12&string_size=32` | 0 |  |
| `home.archive_1_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=1` | 0 |  |
| `home.archive_1_sent_files` | `/cgi-bin/rem.cgi?query=108&id=1` | 0 |  |
| `home.archive_1_test_files` | `/cgi-bin/rem.cgi?query=112&id=1` | 0 |  |
| `home.archive_2_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=2` | 0 |  |
| `home.archive_2_sent_files` | `/cgi-bin/rem.cgi?query=108&id=2` | 0 |  |
| `home.archive_2_test_files` | `/cgi-bin/rem.cgi?query=112&id=2` | 0 |  |
| `home.networking_interfaces` | `/cgi-bin/mpc105.cgi?query=500` | 0 |  |
| `home.networking_services` | `/cgi-bin/mpc105.cgi?query=501` | 0 |  |
| `home.networking_redirection` | `/cgi-bin/mpc105.cgi?query=502` | 0 |  |

### Monitoring (`monitoring`)

Stan interfejsów sieciowych, pamięci i podzespołów oraz RTP100.

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `monitoring.network_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=3` | 0 |  |
| `monitoring.network_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=4` | 0 |  |
| `monitoring.network_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=5` | 0 |  |
| `monitoring.network_interfaces_wlan` | `/cgi-bin/mpc105.cgi?query=6` | 0 |  |
| `monitoring.network_interfaces_mobile` | `/cgi-bin/mpc105.cgi?query=13` | 0 |  |
| `monitoring.network_interfaces_ethernet_switch` | `/cgi-bin/mpc105.cgi?query=14` | 0 |  |
| `monitoring.network_interfaces_gps` | `/cgi-bin/mpc105.cgi?query=16` | 0 |  |
| `monitoring.rtp100_rtp100_variables` | `/cgi-bin/rtp.cgi?query=441` | 0 | Wymaga włączonego modułu: `features.rtp100`. |
| `monitoring.rtp100_rtp100_files` | `/cgi-bin/rtp.cgi?query=444` | 0 | Wymaga włączonego modułu: `features.rtp100`. |
| `monitoring.memory_nand` | `/cgi-bin/mpc105.cgi?query=23` | 0 |  |
| `monitoring.memory_nor` | `/cgi-bin/mpc105.cgi?query=24` | 0 |  |
| `monitoring.memory_ram` | `/cgi-bin/mpc105.cgi?query=25` | 0 |  |
| `monitoring.other_devices_rtc` | `/cgi-bin/mpc105.cgi?query=7` | 0 |  |
| `monitoring.other_devices_fpga` | `/cgi-bin/mpc105.cgi?query=8` | 0 |  |
| `monitoring.other_devices_fram` | `/cgi-bin/mpc105.cgi?query=9` | 0 |  |
| `monitoring.other_devices_adc` | `/cgi-bin/mpc105.cgi?query=10` | 0 |  |
| `monitoring.other_devices_hdlc` | `/cgi-bin/mpc105.cgi?query=11` | 0 |  |
| `monitoring.other_devices_mvbcs` | `/cgi-bin/mpc105.cgi?query=12` | 0 |  |
| `monitoring.other_devices_modem` | `/cgi-bin/mpc105.cgi?query=17` | 0 |  |
| `monitoring.other_devices_wifi` | `/cgi-bin/mpc105.cgi?query=18` | 0 |  |

### Setup (`setup`)

Konfiguracja miernika, interfejsów sieciowych, DHCP i usług.

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `setup.meter_settings` | `/cgi-bin/rem.cgi?query=105` | 0 | Ustawienia miernika (rem.cgi, nie mpc105.cgi). |
| `setup.meter_channels_configuration` | `/cgi-bin/rem.cgi?query=100` | 0 |  |
| `setup.meter_ftp_hosts` | `/cgi-bin/rem.cgi?query=101` | 0 |  |
| `setup.meter_udp_clients` | `/cgi-bin/rem.cgi?query=102` | 0 |  |
| `setup.meter_messages` | `/cgi-bin/rem.cgi?query=103` | 0 |  |
| `setup.meter_calibration` | `/cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` | 3 | Odczyt pamięci współdzielonej; w menu show_level 3 (Super Admin). |
| `setup.meter_thresholds_protection` | `/cgi-bin/rem.cgi?query=111` | 0 |  |
| `setup.rtp100_rtp100_command` | `/cgi-bin/rtp.cgi?query=442` | 0 | Wymaga włączonego modułu: `features.rtp100`. |
| `setup.ethernet_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=103` | 0 |  |
| `setup.ethernet_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=104` | 0 |  |
| `setup.ethernet_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=105` | 0 |  |
| `setup.ethernet_interfaces_switch_ethernet` | `/cgi-bin/mpc105.cgi?query=107` | 0 |  |
| `setup.mobile_interface_mobile_settings` | `/cgi-bin/mpc105.cgi?query=101` | 0 |  |
| `setup.wireless_interface_wlan` | `/cgi-bin/mpc105.cgi?query=106` | 0 |  |
| `setup.wireless_interface_client_access` | `/cgi-bin/mpc105.cgi?query=204` | 0 |  |
| `setup.dhcp_client_settings` | `/cgi-bin/mpc105.cgi?query=200` | 0 |  |
| `setup.dhcp_server_settings` | `/cgi-bin/mpc105.cgi?query=208` | 0 |  |
| `setup.dhcp_address_reservation` | `/cgi-bin/mpc105.cgi?query=209` | 0 |  |
| `setup.services_gateway_dns` | `/cgi-bin/mpc105.cgi?query=201` | 0 |  |
| `setup.services_servers` | `/cgi-bin/mpc105.cgi?query=202` | 0 |  |
| `setup.services_ntp_servers` | `/cgi-bin/mpc105.cgi?query=203` | 0 |  |
| `setup.services_gps` | `/cgi-bin/mpc105.cgi?query=205` | 0 |  |
| `setup.services_port_forwarding` | `/cgi-bin/mpc105.cgi?query=207` | 0 |  |
| `setup.services_proxy_settings` | `/cgi-bin/mpc105.cgi?query=220` | 0 |  |

### Advanced (`advanced`)

Czas RTC, konfiguracja i informacje o urządzeniu (model, numer seryjny, wersje, zdarzenia).

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `advanced.rtc_time_settings` | `/cgi-bin/mpc105.cgi?query=303` | 0 |  |
| `advanced.rtc_time_zones` | `/cgi-bin/mpc105.cgi?query=305` | 0 |  |
| `advanced.configuration_settings` | `/cgi-bin/rem.cgi?query=113` | 0 |  |
| `advanced.information_device_settings` | `/cgi-bin/mpc105.cgi?query=302` | 1 | Model, numer seryjny, numer artykułu i pozostałe dane urządzenia. W menu: show_level 1, write_level 3. |
| `advanced.information_events` | `/cgi-bin/mpc105.cgi?query=314` | 0 | W menu to samo zapytanie służy też do zapisu (set = query=314); skrypt wysyła tylko odczyt. |
| `advanced.information_version` | `/cgi-bin/mpc105.cgi?query=301` | 0 | Wersje oprogramowania. |

### Features (`features`)

Flagi włączenia modułów (`en_query` z menu).

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `features.rtp100` | `/cgi-bin/rem.cgi?query=430` | 0 | Odpowiedź to tablica obiektów; `{"type":"enable","value":"true"}` oznacza włączony moduł (reguła ze skryptu strony). |

## Przykłady odpowiedzi

Przykłady pochodzą **wyłącznie** z odpowiedzi zebranych z prawdziwego urządzenia – nic nie jest zmyślone. Pakiety bez przykładu czekają na uzupełnienie po podłączeniu do urządzenia. Odpowiedź `{"value":"fail"}` (wymagane logowanie) i błędy HTTP nie są przykładami.

Zebrano przykładów: 0 z 66.

Jak uzupełnić:

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

<details><summary>Do uzupełnienia (66)</summary>

- `home.summary_meter_status`
- `home.ch_a_energy`
- `home.ch_a_measures`
- `home.ch_b_energy`
- `home.ch_b_measures`
- `home.digital_io`
- `home.archive_1_waiting_files`
- `home.archive_1_sent_files`
- `home.archive_1_test_files`
- `home.archive_2_waiting_files`
- `home.archive_2_sent_files`
- `home.archive_2_test_files`
- `home.networking_interfaces`
- `home.networking_services`
- `home.networking_redirection`
- `monitoring.network_interfaces_ethernet_0`
- `monitoring.network_interfaces_ethernet_1`
- `monitoring.network_interfaces_ethernet_2`
- `monitoring.network_interfaces_wlan`
- `monitoring.network_interfaces_mobile`
- `monitoring.network_interfaces_ethernet_switch`
- `monitoring.network_interfaces_gps`
- `monitoring.rtp100_rtp100_variables`
- `monitoring.rtp100_rtp100_files`
- `monitoring.memory_nand`
- `monitoring.memory_nor`
- `monitoring.memory_ram`
- `monitoring.other_devices_rtc`
- `monitoring.other_devices_fpga`
- `monitoring.other_devices_fram`
- `monitoring.other_devices_adc`
- `monitoring.other_devices_hdlc`
- `monitoring.other_devices_mvbcs`
- `monitoring.other_devices_modem`
- `monitoring.other_devices_wifi`
- `setup.meter_settings`
- `setup.meter_channels_configuration`
- `setup.meter_ftp_hosts`
- `setup.meter_udp_clients`
- `setup.meter_messages`
- `setup.meter_calibration`
- `setup.meter_thresholds_protection`
- `setup.rtp100_rtp100_command`
- `setup.ethernet_interfaces_ethernet_0`
- `setup.ethernet_interfaces_ethernet_1`
- `setup.ethernet_interfaces_ethernet_2`
- `setup.ethernet_interfaces_switch_ethernet`
- `setup.mobile_interface_mobile_settings`
- `setup.wireless_interface_wlan`
- `setup.wireless_interface_client_access`
- `setup.dhcp_client_settings`
- `setup.dhcp_server_settings`
- `setup.dhcp_address_reservation`
- `setup.services_gateway_dns`
- `setup.services_servers`
- `setup.services_ntp_servers`
- `setup.services_gps`
- `setup.services_port_forwarding`
- `setup.services_proxy_settings`
- `advanced.rtc_time_settings`
- `advanced.rtc_time_zones`
- `advanced.configuration_settings`
- `advanced.information_device_settings`
- `advanced.information_events`
- `advanced.information_version`
- `features.rtp100`

</details>

## Pominięte zapytania

> Poniższych zapytań skrypty **nie** wysyłają – zmieniają stan urządzenia, kończą sesję albo służą do przesyłania plików.

| Zapytanie | Powód |
|---|---|
| `rem.cgi?query=440` | Restore Factory Default – przywraca ustawienia fabryczne |
| `mpc105.cgi?query=1982` | restart urządzenia |
| `mpc105j.cgi?query=122` | wylogowanie (kończy sesję) |
| `mpc105.cgi?query=121` | zmiana hasła |
| `rem.cgi?query=402` | Export (akcja pobrania konfiguracji) |
| `rem.cgi?query=401`, `mpc105.cgi?query=310` | Import konfiguracji i Firmware Upgrade (upload plików) |
| `rtp.cgi?query=440`, `443`, `445` | zapis i komendy RTP100 |
| wszystkie pola `set`, `set1`, `set2` | zapis konfiguracji |

## Skrypty

Zbieranie wszystkich pakietów po kolei: `rem102/scripts/collect.sh` (bash, curl, jq) albo `rem102/scripts/collect.ps1` (Windows PowerShell 5.1+, bez dodatkowych narzędzi). Oba zapisują `collected.json`, `samples/<zakładka>/<id>.json` i `collect.log` w `rem102/results/`. `rem102-info.sh` to skrót do `collect.sh` z wynikiem na stdout.

### Linux / macOS / Git Bash

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

| Zmienna | Znaczenie | Domyślnie |
|---|---|---|
| `REM_HOST` | adres urządzenia | `192.168.128.1` |
| `REM_USER` / `REM_LEVEL` | `User`, `Admin`, `Super Admin` albo poziom `1`, `2`, `3` | – (wymagane jedno z dwóch) |
| `REM_PASS` | hasło | – (wymagane) |
| `REM_BASE_URL` | pełny adres bazowy (inny port, HTTPS, prefiks) | `http://$REM_HOST` |
| `REM_INSECURE` | `1` = akceptuj certyfikat self-signed | – |
| `REM_OUT_DIR` | katalog wynikowy | `rem102/results/` |
| `REM_TIMEOUT`, `REM_DELAY` | limit czasu zapytania i przerwa między zapytaniami, s | `10`, `0` |
| `REM_LOGIN_BODY` | pełne ciało logowania (nadpisuje domyślne) | – |

### Windows (PowerShell)

Pliki `.sh` nie uruchomią się w Windows. Użyj `collect.cmd` (uruchamia `collect.ps1` z `-ExecutionPolicy Bypass`):

```powershell
cd C:\rem102\scripts
.\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'password'
```

- Bez `-Password` skrypt zapyta o hasło. Nazwę ze spacją podaj w cudzysłowie; zamiast nazwy można podać `-Level 3`.
- `-Discover` czyta własne pliki WWW urządzenia (bez logowania) i zapisuje `results\discover.json`; `-Probe` sprawdza porty i ścieżki (`results\probe.json`).
- `-BaseUrl https://192.168.128.1:8443 -Insecure` – inny adres bazowy lub certyfikat self-signed.
- Zwykły HTTP idzie surowym połączeniem TCP, więc nietypowe odpowiedzi CGI też zostają zapisane (z powodem w polu `error`).
- Jeśli uruchamiasz `.ps1` bezpośrednio i dostajesz błąd o zablokowanych skryptach: `Unblock-File .\collect.ps1`.
- `collect.ps1` sprawdzono w PowerShell 7 na atrapie serwera, w Windows PowerShell 5.1 jeszcze nie.

## Użycie w LabVIEW

Lista zapytań jest dostępna jako pliki w `rem102/data/`. Kolejność wierszy jest we wszystkich plikach taka sama.

| Plik | Zawartość | Użycie |
|---|---|---|
| `rem102-package-names.txt` | jedna nazwa pakietu w wierszu (`tab.id`) | pozycje enuma (typedef) |
| `rem102-package-requests.txt` | jedno zapytanie w wierszu, np. `/cgi-bin/mpc105.cgi?query=302` | tablica stringów indeksowana wartością enuma |
| `rem102-packages.tsv` | kolumny z nagłówkiem: `index, name, tab, id, cgi, query, request, method, min_level, requires, label, cyclic_ms, note` | wyszukiwanie po nazwie, bramkowanie po `min_level` i `requires` |

Nazwy mają postać `tab.id`, bo samo `id` mogłoby się powtarzać między zakładkami.

1. **Enum.** Typedef `REM102 Package` z pozycjami z `rem102-package-names.txt`; wartość enuma to numer wiersza liczony od 0.
2. **Tablica zapytań.** *Read from Text File* (z konwersją końców linii), rozbicie na wiersze do `String[]`; wczytaj raz przy starcie.
3. **Logowanie.** `POST /cgi-bin/mpc105.cgi` z `query=120&login=<1|2|3>&pwd=<hasło>`; zachowaj ciasteczko `CGISESSID` i wysyłaj je w nagłówku `Cookie`.
4. **Zapytanie.** *Index Array* wartością enuma → ścieżka z zapytaniem; *HTTP Client* GET → ciało odpowiedzi jako string.
5. **Parsowanie.** *Unflatten From JSON* do typedefu danego pakietu.

### VI polimorficzny

Polimorficzny VI wybiera instancję po **typie** podłączonych danych, nie po wartości enuma. Enum wybiera więc zapytanie, a typ wybiera parser. Dla jednego VI obsługującego każdy pakiet najlepiej pasuje **malleable VI** (`.vim`, LabVIEW 2017 lub nowszy):

```text
Get Package.vim
  wejścia:  Package (enum REM102 Package), Type (dowolny typedef – specyfikator typu), Host, sesja (CGISESSID)
  wyjścia:  Data (typu Type), Raw Body (string), HTTP Status, error out
  wnętrze:  Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)
```

Dla każdego pakietu wystarczy osobny typedef klastra, bez osobnej instancji. Dopóki nie znasz prawdziwych odpowiedzi, użyj `Get Package (Raw).vi` zwracającego sam string. Typedefy zbuduj z próbek zebranych skryptem na prawdziwym urządzeniu. Przed odczytem sprawdź w tsv kolumny `min_level` (poziom konta) i `requires` (pakiet `features.*` mówi, czy moduł jest włączony).

## Założenia i do sprawdzenia

Ustalone z plików WWW urządzenia (nie są już założeniami): logowanie `query=120` z polami `login` (poziom) i `pwd`, ciasteczko `CGISESSID`, odczyty przez GET z odpowiedziami JSON, nazwy CGI `.cgi`, lista zapytań z `Config/*.json`.

1. **Treść odpowiedzi.** Format poszczególnych pakietów jest nieznany do czasu zebrania ich z urządzenia.
2. **Separator `~`.** W plikach menu oznacza prawdopodobnie `&`; kod stron-iframe, który to przekształca, nie był jeszcze pobrany (nowy `-Discover` je pobiera).
3. **Zapytania używane też do zapisu** (`advanced.information_events`, `home.ch_a_measures`, `home.ch_b_measures`): odczyt przez GET powinien być bezpieczny, bo strona robi to samo cyklicznie, ale do potwierdzenia.
4. **Poziomy dostępu.** `show_level` rozumiemy jako minimalny poziom użytkownika do wyświetlenia pozycji menu.
5. **Odpowiedź 502 „The CGI was not CGI/1.1 compliant”** pojawiła się dla nieistniejących numerów zapytań w starej liście; przy poprawnych zapytaniach i po zalogowaniu nie powinna występować.
