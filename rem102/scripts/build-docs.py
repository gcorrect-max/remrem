#!/usr/bin/env python3
"""Generates the REM-102 documentation from the package list and from data captured on a real device.

Inputs (all inside rem102/):
  data/rem102-packages.tsv         package list (built by build-packages.py from the device's own menu files)
  results/samples/<tab>/<id>.json  captured responses, or
  results/collected.json           the same data in one file (written by scripts/collect.ps1 / collect.sh)

Outputs:
  docs/rem102-api.html, docs/rem102-api_en.html   API-style reference pages (PL/EN)
  docs/rem102-info.md,  docs/rem102-info_en.md    the same content as Markdown
  index.html                                      the hub page (what was done, TODO, file list)

Response examples come ONLY from data captured on a real device, and only HTTP 2xx answers that are not
{"value":"fail"} count as examples. Everything else is marked "to be filled in".

Usage: python3 rem102/scripts/build-docs.py [--samples DIR] [--collected FILE]
"""
import csv, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "results", "samples")
COLLECTED = os.path.join(ROOT, "results", "collected.json")
if "--samples" in sys.argv:
    SAMPLES = os.path.abspath(sys.argv[sys.argv.index("--samples") + 1])
if "--collected" in sys.argv:
    COLLECTED = os.path.abspath(sys.argv[sys.argv.index("--collected") + 1])
esc = html.escape
SESSION_URL = "https://claude.ai/code/session_01EnRG8vGUPDNmrrRkAUgc9q"

with open(os.path.join(ROOT, "data", "rem102-packages.tsv"), encoding="utf-8", newline="") as f:
    eps = list(csv.DictReader(f, delimiter="\t"))
TABS = ["home", "monitoring", "setup", "advanced", "features"]

def req_of(e):
    return [r.split(".", 1)[1] for r in e["requires"].split(";") if r]

_collected = None
if os.path.isfile(COLLECTED):
    with open(COLLECTED, encoding="utf-8-sig") as f:
        _collected = json.load(f)

def load_sample(e):
    """Captured package (envelope with http_status/body) or None. A per-package file wins over collected.json."""
    p = os.path.join(SAMPLES, e["tab"], e["id"] + ".json")
    if os.path.isfile(p):
        with open(p, encoding="utf-8-sig") as f:
            return json.load(f)
    d = (_collected or {}).get(e["tab"], {}).get(e["id"])
    return d if isinstance(d, dict) and "http_status" in d else None

def is_ok(d):
    """A captured package with an HTTP 2xx answer that is not the login-required reply {"value":"fail"}."""
    try:
        if not (isinstance(d, dict) and 200 <= int(d.get("http_status") or 0) < 300):
            return False
    except (TypeError, ValueError):
        return False
    return d.get("body") != {"value": "fail"}

def why_not(d):
    if d is None:
        return None
    if d.get("body") == {"value": "fail"}:
        return "login required"
    return f"HTTP {d.get('http_status')}"

def sample_text(d):
    body = d.get("body")
    return body if isinstance(body, str) else json.dumps(body, indent=2, ensure_ascii=False)

CSS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs.css"), encoding="utf-8").read() \
    if os.path.isfile(os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs.css")) else ""

# ---------------------------------------------------------------- tiny Markdown -> HTML
def inline(t):
    t = esc(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    return t

def md2html(md, copy_label="Copy"):
    lines, out, i = md.strip("\n").split("\n"), [], 0
    while i < len(lines):
        l = lines[i]
        if l.startswith("```"):
            j = i + 1; buf = []
            while j < len(lines) and not lines[j].startswith("```"):
                buf.append(lines[j]); j += 1
            out.append(f'<div class="code"><button class="copy" type="button">{copy_label}</button>'
                       f'<pre><code>{esc(chr(10).join(buf), quote=False)}</code></pre></div>')
            i = j + 1
        elif l.startswith("### "):
            out.append(f'<h3 class="sub">{inline(l[4:])}</h3>'); i += 1
        elif l.startswith("> "):
            buf = []
            while i < len(lines) and lines[i].startswith("> "):
                buf.append(lines[i][2:]); i += 1
            out.append(f'<div class="callout">{inline(" ".join(buf))}</div>')
        elif l.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].startswith("|"):
                rows.append([c.strip() for c in lines[i].strip().strip("|").split("|")]); i += 1
            head, body = rows[0], [r for r in rows[2:]]
            h = "<tr>" + "".join(f"<th>{inline(c)}</th>" for c in head) + "</tr>"
            for r in body:
                h += "<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>"
            out.append(f'<div class="tablewrap"><table>{h}</table></div>')
        elif re.match(r"^[-*] ", l):
            items = []
            while i < len(lines) and re.match(r"^[-*] ", lines[i]):
                items.append(lines[i][2:]); i += 1
            out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
        elif re.match(r"^\d+\. ", l):
            items = []
            while i < len(lines) and re.match(r"^\d+\. ", lines[i]):
                items.append(re.sub(r"^\d+\. ", "", lines[i])); i += 1
            out.append("<ol>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ol>")
        elif l.strip() == "":
            i += 1
        else:
            buf = []
            while i < len(lines) and lines[i].strip() and not re.match(r"^(```|### |> |\||[-*] |\d+\. )", lines[i]):
                buf.append(lines[i]); i += 1
            out.append(f"<p>{inline(' '.join(buf))}</p>")
    return "\n".join(out)

# ---------------------------------------------------------------- content (single source for HTML and Markdown)
SEQ = '''HOST=192.168.128.1
JAR=$(mktemp)

# 1. %(login)s
curl -sS -w '\\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" \\
     --data "query=120" --data "login=3" --data-urlencode "pwd=password"
cat "$JAR"    # %(cookie)s

# 2. %(s302)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302"

# 3. %(s301)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=301"

# 4. %(s105)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=105"

# 5. %(s100)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=100"

# 6. %(s3)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=3"

# 7. %(logout)s
curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105j.cgi?query=122"
rm -f "$JAR"'''

ONELINER = '''HOST=192.168.128.1; JAR=$(mktemp)
curl -sS -w '\\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" --data "query=120" --data "login=3" --data-urlencode "pwd=password"
for r in mpc105.cgi?query=302 mpc105.cgi?query=301 rem.cgi?query=105 rem.cgi?query=100; do
  printf '\\n== %s ==\\n' "$r"
  curl -sS -w '\\n' -b "$JAR" "http://$HOST/cgi-bin/$r"
done; rm -f "$JAR"'''

