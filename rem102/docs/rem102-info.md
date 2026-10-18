# REM102 – odczyt informacji o urządzeniu przez CGI (curl)

> Wersja angielska: [`rem102-info_en.md`](rem102-info_en.md) · Wersja HTML: [`rem102-api.html`](rem102-api.html)

Skrypt `rem102/scripts/rem102-info.sh` loguje się do urządzenia REM102 i zbiera **wszystkie pakiety informacji tylko do odczytu** z zakładek **Home, Setup, Advanced, Monitoring** oraz z `settings.json` (nazwa projektu/host). Każdy pakiet jest zwracany jako obiekt JSON.

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

# zapis do plików (domyślnie rem102/results/): collected.json, samples/<zakładka>/<id>.json, collect.log
REM_HOST=... REM_USER=... REM_PASS=... ./rem102/scripts/collect.sh
```

| Zmienna | Znaczenie | Domyślnie |
|---|---|---|
| `REM_HOST` | adres IP/host urządzenia (może zawierać port) | `192.168.128.1` |
| `REM_USER` | login | – (wymagana) |
| `REM_PASS` | hasło | – (wymagana) |
| `REM_LOGIN_BODY` | pełne ciało żądania logowania (nadpisuje domyślne) | `query=120&username=$REM_USER&pwd=$REM_PASS` |
| `REM_OUT_DIR` | katalog wynikowy (`collected.json`, `samples/`, `collect.log`) | `rem102/results/` (w `rem102-info.sh`: wyłączony) |
| `REM_TIMEOUT` | limit czasu jednego zapytania, s | `10` |
| `REM_DELAY` | przerwa między zapytaniami, s | `0` |

Ostrzeżenia (np. nieudane logowanie) idą na stderr, więc stdout zawsze zawiera czysty JSON.

### Windows (PowerShell)

Pliki `.sh` nie uruchomią się w Windows (system pyta, czym otworzyć plik). Użyj wersji PowerShell: `rem102\scripts\collect.ps1`. Nie wymaga ani basha, ani `curl`, ani `jq`, ani Pythona – wystarcza Windows PowerShell 5.1.

```powershell
cd C:\rem102\scripts
.\collect.cmd -DeviceHost 192.168.128.1 -User user -Password password
```

- Bez `-Password` skrypt zapyta o hasło.
- `collect.cmd` uruchamia `collect.ps1` z `-ExecutionPolicy Bypass`, więc nie trzeba zmieniać ustawień PowerShell. Jeśli uruchamiasz `.ps1` bezpośrednio i dostajesz błąd o zablokowanych skryptach, wykonaj `Unblock-File .\collect.ps1`.
- Wynik jest w `rem102\results\` (`collected.json`, `samples\`, `collect.log`), w tym samym formacie co z `collect.sh`.
- Parametry odpowiadają zmiennym `REM_*`: `-DeviceHost`, `-User`, `-Password`, `-LoginBody`, `-OutDir`, `-TimeoutSec`, `-DelayMs`, `-StdOut`.
- W PowerShellu `curl` jest aliasem `Invoke-WebRequest`. Polecenia curl z tej dokumentacji uruchamiaj jako `curl.exe` (Windows 10 i nowsze); składnia powłoki (`\`, `$HOST`) też się różni, więc do zbierania danych użyj `collect.cmd`.
- `collect.ps1` sprawdzono w PowerShell 7 na atrapie serwera, w Windows PowerShell 5.1 jeszcze nie.

## Podstawowe informacje – pełna sekwencja curl

Użytkownik `user`, hasło `password`, adres domyślny `192.168.128.1`. Kroki 2–6 zwracają model, numer seryjny, numer artykułu i pozostałe dane identyfikacyjne.

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# 1. login (cookies CGIUSERNAME / CGIUSERLEVEL are saved in $JAR)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" \
     --data-raw "query=120&username=user&pwd=password"
cat "$JAR"    # powinny być widoczne CGIUSERNAME i CGIUSERLEVEL

# 2. model, numer seryjny, numer artykułu i pozostałe dane urządzenia
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=302"

# 3. wersje oprogramowania (firmware, FPGA, DSP)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=301"

# 4. nazwa hosta
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=126"

# 5. ustawienia miernika
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/rem.fcgi" --data-raw "query=105"

# 6. numer seryjny DMeter (tylko jeśli moduł jest włączony)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/items.fcgi" --data-raw "query=407"

# 7. wylogowanie (opcjonalnie)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=1983"
rm -f "$JAR"
```

