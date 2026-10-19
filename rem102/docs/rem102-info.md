# REM-102 – CGI API (odczyt)

> Wersja angielska: [`rem102-info_en.md`](rem102-info_en.md) · HTML: [`rem102-api.html`](rem102-api.html) · strona główna: [`../index.html`](../index.html)

## Wprowadzenie

Opis zapytań CGI, którymi interfejs WWW urządzenia **REM-102** (serwer Boa, strona producenta HaslerRail) pobiera dane. Lista pochodzi z plików, które urządzenie samo udostępnia (`Config/*.json`), odczytanych skryptem `collect.ps1 -Discover`. Uwzględnione są wyłącznie zapytania odczytowe.

> **Status (2026-10-19).** Logowanie, nazwy CGI, ciasteczko sesji, poziomy dostępu i format odpowiedzi pochodzą ze skryptów strony urządzenia (`Script/*.js`). Ostatnie zbieranie z urządzenia (zalogowano): **65 z 66** pakietów zwróciło odpowiedź, 0 wymagało logowania, 1 zakończyło się błędem HTTP. Dane uwierzytelniające (użytkownicy i hasła w konfiguracji) są w dokumentacji zastąpione `<redacted>`.

Adres bazowy: `http://<HOST>` (domyślnie `192.168.128.1`, port 80). Urządzenie udostępnia cztery pliki CGI:

| Plik CGI | Zakres |
|---|---|
| `/cgi-bin/mpc105.cgi` | platforma: logowanie, sieć, GPS, modem, RTC, pamięci, informacje o urządzeniu |
| `/cgi-bin/mpc105j.cgi` | wylogowanie (wg menu; na tym urządzeniu HTTP 404 – nie istnieje) |
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

# 7. koniec sesji: logout CGI (mpc105j.cgi) zwraca na tym urządzeniu 404, więc wystarczy usunąć ciasteczko
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

Uwagi: `--data-urlencode` koduje hasło tak, jak robi to formularz strony (znaki `@`, `!`, `&` są bezpieczne). W PowerShellu `curl` jest aliasem `Invoke-WebRequest`: używaj `curl.exe` albo skryptu `collect.cmd` (patrz „Skrypty”). Złe hasło zwraca `{ "reference":"login", ..., "value":"fail" }`.

### Gdzie w odpowiedzi są model, numer seryjny i numer artykułu

Odpowiedź kroku 2 (`advanced.information_device_settings`) to tablica elementów `{type, tag, label, value}`. Interesujące pola wybiera się po `tag`:

| Dane | `tag` | `label` urządzenia |
|---|---|---|
| Model (nazwa urządzenia) | `devname` | Device Name |
| Numer seryjny | `sn` | Serial Number |
| Numer artykułu | `pn` | Product Number |
| Nazwa hosta | `hostname` | Local Hostname |
| Adresy MAC | `ethaddr`, `eth1addr`, `eth2addr` | MAC ethernet 0 / 1 / 2 |
| Typ maszyny i urządzeń | `machine`, `widev`, `gpsdev`, `mdmdev` | Machine Type, Wifi / GPS / Modem device |

Wersje oprogramowania (krok 3, `advanced.information_version`) są w polach `kernel`, `ramdisk`, `storage`, `t5`, `p_rnt`, `u_rnt`, `dsp_rnt`, `f_cfg`, `cksum`. Wypisanie podstawowych danych jednym poleceniem:

```bash
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302" \
  | jq -r '.[] | select(.tag=="devname" or .tag=="sn" or .tag=="pn") | "\(.label): \(.value)"'
```

## Logowanie i poziomy dostępu

Logowanie wykonuje formularz strony (`Script/mainParent.js`): `POST /cgi-bin/mpc105.cgi` z polami formularza:

| Pole | Znaczenie |
|---|---|
| `query` | zawsze `120` (z `Config/settings.json`, typ `LoginOnStart`) |
| `login` | poziom: `1` = User, `2` = Admin, `3` = Super Admin (nie nazwa użytkownika) |
| `pwd` | hasło, kodowane URL |
| `change` | zaznaczone tylko przy zmianie hasła |

- Odpowiedź to JSON z polem `value`: `"fail"` = złe hasło, `"change"` = trzeba zmienić hasło, inna wartość = zalogowano. Prawdziwa odpowiedź na nieudane logowanie: `{ "reference":"login", "tag":"reply", "label":"reply", "value":"fail", "execute":"", "cancel":"" }`.
- Każde nieudane logowanie trafia do dziennika zdarzeń urządzenia (`advanced.information_events`: `CODE` 2, `DESCRIPTION` „Login unauthorized”, `USER` np. `superadmin`), więc nie zgaduj haseł wielokrotnie. Skrypty mają tryb samego testu logowania (`-LoginTest` / `REM_LOGIN_TEST=1`).
- Sesję niesie ciasteczko `CGISESSID`; poziom odczytuje strona z 5. znaku wartości (`A`..`D` = 0..3).
- Wylogowanie: strona wywołuje `GET /cgi-bin/mpc105j.cgi?query=122` i kasuje ciasteczko, ale na tym urządzeniu ten plik nie istnieje (HTTP 404, sprawdzone 19.10.2026). Faktycznym końcem sesji jest więc usunięcie ciasteczka; skrypty tak robią.
- Strona pokazuje pozycję menu, gdy `show_level` ≤ poziom użytkownika; zapis wymaga `write_level`.
- Odczyt bez ważnej sesji zwraca tę samą odpowiedź `value: fail` (strona pokazuje wtedy „Needed Authentication”). Bez logowania odpowiadają tylko niektóre zapytania: w próbie z 19.10.2026 `mpc105.cgi?query=13` i `mpc105.cgi?query=314`.

## Konwencje

- Zapytania odczytowe to `GET <cgi>?<query>`, odpowiedzi są w JSON (strona używa `$.getJSON`).
- W plikach menu parametry zapytań są rozdzielone znakiem `~` (np. `query=7~block_offset=10240~…`). Skrypty stron (`iframe.js`, `energy.js`, …) zamieniają go na `&` przed wysłaniem, tak samo zapisano to w tabeli pakietów.
- Pola `en_cgi`/`en_query` w menu sprawdzają, czy moduł jest włączony – to pakiety z zakładki Features.
- Pola `set`, `set1`, `set2` zapisują konfigurację – **nie są** używane.

## Format odpowiedzi urządzenia

Odpowiedzi CGI to JSON, ale z nagłówkiem `Content-type: text/html`. Format wynika ze skryptów strony (`Script/globalFunc.js`, `iframe.js`, `iframeDB.js`, `tableMultiColPag.js`) oraz z pierwszych prawdziwych odpowiedzi.

### Wymagane logowanie

```json
{ "reference":"login", "tag":"reply", "label":"reply", "value":"fail", "execute":"", "cancel":"" }
```

Taką odpowiedź (HTTP 200) dostaje zapytanie bez ważnej sesji, a także nieudane logowanie. Skrypty zbierające liczą ją jako „wymagane logowanie”, nie jako dane. Poprawne logowanie zwraca ten sam kształt z `"value":"ok"` i ustawia ciasteczko `CGISESSID`.

### Inne odpowiedzi „reply”

Gdy moduł jest niedostępny, urządzenie zwraca obiekt tego samego kształtu z innym `reference`: np. `{"reference":"enable_RTP_page","tag":"reply","value":"fail",...}` (moduł RTP100 wyłączony) albo `{"reference":"get_RTP100_var","tag":"reply","value":"error",...}`. Tylko `reference: login` oznacza „wymagane logowanie”.

### Lista pól (strony default.html, eth.html)

Tablica obiektów z polami `type`, `reference`, `tag`, `label`, `color`, `options`, `value`. Typy (z `globalFunc.js`): `text` (tylko do odczytu), `input`, `password`, `check`, `select` (po nim elementy `option`), `bar` (siła sygnału 1–5), `note`, `menu` oraz `enable` (flaga modułu: `value` = `true`/`false`). Pole `tag` jest nazwą pola formularza zapisu. Prawdziwy przykład: `monitoring.network_interfaces_mobile`.

