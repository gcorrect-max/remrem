# REM102 – odczyt informacji o urządzeniu przez CGI (curl)

Skrypt `scripts/rem102-info.sh` loguje się do urządzenia REM102 i zbiera **wszystkie pakiety informacji tylko do odczytu** z zakładek **Home, Setup, Advanced, Monitoring** oraz z `settings.json` (nazwa projektu/host). Każdy pakiet jest zwracany jako obiekt JSON.

Źródłem listy zapytań są pliki konfiguracyjne interfejsu WWW urządzenia: `home.json`, `setup.json`, `advanced.json`, `monitoring.json`, `settings.json`.

> **Status:** skrypt sprawdzono na atrapie serwera HTTP (składanie JSON, pliki wyjściowe, obsługa błędów), **nie na prawdziwym urządzeniu**. Format ciał odpowiedzi urządzenia nie był znany – patrz sekcja [Założenia](#założenia-do-potwierdzenia).

## Wymagania

- `bash`, `curl`, `jq`
- dostęp sieciowy do urządzenia (domyślnie `192.168.128.1`, jak w `data/modulesCfg.ts`)
- konto z odpowiednim poziomem uprawnień (strony z `show_level` 1–2 mogą wymagać wyższego poziomu)

## Uruchomienie

```bash
# jeden plik JSON na stdout
REM_HOST=192.168.128.1 REM_USER=Admin REM_PASS='...' ./scripts/rem102-info.sh > rem102.json

# dodatkowo osobny plik na każdy pakiet: ./dump/<zakładka>/<id>.json oraz ./dump/all.json
REM_OUT_DIR=./dump REM_HOST=... REM_USER=... REM_PASS=... ./scripts/rem102-info.sh > /dev/null
```

| Zmienna | Znaczenie | Domyślnie |
|---|---|---|
| `REM_HOST` | adres IP/host urządzenia (może zawierać port) | `192.168.128.1` |
| `REM_USER` | login | – (wymagana) |
| `REM_PASS` | hasło | – (wymagana) |
| `REM_LOGIN_BODY` | pełne ciało żądania logowania (nadpisuje domyślne) | `query=120&username=$REM_USER&pwd=$REM_PASS` |
| `REM_OUT_DIR` | katalog na osobne pliki JSON pakietów | puste (wyłączone) |

Ostrzeżenia (np. nieudane logowanie) idą na stderr, więc stdout zawsze zawiera czysty JSON.

## Format wyniku

Jeden obiekt: `device` (metadane zbierania) + po jednym kluczu na zakładkę, a w nim pakiety po `id`.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, SN, nr artykułu)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": { "...": "odpowiedź urządzenia" }
    }
  },
  "home": { "...": "..." },
  "setup": { "...": "..." },
  "advanced": { "...": "..." },
  "monitoring": { "...": "..." },
  "features": { "...": "..." }
}
```

Pola pakietu:

| Pole | Opis |
|---|---|
| `label` | ścieżka w menu WWW, z którego pochodzi zapytanie |
| `cgi`, `query` | dokładnie to, co poszło do urządzenia |
| `http_status` | kod HTTP; `0` = błąd połączenia/timeout |
| `body` | odpowiedź: **JSON, jeśli się parsuje**; w przeciwnym razie surowy tekst; `null` gdy pusta |

Błąd jednego pakietu (np. moduł wyłączony → 4xx/5xx lub pusta odpowiedź) **nie przerywa** zbierania pozostałych.

## Pakiety

Wszystkie zapytania to `GET http://$HOST<cgi>?<query>` z ciasteczkami sesji.

### `identity` – model, numer seryjny, numer artykułu, wersje

| id | cgi | query | Źródło w menu |
|---|---|---|---|
| `device_settings` | `mpc105.fcgi` | `query=302` | Advanced › Information › Device Settings (**model, SN, nr artykułu**) |
| `version` | `mpc105.fcgi` | `query=301` | Advanced › Information › Version |
| `host` | `mpc105.fcgi` | `query=126` | settings.json › host |
| `auth_message` | `mpc105.fcgi` | `query=125` | settings.json › auth_message |
| `meter_settings` | `rem.fcgi` | `query=105` | Setup › Meter › Settings |
| `dmeter_serial` | `items.fcgi` | `query=407` | Setup › DMeter › Serial Number |

Nazwa projektu w `settings.json` to `REM102-S2` (prawdopodobny model).

### `home`

| id | cgi | query |
|---|---|---|
| `meter_status` | `rem.fcgi` | `query=10` |
| `emf_status` | `rem.fcgi` | `query=406` |
| `emf_measures` | `rem.fcgi` | `query=407` |
| `emf_cebd` | `rem.fcgi` | `query=409` |
| `dhs_memory` | `rem.fcgi` | `query=459` |
| `digital_io` | `rem.fcgi` | `query=11` |
| `net_interfaces` | `mpc105.fcgi` | `query=500` |
| `net_services` | `mpc105.fcgi` | `query=501` |

### `setup`

| id | cgi | query |
|---|---|---|
| `channels_configuration` | `rem.fcgi` | `query=100` |
| `dcs_user_1` … `dcs_user_4` | `rem.fcgi` | `query=450&user=N` |
| `dcs_communication` | `rem.fcgi` | `query=452` |
| `dcs_binding` | `rem.fcgi` | `query=457` |
| `dcs_conn_test` | `rem.fcgi` | `query=455` |
| `ethernet_0` / `ethernet_1` | `mpc105.fcgi` | `query=103` / `query=104` |
| `mobile_settings` | `mpc105.fcgi` | `query=101` |
| `dhcp_client` | `mpc105.fcgi` | `query=200` |
| `gateway_dns` | `mpc105.fcgi` | `query=201` |
| `servers` | `mpc105.fcgi` | `query=202` |
| `ntp_servers` | `mpc105.fcgi` | `query=203` |
| `ems_time_servers` | `mpc105.fcgi` | `query=230` |
| `gps` | `mpc105.fcgi` | `query=205` |