L = {
"pl": dict(
 code="pl", html_file="rem102-api.html", md_file="rem102-info.md", other_html="rem102-api_en.html", other_md="rem102-info_en.md", other_name="English",
 title="REM-102 – CGI API (odczyt)", subtitle="odczyt informacji o urządzeniu", packages_word="pakietów",
 ui=dict(search="Szukaj: id, query, opis…", req="Wymaga włączonego modułu:", copy="Kopiuj", copied="Skopiowano", inout="W wyniku skryptu:",
         sample="Przykładowa odpowiedź (z urządzenia)", sample_tbd="Przykładowa odpowiedź: do uzupełnienia po podłączeniu do urządzenia.",
         last="ostatnia próba", level="min. poziom", samples_title="Przykłady odpowiedzi", pk_title="Pakiety",
         tbd="Do uzupełnienia ({m})", count="Zebrano przykładów: {n} z {t}.", name="Nazwa", request="Zapytanie", note="Uwagi"),
 tabs={"home": ("Home", "Odczyty miernika: kanały A i B, energia, wejścia/wyjścia cyfrowe, archiwa, sieć."),
       "monitoring": ("Monitoring", "Stan interfejsów sieciowych, pamięci i podzespołów oraz RTP100."),
       "setup": ("Setup", "Konfiguracja miernika, interfejsów sieciowych, DHCP i usług."),
       "advanced": ("Advanced", "Czas RTC, konfiguracja i informacje o urządzeniu (model, numer seryjny, wersje, zdarzenia)."),
       "features": ("Features", "Flagi włączenia modułów (<code>en_query</code> z menu).")},
 notes={("advanced", "information_device_settings"): "Model, numer seryjny, numer artykułu i pozostałe dane urządzenia. W menu: show_level 1, write_level 3.",
        ("advanced", "information_version"): "Wersje oprogramowania.",
        ("advanced", "information_events"): "W menu to samo zapytanie służy też do zapisu (set = query=314); skrypt wysyła tylko odczyt.",
        ("home", "ch_a_measures"): "W menu to samo zapytanie służy też do zapisu (set); skrypt wysyła tylko odczyt.",
        ("home", "ch_b_measures"): "W menu to samo zapytanie służy też do zapisu (set); skrypt wysyła tylko odczyt.",
        ("setup", "meter_settings"): "Ustawienia miernika (rem.cgi, nie mpc105.cgi).",
        ("setup", "meter_calibration"): "Odczyt pamięci współdzielonej; w menu show_level 3 (Super Admin).",
        ("features", "rtp100"): "Odpowiedź to tablica obiektów; <code>{\"type\":\"enable\",\"value\":\"true\"}</code> oznacza włączony moduł (reguła ze skryptu strony)."},
 sections=[
 ("overview", "Wprowadzenie", """
Opis zapytań CGI, którymi interfejs WWW urządzenia **REM-102** (serwer Boa, strona producenta HaslerRail) pobiera dane. Lista pochodzi z plików, które urządzenie samo udostępnia (`Config/*.json`), odczytanych skryptem `collect.ps1 -Discover`. Uwzględnione są wyłącznie zapytania odczytowe.

> **Status.** Logowanie, nazwy CGI, ciasteczko sesji i poziomy dostępu pochodzą ze skryptów strony urządzenia (`Script/mainParent.js`, `Script/globalFunc.js`). Skrypty zbierające sprawdzono na atrapie serwera, nie na prawdziwych odpowiedziach. **Treści odpowiedzi poszczególnych pakietów nie znamy jeszcze** – patrz sekcja „Przykłady odpowiedzi”.

Adres bazowy: `http://<HOST>` (domyślnie `192.168.128.1`, port 80). Urządzenie udostępnia cztery pliki CGI:

| Plik CGI | Zakres |
|---|---|
| `/cgi-bin/mpc105.cgi` | platforma: logowanie, sieć, GPS, modem, RTC, pamięci, informacje o urządzeniu |
| `/cgi-bin/mpc105j.cgi` | wylogowanie |
| `/cgi-bin/rem.cgi` | miernik: kanały A/B, energia, archiwa, konfiguracja |
| `/cgi-bin/rtp.cgi` | RTP100 |
"""),
 ("quick", "Podstawowe informacje – pełna sekwencja curl", """
Poziom Super Admin (`login=3`), hasło `password` (wpisz własne). Kroki 2–6 zwracają model, numer seryjny, numer artykułu i pozostałe dane identyfikacyjne oraz podstawową konfigurację.

```bash
@SEQ@
```

Wszystko jednym poleceniem (bez wylogowania), z nagłówkiem przed każdą odpowiedzią:

```bash
@ONE@
```

Uwagi: `--data-urlencode` koduje hasło tak, jak robi to formularz strony (znaki `@`, `!`, `&` są bezpieczne). W PowerShellu `curl` jest aliasem `Invoke-WebRequest`: używaj `curl.exe` albo skryptu `collect.cmd` (patrz „Skrypty”). Zła para poziom/hasło zwraca `{"value":"fail"}`.
"""),
 ("auth", "Logowanie i poziomy dostępu", """
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
"""),
 ("conv", "Konwencje", """
- Zapytania odczytowe to `GET <cgi>?<query>`, odpowiedzi są w JSON (strona używa `$.getJSON`).
- W plikach menu parametry zapytań bywają rozdzielone znakiem `~` (np. `query=7~block_offset=10240~…`). W tabeli pakietów zapisano je jako `&`; to założenie, patrz „Założenia”.
- Pola `en_cgi`/`en_query` w menu sprawdzają, czy moduł jest włączony – to pakiety z zakładki Features.
- Pola `set`, `set1`, `set2` zapisują konfigurację – **nie są** używane.
"""),
 ("response", "Format wyniku skryptów", """
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
"""),
 ("excluded", "Pominięte zapytania", """
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
"""),
 ("scripts", "Skrypty", """
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
cd C:\\rem102\\scripts
.\\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'password'
```

- Bez `-Password` skrypt zapyta o hasło. Nazwę ze spacją podaj w cudzysłowie; zamiast nazwy można podać `-Level 3`.
- `-Discover` czyta własne pliki WWW urządzenia (bez logowania) i zapisuje `results\\discover.json`; `-Probe` sprawdza porty i ścieżki (`results\\probe.json`).
- `-BaseUrl https://192.168.128.1:8443 -Insecure` – inny adres bazowy lub certyfikat self-signed.
- Zwykły HTTP idzie surowym połączeniem TCP, więc nietypowe odpowiedzi CGI też zostają zapisane (z powodem w polu `error`).
- Jeśli uruchamiasz `.ps1` bezpośrednio i dostajesz błąd o zablokowanych skryptach: `Unblock-File .\\collect.ps1`.
- `collect.ps1` sprawdzono w PowerShell 7 na atrapie serwera, w Windows PowerShell 5.1 jeszcze nie.
"""),
 ("labview", "Użycie w LabVIEW", """
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
"""),
 ("assumptions", "Założenia i do sprawdzenia", """
Ustalone z plików WWW urządzenia (nie są już założeniami): logowanie `query=120` z polami `login` (poziom) i `pwd`, ciasteczko `CGISESSID`, odczyty przez GET z odpowiedziami JSON, nazwy CGI `.cgi`, lista zapytań z `Config/*.json`.

1. **Treść odpowiedzi.** Format poszczególnych pakietów jest nieznany do czasu zebrania ich z urządzenia.
2. **Separator `~`.** W plikach menu oznacza prawdopodobnie `&`; kod stron-iframe, który to przekształca, nie był jeszcze pobrany (nowy `-Discover` je pobiera).
3. **Zapytania używane też do zapisu** (`advanced.information_events`, `home.ch_a_measures`, `home.ch_b_measures`): odczyt przez GET powinien być bezpieczny, bo strona robi to samo cyklicznie, ale do potwierdzenia.
4. **Poziomy dostępu.** `show_level` rozumiemy jako minimalny poziom użytkownika do wyświetlenia pozycji menu.
5. **Odpowiedź 502 „The CGI was not CGI/1.1 compliant”** pojawiła się dla nieistniejących numerów zapytań w starej liście; przy poprawnych zapytaniach i po zalogowaniu nie powinna występować.
"""),
 ]),
"en": dict(
 code="en", html_file="rem102-api_en.html", md_file="rem102-info_en.md", other_html="rem102-api.html", other_md="rem102-info.md", other_name="Polski",
 title="REM-102 – CGI API (read-only)", subtitle="device information readout", packages_word="packages",
 ui=dict(search="Search: id, query, description…", req="Requires enabled module:", copy="Copy", copied="Copied", inout="In script output:",
         sample="Example response (from the device)", sample_tbd="Example response: to be filled in after connecting to the device.",
         last="last attempt", level="min. level", samples_title="Response examples", pk_title="Packages",
         tbd="To be filled in ({m})", count="Captured examples: {n} of {t}.", name="Name", request="Request", note="Notes"),
 tabs={"home": ("Home", "Meter readouts: channels A and B, energy, digital I/O, archives, networking."),
       "monitoring": ("Monitoring", "State of network interfaces, memories and hardware blocks, and RTP100."),
       "setup": ("Setup", "Meter, network interface, DHCP and service configuration."),
       "advanced": ("Advanced", "RTC time, configuration and device information (model, serial number, versions, events)."),
       "features": ("Features", "Module enable flags (<code>en_query</code> from the menu).")},
 notes={("advanced", "information_device_settings"): "Model, serial number, article number and other device data. In the menu: show_level 1, write_level 3.",
        ("advanced", "information_version"): "Software versions.",
        ("advanced", "information_events"): "In the menu the same query is also used for writing (set = query=314); the scripts send reads only.",
        ("home", "ch_a_measures"): "In the menu the same query is also used for writing (set); the scripts send reads only.",
        ("home", "ch_b_measures"): "In the menu the same query is also used for writing (set); the scripts send reads only.",
        ("setup", "meter_settings"): "Meter settings (rem.cgi, not mpc105.cgi).",
        ("setup", "meter_calibration"): "Shared-memory read; show_level 3 in the menu (Super Admin).",
        ("features", "rtp100"): "The reply is an array of objects; <code>{\"type\":\"enable\",\"value\":\"true\"}</code> means the module is enabled (rule from the page's script)."},
 sections=[
 ("overview", "Overview", """
Description of the CGI requests that the web interface of the **REM-102** device (Boa server, vendor page by HaslerRail) uses to fetch data. The list comes from files the device serves itself (`Config/*.json`), read with `collect.ps1 -Discover`. Only read requests are included.

> **Status.** The login, CGI names, session cookie and access levels come from the device page's own scripts (`Script/mainParent.js`, `Script/globalFunc.js`). The collector scripts were tested against a mock server, not against real responses. **The response content of the individual packages is not known yet** – see “Response examples”.

Base URL: `http://<HOST>` (default `192.168.128.1`, port 80). The device exposes four CGI files:

| CGI file | Scope |
|---|---|
| `/cgi-bin/mpc105.cgi` | platform: login, networking, GPS, modem, RTC, memories, device information |
| `/cgi-bin/mpc105j.cgi` | logout |
| `/cgi-bin/rem.cgi` | meter: channels A/B, energy, archives, configuration |
| `/cgi-bin/rtp.cgi` | RTP100 |
"""),
 ("quick", "Basic information – full curl sequence", """
Super Admin level (`login=3`), password `password` (use your own). Steps 2–6 return the model, serial number, article number and other identification data, plus the basic configuration.

```bash
@SEQ@
```

Everything in one command (no logout), with a header before each response:

```bash
@ONE@
```

Notes: `--data-urlencode` encodes the password the way the page's form does (`@`, `!`, `&` are safe). In PowerShell `curl` is an alias of `Invoke-WebRequest`: use `curl.exe` or the `collect.cmd` script (see “Scripts”). A wrong level/password pair returns `{"value":"fail"}`.
"""),
 ("auth", "Login and access levels", """
Login is done by the page's form (`Script/mainParent.js`): `POST /cgi-bin/mpc105.cgi` with the form fields:

| Field | Meaning |
|---|---|
| `query` | always `120` (from `Config/settings.json`, type `LoginOnStart`) |
| `login` | level: `1` = User, `2` = Admin, `3` = Super Admin (not a user name) |
| `pwd` | password, URL-encoded |
| `change` | checked only when changing the password |

- The reply is JSON with a `value` field: `"fail"` = wrong password, `"change"` = the password must be changed, any other value = logged in.
- The session is carried by the `CGISESSID` cookie; the page reads the level from the 5th character of its value (`A`..`D` = 0..3).
- Logout: `GET /cgi-bin/mpc105j.cgi?query=122`, the page then deletes the cookie.
- The page shows a menu entry when `show_level` ≤ the user level; writing needs `write_level`.
- According to the page's scripts, the reply `{"value":"fail"}` to a read request means “Needed Authentication”.
"""),
 ("conv", "Conventions", """
- Read requests are `GET <cgi>?<query>`; replies are JSON (the page uses `$.getJSON`).
- In the menu files multi-parameter queries are sometimes separated with `~` (e.g. `query=7~block_offset=10240~…`). The package table writes them as `&`; this is an assumption, see “Assumptions”.
- The `en_cgi`/`en_query` menu fields check whether a module is enabled – these are the packages in the Features tab.
- The `set`, `set1`, `set2` fields write configuration – they are **not** used.
"""),
 ("response", "Result format of the scripts", """
The collector scripts return one JSON object: `device` (metadata), `login` (login result) and a key per tab with packages keyed by `id`.

```json
{
  "device": { "base_url": "http://192.168.128.1", "collected_at": "<UTC time>", "packages_total": 66 },
  "login": { "http_status": 200, "ok": true, "value": "<reply>", "level_requested": 3, "level_from_cookie": 3 },
  "advanced": {
    "information_device_settings": {
      "label": "Advanced > Information > Device Settings",
      "cgi": "/cgi-bin/mpc105.cgi",
      "query": "query=302",
      "http_status": 200,
      "content_type": "<header>",
      "body": "<device response – to be filled in after connecting>"
    }
  }
}
```

| Field | Description |
|---|---|
| `label` | path in the web menu |
| `cgi`, `query` | exactly what was sent to the device |
| `http_status` | HTTP code; `0` = no HTTP answer (the `error` field gives the reason) |
| `content_type`, `server` | response headers |
| `body` | JSON if the response parses; otherwise text; `null` when empty |
| `post_retry` | only when GET failed: result of a single POST retry |

A failure of one package does not stop the collection of the others.
"""),
 ("excluded", "Excluded requests", """
> The scripts do **not** send the requests below – they change device state, end the session or are used to upload files.

| Request | Reason |
|---|---|
| `rem.cgi?query=440` | Restore Factory Default – resets the device to factory settings |
| `mpc105.cgi?query=1982` | device reboot |
| `mpc105j.cgi?query=122` | logout (ends the session) |
| `mpc105.cgi?query=121` | change password |
| `rem.cgi?query=402` | Export (configuration download action) |
| `rem.cgi?query=401`, `mpc105.cgi?query=310` | configuration Import and Firmware Upgrade (file uploads) |
| `rtp.cgi?query=440`, `443`, `445` | RTP100 writes and commands |
| all `set`, `set1`, `set2` fields | configuration writes |
"""),
 ("scripts", "Scripts", """
Collecting all packages one by one: `rem102/scripts/collect.sh` (bash, curl, jq) or `rem102/scripts/collect.ps1` (Windows PowerShell 5.1+, no extra tools). Both write `collected.json`, `samples/<tab>/<id>.json` and `collect.log` to `rem102/results/`. `rem102-info.sh` is a shortcut to `collect.sh` that prints the result to stdout.

### Linux / macOS / Git Bash

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

| Variable | Meaning | Default |
|---|---|---|
| `REM_HOST` | device address | `192.168.128.1` |
| `REM_USER` / `REM_LEVEL` | `User`, `Admin`, `Super Admin` or level `1`, `2`, `3` | – (one of the two required) |
| `REM_PASS` | password | – (required) |
| `REM_BASE_URL` | full base URL (other port, HTTPS, prefix) | `http://$REM_HOST` |
| `REM_INSECURE` | `1` = accept a self-signed certificate | – |
| `REM_OUT_DIR` | output directory | `rem102/results/` |
| `REM_TIMEOUT`, `REM_DELAY` | per-request time limit and pause between requests, s | `10`, `0` |
| `REM_LOGIN_BODY` | full login body (overrides the default) | – |

### Windows (PowerShell)

`.sh` files do not run on Windows. Use `collect.cmd` (it runs `collect.ps1` with `-ExecutionPolicy Bypass`):

```powershell
cd C:\\rem102\\scripts
.\\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'password'
```

- Without `-Password` the script asks for it. Quote a name with a space; instead of the name you can pass `-Level 3`.
- `-Discover` reads the device's own web files (no login) and writes `results\\discover.json`; `-Probe` checks ports and paths (`results\\probe.json`).
- `-BaseUrl https://192.168.128.1:8443 -Insecure` – another base URL or a self-signed certificate.
- Plain HTTP goes over a raw TCP connection, so unusual CGI replies are captured too (the reason is in the `error` field).
- If you run the `.ps1` directly and get an error about blocked scripts: `Unblock-File .\\collect.ps1`.
- `collect.ps1` was tested in PowerShell 7 against a mock server, not yet in Windows PowerShell 5.1.
"""),
 ("labview", "Using it from LabVIEW", """
The request list is available as files in `rem102/data/`. Row order is identical in all files.

| File | Content | Use |
|---|---|---|
| `rem102-package-names.txt` | one package name per line (`tab.id`) | enum items (typedef) |
| `rem102-package-requests.txt` | one request per line, e.g. `/cgi-bin/mpc105.cgi?query=302` | string array indexed by the enum value |
| `rem102-packages.tsv` | columns with a header: `index, name, tab, id, cgi, query, request, method, min_level, requires, label, cyclic_ms, note` | lookup by name, gating on `min_level` and `requires` |

Names are `tab.id` because a bare `id` could repeat between tabs.

1. **Enum.** A typedef `REM102 Package` with the items from `rem102-package-names.txt`; the enum value is the 0-based line number.
2. **Request array.** *Read from Text File* (with end-of-line conversion), split into lines into a `String[]`; load it once at start-up.
3. **Login.** `POST /cgi-bin/mpc105.cgi` with `query=120&login=<1|2|3>&pwd=<password>`; keep the `CGISESSID` cookie and send it in the `Cookie` header.
4. **Request.** *Index Array* with the enum value → path with query; *HTTP Client* GET → response body as a string.
5. **Parsing.** *Unflatten From JSON* into the typedef of that package.

### Polymorphic VI

A polymorphic VI picks its instance by the **type** of the wired data, not by an enum value. So the enum selects the request and the type selects the parser. For a single VI that handles every package, a **malleable VI** (`.vim`, LabVIEW 2017 or newer) fits best:

```text
Get Package.vim
  inputs:   Package (enum REM102 Package), Type (any typedef – type specifier), Host, session (CGISESSID)
  outputs:  Data (of type Type), Raw Body (string), HTTP Status, error out
  inside:   Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)
```

Each package only needs its own cluster typedef, with no separate instance. Until you know the real responses, use a `Get Package (Raw).vi` that returns just the string. Build the typedefs from samples collected with the script on a real device. Before reading, check the `min_level` (account level) and `requires` columns in the tsv (the `features.*` package tells whether the module is enabled).
"""),
 ("assumptions", "Assumptions and open points", """
Established from the device's own web files (no longer assumptions): login `query=120` with the `login` (level) and `pwd` fields, the `CGISESSID` cookie, reads over GET with JSON replies, the `.cgi` CGI names, the request list from `Config/*.json`.

1. **Response content.** The format of the individual packages is unknown until they are captured from the device.
2. **The `~` separator.** In the menu files it probably means `&`; the iframe page code that converts it has not been downloaded yet (the new `-Discover` fetches it).
3. **Queries also used for writing** (`advanced.information_events`, `home.ch_a_measures`, `home.ch_b_measures`): a GET read should be safe because the page does the same cyclically, but this is to be confirmed.
4. **Access levels.** `show_level` is understood as the minimum user level needed to show the menu entry.
5. **The 502 “The CGI was not CGI/1.1 compliant” reply** appeared for non-existent query numbers in the old list; with correct queries and after login it should not occur.
"""),
 ]),
}