### Zdarzenia (`advanced.information_events`)

Tablica: elementy `{"type":"head","column_no":N,"column_name":"..."}` opisują kolumny, a element `{"type":"data","events":[...]}` zawiera wiersze z polami `ID`, `DATATIME`, `CODE`, `USER`, `DESCRIPTION`, `TIMET`. Prawdziwy przykład poniżej.

### Tabele (`home.ch_*_measures`, archiwa)

Tablica z dwoma elementami: `{"type":"header","table_head":[{column_no, column_name, column_label}]}` opisuje kolumny, a `{"type":"data","table_rows":[{...}]}` zawiera wiersze (dla pomiarów: `ID`, `DATA`, `TIMET`, `EAP`, `ENP`, `ERP`, `ERNP`; wiersze co 15 s, od najnowszego). Prawdziwy przykład: `home.ch_a_measures` (skrócony w dokumentacji).

### Odczyty pamięci (`query=7&...`)

Prawdziwa odpowiedź (`home.summary_meter_status`, `home.ch_a_energy`, `home.digital_io`): tablica elementów `{"type":"text","reference":"energy","tag":"remshm_<block_offset>_<przesunięcie>","label":<tag>,"color","options","value"}`. Kolejne pola leżą co 32 bajty (`string_size=32`), wartości są tekstami; znaczenie pola wynika z jego położenia (strony mapują `tag` na opisy).

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
| `home.ch_a_measures` | `/cgi-bin/rem.cgi?query=106&channel=0` | 0 | Pole „set” w menu to formularz wyboru godziny/daty (skrypt `measure.js`) – filtr, nie zapis ustawień. |
| `home.ch_b_energy` | `/cgi-bin/rem.cgi?query=7&block_offset=12288&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` | 0 |  |
| `home.ch_b_measures` | `/cgi-bin/rem.cgi?query=106&channel=1` | 0 | Pole „set” w menu to formularz wyboru godziny/daty (skrypt `measure.js`) – filtr, nie zapis ustawień. |
| `home.digital_io` | `/cgi-bin/rem.cgi?query=7&block_offset=13312&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=12&string_size=32` | 0 |  |
| `home.archive_1_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=1` | 0 |  |
| `home.archive_1_sent_files` | `/cgi-bin/rem.cgi?query=108&id=1` | 0 |  |
| `home.archive_1_test_files` | `/cgi-bin/rem.cgi?query=112&id=1` | 0 | W odpowiedzi są użytkownik i hasło FTP; w dokumentacji zastąpione `&lt;redacted&gt;`. |
| `home.archive_2_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=2` | 0 |  |
| `home.archive_2_sent_files` | `/cgi-bin/rem.cgi?query=108&id=2` | 0 |  |
| `home.archive_2_test_files` | `/cgi-bin/rem.cgi?query=112&id=2` | 0 | W próbie z 19.10.2026: HTTP 502 „The CGI was not CGI/1.1 compliant” (GET i POST); to samo zapytanie dla archiwum 1 odpowiada normalnie. Przyczyna nieustalona. |
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
| `monitoring.network_interfaces_mobile` | `/cgi-bin/mpc105.cgi?query=13` | 0 | Odpowiada bez logowania (próba z 19.10.2026). |
| `monitoring.network_interfaces_ethernet_switch` | `/cgi-bin/mpc105.cgi?query=14` | 0 |  |
| `monitoring.network_interfaces_gps` | `/cgi-bin/mpc105.cgi?query=16` | 0 |  |
| `monitoring.rtp100_rtp100_variables` | `/cgi-bin/rtp.cgi?query=441` | 0 | Moduł RTP100 jest na tym urządzeniu wyłączony: odpowiedź `value: error` (`reference: get_RTP100_var`). Wymaga włączonego modułu: `features.rtp100`. |
| `monitoring.rtp100_rtp100_files` | `/cgi-bin/rtp.cgi?query=444` | 0 | Moduł RTP100 jest na tym urządzeniu wyłączony: odpowiedź `value: error`. Wymaga włączonego modułu: `features.rtp100`. |
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
| `setup.meter_ftp_hosts` | `/cgi-bin/rem.cgi?query=101` | 0 | W odpowiedzi są nazwy użytkowników i hasła hostów FTP; w dokumentacji i w śledzonej kopii wyników zastąpione `&lt;redacted&gt;`. |
| `setup.meter_udp_clients` | `/cgi-bin/rem.cgi?query=102` | 0 |  |
| `setup.meter_messages` | `/cgi-bin/rem.cgi?query=103` | 0 |  |
| `setup.meter_calibration` | `/cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` | 3 | Odczyt pamięci współdzielonej; w menu show_level 3 (Super Admin). |
| `setup.meter_thresholds_protection` | `/cgi-bin/rem.cgi?query=111` | 0 |  |
| `setup.rtp100_rtp100_command` | `/cgi-bin/rtp.cgi?query=442` | 0 | Moduł RTP100 jest na tym urządzeniu wyłączony: odpowiedź `value: error` (`reference: get_RTP100_cmd_var`). Wymaga włączonego modułu: `features.rtp100`. |
| `setup.ethernet_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=103` | 0 |  |
| `setup.ethernet_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=104` | 0 |  |
| `setup.ethernet_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=105` | 0 |  |
| `setup.ethernet_interfaces_switch_ethernet` | `/cgi-bin/mpc105.cgi?query=107` | 0 |  |
| `setup.mobile_interface_mobile_settings` | `/cgi-bin/mpc105.cgi?query=101` | 0 | W odpowiedzi są użytkownik i hasło APN; w dokumentacji zastąpione `&lt;redacted&gt;`. |
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
| `advanced.information_device_settings` | `/cgi-bin/mpc105.cgi?query=302` | 1 | Model (`devname`), numer seryjny (`sn`), numer artykułu (`pn`, „Product Number”), nazwa hosta, adresy MAC, typ maszyny i urządzeń. W menu: show_level 1, write_level 3. |
| `advanced.information_events` | `/cgi-bin/mpc105.cgi?query=314` | 0 | Odpowiada bez logowania (próba z 19.10.2026). Pole „set” w menu to formularz wyboru daty (`datetime`, rok/miesiąc/dzień) – filtr, nie zapis ustawień. |
| `advanced.information_version` | `/cgi-bin/mpc105.cgi?query=301` | 0 | Wersje oprogramowania: pola `cgi`, `kernel`, `ramdisk`, `storage`, `t5`, `p_rnt`, `u_rnt`, `dsp_rnt`, `f_cfg`, `cksum`. |

### Features (`features`)

Flagi włączenia modułów (`en_query` z menu).

| Nazwa | Zapytanie | min. poziom | Uwagi |
|---|---|---|---|
| `features.rtp100` | `/cgi-bin/rem.cgi?query=430` | 0 | Na tym urządzeniu moduł RTP100 jest wyłączony: `{"reference":"enable_RTP_page","tag":"reply","value":"fail"}`. To nie jest odpowiedź „wymagane logowanie” (`reference` ≠ `login`). Gdy moduł jest włączony, odpowiedź zawiera element `{"type":"enable","value":"true"}` (reguła ze skryptu strony). |

## Przykłady odpowiedzi

Przykłady pochodzą **wyłącznie** z odpowiedzi zebranych z prawdziwego urządzenia – nic nie jest zmyślone. Pakiety bez przykładu czekają na uzupełnienie po podłączeniu do urządzenia. Odpowiedź „wymagane logowanie” (`value: fail`) i błędy HTTP nie są przykładami.

Zebrano przykładów: 65 z 66.

Jak uzupełnić:

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

### `home.summary_meter_status`