Wszystko jednym poleceniem (bez wylogowania), z nagłówkiem przed każdą odpowiedzią:

```bash
HOST=192.168.128.1; JAR=$(mktemp)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=120&username=user&pwd=password"
for r in mpc105.fcgi:302 mpc105.fcgi:301 mpc105.fcgi:126 rem.fcgi:105 items.fcgi:407; do
  printf '\n== %s?query=%s ==\n' "${r%%:*}" "${r##*:}"
  curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/${r%%:*}" --data-raw "query=${r##*:}"
done; rm -f "$JAR"
```

Uwagi: nazwy pól logowania (`username`, `pwd`) są założeniem (patrz [Założenia](#założenia-do-potwierdzenia)). Hasło ze znakami specjalnymi (`&`, `+`, `%`) wymaga kodowania URL w `--data-raw` albo użycia `--data-urlencode "pwd=..."`.

## Format wyniku

Jeden obiekt: `device` (metadane zbierania) + po jednym kluczu na zakładkę, a w nim pakiety po `id`.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, serial no., article no.)",
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

### Struktura wyniku

Poniżej sama koperta pakietu. Treść odpowiedzi urządzenia (`body`) jest tu zastąpiona znacznikiem. Prawdziwe odpowiedzi są w sekcji [Przykłady odpowiedzi](#przykłady-odpowiedzi) i pojawiają się tam dopiero po zebraniu ich z urządzenia.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "<czas UTC>" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, serial no., article no.)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": "<odpowiedź urządzenia – do uzupełnienia po podłączeniu>"
    }
  }
}
```

<!-- rem102-samples:start -->

## Przykłady odpowiedzi

Przykłady pochodzą **wyłącznie** z odpowiedzi zebranych z prawdziwego urządzenia – nic nie jest zmyślone. Pakiety bez przykładu czekają na uzupełnienie po podłączeniu do urządzenia.

Zebrano przykładów: 0 z 65.

Jak uzupełnić (po podłączeniu do urządzenia):

```bash
REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

<details><summary>Do uzupełnienia (65)</summary>

- `identity.device_settings`
- `identity.version`
- `identity.host`
- `identity.auth_message`
- `identity.meter_settings`
- `identity.dmeter_serial`
- `home.meter_status`
- `home.emf_status`
- `home.emf_measures`
- `home.emf_cebd`
- `home.dhs_memory`
- `home.digital_io`
- `home.net_interfaces`
- `home.net_services`
- `setup.channels_configuration`
- `setup.dcs_user_1`
- `setup.dcs_user_2`
- `setup.dcs_user_3`
- `setup.dcs_user_4`
- `setup.dcs_communication`
- `setup.dcs_binding`
- `setup.dcs_conn_test`
- `setup.ethernet_0`
- `setup.ethernet_1`
- `setup.mobile_settings`
- `setup.dhcp_client`
- `setup.gateway_dns`
- `setup.servers`
- `setup.ntp_servers`
- `setup.ems_time_servers`
- `setup.gps`
- `advanced.rtc_time`
- `advanced.events`
- `monitoring.eth_0`
- `monitoring.eth_1`
- `monitoring.mobile`
- `monitoring.gps`
- `monitoring.dcs_stats_user_1`
- `monitoring.dcs_stats_user_2`
- `monitoring.dcs_stats_user_3`
- `monitoring.dcs_stats_user_4`
- `monitoring.dmeter_status`
- `monitoring.rtp100_vars`
- `monitoring.rtp100_files`
- `monitoring.mem_nand`
- `monitoring.mem_nor`
- `monitoring.mem_ram`
- `monitoring.dev_rtc`
- `monitoring.dev_fpga`
- `monitoring.dev_fram`
- `monitoring.dev_adc`
- `monitoring.dev_dsp`
- `monitoring.dev_mvbcs`
- `monitoring.dev_modem`
- `features.dcs`
- `features.dcs_user_1`
- `features.dcs_user_2`
- `features.dcs_user_3`
- `features.dcs_user_4`
- `features.dmeter_rem`
- `features.dmeter_items`
- `features.rtp100`
- `features.mobile`
- `features.gps`
- `features.dsp_digitalio`