# ---------------------------------------------------------------- generators
def seq_text(code):
    t = {"pl": dict(login="logowanie jako Super Admin (login=3); hasło kodowane jak w formularzu", cookie="powinno być widoczne ciasteczko CGISESSID",
                    s302="model, numer seryjny, numer artykułu i pozostałe dane urządzenia (Advanced > Information > Device Settings)",
                    s301="wersje oprogramowania (Advanced > Information > Version)", s105="ustawienia miernika (Setup > Meter > Settings)",
                    s100="konfiguracja kanałów (Setup > Meter > Channels Configuration)", s3="stan Ethernet 0 (Monitoring > Network Interfaces)",
                    logout="wylogowanie (opcjonalnie)"),
         "en": dict(login="login as Super Admin (login=3); the password is encoded like the page's form does", cookie="the CGISESSID cookie should be listed",
                    s302="model, serial number, article number and other device data (Advanced > Information > Device Settings)",
                    s301="software versions (Advanced > Information > Version)", s105="meter settings (Setup > Meter > Settings)",
                    s100="channels configuration (Setup > Meter > Channels Configuration)", s3="Ethernet 0 state (Monitoring > Network Interfaces)",
                    logout="logout (optional)")}[code]
    return SEQ % t

def section_md(code, sid):
    body = dict((s[0], s[2]) for s in L[code]["sections"])[sid].strip("\n")
    return body.replace("@SEQ@", seq_text(code)).replace("@ONE@", ONELINER)