`GET /cgi-bin/rem.cgi?query=7&block_offset=10240&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=17&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_0",
    "label": "remshm_10240_0",
    "color": "black",
    "options": "",
    "value": "2026-10-19 02:37:44"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_32",
    "label": "remshm_10240_32",
    "color": "black",
    "options": "",
    "value": "Run"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_64",
    "label": "remshm_10240_64",
    "color": "black",
    "options": "",
    "value": "Invalid"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_96",
    "label": "remshm_10240_96",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_128",
    "label": "remshm_10240_128",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_160",
    "label": "remshm_10240_160",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  "... (11 more items omitted)"
]
```

### `home.ch_a_energy`

`GET /cgi-bin/rem.cgi?query=7&block_offset=11264&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_0",
    "label": "remshm_11264_0",
    "color": "black",
    "options": "",
    "value": "-0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_32",
    "label": "remshm_11264_32",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_64",
    "label": "remshm_11264_64",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_96",
    "label": "remshm_11264_96",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_128",
    "label": "remshm_11264_128",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_160",
    "label": "remshm_11264_160",
    "color": "black",
    "options": "",
    "value": "1.00000"
  },
  "... (13 more items omitted)"
]
```

### `home.ch_a_measures`

`GET /cgi-bin/rem.cgi?query=106&channel=0` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "ID",
        "column_label": "Id"
      },
      {
        "column_no": 2,
        "column_name": "TIMET",
        "column_label": "Local Date"
      },
      {
        "column_no": 3,
        "column_name": "DATA",
        "column_label": "UTC Date"
      },
      {
        "column_no": 4,
        "column_name": "EAP",
        "column_label": "Consumed"
      },
      {
        "column_no": 5,
        "column_name": "ENP",
        "column_label": "Regenerate"
      },
      {
        "column_no": 6,
        "column_name": "ERP",
        "column_label": "React. C"
      },
      {
        "column_no": 7,
        "column_name": "ERNP",
        "column_label": "React. R"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "ID": "50309",
        "DATA": "2026/10/19 02:37:30",
        "TIMET": "2026-10-19 02:37:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50308",
        "DATA": "2026/10/19 02:37:15",
        "TIMET": "2026-10-19 02:37:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50307",
        "DATA": "2026/10/19 02:37:00",
        "TIMET": "2026-10-19 02:37:00",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50306",
        "DATA": "2026/10/19 02:36:45",
        "TIMET": "2026-10-19 02:36:45",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50305",
        "DATA": "2026/10/19 02:36:30",
        "TIMET": "2026-10-19 02:36:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50304",
        "DATA": "2026/10/19 02:36:15",
        "TIMET": "2026-10-19 02:36:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      "... (114 more items omitted)"
    ]
  }
]
```

### `home.ch_b_energy`

`GET /cgi-bin/rem.cgi?query=7&block_offset=12288&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_0",
    "label": "remshm_12288_0",
    "color": "black",
    "options": "",
    "value": "-0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_32",
    "label": "remshm_12288_32",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_64",
    "label": "remshm_12288_64",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_96",
    "label": "remshm_12288_96",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_128",
    "label": "remshm_12288_128",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_160",
    "label": "remshm_12288_160",
    "color": "black",
    "options": "",
    "value": "1.00000"
  },
  "... (13 more items omitted)"
]
```

### `home.ch_b_measures`

`GET /cgi-bin/rem.cgi?query=106&channel=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "ID",
        "column_label": "Id"
      },
      {
        "column_no": 2,
        "column_name": "TIMET",
        "column_label": "Local Date"
      },
      {
        "column_no": 3,
        "column_name": "DATA",
        "column_label": "UTC Date"
      },
      {
        "column_no": 4,
        "column_name": "EAP",
        "column_label": "Consumed"
      },
      {
        "column_no": 5,
        "column_name": "ENP",
        "column_label": "Regenerate"
      },
      {
        "column_no": 6,
        "column_name": "ERP",
        "column_label": "React. C"
      },
      {
        "column_no": 7,
        "column_name": "ERNP",
        "column_label": "React. R"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "ID": "50309",
        "DATA": "2026/10/19 02:37:30",
        "TIMET": "2026-10-19 02:37:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50308",
        "DATA": "2026/10/19 02:37:15",
        "TIMET": "2026-10-19 02:37:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50307",
        "DATA": "2026/10/19 02:37:00",
        "TIMET": "2026-10-19 02:37:00",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50306",
        "DATA": "2026/10/19 02:36:45",
        "TIMET": "2026-10-19 02:36:45",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50305",
        "DATA": "2026/10/19 02:36:30",
        "TIMET": "2026-10-19 02:36:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50304",
        "DATA": "2026/10/19 02:36:15",
        "TIMET": "2026-10-19 02:36:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      "... (114 more items omitted)"
    ]
  }
]
```

### `home.digital_io`

`GET /cgi-bin/rem.cgi?query=7&block_offset=13312&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=12&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_0",
    "label": "remshm_13312_0",
    "color": "black",
    "options": "",
    "value": "LOW"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_32",
    "label": "remshm_13312_32",
    "color": "black",
    "options": "",
    "value": "LOW"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_64",
    "label": "remshm_13312_64",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_96",
    "label": "remshm_13312_96",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_128",
    "label": "remshm_13312_128",
    "color": "black",
    "options": "",
    "value": "OPEN"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_160",
    "label": "remshm_13312_160",
    "color": "black",
    "options": "",
    "value": "OPEN"
  },
  "... (6 more items omitted)"
]
```

### `home.archive_1_waiting_files`

`GET /cgi-bin/rem.cgi?query=107&id=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=109&id=1&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "Id": 1,
        "Start": "2026-10-19T02:23:30+0000",
        "Stop": "2026-10-19T02:30:45+0000",
        "filename": "rem102_1_21292853_1792377075.tgz"
      },
      {
        "Id": 2,
        "Start": "2026-10-19T02:16:00+0000",
        "Stop": "2026-10-19T02:23:15+0000",
        "filename": "rem102_1_21292853_1792376625.tgz"
      },
      {
        "Id": 3,
        "Start": "2026-10-19T02:08:30+0000",
        "Stop": "2026-10-19T02:15:45+0000",
        "filename": "rem102_1_21292853_1792376175.tgz"
      },
      {
        "Id": 4,
        "Start": "2026-10-19T02:01:00+0000",
        "Stop": "2026-10-19T02:08:15+0000",
        "filename": "rem102_1_21292853_1792375725.tgz"
      },
      {
        "Id": 5,
        "Start": "2026-10-19T01:53:30+0000",
        "Stop": "2026-10-19T02:00:45+0000",
        "filename": "rem102_1_21292853_1792375275.tgz"
      },
      {
        "Id": 6,
        "Start": "2026-10-19T01:46:00+0000",
        "Stop": "2026-10-19T01:53:15+0000",
        "filename": "rem102_1_21292853_1792374825.tgz"
      },
      "... (44 more items omitted)"
    ],
    "count": 1554
  }
]
```

### `home.archive_1_sent_files`

`GET /cgi-bin/rem.cgi?query=108&id=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=110&id=1&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [],
    "count": 4
  }
]
```

### `home.archive_1_test_files`

`GET /cgi-bin/rem.cgi?query=112&id=1` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "id",
    "label": "Archive",
    "color": "black",
    "options": "",
    "value": "1"
  },
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "destination1",
    "label": "Destination",
    "color": "black",
    "options": "",
    "value": "ftp.energyportal.com"
  },
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "remote1",
    "label": "Remote",
    "color": "black",
    "options": "",
    "value": "/"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "user1",
    "label": "User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "password1",
    "label": "Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  }
]
```

### `home.archive_2_waiting_files`