</details>

<!-- rem102-samples:end -->

## Użycie w LabVIEW

Lista zapytań jest dostępna jako pliki w `rem102/data/`. Kolejność wierszy jest we wszystkich plikach taka sama.

| Plik | Zawartość | Użycie |
|---|---|---|
| `rem102-package-names.txt` | jedna nazwa pakietu w wierszu (`tab.id`) | pozycje enuma (typedef) |
| `rem102-package-requests.txt` | jedno zapytanie w wierszu, np. `/cgi-bin/mpc105.fcgi?query=302` | tablica stringów indeksowana wartością enuma |
| `rem102-packages.tsv` | kolumny z nagłówkiem: `index, name, tab, id, cgi, query, request, method, min_level, requires, label` | wyszukiwanie po nazwie, bramkowanie po `min_level` i `requires` |

Nazwy mają postać `tab.id`, bo samo `id` się powtarza (np. `gps` występuje w Setup, Monitoring i Features).

Przepływ:

1. **Enum.** Typedef `REM102 Package` z pozycjami z `rem102-package-names.txt`. Wartość enuma to 0-based numer wiersza.
2. **Tablica zapytań.** *Read from Text File* (z konwersją końców linii), rozbicie na wiersze do `String[]`. Wczytaj raz przy starcie.
3. **Zapytanie.** *Index Array* wartością enuma daje ścieżkę. Dopisz `http://` i host.
4. **GET.** *HTTP Client* z ciasteczkami sesji po logowaniu (`query=120`) zwraca ciało odpowiedzi jako string.
5. **Parsowanie.** *Unflatten From JSON* do typedefu danego pakietu.

### VI polimorficzny

Polimorficzny VI wybiera instancję po **typie** podłączonych danych, nie po wartości enuma. Enum wybiera więc zapytanie, a typ wybiera parser. Dla jednego VI obsługującego każdy pakiet najlepiej pasuje **malleable VI** (`.vim`, LabVIEW 2017 lub nowszy):

```text
Get Package.vim
  wejścia:  Package (enum REM102 Package), Type (dowolny typedef – specyfikator typu), Host, sesja
  wyjścia:  Data (typu Type), Raw Body (string), HTTP Status, error out
  wnętrze:  Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)
```

Dla każdego pakietu wystarczy osobny typedef klastra, bez osobnej instancji. Klasyczny polimorficzny `.vi` też zadziała, ale wymaga instancji na każdy typedef.

Dopóki nie znasz prawdziwych odpowiedzi, użyj `Get Package (Raw).vi` zwracającego sam string. Typedefy zbuduj z próbek zebranych skryptem `collect.sh` na prawdziwym urządzeniu. Przed odczytem sprawdź w tsv kolumny `min_level` i `requires` (pakiet `features.*` mówi, czy moduł jest włączony).

## Założenia (do potwierdzenia)

1. **Logowanie.** Pliki JSON podają tylko `query=120`. Nazwy pól `username` i `pwd` pochodzą z konfiguracji LabVIEW (`data/modulesCfg.ts`), ciasteczka `CGIUSERNAME`/`CGIUSERLEVEL` również. Jeśli logowanie się nie uda, skrypt wypisze ostrzeżenie – wtedy przechwyć prawdziwe żądanie w DevTools i podaj je w `REM_LOGIN_BODY`.
2. **GET vs POST.** Zapytania odczytowe wysyłane są GET-em. Jeśli urządzenie zwraca puste odpowiedzi, spróbuj POST (`-X POST --data-raw ...`) – zmień wywołanie w funkcji `q`.
3. **Format odpowiedzi.** Nie wiadomo, czy urządzenie odpowiada JSON-em. Skrypt przyjmuje oba warianty (JSON → sparsowany, inne → surowy tekst w `body`).
4. **Separator `~`.** W polu `query` w plikach menu oznacza `&`.