### `advanced`

| id | cgi | query |
|---|---|---|
| `rtc_time` | `mpc105.fcgi` | `query=303` |
| `events` | `mpc105.fcgi` | `query=314` |

(`Device Settings` i `Version` są w pakiecie `identity`.)

### `monitoring`

| id | cgi | query |
|---|---|---|
| `eth_0`, `eth_1`, `mobile`, `gps` | `mpc105.fcgi` | `query=3`, `4`, `13`, `16` |
| `dcs_stats_user_1` … `_4` | `rem.fcgi` | `query=461&user=N` |
| `dmeter_status` | `items.fcgi` | `query=409` |
| `rtp100_vars`, `rtp100_files` | `rtp.fcgi` | `query=441`, `444` |
| `mem_nand`, `mem_nor`, `mem_ram` | `mpc105.fcgi` | `query=23`, `24`, `25` |
| `dev_rtc`, `dev_fpga`, `dev_fram`, `dev_adc`, `dev_dsp`, `dev_mvbcs`, `dev_modem` | `mpc105.fcgi` | `query=7`, `8`, `9`, `10`, `11`, `12`, `17` |

### `features` – które moduły są włączone (`en_query` z menu)

`dcs` (463), `dcs_user_1..4` (`462&user=N`), `dmeter_rem` (420), `dmeter_items` (`items.fcgi` 400), `rtp100` (430), `mobile` (`mpc105` 14), `gps` (`mpc105` 15), `dsp_digitalio` (`mpc105` 18).
Pozwalają zrozumieć, czemu np. pakiety DCS czy GPS są puste.

## Celowo pominięte

| Zapytanie | Dlaczego |
|---|---|
| `rem.fcgi query=440` (Restore Factory Default) | przywraca ustawienia fabryczne |
| `mpc105.fcgi query=1982` (reboot) | restartuje urządzenie |
| `rem.fcgi query=402` (Export SIC Configuration) | akcja eksportu, nie odczyt informacji |
| `mpc105.fcgi query=122` (Accounts Management) | dane kont użytkowników |
| wszystkie pola `set` / `set1` | zapisują konfigurację |
| `items.fcgi query=410`, `rtp.fcgi query=442/443/445` | zapis/komendy RTP100 i DMeter |

## Przykłady

### Pojedyncze zapytania curl (ręcznie)

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# logowanie (cookies CGIUSERNAME / CGIUSERLEVEL trafiają do $JAR)
curl -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" \
     --data-raw "query=120&username=Admin&pwd=HASLO"

# model, numer seryjny, numer artykułu
curl -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=302"

# wersje oprogramowania
curl -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=301"

# DCS User 2 (w JSON-ach menu zapis "query=450~user=2"; "~" = "&")
curl -b "$JAR" -G "http://$HOST/cgi-bin/rem.fcgi" --data-raw "query=450&user=2"
```

### Wyciąganie danych z wyniku (`jq`)

```bash
# identyfikacja urządzenia
jq '.identity | {device_settings: .device_settings.body, version: .version.body}' rem102.json

# które pakiety się nie udały (kod HTTP != 200)
jq -r 'del(.device) | to_entries[] | .key as $t | .value | to_entries[]
       | select(.value.http_status != 200) | "\($t)/\(.key): HTTP \(.value.http_status)"' rem102.json

# wszystkie pakiety jako płaska lista id -> body
jq 'del(.device) | [to_entries[] | .key as $t | .value | to_entries[]
       | {id: "\($t)/\(.key)", body: .value.body}]' rem102.json

# jedna zakładka
jq '.monitoring' rem102.json
```

### Przykładowy wynik (poglądowy)

> Ciało odpowiedzi (`body`) poniżej jest **zmyślone**, tylko pokazuje strukturę koperty. Prawdziwe nazwy pól zwraca urządzenie.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, SN, nr artykułu)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": { "model": "<model>", "serial": "<numer seryjny>", "article": "<numer artykułu>" }
    },
    "version": {
      "label": "Advanced > Information > Version (firmware/FPGA/DSP)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=301",
      "http_status": 200,
      "body": "odpowiedź tekstowa, gdy nie jest to JSON"
    }
  },
  "advanced": {
    "events": {
      "label": "Advanced > Information > Events",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=314",
      "http_status": 500,
      "body": null
    }
  }
}
```

## Założenia (do potwierdzenia)

1. **Logowanie.** Pliki JSON podają tylko `query=120`. Nazwy pól `username` i `pwd` pochodzą z konfiguracji LabVIEW (`data/modulesCfg.ts`), ciasteczka `CGIUSERNAME`/`CGIUSERLEVEL` również. Jeśli logowanie się nie uda, skrypt wypisze ostrzeżenie – wtedy przechwyć prawdziwe żądanie w DevTools i podaj je w `REM_LOGIN_BODY`.
2. **GET vs POST.** Zapytania odczytowe wysyłane są GET-em. Jeśli urządzenie zwraca puste odpowiedzi, spróbuj POST (`-X POST --data-raw ...`) – zmień wywołanie w funkcji `q`.
3. **Format odpowiedzi.** Nie wiadomo, czy urządzenie odpowiada JSON-em. Skrypt przyjmuje oba warianty (JSON → sparsowany, inne → surowy tekst w `body`).
4. **Separator `~`.** W polu `query` w plikach menu oznacza `&`.