`GET /cgi-bin/rem.cgi?query=107&id=2` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=109&id=2&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "Id": 1,
        "Start": "2026-10-19T02:23:30+0000",
        "Stop": "2026-10-19T02:30:45+0000",
        "filename": "rem102_2_21292853_1792377075.tgz"
      },
      {
        "Id": 2,
        "Start": "2026-10-19T02:16:00+0000",
        "Stop": "2026-10-19T02:23:15+0000",
        "filename": "rem102_2_21292853_1792376625.tgz"
      },
      {
        "Id": 3,
        "Start": "2026-10-19T02:08:30+0000",
        "Stop": "2026-10-19T02:15:45+0000",
        "filename": "rem102_2_21292853_1792376175.tgz"
      },
      {
        "Id": 4,
        "Start": "2026-10-19T02:01:00+0000",
        "Stop": "2026-10-19T02:08:15+0000",
        "filename": "rem102_2_21292853_1792375725.tgz"
      },
      {
        "Id": 5,
        "Start": "2026-10-19T01:53:30+0000",
        "Stop": "2026-10-19T02:00:45+0000",
        "filename": "rem102_2_21292853_1792375275.tgz"
      },
      {
        "Id": 6,
        "Start": "2026-10-19T01:46:00+0000",
        "Stop": "2026-10-19T01:53:15+0000",
        "filename": "rem102_2_21292853_1792374825.tgz"
      },
      "... (44 more items omitted)"
    ],
    "count": 1557
  }
]
```

### `home.archive_2_sent_files`

`GET /cgi-bin/rem.cgi?query=108&id=2` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=110&id=2&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [],
    "count": 4
  }
]
```

### `home.networking_interfaces`

`GET /cgi-bin/mpc105.cgi?query=500` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth0",
    "label": "ETH0",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth1",
    "label": "ETH1",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth2",
    "label": "ETH2",
    "color": "black",
    "options": "Down",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "wlan0",
    "label": "WLAN",
    "color": "black",
    "options": "Down",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "mobile",
    "label": "Mobile",
    "color": "black",
    "options": "Down",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "gps",
    "label": "GPS",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  "... (3 more items omitted)"
]
```

### `home.networking_services`

`GET /cgi-bin/mpc105.cgi?query=501` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "services",
    "tag": "web",
    "label": "Web Server",
    "color": "green",
    "options": "",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "ftp",
    "label": "FTP Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "telnet",
    "label": "Telnet Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "ssh",
    "label": "SSH Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "tftp",
    "label": "TFTP Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "tftp",
    "label": "T5RUN PLC",
    "color": "green",
    "options": "",
    "value": "Enabled"
  },
  "... (4 more items omitted)"
]
```

### `home.networking_redirection`

`GET /cgi-bin/mpc105.cgi?query=502` · HTTP 200

```json
[]
```

### `monitoring.network_interfaces_ethernet_0`

`GET /cgi-bin/mpc105.cgi?query=3` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": "192.168.128.1"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "mac",
    "label": "Mac Address",
    "color": "black",
    "options": "",
    "value": "00:03:D9:01:0B:7E"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "ipbrod",
    "label": "IP Brodcast",
    "color": "black",
    "options": "",
    "value": "192.168.128.255"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "mask",
    "label": "IP Subnet Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  "... (14 more items omitted)"
]
```

### `monitoring.network_interfaces_ethernet_1`

`GET /cgi-bin/mpc105.cgi?query=4` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth1",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp ON"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": "RUNNING"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "mac",
    "label": "Mac Address",
    "color": "black",
    "options": "",
    "value": "00:03:D9:01:0B:7F"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "ipbrod",
    "label": "IP Brodcast",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "mask",
    "label": "IP Subnet Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  "... (14 more items omitted)"
]
```

### `monitoring.network_interfaces_ethernet_2`

`GET /cgi-bin/mpc105.cgi?query=5` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth2",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "eth2",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_wlan`

`GET /cgi-bin/mpc105.cgi?query=6` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wlan0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "wlan0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_mobile`

`GET /cgi-bin/mpc105.cgi?query=13` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "ppp0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "PPP"
  },
  {
    "type": "text",
    "reference": "ppp0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_ethernet_switch`

`GET /cgi-bin/mpc105.cgi?query=14` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "br0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "br0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_gps`

`GET /cgi-bin/mpc105.cgi?query=16` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "rmc",
    "tag": "rmc",
    "label": "RMC  ",
    "color": "black",
    "options": "",
    "value": "$GNRMC,,V,,,,,,,,,,N*4D"
  },
  {
    "type": "text",
    "reference": "status",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": "Invalid"
  },
  {
    "type": "text",
    "reference": "time",
    "tag": "time",
    "label": "UTC Time",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "latitude",
    "tag": "latitude",
    "label": "Latitude (Decimal Degrees)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "longitude",
    "tag": "longitude",
    "label": "Longitude (Decimal Degrees)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "speed",
    "tag": "speed",
    "label": "Speed (Km/h)",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.rtp100_rtp100_variables`

`GET /cgi-bin/rtp.cgi?query=441` · HTTP 200

```json
{
  "reference": "get_RTP100_var",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `monitoring.rtp100_rtp100_files`

`GET /cgi-bin/rtp.cgi?query=444` · HTTP 200

```json
{
  "reference": "get_RTP100_files",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `monitoring.memory_nand`

`GET /cgi-bin/mpc105.cgi?query=23` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Size",
    "label": "Size",
    "color": "black",
    "options": "",
    "value": "1.8G"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "45.8M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "1.7G"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "2%"
  }
]
```

### `monitoring.memory_nor`

`GET /cgi-bin/mpc105.cgi?query=24` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Size",
    "label": "Size",
    "color": "black",
    "options": "",
    "value": "51.0M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "7.3M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "43.7M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "14%"
  }
]
```

### `monitoring.memory_ram`

`GET /cgi-bin/mpc105.cgi?query=25` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Total",
    "label": "Total",
    "color": "black",
    "options": "",
    "value": "254.9M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "96.8M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "158.2M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "38.0"
  }
]
```

### `monitoring.other_devices_rtc`

`GET /cgi-bin/mpc105.cgi?query=7` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "rtc",
    "tag": "RTC",
    "label": "UTC date and time",
    "color": "black",
    "options": "",
    "value": "2026-10-19 02:37:46"
  }
]
```

### `monitoring.other_devices_fpga`

`GET /cgi-bin/mpc105.cgi?query=8` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "fpga",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.3 [Jun 23 2016 13:30:09]"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Sw  ",
    "label": "FPGA Sw  ",
    "color": "black",
    "options": "",
    "value": "01.09"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Hw  ",
    "label": "FPGA Hw  ",
    "color": "black",
    "options": "",
    "value": "01"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Info",
    "label": "FPGA Info",
    "color": "black",
    "options": "",
    "value": "07/02/2020 - 15:20:16"
  }
]
```

### `monitoring.other_devices_fram`

`GET /cgi-bin/mpc105.cgi?query=9` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "fram",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.0 [May 28 2013 10:31:14]"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "F-RAM    ",
    "label": "F-RAM    ",
    "color": "black",
    "options": "",
    "value": "Ramtron FM25V10"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "Size     ",
    "label": "Size     ",
    "color": "black",
    "options": "",
    "value": "131072 bytes"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "Serial Num",
    "label": "Serial Num",
    "color": "black",
    "options": "",
    "value": "FFFFFFFFFFFFFF"
  }
]
```

### `monitoring.other_devices_adc`

`GET /cgi-bin/mpc105.cgi?query=10` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.0 [Oct 18 2013 10:55:41]"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_rtc_v_bat",
    "label": "RTC Voltage Battery",
    "color": "black",
    "options": "",
    "value": "3.16V"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_temp",
    "label": "Temperature",
    "color": "black",
    "options": "",
    "value": "41.21°C"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_33v",
    "label": "3.3V Voltage",
    "color": "black",
    "options": "",
    "value": "3.30V"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_5v",
    "label": "5V Voltage",
    "color": "black",
    "options": "",
    "value": "4.99V"
  }
]
```

### `monitoring.other_devices_hdlc`

`GET /cgi-bin/mpc105.cgi?query=11` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "hdlc",
    "tag": "Version  ",
    "label": "Not loaded",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.other_devices_mvbcs`