def build_html(code):
    T = L[code]; U = T["ui"]
    other = T["other_html"]
    nav, parts = [], []
    def sec(sid):
        title = next(s[1] for s in T["sections"] if s[0] == sid)
        return f'<section id="{sid}"><h2>{esc(title)}</h2>{md2html(section_md(code, sid), U["copy"])}</section>'
    first = T["sections"][0]
    nav.append(f'<div class="nav-group"><a class="nav-h" href="#overview">{esc(first[1])}</a>'
               + "".join(f'<a class="nav-i" href="#{s[0]}">{esc(s[1])}</a>' for s in T["sections"][1:5]) + '</div>')
    parts.append(f'<section id="overview-top"><h1>{esc(T["title"])}</h1></section>')
    parts.append(f'<section id="overview"><h2>{esc(first[1])}</h2>{md2html(section_md(code, "overview"), U["copy"])}</section>')
    for sid in ("quick", "auth", "conv", "response"):
        parts.append(sec(sid))
    # package cards
    def sample_html(e):
        d = load_sample(e)
        if d is None:
            return f'<p class="muted small tbd">{U["sample_tbd"]}</p>'
        if not is_ok(d):
            return f'<p class="muted small tbd">{U["sample_tbd"]} ({U["last"]}: {esc(why_not(d))})</p>'
        return (f'<details class="sample" open><summary>{U["sample"]} · HTTP {esc(str(d.get("http_status")))}</summary>'
                f'<pre><code>{esc(sample_text(d))}</code></pre></details>')
    for tab in TABS:
        title, desc = T["tabs"][tab]
        items = [e for e in eps if e["tab"] == tab]
        nav.append(f'<div class="nav-group"><a class="nav-h" href="#tab-{tab}">{esc(title)} <span>{len(items)}</span></a>'
                   + "".join(f'<a class="nav-i" href="#{tab}-{e["id"]}" data-s="{esc((e["id"] + " " + e["label"] + " " + e["query"]).lower())}">{esc(e["id"])}</a>' for e in items) + '</div>')
        parts.append(f'<section class="tab" id="tab-{tab}"><h2>{esc(title)} <code class="tabkey">{tab}</code></h2><p class="muted">{desc}</p>')
        for e in items:
            badges = '<span class="m">GET</span>'
            if e["min_level"] != "0":
                badges += f'<span class="b lvl">{U["level"]} {e["min_level"]}</span>'
            req = req_of(e)
            reqhtml = (f'<p class="req">{U["req"]} ' + ", ".join(f'<a href="#features-{r}"><code>features.{r}</code></a>' for r in req) + '.</p>') if req else ""
            note = T["notes"].get((tab, e["id"]))
            notehtml = f'<p>{note}</p>' if note else ""
            cmd = f'curl -sS -b "$JAR" "http://$HOST{e["request"]}"'
            parts.append(f'''<article class="ep" id="{tab}-{e["id"]}" data-s="{esc((e["id"] + " " + e["label"] + " " + e["request"]).lower())}">
<header><h3>{esc(e["label"])}</h3><div class="badges">{badges}</div></header>
<div class="url"><span class="m">GET</span><code>{esc(e["request"])}</code></div>
{notehtml}{reqhtml}
<div class="code"><button class="copy" type="button" aria-label="{U["copy"]}">{U["copy"]}</button><pre><code>{esc(cmd)}</code></pre></div>
{sample_html(e)}
<p class="muted small">{U["inout"]} <code>.{tab}.{e["id"]}</code></p>
</article>''')
        parts.append('</section>')
    for sid in ("excluded", "scripts", "labview", "assumptions"):
        parts.append(sec(sid))
    nav.append('<div class="nav-group">' + "".join(
        f'<a class="nav-h" href="#{s[0]}">{esc(s[1])}</a>' for s in T["sections"] if s[0] in ("excluded", "scripts", "labview", "assumptions")) + '</div>')
    page = f'''<!doctype html>
<html lang="{code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>REM-102 CGI API</title>
<style>
{CSS}
</style>
</head>
<body>
<div class="layout">
<aside>
<h1>REM-102 CGI API</h1>
<div class="muted small">{T["subtitle"]} · {len(eps)} {T["packages_word"]}</div>
<a class="lang" href="{other}" hreflang="{"en" if code == "pl" else "pl"}">{T["other_name"]} ↗</a>
<input id="filter" type="search" placeholder="{esc(U["search"])}" aria-label="{esc(U["search"])}">
{"".join(nav)}
</aside>
<main>
{chr(10).join(parts)}
</main>
</div>
<script>
(function(){{
  var f=document.getElementById('filter');
  var eps=[].slice.call(document.querySelectorAll('.ep'));
  var navs=[].slice.call(document.querySelectorAll('.nav-i[data-s]'));
  f.addEventListener('input',function(){{
    var v=f.value.trim().toLowerCase();
    eps.forEach(function(e){{e.classList.toggle('hidden',v&&e.dataset.s.indexOf(v)<0)}});
    navs.forEach(function(n){{n.classList.toggle('hidden',v&&n.dataset.s.indexOf(v)<0)}});
  }});
  document.querySelectorAll('.copy').forEach(function(b){{
    b.addEventListener('click',function(){{
      var t=b.parentNode.querySelector('code').textContent;
      var done=function(){{b.textContent='{U["copied"]}';setTimeout(function(){{b.textContent='{U["copy"]}'}},1200)}};
      if(navigator.clipboard){{navigator.clipboard.writeText(t).then(done,function(){{}})}}
    }});
  }});
}})();
</script>
</body>
</html>
'''
    with open(os.path.join(ROOT, "docs", T["html_file"]), "w", encoding="utf-8", newline="\n") as f:
        f.write(page)