`GET /cgi-bin/mpc105.cgi?query=12` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.4 [Feb 11 2020 10:20:45]"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Chip ID  ",
    "label": "Chip ID  ",
    "color": "black",
    "options": "",
    "value": "0x2005"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Model    ",
    "label": "Model    ",
    "color": "black",
    "options": "",
    "value": "MVBCS1"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "5"
  }
]
```

### `monitoring.other_devices_modem`

`GET /cgi-bin/mpc105.cgi?query=17` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "modem",
    "tag": "mi",
    "label": "Manufactory",
    "color": "black",
    "options": "",
    "value": "Telit"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "mm",
    "label": "Model",
    "color": "black",
    "options": "",
    "value": "LE910C1-EU"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "mr",
    "label": "Version",
    "color": "black",
    "options": "",
    "value": "25.20.223"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "sd",
    "label": "SIM inserted",
    "color": "black",
    "options": "",
    "value": "No"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "si",
    "label": "IMSI",
    "color": "black",
    "options": "",
    "value": "+CMEERROR"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "op",
    "label": "Operator Name",
    "color": "black",
    "options": "",
    "value": " Vodafone CZ "
  },
  "... (4 more items omitted)"
]
```

### `monitoring.other_devices_wifi`

`GET /cgi-bin/mpc105.cgi?query=18` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wifi",
    "tag": "essid",
    "label": "ESSID",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "mode",
    "label": "Mode",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "freq",
    "label": "Frequency (GHz)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "rate",
    "label": "Bit Rate (Mb/s)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "linkq",
    "label": "Link Quality",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "bar",
    "reference": "wifi",
    "tag": "pw",
    "label": "Power Level",
    "color": "red",
    "options": "",
    "value": "0"
  }
]
```

### `setup.meter_settings`

`GET /cgi-bin/rem.cgi?query=105` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "settings",
    "tag": "evn",
    "label": "EMS Addressing (EMSn.EVNn.ns)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period:",
    "color": "black",
    "options": "",
    "value": "15"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "15 seconds",
    "value": "15"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "30 seconds",
    "value": "30"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "1 minute",
    "value": "60"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "5 minutes (legal)",
    "value": "300"
  },
  {
    "type": "check",
    "reference": "settings",
    "tag": "disable_dhs",
    "label": "Disable DHS",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.meter_channels_configuration`

`GET /cgi-bin/rem.cgi?query=100` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "tool",
    "tag": "enable0",
    "label": "Line A",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "select",
    "reference": "tool",
    "tag": "type0",
    "label": "- Type",
    "color": "black",
    "options": "",
    "value": "DC"
  },
  {
    "type": "option",
    "reference": "tool",
    "tag": "type0",
    "label": "Type",
    "color": "black",
    "options": "AC",
    "value": "AC"
  },
  {
    "type": "option",
    "reference": "tool",
    "tag": "type0",
    "label": "Type",
    "color": "black",
    "options": "DC",
    "value": "DC"
  },
  {
    "type": "input",
    "reference": "tool",
    "tag": "Vn0",
    "label": "- Nominal Voltage Sensor (Vn)",
    "color": "black",
    "options": "",
    "value": "3000"
  },
  {
    "type": "input",
    "reference": "tool",
    "tag": "In0",
    "label": "- Nominal Current Sensor (In)",
    "color": "black",
    "options": "",
    "value": "2000"
  },
  "... (18 more items omitted)"
]
```

### `setup.meter_ftp_hosts`

`GET /cgi-bin/rem.cgi?query=101` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ftp",
    "tag": "enable0",
    "label": "Server #1",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "destination0",
    "label": "- Destination",
    "color": "black",
    "options": "",
    "value": "ftp.energyportal.com"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "remote0",
    "label": "- Remote",
    "color": "black",
    "options": "",
    "value": "/"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "user0",
    "label": "- User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "password0",
    "label": "- Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "interval0",
    "label": "- Samples for file",
    "color": "black",
    "options": "",
    "value": "30"
  },
  "... (16 more items omitted)"
]
```

### `setup.meter_udp_clients`

`GET /cgi-bin/rem.cgi?query=102` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "udp",
    "tag": "enable0",
    "label": "Server #1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "udp",
    "tag": "broadcast0",
    "label": "- Broadcast",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "udp",
    "tag": "interface0",
    "label": "- Interface",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "eth0",
    "value": "eth0"
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "eth1",
    "value": "eth1"
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "ppp0",
    "value": "ppp0"
  },
  "... (12 more items omitted)"
]
```

### `setup.meter_messages`

`GET /cgi-bin/rem.cgi?query=103` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVI",
    "label": "Voltages and Currents (VI) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enER",
    "label": "Powers (ER) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enES",
    "label": "Energy Summary (ES) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enTL",
    "label": "Location and Time (TL) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVSHA",
    "label": "Custom on CH A",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVSHB",
    "label": "Custom on CH B",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.meter_calibration`

`GET /cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_8192_0",
    "label": "remshm_8192_0",
    "color": "black",
    "options": "",
    "value": "0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_8192_4",
    "label": "remshm_8192_4",
    "color": "black",
    "options": "",
    "value": "0"
  }
]
```

### `setup.meter_thresholds_protection`

`GET /cgi-bin/rem.cgi?query=111` · HTTP 200

```json
[
  {
    "type": "select",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "",
    "value": "-1"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "None",
    "value": "-1"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "A",
    "value": "0"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "B",
    "value": "1"
  },
  {
    "type": "input",
    "reference": "protection",
    "tag": "ovmh",
    "label": "Over Voltage Max High [%Vn]",
    "color": "black",
    "options": "",
    "value": "124"
  },
  {
    "type": "input",
    "reference": "protection",
    "tag": "ovml",
    "label": "Over Voltage Max Low [%Vn]",
    "color": "black",
    "options": "",
    "value": "116"
  },
  "... (9 more items omitted)"
]
```

### `setup.rtp100_rtp100_command`

`GET /cgi-bin/rtp.cgi?query=442` · HTTP 200

```json
{
  "reference": "get_RTP100_cmd_var",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `setup.ethernet_interfaces_ethernet_0`

`GET /cgi-bin/mpc105.cgi?query=103` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "eth0",
    "tag": "bonding",
    "label": "Redundancy on ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "eth0",
    "tag": "mirroring",
    "label": "Mirroring on ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "eth0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": "192.168.128.1"
  },
  {
    "type": "input",
    "reference": "eth0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  {
    "type": "select",
    "reference": "eth0",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "auto"
  },
  "... (5 more items omitted)"
]
```

### `setup.ethernet_interfaces_ethernet_1`

`GET /cgi-bin/mpc105.cgi?query=104` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "eth1",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth1",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth1",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "auto",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-FD",
    "value": "100BaseT-FD"
  },
  "... (3 more items omitted)"
]
```

### `setup.ethernet_interfaces_ethernet_2`

`GET /cgi-bin/mpc105.cgi?query=105` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "eth2",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth2",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  {
    "type": "select",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "10BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "auto",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-FD",
    "value": "100BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-HD",
    "value": "100BaseT-HD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "10BaseT-FD",
    "value": "10BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "10BaseT-HD",
    "value": "10BaseT-HD"
  }
]
```

### `setup.ethernet_interfaces_switch_ethernet`

`GET /cgi-bin/mpc105.cgi?query=107` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "br0",
    "tag": "switch1_2",
    "label": "Enable switch ETH0 and ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "br0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "br0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "br0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.mobile_interface_mobile_settings`

`GET /cgi-bin/mpc105.cgi?query=101` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ppp",
    "tag": "modem",
    "label": "Start on boot",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ppp",
    "tag": "prio",
    "label": "PPP priority",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ppp",
    "tag": "dns",
    "label": "DNS priority",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "timeout",
    "label": "Connection Timeout",
    "color": "black",
    "options": "",
    "value": "300"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "apn",
    "label": "APN",
    "color": "black",
    "options": "",
    "value": "internet"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "phone",
    "label": "Phone Number",
    "color": "black",
    "options": "",
    "value": "*99***4#"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "user",
    "label": "User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "password",
    "label": "Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  }
]
```

### `setup.wireless_interface_wlan`

`GET /cgi-bin/mpc105.cgi?query=106` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "wlan0",
    "tag": "wifi",
    "label": "Start on boot",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "wlan0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.wireless_interface_client_access`

`GET /cgi-bin/mpc105.cgi?query=204` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wifi",
    "tag": "Priority 4",
    "label": "Network",
    "color": "black",
    "options": "",
    "value": "Priority 4"
  },
  {
    "type": "input",
    "reference": "wifi",
    "tag": "ssid0",
    "label": "ESSID",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "NONE",
    "value": "NONE"
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "WEP",
    "value": "WEP"
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "WPA-PSK",
    "value": "WPA-PSK"
  },
  "... (34 more items omitted)"
]
```

### `setup.dhcp_client_settings`

`GET /cgi-bin/mpc105.cgi?query=200` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "hostname",
    "label": "DHCP Hostname (option 12)",
    "color": "black",
    "options": "",
    "value": "REM102"
  },
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "clientID",
    "label": "DHCP Client ID (option 61)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "timeout",
    "label": "DHCP Timeout (0 = DHCP Mode 2)",
    "color": "black",
    "options": "",
    "value": "0"
  }
]
```

### `setup.dhcp_server_settings`

`GET /cgi-bin/mpc105.cgi?query=208` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "dhcps",
    "tag": "server",
    "label": "Enable DHCP server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "",
    "value": "ETH0"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "ETH0",
    "value": "ETH0"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "ETH1",
    "value": "ETH1"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "SWITCH",
    "value": "SWITCH"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "WLAN",
    "value": "WLAN"
  },
  "... (3 more items omitted)"
]
```

### `setup.dhcp_address_reservation`

`GET /cgi-bin/mpc105.cgi?query=209` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "resip",
    "tag": "Host00",
    "label": "row00",
    "color": "black",
    "options": "col00",
    "value": "Host00"
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_ID00",
    "label": "row00",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_IP00",
    "label": "row00",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  {
    "type": "text",
    "reference": "resip",
    "tag": "Host01",
    "label": "row01",
    "color": "black",
    "options": "col00",
    "value": "Host01"
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_ID01",
    "label": "row01",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_IP01",
    "label": "row01",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  "... (24 more items omitted)"
]
```

### `setup.services_gateway_dns`

`GET /cgi-bin/mpc105.cgi?query=201` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "gateway",
    "tag": "defgw",
    "label": "Default Gateway IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gateway",
    "tag": "dns1",
    "label": "DNS1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gateway",
    "tag": "dns2",
    "label": "DNS2",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.services_servers`

`GET /cgi-bin/mpc105.cgi?query=202` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "server",
    "tag": "httpd",
    "label": "Enable WEB server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "webpwd",
    "label": "WEB user to system user",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "root",
    "label": "Disable root login",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "telnetd",
    "label": "Disable TELNET server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "sshd",
    "label": "Disable SSH server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "ftpd",
    "label": "Disable FTP server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  "... (9 more items omitted)"
]
```

### `setup.services_ntp_servers`

`GET /cgi-bin/mpc105.cgi?query=203` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ntp",
    "tag": "service",
    "label": "Run as server on port 123",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ntp",
    "tag": "oneshot",
    "label": "Quit after clock is set",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ntp",
    "tag": "ntpdhcp",
    "label": "NTP Server Address from DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ntp",
    "tag": "ntp1",
    "label": "NTP Server 1 Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ntp",
    "tag": "ntp2",
    "label": "NTP Server 2 Address",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.services_gps`

`GET /cgi-bin/mpc105.cgi?query=205` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "gps",
    "tag": "gps",
    "label": "Start on boot",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "gps",
    "tag": "update",
    "label": "Update clock",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gps",
    "tag": "dtime",
    "label": "Synchronization deviation [s] ",
    "color": "black",
    "options": "",
    "value": "2"
  },
  {
    "type": "select",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "",
    "value": "ttyS3"
  },
  {
    "type": "option",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "slave",
    "value": "slave"
  },
  {
    "type": "option",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "ttyS1",
    "value": "ttyS1"
  },
  "... (23 more items omitted)"
]
```

### `setup.services_port_forwarding`

`GET /cgi-bin/mpc105.cgi?query=207` · HTTP 200

```json
[
  {
    "FORWARDING": ""
  },
  {
    "rule0": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT00",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT00",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP00",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule1": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT01",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT01",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP01",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule2": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT02",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT02",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP02",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule3": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT03",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT03",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP03",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule4": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT04",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT04",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP04",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule5": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT05",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT05",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP05",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule6": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT06",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT06",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP06",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule7": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT07",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT07",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP07",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule8": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT08",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT08",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP08",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule9": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT09",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT09",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP09",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule10": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT10",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT10",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP10",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule11": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT11",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT11",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP11",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule12": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT12",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT12",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP12",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule13": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT13",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT13",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP13",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule14": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT14",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT14",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP14",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule15": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT15",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT15",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP15",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule16": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT16",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT16",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP16",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule17": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT17",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT17",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP17",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule18": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT18",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT18",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP18",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule19": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT19",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT19",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP19",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ]
  }
]
```

### `setup.services_proxy_settings`

`GET /cgi-bin/mpc105.cgi?query=220` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_HOST00",
    "label": "row00",
    "color": "black",
    "options": "col00",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_LPATH00",
    "label": "row00",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_RPATH00",
    "label": "row00",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_HOST01",
    "label": "row01",
    "color": "black",
    "options": "col00",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_LPATH01",
    "label": "row01",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_RPATH01",
    "label": "row01",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  "... (24 more items omitted)"
]
```

### `advanced.rtc_time_settings`

`GET /cgi-bin/mpc105.cgi?query=303` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "update",
    "tag": "update",
    "label": "Update",
    "color": "black",
    "options": "",
    "value": "disable"
  },
  {
    "type": "input",
    "reference": "year",
    "tag": "year",
    "label": "Year",
    "color": "black",
    "options": "",
    "value": "2026"
  },
  {
    "type": "input",
    "reference": "month",
    "tag": "month",
    "label": "Month",
    "color": "black",
    "options": "",
    "value": "10"
  },
  {
    "type": "input",
    "reference": "day",
    "tag": "day",
    "label": "Day",
    "color": "black",
    "options": "",
    "value": "19"
  },
  {
    "type": "input",
    "reference": "hour",
    "tag": "hour",
    "label": "Hour",
    "color": "black",
    "options": "",
    "value": "02"
  },
  {
    "type": "input",
    "reference": "minute",
    "tag": "minute",
    "label": "Minute",
    "color": "black",
    "options": "",
    "value": "37"
  },
  {
    "type": "input",
    "reference": "second",
    "tag": "second",
    "label": "Second",
    "color": "black",
    "options": "",
    "value": "50"
  }
]
```

### `advanced.rtc_time_zones`

`GET /cgi-bin/mpc105.cgi?query=305` · HTTP 200

```json
[
  {
    "type": "select",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Time Zone",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Universal Time Coordinated",
    "color": "black",
    "options": "Universal Time Coordinated",
    "value": "UTC"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Central European Time",
    "color": "black",
    "options": "Central European Time",
    "value": "CET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Eastern European Time",
    "color": "black",
    "options": "Eastern European Time",
    "value": "EET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Western European Time",
    "color": "black",
    "options": "Western European Time",
    "value": "WET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "India",
    "color": "black",
    "options": "India Time",
    "value": "Calcutta"
  },
  "... (36 more items omitted)"
]
```