def build_md(code):
    T = L[code]; U = T["ui"]
    o = [f"# {T['title']}", "",
         f"> {'Wersja angielska' if code == 'pl' else 'Polish version'}: [`{T['other_md']}`]({T['other_md']}) · HTML: [`{T['html_file']}`]({T['html_file']}) · "
         f"{'strona główna' if code == 'pl' else 'hub page'}: [`../index.html`](../index.html)", ""]
    def sec(sid):
        title = next(s[1] for s in T["sections"] if s[0] == sid)
        return [f"## {title}", "", section_md(code, sid), ""]
    for sid in ("overview", "quick", "auth", "conv", "response"):
        o += sec(sid)
    # packages
    o += [f"## {U['pk_title']}", ""]
    for tab in TABS:
        title, desc = T["tabs"][tab]
        o += [f"### {title} (`{tab}`)", "", re.sub(r"</?code>", "`", desc), "",
              f"| {U['name']} | {U['request']} | {U['level']} | {U['note']} |", "|---|---|---|---|"]
        for e in (x for x in eps if x["tab"] == tab):
            note = re.sub(r"</?code>", "`", T["notes"].get((tab, e["id"]), ""))
            if req_of(e):
                note = (note + " " if note else "") + U["req"] + " " + ", ".join(f"`features.{r}`" for r in req_of(e)) + "."
            o.append(f"| `{e['name']}` | `{e['request']}` | {e['min_level']} | {note} |")
        o.append("")
    # response examples (generated)
    have = [(e, load_sample(e)) for e in eps]
    done = [(e, d) for e, d in have if is_ok(d)]
    todo = [(e, d) for e, d in have if not is_ok(d)]
    intro = {"pl": "Przykłady pochodzą **wyłącznie** z odpowiedzi zebranych z prawdziwego urządzenia – nic nie jest zmyślone. Pakiety bez przykładu czekają na uzupełnienie po podłączeniu do urządzenia. Odpowiedź `{\"value\":\"fail\"}` (wymagane logowanie) i błędy HTTP nie są przykładami.",
             "en": "The examples come **only** from responses captured on a real device – nothing is made up. Packages without an example are waiting to be filled in after connecting to the device. The reply `{\"value\":\"fail\"}` (login required) and HTTP errors are not examples."}[code]
    howto = {"pl": "Jak uzupełnić:", "en": "How to fill them in:"}[code]
    o += [f"## {U['samples_title']}", "", intro, "", U["count"].format(n=len(done), t=len(eps)), "", howto, "", "```bash",
          "REM_HOST=192.168.128.1 REM_USER=\"Super Admin\" REM_PASS='password' ./rem102/scripts/collect.sh", "python3 rem102/scripts/build-docs.py", "```", ""]
    for e, d in done:
        o += [f"### `{e['name']}`", "", f"`GET {e['request']}` · HTTP {d.get('http_status')}", "",
              "```" + ("text" if isinstance(d.get("body"), str) else "json"), sample_text(d), "```", ""]
    if todo:
        o += [f"<details><summary>{U['tbd'].format(m=len(todo))}</summary>", ""]
        o += [f"- `{e['name']}`" + (f" ({U['last']}: {why_not(d)})" if d is not None else "") for e, d in todo]
        o += ["", "</details>", ""]
    for sid in ("excluded", "scripts", "labview", "assumptions"):
        o += sec(sid)
    with open(os.path.join(ROOT, "docs", T["md_file"]), "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(o).rstrip("\n") + "\n")

# ---------------------------------------------------------------- hub page
def build_index():
    def exists(rel):
        return os.path.exists(os.path.join(ROOT, rel))
    def status(rel):
        return '<span class="b ok">jest</span>' if exists(rel) else '<span class="b lvl">brak – powstaje po uruchomieniu na urządzeniu</span>'
    all_d = [load_sample(e) for e in eps]
    captured = sum(1 for d in all_d if is_ok(d))
    isok = '<span class="b ok">jest</span>'
    def files(rows):
        h = "<tr><th>Plik</th><th>Opis</th><th>Stan</th></tr>"
        for rel, desc, st in rows:
            name = f'<code>{esc(rel)}</code>'
            if "<" not in rel and exists(rel):
                name = f'<a href="{esc(rel)}"><code>{esc(rel)}</code></a>'
            h += f'<tr><td>{name}</td><td>{desc}</td><td>{st}</td></tr>'
        return f'<div class="tablewrap"><table>{h}</table></div>'
    out_rows = [
        ("results/collected.json", "wszystko z jednego uruchomienia w jednym pliku: <code>device</code>, <code>login</code>, pakiety. <strong>To wystarczy przekazać dalej.</strong>", status("results/collected.json")),
        ("results/samples/<zakładka>/<id>.json", "ten sam wynik rozbity na pakiety; z nich generator wstawia przykłady do dokumentacji", status("results/samples")),
        ("results/collect.log", "log przebiegu: numer, nazwa pakietu, kod HTTP, rozmiar (bez hasła)", status("results/collect.log")),
        ("results/discover.json", "wynik <code>-Discover</code>: własne pliki WWW urządzenia (strony, skrypty JS, <code>Config/*.json</code>)", status("results/discover.json")),
        ("results/archive/", "zachowane wyniki wcześniejszych uruchomień na urządzeniu (probe, discover, nieudane próby)", status("results/archive")),
    ]
    src_rows = [
        ("data/device-config/", "pliki WWW pobrane z urządzenia (<code>Config/*.json</code>, <code>Script/*.js</code>, strona logowania) – źródło prawdy dla listy zapytań", status("data/device-config")),
        ("data/rem102-packages.tsv", f"lista {len(eps)} pakietów: nazwa, zakładka, zapytanie, poziom dostępu, wymagane moduły", isok),
        ("data/rem102-package-names.txt", "nazwy pakietów (<code>tab.id</code>) – pozycje enuma w LabVIEW", isok),
        ("data/rem102-package-requests.txt", "zapytania w tej samej kolejności – tablica stringów indeksowana enumem", isok),
        ("scripts/build-packages.py", "buduje listę pakietów z <code>data/device-config/Config/*.json</code>", isok),
        ("scripts/collect.sh", "bash: pobiera po kolei wszystkie pakiety i zapisuje wynik do <code>results/</code>", isok),
        ("scripts/collect.ps1", "Windows (PowerShell 5.1+): to samo, plus <code>-Discover</code> i <code>-Probe</code>", isok),
        ("scripts/collect.cmd", "launcher dla <code>collect.ps1</code> (bez zmiany polityki wykonywania skryptów)", isok),
        ("scripts/rem102-info.sh", "skrót do <code>collect.sh</code>: wynik JSON na stdout", isok),
        ("scripts/build-docs.py", "generuje dokumentację (HTML i md, PL i EN) oraz tę stronę", isok),
    ]
    doc_rows = [
        ("docs/rem102-api.html", "dokumentacja jak do API (PL)", isok), ("docs/rem102-api_en.html", "dokumentacja jak do API (EN)", isok),
        ("docs/rem102-info.md", "ta sama treść w Markdown (PL)", isok), ("docs/rem102-info_en.md", "ta sama treść w Markdown (EN)", isok),
    ]
    done = lambda t: f'<li>☑ {t}</li>'
    todo = lambda t: f'<li>☐ {t}</li>'
    page = f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>REM-102 – odczyt informacji</title>
<style>
{CSS}
</style>
</head>
<body>
<main style="margin:0 auto">
<h1>REM-102 – odczyt informacji o urządzeniu</h1>
<p class="lead">Strona prowadząca do wątku, w którym powstał ten zestaw: <a href="{SESSION_URL}">{SESSION_URL}</a></p>
<div class="callout"><strong>Stan:</strong> znamy już prawdziwe API urządzenia (z jego własnych plików WWW), ale nie mamy jeszcze żadnej prawdziwej odpowiedzi pakietu. Skrypty sprawdzono na atrapie serwera. Poprawne odpowiedzi w dokumentacji: {captured} z {len(eps)}.</div>

<h2>Cel</h2>
<p>Pełny opis podłączonego urządzenia REM-102 (model, numer seryjny, numer artykułu i reszta informacji z zakładek Home, Monitoring, Setup, Advanced) pobierany przez CGI, razem z dokumentacją tych zapytań i danymi do użycia w LabVIEW.</p>

<h2 id="found">Co ustaliliśmy z urządzenia (18.10.2026)</h2>
<ul>
<li><strong>Serwer:</strong> <code>Boa/0.94.14rc21</code>, port 80, strona logowania („Log-in”, HaslerRail). Inne porty nie odpowiadały.</li>
<li><strong>Pliki menu z pierwotnego zestawu były z innej wersji firmware.</strong> To urządzenie używa CGI <code>.cgi</code> (nie <code>.fcgi</code>), a lista zapytań jest inna: kanały A/B, archiwa, Ethernet 2, WLAN, HDLC i inne. Dlatego <code>-Discover</code> pobrał jego własne <code>Config/*.json</code>, a z nich odtworzono listę ({len(eps)} pakietów).</li>
<li><strong>Logowanie nie używa nazwy użytkownika.</strong> Formularz wysyła <code>query=120&amp;login=&lt;1|2|3&gt;&amp;pwd=&lt;hasło&gt;</code> (User, Admin, Super Admin) do <code>/cgi-bin/mpc105.cgi</code>. Sesję niesie ciasteczko <code>CGISESSID</code>, błąd to <code>{{"value":"fail"}}</code>.</li>
<li><strong>Wcześniejsze 404 i 502:</strong> pierwotne zapytania szły na nieistniejące <code>.fcgi</code> (404); <code>rem.cgi</code> z nieznanym numerem zapytania daje 502 „The CGI was not CGI/1.1 compliant”. Biblioteka HTTP z PowerShella nie radziła sobie z odpowiedzią <code>mpc105.cgi</code> (kod 0), dlatego <code>collect.ps1</code> mówi teraz surowym HTTP przez TCP.</li>
<li>Zapisy z tych prób są w <code>results/archive/</code>: <a href="results/archive/probe-2026-10-18.json">probe</a>, <a href="results/archive/discover-2026-10-18.json">discover</a>, <a href="results/archive/collected-2026-10-18_all-404.json">pierwsze zbieranie (wszystko 404)</a>.</li>
</ul>

<h2>Działania i po co</h2>
<ul>
<li><strong>Odczytano własne pliki WWW urządzenia</strong> (<code>-Probe</code>, <code>-Discover</code>) – żeby oprzeć dokumentację na tym, co urządzenie naprawdę udostępnia, a nie na zgadywaniu.</li>
<li><strong>Odtworzono listę zapytań tylko do odczytu</strong> z <code>Config/*.json</code> i wykluczono zapis, reset, reboot, upload i wylogowanie – żeby odczyt niczego nie zmieniał.</li>
<li><strong>Napisano skrypty zbierające</strong> (<code>collect.sh</code>, <code>collect.ps1</code>) – pobierają wszystko po kolei i zapisują do plików, z których uzupełnia się dokumentację.</li>
<li><strong>Dokumentacja w HTML i md, PL i EN</strong> z jednego źródła – opis API, sekwencja curl dla podstawowych informacji, przykłady.</li>
<li><strong>Tabele dla LabVIEW</strong> – nazwy do enuma i tablica zapytań, żeby jeden VI obsługiwał każdy pakiet.</li>
<li><strong>Generator</strong> – przykłady odpowiedzi trafiają do dokumentów tylko z danych zebranych z urządzenia, nic nie jest zmyślone.</li>
</ul>

<h2>Kolejność rozwiązań</h2>
<ol>
<li>Sprawdzenie, co odpowiada na adresie (<code>-Probe</code>): Boa, port 80, strona logowania.</li>
<li>Pobranie własnych plików WWW (<code>-Discover</code>): <code>Config/*.json</code> i skrypty JS.</li>
<li>Odczytanie ze skryptów strony protokołu: logowanie poziomem i hasłem, ciasteczko, odczyty GET z JSON.</li>
<li>Odtworzenie listy zapytań z menu urządzenia (<code>build-packages.py</code>) i wykluczenie zapisów.</li>
<li>Zbieranie po kolei i zapis do <code>results/</code> (<code>collect.*</code>), z surowym HTTP w PowerShellu.</li>
<li>Generator wstawia do dokumentów wyłącznie zebrane odpowiedzi; reszta jest oznaczona „do uzupełnienia”.</li>
<li>LabVIEW: enum wybiera zapytanie, typ (typedef) wybiera parser – malleable VI <code>Get Package.vim</code>.</li>
</ol>

<h2>TODO</h2>
<ul class="chk">
{done("Odczytać własne pliki WWW urządzenia i ustalić API (Boa, <code>.cgi</code>, logowanie poziomem)")}
{done("Odtworzyć listę zapytań z <code>Config/*.json</code> urządzenia, przepisać skrypty i dokumentację")}
{todo("Uruchomić <code>collect.cmd</code> z poziomem Super Admin i hasłem – pierwsza prawdziwa odpowiedź (<code>results\\\\collected.json</code>)")}
{todo("Uruchomić ponownie <code>collect.cmd -Discover</code> – nowa wersja pobiera też strony <code>*.html</code> i ich skrypty (separator <code>~</code>, format odpowiedzi)")}
{todo("Przekazać <code>collected.json</code> i <code>discover.json</code> – dokumentację uzupełnia się z nich (<code>python3 rem102/scripts/build-docs.py</code>)")}
{todo("Sprawdzić <code>collect.ps1</code> w Windows PowerShell 5.1 (testowano w PowerShell 7 na atrapie)")}
{todo("Potwierdzić format odpowiedzi poszczególnych pakietów i poziomy dostępu (<code>min_level</code>)")}
{todo("Potwierdzić, że odczyt <code>advanced.information_events</code> i <code>home.ch_*_measures</code> jest bezpieczny – w menu to samo zapytanie służy też do zapisu")}
{todo("LabVIEW: typedefy z próbek, <code>Get Package.vim</code> i <code>Get Package (Raw).vi</code>")}
{todo("Opcjonalnie: wersja EN tej strony")}
</ul>

<h2>Pliki</h2>
<h3 class="sub">Wynikowe (zbierane z urządzenia) – <code>rem102/results/</code></h3>
{files(out_rows)}
<h3 class="sub">Źródłowe i skrypty – <code>rem102/data/</code>, <code>rem102/scripts/</code></h3>
{files(src_rows)}
<h3 class="sub">Dokumentacja – <code>rem102/docs/</code></h3>
{files(doc_rows)}

<h2>Uruchomienie</h2>
<p>Windows (PowerShell) – plik <code>.sh</code> nie uruchomi się, użyj <code>collect.cmd</code> (nie wymaga bash, curl, jq ani Pythona):</p>
<div class="code"><pre><code>cd C:\\rem102\\scripts
.\\collect.cmd -DeviceHost 192.168.128.1 -Discover
.\\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'hasło'</code></pre></div>
<p>Linux / macOS / Git Bash:</p>
<div class="code"><pre><code>REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='hasło' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py</code></pre></div>
<p class="muted">Wersja bash wymaga <code>bash</code>, <code>curl</code>, <code>jq</code>; generator wymaga <code>python3</code> (uruchamiam go ja po otrzymaniu <code>collected.json</code>). Skrypty nie zapisują hasła w plikach wynikowych ani w logu.</p>
</main>
</body>
</html>
"""
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(page)

for c in ("pl", "en"):
    build_html(c)
    build_md(c)
build_index()
print("ok:", sum(1 for e in eps if is_ok(load_sample(e))), "of", len(eps), "packages have a captured usable sample")