### `advanced.configuration_settings`

`GET /cgi-bin/rem.cgi?query=113` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "ftp",
    "tag": "ftphost0",
    "label": "FTP Server #1",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "uploaddcs0",
    "label": " - Upload to server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "downloaddcs0",
    "label": " - Download from server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "ftp",
    "tag": "ftphost1",
    "label": "FTP Server #2",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "uploaddcs1",
    "label": " - Upload to server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "downloaddcs1",
    "label": " - Download from server",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `advanced.information_device_settings`

`GET /cgi-bin/mpc105.cgi?query=302` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "info",
    "tag": "sn",
    "label": "Serial Number",
    "color": "black",
    "options": "",
    "value": "21292853"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "pn",
    "label": "Product Number",
    "color": "blalk",
    "options": "",
    "value": "5.6602.013/01_A"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "devname",
    "label": "Device Name",
    "color": "blalk",
    "options": "",
    "value": "REM102-G-G-S-T-W-8-GS-O-000"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "hostname",
    "label": "Local Hostname",
    "color": "blalk",
    "options": "",
    "value": "REM102"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "ethaddr",
    "label": "MAC ethernet 0",
    "color": "blalk",
    "options": "",
    "value": "00:03:D9:01:0B:7E"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "eth1addr",
    "label": "MAC ethernet 1",
    "color": "blalk",
    "options": "",
    "value": "00:03:D9:01:0B:7F"
  },
  "... (18 more items omitted)"
]
```

### `advanced.information_events`

`GET /cgi-bin/mpc105.cgi?query=314` · HTTP 200

```json
[
  {
    "type": "head",
    "column_no": 1,
    "column_name": "ID"
  },
  {
    "type": "head",
    "column_no": 2,
    "column_name": "DATATIME"
  },
  {
    "type": "head",
    "column_no": 3,
    "column_name": "CODE"
  },
  {
    "type": "head",
    "column_no": 4,
    "column_name": "USER"
  },
  {
    "type": "head",
    "column_no": 5,
    "column_name": "DESCRIPTION"
  },
  {
    "type": "data",
    "events": [
      {
        "ID": "3739",
        "DATATIME": "2026-10-19 02:37:44",
        "CODE": "1",
        "USER": "superadmin",
        "DESCRIPTION": "Login authorized",
        "TIMET": "1792377464"
      },
      {
        "ID": "3738",
        "DATATIME": "2026-10-19 02:37:14",
        "CODE": "1",
        "USER": "superadmin",
        "DESCRIPTION": "Login authorized",
        "TIMET": "1792377434"
      },
      {
        "ID": "3737",
        "DATATIME": "2026-10-19 02:27:53",
        "CODE": "2",
        "USER": "superadmin",
        "DESCRIPTION": "Login unauthorized",
        "TIMET": "1792376873"
      }
    ]
  }
]
```

### `advanced.information_version`

`GET /cgi-bin/mpc105.cgi?query=301` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "cgi",
    "tag": "cgi",
    "label": "MCG105",
    "color": "black",
    "options": "",
    "value": "1.5. 27423"
  },
  {
    "type": "text",
    "reference": "kernel",
    "tag": "kernel",
    "label": "Kernel",
    "color": "black",
    "options": "",
    "value": "Linux 2.6.29.1-rem102-1.0.0 #349 PREEMPT Thu Jan 23 17:11:05 CET 2020"
  },
  {
    "type": "text",
    "reference": "ramdisk",
    "tag": "ramdisk",
    "label": "System Disk",
    "color": "black",
    "options": "",
    "value": "01.21.00 build 4"
  },
  {
    "type": "text",
    "reference": "storage",
    "tag": "storage",
    "label": "Application Disk",
    "color": "black",
    "options": "",
    "value": "01.21.00 build 4"
  },
  {
    "type": "text",
    "reference": "t5",
    "tag": "t5",
    "label": "T5RUN PLC",
    "color": "black",
    "options": "",
    "value": "PRISMA runtime - Linux Multithreaded - V8.6 000217-RNT041."
  },
  {
    "type": "text",
    "reference": "p_rnt",
    "tag": "p_rnt",
    "label": "Production RNT",
    "color": "black",
    "options": "",
    "value": "000178-RNT172-31 October 26, 2017 - 12:00:00 UTC"
  },
  "... (5 more items omitted)"
]
```

### `features.rtp100`

`GET /cgi-bin/rem.cgi?query=430` · HTTP 200

```json
{
  "reference": "enable_RTP_page",
  "tag": "reply",
  "label": "reply",
  "value": "fail",
  "execute": "",
  "cancel": ""
}
```

<details><summary>Do uzupełnienia (1)</summary>

- `home.archive_2_test_files` (ostatnia próba: HTTP 502)

</details>

## Pominięte zapytania

> Poniższych zapytań skrypty **nie** wysyłają – zmieniają stan urządzenia, kończą sesję albo służą do przesyłania plików.

| Zapytanie | Powód |
|---|---|
| `rem.cgi?query=440` | Restore Factory Default – przywraca ustawienia fabryczne |
| `mpc105.cgi?query=1982` | restart urządzenia |
| `mpc105j.cgi?query=122` | wylogowanie – brak na tym urządzeniu (404) |
| `mpc105.cgi?query=121` | zmiana hasła |
| `rem.cgi?query=402` | Export (akcja pobrania konfiguracji) |
| `rem.cgi?query=401`, `mpc105.cgi?query=310` | Import konfiguracji i Firmware Upgrade (upload plików) |
| `rtp.cgi?query=440`, `443`, `445` | zapis i komendy RTP100 |
| wszystkie pola `set`, `set1`, `set2` | zapis konfiguracji |

## Skrypty

Zbieranie wszystkich pakietów po kolei: `rem102/scripts/collect.sh` (bash, curl, jq) albo `rem102/scripts/collect.ps1` (Windows PowerShell 5.1+, bez dodatkowych narzędzi). Oba zapisują `collected.json`, `samples/<zakładka>/<id>.json` i `collect.log` w `rem102/results/`. `rem102-info.sh` to skrót do `collect.sh` z wynikiem na stdout.

### Login, odczyt i wylogowanie – gotowe skrypty z parametrami

Użytkownik i hasło podaje się w linii poleceń (`User`, `Admin`, `Super Admin` albo poziom `1`, `2`, `3`). Skrypty wykonują: logowanie, odczyt danych urządzenia (`query=302`) i wersji (`query=301`) i kończą sesję (usunięcie ciasteczka; logout CGI zwraca na tym urządzeniu 404).

```bash
./rem102/scripts/rem102-curl.sh "Super Admin" 'hasło' [host]
```

```powershell
cd C:\rem102\scripts
.\rem102-curl.cmd "Super Admin" 'hasło' [host]
```

Plik `.cmd` jest w `rem102\scripts`, więc uruchom go z tego katalogu albo pełną ścieżką: `C:\rem102\scripts\rem102-curl.cmd "Super Admin" 'hasło'`. Gdy hasło zawiera znaki `%`, `^`, `&` lub `"`, pomiń argument hasła: skrypt zapyta o nie sam i nic się nie zepsuje.

Hasło trafia do `curl` przez stdin lub plik tymczasowy, więc nie widać go na liście procesów. Same wywołania `curl` (poziom 3):

```bash
LEVEL=3; PASS='hasło'; HOST=192.168.128.1; JAR=$(mktemp)
printf '%s' "$PASS" | curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" --data "query=120" --data "login=$LEVEL" --data-urlencode "pwd@-"
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302"
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=301"
rm -f "$JAR"
```

Wylogowania nie ma: strona wywołuje `mpc105j.cgi?query=122`, ale na tym urządzeniu zwraca ono 404 – sesję kończy usunięcie ciasteczka (`rm -f "$JAR"`).

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

- Bez `-Password` skrypt zapyta o hasło (to najprostszy sposób, bez problemów z cudzysłowami). Nazwę ze spacją podaj w cudzysłowie; zamiast nazwy można podać `-Level 3`.
- `-LoginTest` wykonuje jedną próbę logowania i kończy – dobry sposób na sprawdzenie hasła bez wielu nieudanych prób.
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

### Najprościej: jedno wywołanie `System Exec`

Jedna linia poleceń wykonuje logowanie i odczyt danych: `curl` obsługuje kilka zapytań w jednym uruchomieniu i trzyma sesję w pliku ciasteczek, więc nie trzeba wyciągać identyfikatora sesji. Parametry *Format Into String* po kolei: plik ciasteczek (dowolna ścieżka do zapisu, np. w folderze tymczasowym), host, poziom (1/2/3), hasło, plik ciasteczek, host.

```text
"C:/Windows/System32/curl.exe" -sS --max-time 20 -w "#END#" -c "%s" -X POST "http://%s/cgi-bin/mpc105.cgi" --data "query=120" --data "login=%d" --data-urlencode "pwd=%s" --next -sS -w "#END#" -b "%s" "http://%s/cgi-bin/mpc105.cgi?query=302"
```

*Standard output* podziel na znaczniku `#END#` (*Search and Split String*) na dwie części: (1) odpowiedź logowania (`"value":"ok"` albo `fail`), (2) dane urządzenia (tablica JSON, patrz niżej). Przy złym haśle część (2) zawiera odpowiedź „wymagane logowanie”. Wylogowania nie ma (logout CGI zwraca 404): po odczycie wystarczy usunąć plik ciasteczek. Hasło ze znakami `%`, `^`, `&` lub `"` może zepsuć linię – wtedy użyj wersji z plikiem hasła poniżej. Sprawdzono z `curl` na atrapie urządzenia.

Bez `System Exec`: *HTTP Client Open Handle* (z plikiem ciasteczek) → *HTTP Client POST* (treść `query=120&login=3&pwd=<hasło zakodowane URL>`, nagłówek `Content-Type: application/x-www-form-urlencoded`) → *HTTP Client GET* → *HTTP Client Close Handle*. Niesprawdzone z tym urządzeniem.

### Osobne wywołania `System Exec` (curl, z wersją z plikiem hasła)

`System Exec.vi` uruchamia `curl.exe` (Windows 10 i nowszy). Każde wywołanie to osobny proces, więc sesję przenosi identyfikator z ciasteczka `CGISESSID`, który odczytujesz z odpowiedzi logowania. Wejścia `System Exec`: *command line*, *working directory* (np. folder aplikacji), *wait until completion* = TRUE; wyjścia: *standard output*, *standard error*, *return code* (0 = curl wykonał zapytanie; 7 = brak połączenia, 28 = przekroczony czas). Linie poleceń składaj przez *Format Into String* (`%s` = tekst, `%d` = liczba).

1. **Logowanie** (`%s` = host, `%d` = poziom 1/2/3, `%s` = ścieżka pliku z hasłem):

```text
"C:/Windows/System32/curl.exe" -sS -i --max-time 10 -X POST "http://%s/cgi-bin/mpc105.cgi" --data "query=120" --data "login=%d" --data-urlencode "pwd@%s"
```

   Z *standard output* (nagłówki + ciało) wyciągnij *Match Regular Expression*: identyfikator sesji `CGISESSID=([^;\s]+)` (pod-dopasowanie 1) i wynik `"value"\s*:\s*"([^"]*)"` (`ok` albo `fail`). Brak identyfikatora lub `fail` = błąd logowania (zły poziom lub hasło); każde nieudane logowanie jest zapisywane w dzienniku zdarzeń urządzenia.

2. **Odczyt danych urządzenia** (`%s` = identyfikator sesji, `%s` = host):

```text
"C:/Windows/System32/curl.exe" -sS --max-time 10 -H "Cookie: CGISESSID=%s" "http://%s/cgi-bin/mpc105.cgi?query=302"
```

   *Standard output* to tablica JSON; *Unflatten From JSON* do tablicy klastra z polami tekstowymi `type`, `reference`, `tag`, `label`, `color`, `options`, `value`. Wartość pola znajdziesz po `tag`: `devname` (model), `sn` (numer seryjny), `pn` (numer artykułu). Wersje oprogramowania: to samo wywołanie z `query=301`; dowolny inny pakiet z `rem102-package-requests.txt` – podstaw jego ścieżkę zamiast `/cgi-bin/mpc105.cgi?query=302`.

3. **Koniec sesji:** logout CGI (`mpc105j.cgi`) zwraca na tym urządzeniu 404, więc nie ma osobnego wywołania; usuń plik ciasteczek lub zapomnij identyfikator sesji.

Uwagi:

- **Ukośniki i apostrofy:** w stałych tekstowych LabVIEW (*Format Into String*) pisz ścieżki z ukośnikami `/` (`C:/rem102/cookies.txt`): backslash jest tam kodem specjalnym i znika (`C:\Windows` staje się `C:Windows`, błąd 2 w `System Exec`). Hasło wpisz bez apostrofów i cudzysłowów, dokładnie tak, jak w przeglądarce, i pamiętaj o `http://` (dwa ukośniki).
- **Hasło:** zapisz je *Write to Text File* do pliku tymczasowego (bez znaku końca linii), przekaż ścieżkę w `pwd@<plik>` (curl sam koduje wartość) i po logowaniu usuń plik. Dzięki temu znaki specjalne (`%`, `^`, `&`, `"`) nie psują linii poleceń i hasło nie zostaje w wierszu poleceń procesu. Prostsza, ale mniej odporna wersja: `--data-urlencode "pwd=%s"`.
- **32-bitowy LabVIEW** na 64-bitowym Windows nie widzi `C:/Windows/System32/curl.exe` (przekierowanie do `SysWOW64`). Użyj `C:/Windows/Sysnative/curl.exe` albo dołącz `curl.exe` do aplikacji i podaj jego pełną ścieżkę.
- Nie używaj przekierowań (`>`) ani potoków (`|`) w linii poleceń; do zapisu do pliku służą opcje curl `-o` i `-D`.
- Wylogowania nie ma: strona wywołuje `mpc105j.cgi?query=122`, ale na tym urządzeniu zwraca ono 404 – sesję kończy usunięcie ciasteczka (`rm -f "$JAR"`).

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

Ustalone z plików WWW urządzenia i z prawdziwych odpowiedzi (nie są już założeniami): logowanie `query=120` z polami `login` (poziom) i `pwd` (potwierdzone zalogowaniem jako Super Admin), ciasteczko `CGISESSID`, odczyty przez GET z odpowiedziami JSON, nazwy CGI `.cgi`, lista zapytań z `Config/*.json`, separator `~` zamieniany na `&`, format odpowiedzi „wymagane logowanie”, pola „set” przy zdarzeniach i pomiarach to filtry daty (nie zapis).

1. **Konta Admin i User.** Zbieranie wykonano jako Super Admin (poziom 3). Czy `show_level` i `write_level` działają jak opisano i które pakiety są dostępne niższym poziomom – do sprawdzenia.
2. **`home.archive_2_test_files`** zwraca 502 (GET i POST), a to samo zapytanie dla archiwum 1 działa; przyczyna nieustalona.
3. **Moduł RTP100** jest na tym urządzeniu wyłączony; jego odpowiedzi (`value: error` / `fail`) opisują brak modułu, a nie format danych. Na urządzeniu z włączonym RTP100 trzeba je zebrać ponownie.
4. **Odpowiedź 502 „The CGI was not CGI/1.1 compliant”** pojawiła się dla nieistniejących numerów zapytań w starej liście; przy poprawnych zapytaniach nie występuje.
