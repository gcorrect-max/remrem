#!/usr/bin/env python3
"""Generates the REM102 documentation from the package list and from data captured on a real device.

Inputs (all inside rem102/):
  data/rem102-packages.tsv        list of packages (single source of truth)
  results/samples/<tab>/<id>.json captured responses, or
  results/collected.json          the same data in one file (written by scripts/collect.sh)

Outputs:
  docs/rem102-api.html, docs/rem102-api_en.html   API-style reference pages (PL/EN)
  docs/rem102-info.md,  docs/rem102-info_en.md    the "Response examples" section
                                                  (between the rem102-samples markers)
  index.html                                      the hub page (what was done, TODO, file list)

Response examples come ONLY from data captured on a real device:
  REM_HOST=... REM_USER=... REM_PASS=... ./rem102/scripts/collect.sh
  python3 rem102/scripts/build-docs.py
Packages without captured data are marked as "to be filled in".

Usage: python3 rem102/scripts/build-docs.py [--samples DIR] [--collected FILE]
"""
import csv, html, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAMPLES = os.path.join(ROOT, "results", "samples")
COLLECTED = os.path.join(ROOT, "results", "collected.json")
if "--samples" in sys.argv:
    SAMPLES = os.path.abspath(sys.argv[sys.argv.index("--samples") + 1])
if "--collected" in sys.argv:
    COLLECTED = os.path.abspath(sys.argv[sys.argv.index("--collected") + 1])
esc = html.escape

with open(os.path.join(ROOT, "data", "rem102-packages.tsv"), encoding="utf-8", newline="") as f:
    eps = list(csv.DictReader(f, delimiter="	"))

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
    """True for a captured package with an HTTP 2xx answer (only those are shown as response examples)."""
    try:
        return isinstance(d, dict) and 200 <= int(d.get("http_status") or 0) < 300
    except (TypeError, ValueError):
        return False

def sample_text(d):
    body = d.get("body")
    return body if isinstance(body, str) else json.dumps(body, indent=2, ensure_ascii=False)

CSS = r''':root{--bg:#f7f8fa;--panel:#fff;--text:#1b2230;--muted:#5d6779;--line:#dde1e8;--accent:#0b6bcb;--accent-bg:#e6f0fb;--code-bg:#f0f2f6;--warn:#b45309;--warn-bg:#fdf1de;--bad:#b42318;--bad-bg:#fdeceb;--get:#0a7a4b;--get-bg:#dff5ea}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#0f131a;--panel:#171c25;--text:#e4e8ef;--muted:#9aa5b8;--line:#2a3140;--accent:#6aaaf0;--accent-bg:#17283d;--code-bg:#0c1016;--warn:#f0b35c;--warn-bg:#2d2312;--bad:#f5918a;--bad-bg:#2f1a19;--get:#5fd49b;--get-bg:#12281f}}
:root[data-theme="dark"]{--bg:#0f131a;--panel:#171c25;--text:#e4e8ef;--muted:#9aa5b8;--line:#2a3140;--accent:#6aaaf0;--accent-bg:#17283d;--code-bg:#0c1016;--warn:#f0b35c;--warn-bg:#2d2312;--bad:#f5918a;--bad-bg:#2f1a19;--get:#5fd49b;--get-bg:#12281f}
*{box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:16px}
body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px}
a{color:var(--accent)}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);min-height:100vh}
aside{position:sticky;top:0;height:100vh;overflow:auto;padding:16px;border-right:1px solid var(--line);background:var(--panel)}
aside h1{font-size:16px;margin:0 0 4px}
aside input{width:100%;padding:8px 10px;margin:10px 0 12px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--text);font:inherit}
.nav-group{margin-bottom:12px}
.nav-h{display:flex;justify-content:space-between;font-weight:600;text-decoration:none;color:var(--text);padding:4px 0}
.nav-h span{color:var(--muted);font-weight:400}
.nav-i{display:block;padding:2px 0 2px 10px;text-decoration:none;color:var(--muted);font-size:13px;border-left:2px solid var(--line)}
.nav-i:hover{color:var(--accent);border-color:var(--accent)}
main{padding:24px 32px 64px;max-width:960px;width:100%}
h2{margin:40px 0 4px;font-size:22px}
h3{margin:0;font-size:15px}
.tabkey{font-size:12px;background:var(--code-bg);padding:2px 6px;border-radius:4px;color:var(--muted);font-weight:400}
.muted{color:var(--muted)} .small{font-size:12.5px;margin:8px 0 0}
.lead{font-size:17px;color:var(--muted);margin-top:4px}
.card{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:16px 18px;margin:14px 0}
table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:7px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:12.5px;text-transform:uppercase;letter-spacing:.03em}
.tablewrap{overflow-x:auto}
.ep{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:14px 16px;margin:12px 0}
.ep header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}
.badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
.m{display:inline-block;background:var(--get-bg);color:var(--get);font-weight:700;font-size:11px;padding:2px 7px;border-radius:4px;letter-spacing:.04em}
.b{font-size:11px;padding:2px 7px;border-radius:4px;white-space:nowrap}
.lvl{background:var(--warn-bg);color:var(--warn)}
.url{display:flex;align-items:center;gap:10px;margin:10px 0 8px;padding:8px 10px;background:var(--code-bg);border-radius:6px;overflow-x:auto}
.url code{white-space:nowrap}
.req{margin:6px 0;color:var(--muted);font-size:13.5px}
.code{position:relative}
pre{margin:0;padding:12px 14px;background:var(--code-bg);border-radius:6px;overflow-x:auto}
.copy{position:absolute;top:6px;right:6px;font:12px system-ui;background:var(--panel);color:var(--muted);border:1px solid var(--line);border-radius:5px;padding:3px 8px;cursor:pointer}
.copy:hover{color:var(--accent);border-color:var(--accent)}
.callout{border-left:4px solid var(--warn);background:var(--warn-bg);padding:10px 14px;border-radius:0 6px 6px 0;margin:14px 0}
.callout.bad{border-color:var(--bad);background:var(--bad-bg)}
.hidden{display:none!important}
@media (max-width:820px){.layout{grid-template-columns:minmax(0,1fr)} h1,h2,h3{overflow-wrap:anywhere} aside{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)} .nav-i{display:none} main{padding:20px 16px 48px} .ep header{flex-direction:column}}
'''

# ---------- per-language text ----------
TABS = ["identity","home","setup","advanced","monitoring","features"]
L = {
"pl": dict(
 lang="pl", file="rem102-api.html", other="rem102-api_en.html", other_name="English", 
 tabs={"identity":("Identyfikacja","Model, numer seryjny, numer artykułu i wersje oprogramowania."),
       "home":("Home","Status miernika, kanały EMF, wejścia/wyjścia cyfrowe, sieć."),
       "setup":("Setup","Konfiguracja miernika, DCS, interfejsów sieciowych i usług."),
       "advanced":("Advanced","Czas RTC i zdarzenia."),
       "monitoring":("Monitoring","Stan interfejsów, statystyki DCS, pamięci i podzespołów."),
       "features":("Features","Flagi włączenia modułów (en_query) – wyjaśniają puste pakiety.")},
 notes={("identity","device_settings"):"Główne źródło: model, numer seryjny, numer artykułu i pozostałe dane urządzenia. W menu pole zapisu ma write_level 3, odczyt jest dostępny od poziomu 0.",
        ("identity","version"):"Wersje oprogramowania (firmware, FPGA, DSP).",
        ("identity","host"):"Nazwa hosta z settings.json. Nazwa projektu w settings.json: REM102-S2.",
        ("identity","auth_message"):"Komunikat uwierzytelniania z settings.json.",
        ("identity","meter_settings"):"Ustawienia miernika (strona Setup › Meter › Settings).",
        ("identity","dmeter_serial"):"Numer seryjny DMeter (iTEMS). Używa pliku items.fcgi.",
        ("advanced","events"):"W menu to samo zapytanie służy też do zapisu (set = query=314); skrypt wysyła tylko odczyt."},
 ui=dict(subtitle="odczyt informacji o urządzeniu", packages="pakietów", search="Szukaj: id, query, opis…", intro="Wprowadzenie", login="Logowanie",
         conv="Konwencje", env="Format odpowiedzi", excl="Pominięte zapytania", script="Skrypt", assum="Założenia", lv="Integracja z LabVIEW",
         req="Wymaga włączonego modułu:", copy="Kopiuj", copied="Skopiowano", inout="W wyniku skryptu:", sample="Przykładowa odpowiedź (z urządzenia)", last="ostatnia próba", sample_tbd="Przykładowa odpowiedź: do uzupełnienia po podłączeniu do urządzenia."),
 prose=dict(
 title="REM102 – CGI API (odczyt)",
 overview='''<p class="lead">Opis zapytań HTTP, którymi interfejs WWW urządzenia REM102 pobiera dane. Zestawione z plików <code>home.json</code>, <code>setup.json</code>, <code>advanced.json</code>, <code>monitoring.json</code> i <code>settings.json</code>. Uwzględnione są wyłącznie zapytania odczytowe.</p>
<div class="callout"><strong>Status.</strong> Skrypt <code>rem102/scripts/rem102-info.sh</code> sprawdzono na atrapie serwera, nie na prawdziwym urządzeniu. Format ciał odpowiedzi i parametry logowania są założeniami – patrz <a href="#assumptions">Założenia</a>.</div>
<div class="card"><strong>Base URL</strong><pre><code>http://&lt;HOST&gt;        # domyślnie 192.168.128.1</code></pre>
<p>Urządzenie udostępnia cztery pliki CGI:</p>
<div class="tablewrap"><table><tr><th>Plik CGI</th><th>Zakres</th></tr>
<tr><td><code>/cgi-bin/mpc105.fcgi</code></td><td>platforma: logowanie, sieć, GPS, modem, RTC, informacje o urządzeniu, pamięci</td></tr>
<tr><td><code>/cgi-bin/rem.fcgi</code></td><td>miernik REM: status, kanały EMF, DCS, Digital IO, konfiguracja kanałów</td></tr>
<tr><td><code>/cgi-bin/items.fcgi</code></td><td>DMeter (iTEMS)</td></tr>
<tr><td><code>/cgi-bin/rtp.fcgi</code></td><td>RTP100</td></tr></table></div></div>''',
 auth='''<p>Po udanym logowaniu urządzenie ustawia ciasteczka <code>CGIUSERNAME</code> i <code>CGIUSERLEVEL</code>. Wszystkie dalsze zapytania wysyłaj z <code>-b "$JAR"</code>.</p>
<div class="tablewrap"><table><tr><th>query</th><th>Funkcja</th></tr>
<tr><td><code>query=120</code></td><td>logowanie</td></tr>
<tr><td><code>query=125</code></td><td>komunikat uwierzytelniania (<code>identity.auth_message</code>)</td></tr>
<tr><td><code>query=126</code></td><td>nazwa hosta (<code>identity.host</code>)</td></tr>
<tr><td><code>query=121</code></td><td>zmiana hasła – zapis, nieużywane</td></tr>
<tr><td><code>query=1983</code></td><td>wylogowanie</td></tr></table></div>
<p class="muted">Strony z <code>show_level</code> 1 lub 2 mogą wymagać konta o wyższym poziomie (<code>CGIUSERLEVEL</code>).</p>''',
 conv='''<ul>
<li>Zapytania odczytowe wysyłane są metodą <strong>GET</strong>: <code>curl -G … --data-raw "query=…"</code> dołącza parametry do URL-a.</li>
<li>W plikach menu parametry w polu <code>query</code> bywają rozdzielone znakiem <code>~</code> (np. <code>query=450~user=1</code>). W prawdziwym żądaniu to <code>&amp;</code>: <code>query=450&amp;user=1</code>.</li>
<li>Pola <code>en_cgi</code>/<code>en_query</code> w menu sprawdzają, czy moduł jest włączony – to pakiety z zakładki <a href="#tab-features">Features</a>.</li>
<li>Pola <code>set</code> i <code>set1</code> zapisują konfigurację – <strong>nie są</strong> używane.</li>
</ul>''',
 env_intro='<p>Skrypt zwraca jeden obiekt JSON: <code>device</code> (metadane), <code>login</code> (wynik logowania) + klucz na zakładkę + pakiety po <code>id</code>.</p>',
 env_fields=[("label","ścieżka w menu WWW"),("cgi, query","dokładnie to, co poszło do urządzenia"),("http_status","kod HTTP; <code>0</code> = błąd połączenia lub timeout"),("content_type","nagłówek Content-Type odpowiedzi (<code>null</code>, jeśli go brak)"),("post_retry","tylko gdy GET zawiódł (kod inny niż 2xx lub pusta odpowiedź): wynik jednorazowej próby POST"),("body","JSON, jeśli odpowiedź się parsuje; inaczej surowy tekst; <code>null</code> gdy pusta")],
 env_th=("Pole","Opis"), env_note="Błąd jednego pakietu (np. moduł wyłączony) nie przerywa zbierania pozostałych.", env_orig="odpowiedź urządzenia",
 excl_callout="Poniższych zapytań skrypt <strong>nie</strong> wysyła – zmieniają stan urządzenia lub ujawniają dane kont.",
 excl_th=("Zapytanie","Powód"),
 excl=[("rem.fcgi?query=440","Restore Factory Default – przywraca ustawienia fabryczne"),("mpc105.fcgi?query=1982","restart urządzenia"),("rem.fcgi?query=402","Export SIC Configuration – akcja eksportu"),("mpc105.fcgi?query=122","Accounts Management – dane kont użytkowników"),("items.fcgi?query=410, rtp.fcgi?query=442/443/445","zapis/komendy DMeter i RTP100"),("wszystkie pola set / set1","zapis konfiguracji")],
 script_th=("Zmienna","Znaczenie","Domyślnie"),
 script_vars=[("REM_HOST","adres urządzenia (może zawierać port)","192.168.128.1"),("REM_USER","login","wymagana"),("REM_PASS","hasło","wymagana"),("REM_LOGIN_BODY","pełne ciało żądania logowania","query=120&amp;username=…&amp;pwd=…"),("REM_OUT_DIR","katalog wynikowy (collected.json, samples/, collect.log)","rem102/results/"),("REM_TIMEOUT","limit czasu jednego zapytania, s","10"),("REM_DELAY","przerwa między zapytaniami, s","0")],
 script_dump="# zapis do plików (domyślnie rem102/results/): collected.json, samples/&lt;zakładka&gt;/&lt;id&gt;.json, collect.log",
 script_req="Wymaga <code>bash</code>, <code>curl</code>, <code>jq</code>. Przykłady <code>jq</code>:",
 win_html='<h3 class="sub">Windows (PowerShell)</h3><p>Pliki <code>.sh</code> nie uruchomią się w Windows (system pyta, czym otworzyć plik). Użyj wersji PowerShell: <code>rem102\\scripts\\collect.ps1</code>. Nie wymaga ani basha, ani <code>curl</code>, ani <code>jq</code>, ani Pythona – wystarcza Windows PowerShell 5.1.</p><pre><code>cd C:\\rem102\\scripts\n.\\collect.cmd -DeviceHost 192.168.128.1 -User user -Password password</code></pre><ul><li>Bez <code>-Password</code> skrypt zapyta o hasło.</li><li><code>collect.cmd</code> uruchamia <code>collect.ps1</code> z <code>-ExecutionPolicy Bypass</code>, więc nie trzeba zmieniać ustawień PowerShell. Jeśli uruchamiasz <code>.ps1</code> bezpośrednio i dostajesz błąd o zablokowanych skryptach, wykonaj <code>Unblock-File .\\collect.ps1</code>.</li><li>Wynik jest w <code>rem102\\results\\</code> (<code>collected.json</code>, <code>samples\\</code>, <code>collect.log</code>), w tym samym formacie co z <code>collect.sh</code>.</li><li>Parametry odpowiadają zmiennym <code>REM_*</code>: <code>-DeviceHost</code>, <code>-User</code>, <code>-Password</code>, <code>-LoginBody</code>, <code>-OutDir</code>, <code>-TimeoutSec</code>, <code>-DelayMs</code>, <code>-StdOut</code>.</li><li>W PowerShellu <code>curl</code> jest aliasem <code>Invoke-WebRequest</code>. Polecenia curl z tej dokumentacji uruchamiaj jako <code>curl.exe</code> (Windows 10 i nowsze); składnia powłoki (<code>\\</code>, <code>$HOST</code>) też się różni, więc do zbierania danych użyj <code>collect.cmd</code>.</li><li>Nazwę użytkownika ze spacją podaj w cudzysłowie: <code>-User "Super Admin"</code> (bez cudzysłowu druga część trafia do innego parametru). To samo dotyczy hasła ze znakami specjalnymi.</li><li>Gdy wszystko zwraca HTTP 404 (jak przy pierwszym uruchomieniu), uruchom <code>.\\collect.cmd -DeviceHost 192.168.128.1 -Probe</code>. Tryb <code>-Probe</code> nie wysyła danych logowania; sprawdza porty 80/8080/8000/8081/443/8443 i kilka ścieżek, a wynik zapisuje w <code>results\\probe.json</code>.</li><li>Gdy CGI jest pod innym adresem, podaj go: <code>-BaseUrl https://192.168.128.1:8443</code> (albo <code>http://host:port/prefiks</code>); <code>-Insecure</code> akceptuje certyfikat self-signed.</li><li>Gdy urządzenie używa <code>.cgi</code> zamiast <code>.fcgi</code> (tak jest w firmware, który odpowiedział w teście), dodaj <code>-CgiExt cgi</code>. Wtedy login i wszystkie zapytania idą na <code>/cgi-bin/*.cgi</code>.</li><li><code>-Discover</code> czyta własne pliki WWW urządzenia (strona logowania, <code>Config/*.json</code>, skrypty JS), bez logowania, i zapisuje <code>results\\discover.json</code>. Pokazuje prawdziwe nazwy CGI i format logowania.</li><li><code>collect.ps1</code> sprawdzono w PowerShell 7 na atrapie serwera, w Windows PowerShell 5.1 jeszcze nie.</li></ul>',
 jq1="# identyfikacja urządzenia", jq2="# pakiety, które się nie udały",
 assum='''<ol>
<li><strong>Logowanie.</strong> Pliki menu podają tylko <code>query=120</code>. Nazwy pól <code>username</code> i <code>pwd</code> oraz nazwy ciasteczek pochodzą z konfiguracji LabVIEW (<code>data/modulesCfg.ts</code>). Jeśli logowanie się nie uda, przechwyć prawdziwe żądanie w DevTools i podaj je w <code>REM_LOGIN_BODY</code>.</li>
<li><strong>GET kontra POST.</strong> Odczyty idą GET-em. Przy pustych odpowiedziach spróbuj POST.</li>
<li><strong>Format odpowiedzi.</strong> Nie wiadomo, czy urządzenie odpowiada JSON-em. Skrypt obsługuje JSON i zwykły tekst.</li>
<li><strong>Poziomy dostępu.</strong> Znaczenie <code>show_level</code> przyjęto jako minimalny poziom użytkownika do wyświetlenia strony.</li>
</ol>''',
 lv='''<p>Lista zapytań jest dostępna jako pliki w <code>rem102/data/</code>, gotowe do wczytania w LabVIEW. Kolejność wierszy jest we wszystkich plikach taka sama.</p>
<div class="tablewrap"><table><tr><th>Plik</th><th>Zawartość</th><th>Użycie</th></tr>
<tr><td><code>rem102-package-names.txt</code></td><td>jedna nazwa pakietu w wierszu (<code>tab.id</code>)</td><td>pozycje enuma (typedef)</td></tr>
<tr><td><code>rem102-package-requests.txt</code></td><td>jedno zapytanie w wierszu: <code>/cgi-bin/mpc105.fcgi?query=302</code></td><td>tablica stringów indeksowana wartością enuma</td></tr>
<tr><td><code>rem102-packages.tsv</code></td><td>wszystkie kolumny z nagłówkiem: <code>index, name, tab, id, cgi, query, request, method, min_level, requires, label</code></td><td>wyszukiwanie po nazwie, bramkowanie po <code>min_level</code> i <code>requires</code></td></tr></table></div>
<p>Nazwy mają postać <code>tab.id</code>, bo samo <code>id</code> się powtarza (np. <code>gps</code> występuje w Setup, Monitoring i Features).</p>
<h3 class="sub">Przepływ</h3>
<ol>
<li><strong>Enum.</strong> Utwórz typedef <code>REM102 Package</code>; pozycje z <code>rem102-package-names.txt</code>. Wartość enuma to 0-based numer wiersza.</li>
<li><strong>Tablica zapytań.</strong> <em>Read from Text File</em> (z konwersją końców linii) rozbij na wiersze do <code>String[]</code>. Wczytaj raz przy starcie (functional global albo DVR).</li>
<li><strong>Zapytanie.</strong> <em>Index Array</em> wartością enuma → ścieżka. Dopisz <code>http://</code> + host.</li>
<li><strong>GET.</strong> <em>HTTP Client</em> z ciasteczkami sesji po logowaniu (<code>query=120</code>) → ciało odpowiedzi jako string.</li>
<li><strong>Parsowanie.</strong> <em>Unflatten From JSON</em> do typedefu danego pakietu.</li>
</ol>
<h3 class="sub">VI polimorficzny</h3>
<p>Polimorficzny VI wybiera instancję po <strong>typie</strong> podłączonych danych, nie po wartości enuma. Enum wybiera więc zapytanie, a typ wybiera parser. Dla jednego VI obsługującego każdy pakiet najlepiej pasuje <strong>malleable VI</strong> (<code>.vim</code>, LabVIEW 2017 lub nowszy):</p>
<pre><code>Get Package.vim
  wejścia:  Package (enum REM102 Package), Type (dowolny typedef – specyfikator typu), Host, sesja
  wyjścia:  Data (typu Type), Raw Body (string), HTTP Status, error out
  wnętrze:  Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)</code></pre>
<p>Dla każdego pakietu wystarczy osobny typedef klastra – nie trzeba osobnej instancji. Klasyczny polimorficzny <code>.vi</code> też zadziała, ale wymaga instancji na każdy typedef.</p>
<p>Dopóki nie znasz prawdziwych odpowiedzi, użyj <code>Get Package (Raw).vi</code> zwracającego sam string. Typedefy zbuduj z próbek zebranych skryptem <code>collect.sh</code> na prawdziwym urządzeniu.</p>
<p class="muted">Przed odczytem sprawdź w tsv kolumny <code>min_level</code> (poziom konta) i <code>requires</code> (pakiet <code>features.*</code>, który mówi, czy moduł jest włączony).</p>''',
 ),
),
"en": dict(
 lang="en", file="rem102-api_en.html", other="rem102-api.html", other_name="Polski",
 tabs={"identity":("Identity","Model, serial number, article number and software versions."),
       "home":("Home","Meter status, EMF channels, digital I/O, networking."),
       "setup":("Setup","Meter, DCS, network interface and service configuration."),
       "advanced":("Advanced","RTC time and events."),
       "monitoring":("Monitoring","Interface state, DCS statistics, memories and hardware blocks."),
       "features":("Features","Module enable flags (en_query) – they explain empty packages.")},
 notes={("identity","device_settings"):"Main source of the model, serial number, article number and other device data. In the menu the write field has write_level 3; reading is available from level 0.",
        ("identity","version"):"Software versions (firmware, FPGA, DSP).",
        ("identity","host"):"Hostname from settings.json. Project name in settings.json: REM102-S2.",
        ("identity","auth_message"):"Authentication message from settings.json.",
        ("identity","meter_settings"):"Meter settings (page Setup › Meter › Settings).",
        ("identity","dmeter_serial"):"DMeter (iTEMS) serial number. Uses items.fcgi.",
        ("advanced","events"):"In the menu the same query is also used for writing (set = query=314); the script sends reads only."},
 ui=dict(subtitle="device information readout", packages="packages", search="Search: id, query, description…", intro="Overview", login="Login",
         conv="Conventions", env="Response format", excl="Excluded requests", script="Script", assum="Assumptions", lv="LabVIEW integration",
         req="Requires enabled module:", copy="Copy", copied="Copied", inout="In script output:", sample="Example response (from the device)", last="last attempt", sample_tbd="Example response: to be filled in after connecting to the device."),
 prose=dict(
 title="REM102 – CGI API (read-only)",
 overview='''<p class="lead">Description of the HTTP requests that the REM102 web interface uses to fetch data. Compiled from <code>home.json</code>, <code>setup.json</code>, <code>advanced.json</code>, <code>monitoring.json</code> and <code>settings.json</code>. Only read requests are included.</p>
<div class="callout"><strong>Status.</strong> The <code>rem102/scripts/rem102-info.sh</code> script was tested against a mock server, not a real device. The response body format and the login parameters are assumptions – see <a href="#assumptions">Assumptions</a>.</div>
<div class="card"><strong>Base URL</strong><pre><code>http://&lt;HOST&gt;        # default 192.168.128.1</code></pre>
<p>The device exposes four CGI files:</p>
<div class="tablewrap"><table><tr><th>CGI file</th><th>Scope</th></tr>
<tr><td><code>/cgi-bin/mpc105.fcgi</code></td><td>platform: login, networking, GPS, modem, RTC, device information, memories</td></tr>
<tr><td><code>/cgi-bin/rem.fcgi</code></td><td>REM meter: status, EMF channels, DCS, Digital IO, channel configuration</td></tr>
<tr><td><code>/cgi-bin/items.fcgi</code></td><td>DMeter (iTEMS)</td></tr>
<tr><td><code>/cgi-bin/rtp.fcgi</code></td><td>RTP100</td></tr></table></div></div>''',
 auth='''<p>After a successful login the device sets the <code>CGIUSERNAME</code> and <code>CGIUSERLEVEL</code> cookies. Send every further request with <code>-b "$JAR"</code>.</p>
<div class="tablewrap"><table><tr><th>query</th><th>Function</th></tr>
<tr><td><code>query=120</code></td><td>login</td></tr>
<tr><td><code>query=125</code></td><td>authentication message (<code>identity.auth_message</code>)</td></tr>
<tr><td><code>query=126</code></td><td>hostname (<code>identity.host</code>)</td></tr>
<tr><td><code>query=121</code></td><td>change password – a write, not used</td></tr>
<tr><td><code>query=1983</code></td><td>logout</td></tr></table></div>
<p class="muted">Pages with <code>show_level</code> 1 or 2 may require an account with a higher level (<code>CGIUSERLEVEL</code>).</p>''',
 conv='''<ul>
<li>Read requests are sent with <strong>GET</strong>: <code>curl -G … --data-raw "query=…"</code> appends the parameters to the URL.</li>
<li>In the menu files the <code>query</code> field sometimes separates parameters with <code>~</code> (e.g. <code>query=450~user=1</code>). In the real request this is <code>&amp;</code>: <code>query=450&amp;user=1</code>.</li>
<li>The <code>en_cgi</code>/<code>en_query</code> menu fields check whether a module is enabled – these are the packages in the <a href="#tab-features">Features</a> tab.</li>
<li>The <code>set</code> and <code>set1</code> fields write configuration – they are <strong>not</strong> used.</li>
</ul>''',
 env_intro='<p>The script returns one JSON object: <code>device</code> (metadata), <code>login</code> (login result) + a key per tab + packages keyed by <code>id</code>.</p>',
 env_fields=[("label","path in the web menu"),("cgi, query","exactly what was sent to the device"),("http_status","HTTP code; <code>0</code> = connection error or timeout"),("content_type","response Content-Type header (<code>null</code> if absent)"),("post_retry","only when GET failed (non-2xx code or empty response): result of a single POST retry"),("body","JSON if the response parses; otherwise raw text; <code>null</code> when empty")],
 env_th=("Field","Description"), env_note="A failure of one package (e.g. a disabled module) does not stop the collection of the others.", env_orig="device response",
 excl_callout="The script does <strong>not</strong> send the requests below – they change device state or expose account data.",
 excl_th=("Request","Reason"),
 excl=[("rem.fcgi?query=440","Restore Factory Default – resets the device to factory settings"),("mpc105.fcgi?query=1982","device reboot"),("rem.fcgi?query=402","Export SIC Configuration – an export action"),("mpc105.fcgi?query=122","Accounts Management – user account data"),("items.fcgi?query=410, rtp.fcgi?query=442/443/445","DMeter and RTP100 writes/commands"),("all set / set1 fields","configuration writes")],
 script_th=("Variable","Meaning","Default"),
 script_vars=[("REM_HOST","device address (may include a port)","192.168.128.1"),("REM_USER","login","required"),("REM_PASS","password","required"),("REM_LOGIN_BODY","full login request body","query=120&amp;username=…&amp;pwd=…"),("REM_OUT_DIR","output directory (collected.json, samples/, collect.log)","rem102/results/"),("REM_TIMEOUT","per-request time limit, s","10"),("REM_DELAY","pause between requests, s","0")],
 script_dump="# write to files (default rem102/results/): collected.json, samples/&lt;tab&gt;/&lt;id&gt;.json, collect.log",
 script_req="Requires <code>bash</code>, <code>curl</code>, <code>jq</code>. <code>jq</code> examples:",
 win_html='<h3 class="sub">Windows (PowerShell)</h3><p><code>.sh</code> files do not run on Windows (the system asks which app should open the file). Use the PowerShell version: <code>rem102\\scripts\\collect.ps1</code>. It needs neither bash, nor <code>curl</code>, nor <code>jq</code>, nor Python – Windows PowerShell 5.1 is enough.</p><pre><code>cd C:\\rem102\\scripts\n.\\collect.cmd -DeviceHost 192.168.128.1 -User user -Password password</code></pre><ul><li>Without <code>-Password</code> the script asks for the password.</li><li><code>collect.cmd</code> runs <code>collect.ps1</code> with <code>-ExecutionPolicy Bypass</code>, so no PowerShell settings need to change. If you run the <code>.ps1</code> directly and get an error about blocked scripts, run <code>Unblock-File .\\collect.ps1</code>.</li><li>The result is in <code>rem102\\results\\</code> (<code>collected.json</code>, <code>samples\\</code>, <code>collect.log</code>), in the same format as from <code>collect.sh</code>.</li><li>The parameters match the <code>REM_*</code> variables: <code>-DeviceHost</code>, <code>-User</code>, <code>-Password</code>, <code>-LoginBody</code>, <code>-OutDir</code>, <code>-TimeoutSec</code>, <code>-DelayMs</code>, <code>-StdOut</code>.</li><li>In PowerShell <code>curl</code> is an alias of <code>Invoke-WebRequest</code>. Run the curl commands from this documentation as <code>curl.exe</code> (Windows 10 and later); shell syntax (<code>\\</code>, <code>$HOST</code>) differs too, so use <code>collect.cmd</code> to collect data.</li><li>Quote a user name that contains a space: <code>-User "Super Admin"</code> (without quotes the second word is bound to another parameter). The same applies to passwords with special characters.</li><li>If everything returns HTTP 404 (as on the first run), run <code>.\\collect.cmd -DeviceHost 192.168.128.1 -Probe</code>. <code>-Probe</code> sends no credentials; it checks ports 80/8080/8000/8081/443/8443 and a few paths and writes the result to <code>results\\probe.json</code>.</li><li>If the CGI is at a different address, pass it: <code>-BaseUrl https://192.168.128.1:8443</code> (or <code>http://host:port/prefix</code>); <code>-Insecure</code> accepts a self-signed certificate.</li><li>If the device uses <code>.cgi</code> instead of <code>.fcgi</code> (the firmware that answered in the test does), add <code>-CgiExt cgi</code>. Login and all requests then go to <code>/cgi-bin/*.cgi</code>.</li><li><code>-Discover</code> reads the device\'s own web files (login page, <code>Config/*.json</code>, JS files) without logging in and writes <code>results\\discover.json</code>. It shows the real CGI names and the login format.</li><li><code>collect.ps1</code> was tested in PowerShell 7 against a mock server, not yet in Windows PowerShell 5.1.</li></ul>',
 jq1="# device identification", jq2="# packages that failed",
 assum='''<ol>
<li><strong>Login.</strong> The menu files give only <code>query=120</code>. The <code>username</code> and <code>pwd</code> field names and the cookie names come from the LabVIEW configuration (<code>data/modulesCfg.ts</code>). If login fails, capture the real request in DevTools and pass it in <code>REM_LOGIN_BODY</code>.</li>
<li><strong>GET vs POST.</strong> Reads use GET. If responses are empty, try POST.</li>
<li><strong>Response format.</strong> It is not known whether the device answers with JSON. The script handles both JSON and plain text.</li>
<li><strong>Access levels.</strong> <code>show_level</code> is taken to mean the minimum user level needed to display the page.</li>
</ol>''',
 lv='''<p>The request list is available as files in <code>rem102/data/</code>, ready to load in LabVIEW. Row order is identical in all files.</p>
<div class="tablewrap"><table><tr><th>File</th><th>Content</th><th>Use</th></tr>
<tr><td><code>rem102-package-names.txt</code></td><td>one package name per line (<code>tab.id</code>)</td><td>enum items (typedef)</td></tr>
<tr><td><code>rem102-package-requests.txt</code></td><td>one request per line: <code>/cgi-bin/mpc105.fcgi?query=302</code></td><td>string array indexed by the enum value</td></tr>
<tr><td><code>rem102-packages.tsv</code></td><td>all columns with a header: <code>index, name, tab, id, cgi, query, request, method, min_level, requires, label</code></td><td>lookup by name, gating on <code>min_level</code> and <code>requires</code></td></tr></table></div>
<p>Names are <code>tab.id</code> because a bare <code>id</code> repeats (e.g. <code>gps</code> exists in Setup, Monitoring and Features).</p>
<h3 class="sub">Flow</h3>
<ol>
<li><strong>Enum.</strong> Create a typedef <code>REM102 Package</code> with the items from <code>rem102-package-names.txt</code>. The enum value is the 0-based line number.</li>
<li><strong>Request array.</strong> <em>Read from Text File</em> (with end-of-line conversion), split into lines into a <code>String[]</code>. Load it once at start-up (functional global or DVR).</li>
<li><strong>Request.</strong> <em>Index Array</em> with the enum value → path. Prepend <code>http://</code> + host.</li>
<li><strong>GET.</strong> <em>HTTP Client</em> with the session cookies from login (<code>query=120</code>) → response body as a string.</li>
<li><strong>Parsing.</strong> <em>Unflatten From JSON</em> into the typedef of that package.</li>
</ol>
<h3 class="sub">Polymorphic VI</h3>
<p>A polymorphic VI picks its instance by the <strong>type</strong> of the wired data, not by an enum value. So the enum selects the request and the type selects the parser. For a single VI that handles every package, a <strong>malleable VI</strong> (<code>.vim</code>, LabVIEW 2017 or newer) fits best:</p>
<pre><code>Get Package.vim
  inputs:   Package (enum REM102 Package), Type (any typedef – type specifier), Host, session
  outputs:  Data (of type Type), Raw Body (string), HTTP Status, error out
  inside:   Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)</code></pre>
<p>Each package only needs its own cluster typedef – no separate instance. A classic polymorphic <code>.vi</code> also works but needs one instance per typedef.</p>
<p>Until you know the real responses, use a <code>Get Package (Raw).vi</code> that returns just the string. Build the typedefs from samples collected with <code>collect.sh</code> on a real device.</p>
<p class="muted">Before reading, check the <code>min_level</code> (account level) and <code>requires</code> columns in the tsv (the <code>features.*</code> package that tells whether the module is enabled).</p>''',
 ),
),
}

QUICK = {'pl': {'title': 'Podstawowe informacje – pełna sekwencja curl', 'nav': 'Podstawowe informacje', 'intro': '<p>Użytkownik <code>user</code>, hasło <code>password</code>, adres domyślny <code>192.168.128.1</code>. Kroki 2–6 zwracają model, numer seryjny, numer artykułu i pozostałe dane identyfikacyjne.</p>', 'seq': 'HOST=192.168.128.1\nJAR=$(mktemp)\n\n# 1. login (cookies CGIUSERNAME / CGIUSERLEVEL are saved in $JAR)\ncurl -sS -w &#x27;\\n&#x27; -c &quot;$JAR&quot; -X POST &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; \\\n     --data-raw &quot;query=120&amp;username=user&amp;pwd=password&quot;\ncat &quot;$JAR&quot;    # powinny być widoczne CGIUSERNAME i CGIUSERLEVEL\n\n# 2. model, numer seryjny, numer artykułu i pozostałe dane urządzenia\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=302&quot;\n\n# 3. wersje oprogramowania (firmware, FPGA, DSP)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=301&quot;\n\n# 4. nazwa hosta\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=126&quot;\n\n# 5. ustawienia miernika\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/rem.fcgi&quot; --data-raw &quot;query=105&quot;\n\n# 6. numer seryjny DMeter (tylko jeśli moduł jest włączony)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/items.fcgi&quot; --data-raw &quot;query=407&quot;\n\n# 7. wylogowanie (opcjonalnie)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=1983&quot;\nrm -f &quot;$JAR&quot;', 'one_intro': 'Wszystko jednym poleceniem (bez wylogowania), z nagłówkiem przed każdą odpowiedzią:', 'one': 'HOST=192.168.128.1; JAR=$(mktemp)\ncurl -sS -w &#x27;\\n&#x27; -c &quot;$JAR&quot; -X POST &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=120&amp;username=user&amp;pwd=password&quot;\nfor r in mpc105.fcgi:302 mpc105.fcgi:301 mpc105.fcgi:126 rem.fcgi:105 items.fcgi:407; do\n  printf &#x27;\\n== %s?query=%s ==\\n&#x27; &quot;${r%%:*}&quot; &quot;${r##*:}&quot;\n  curl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/${r%%:*}&quot; --data-raw &quot;query=${r##*:}&quot;\ndone; rm -f &quot;$JAR&quot;', 'note': '<p class="muted">Nazwy pól logowania (<code>username</code>, <code>pwd</code>) są założeniem – patrz <a href="#assumptions">Założenia</a>. Hasło ze znakami specjalnymi (<code>&amp;</code>, <code>+</code>, <code>%</code>) wymaga kodowania URL w <code>--data-raw</code> albo użycia <code>--data-urlencode "pwd=…"</code>.</p>'}, 'en': {'title': 'Basic information – full curl sequence', 'nav': 'Basic information', 'intro': '<p>User <code>user</code>, password <code>password</code>, default address <code>192.168.128.1</code>. Steps 2–6 return the model, serial number, article number and the other identification data.</p>', 'seq': 'HOST=192.168.128.1\nJAR=$(mktemp)\n\n# 1. login (cookies CGIUSERNAME / CGIUSERLEVEL are saved in $JAR)\ncurl -sS -w &#x27;\\n&#x27; -c &quot;$JAR&quot; -X POST &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; \\\n     --data-raw &quot;query=120&amp;username=user&amp;pwd=password&quot;\ncat &quot;$JAR&quot;    # CGIUSERNAME and CGIUSERLEVEL should be listed\n\n# 2. model, serial number, article number and other device data\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=302&quot;\n\n# 3. software versions (firmware, FPGA, DSP)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=301&quot;\n\n# 4. hostname\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=126&quot;\n\n# 5. meter settings\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/rem.fcgi&quot; --data-raw &quot;query=105&quot;\n\n# 6. DMeter serial number (only if the module is enabled)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/items.fcgi&quot; --data-raw &quot;query=407&quot;\n\n# 7. logout (optional)\ncurl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=1983&quot;\nrm -f &quot;$JAR&quot;', 'one_intro': 'Everything in one command (no logout), with a header before each response:', 'one': 'HOST=192.168.128.1; JAR=$(mktemp)\ncurl -sS -w &#x27;\\n&#x27; -c &quot;$JAR&quot; -X POST &quot;http://$HOST/cgi-bin/mpc105.fcgi&quot; --data-raw &quot;query=120&amp;username=user&amp;pwd=password&quot;\nfor r in mpc105.fcgi:302 mpc105.fcgi:301 mpc105.fcgi:126 rem.fcgi:105 items.fcgi:407; do\n  printf &#x27;\\n== %s?query=%s ==\\n&#x27; &quot;${r%%:*}&quot; &quot;${r##*:}&quot;\n  curl -sS -w &#x27;\\n&#x27; -b &quot;$JAR&quot; -G &quot;http://$HOST/cgi-bin/${r%%:*}&quot; --data-raw &quot;query=${r##*:}&quot;\ndone; rm -f &quot;$JAR&quot;', 'note': '<p class="muted">The login field names (<code>username</code>, <code>pwd</code>) are an assumption – see <a href="#assumptions">Assumptions</a>. A password with special characters (<code>&amp;</code>, <code>+</code>, <code>%</code>) needs URL encoding in <code>--data-raw</code>, or use <code>--data-urlencode "pwd=…"</code>.</p>'}}

def build(code):
    T = L[code]; U = T["ui"]; P = T["prose"]
    def anchor(e): return f'{e["tab"]}-{e["id"]}'
    def sample_html(e):
        d = load_sample(e)
        if d is None:
            return f'<p class="muted small tbd">{U["sample_tbd"]}</p>'
        if not is_ok(d):
            return f'<p class="muted small tbd">{U["sample_tbd"]} ({U["last"]}: HTTP {esc(str(d.get("http_status")))})</p>'
        return (f'<details class="sample" open><summary>{U["sample"]} · HTTP {esc(str(d.get("http_status")))}</summary>'
                f'<pre><code>{esc(sample_text(d))}</code></pre></details>')
    nav=[]; cards=[]
    for tab in TABS:
        title,desc = T["tabs"][tab]
        items=[e for e in eps if e["tab"]==tab]
        nav.append(f'<div class="nav-group"><a class="nav-h" href="#tab-{tab}">{esc(title)} <span>{len(items)}</span></a>'
                   + "".join(f'<a class="nav-i" href="#{anchor(e)}" data-s="{esc((e["id"]+" "+e["label"]+" "+e["query"]).lower())}">{esc(e["id"])}</a>' for e in items) + '</div>')
        cards.append(f'<section class="tab" id="tab-{tab}"><h2>{esc(title)} <code class="tabkey">{tab}</code></h2><p class="muted">{esc(desc)}</p>')
        for e in items:
            badges='<span class="m">GET</span>'
            if e["min_level"] != "0": badges+='<span class="b lvl">show_level ≥ 1</span>'
            req=req_of(e)
            reqhtml = f'<p class="req">{U["req"]} '+", ".join(f'<a href="#features-{r}"><code>features.{r}</code></a>' for r in req)+'.</p>' if req else ""
            note=T["notes"].get((tab,e["id"]))
            notehtml=f'<p>{esc(note)}</p>' if note else ""
            cmd=f'curl -b "$JAR" -G "http://$HOST{e["cgi"]}" \\\n     --data-raw "{e["query"]}"'
            cards.append(f'''<article class="ep" id="{anchor(e)}" data-s="{esc((e["id"]+" "+e["label"]+" "+e["query"]+" "+e["cgi"]).lower())}">
<header><h3>{esc(e["label"])}</h3><div class="badges">{badges}</div></header>
<div class="url"><span class="m">GET</span><code>{esc(e["cgi"])}?{esc(e["query"])}</code></div>
{notehtml}{reqhtml}
<div class="code"><button class="copy" type="button" aria-label="{U["copy"]}">{U["copy"]}</button><pre><code>{esc(cmd)}</code></pre></div>
{sample_html(e)}
<p class="muted small">{U["inout"]} <code>{esc(f".{tab}.{e['id']}")}</code></p>
</article>''')
        cards.append('</section>')
    def table(th, rows, codecols=()):
        h="<tr>"+"".join(f"<th>{c}</th>" for c in th)+"</tr>"
        for r in rows:
            h+="<tr>"+"".join(f"<td>{('<code>'+c+'</code>') if i in codecols else c}</td>" for i,c in enumerate(r))+"</tr>"
        return f'<div class="tablewrap"><table>{h}</table></div>'
    env_json='''{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced &gt; Information &gt; Device Settings (model, serial no., article no.)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": { "…": "%s" }
    }
  }
}''' % P["env_orig"]
    jq = f'''{P["jq1"]}
jq '.identity | {{device_settings: .device_settings.body, version: .version.body}}' rem102.json

{P["jq2"]}
jq -r 'del(.device) | to_entries[] | .key as $t | .value | to_entries[]
       | select(.value.http_status != 200) | "\\($t)/\\(.key): HTTP \\(.value.http_status)"' rem102.json'''
    pwd_ph = "HASLO" if code=="pl" else "PASSWORD"
    page = f'''<!doctype html>
<html lang="{code}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>REM102 CGI API</title>
<style>
{CSS}.sample summary{{cursor:pointer;font-size:13px;color:var(--muted);margin:10px 0 6px}} .tbd{{font-style:italic}} .sub{{margin:18px 0 6px;font-size:16px}} .lang{{display:inline-block;margin-top:6px;font-size:13px}}
</style>
</head>
<body>
<div class="layout">
<aside>
<h1>REM102 CGI API</h1>
<div class="muted small">{U["subtitle"]} · {len(eps)} {U["packages"]}</div>
<a class="lang" href="{T["other"]}" hreflang="{"en" if code=="pl" else "pl"}">{T["other_name"]} ↗</a>
<input id="filter" type="search" placeholder="{esc(U["search"])}" aria-label="{esc(U["search"])}">
<div class="nav-group"><a class="nav-h" href="#overview">{U["intro"]}</a><a class="nav-i" href="#quick">{QUICK[code]["nav"]}</a><a class="nav-i" href="#auth">{U["login"]}</a><a class="nav-i" href="#conv">{U["conv"]}</a><a class="nav-i" href="#envelope">{U["env"]}</a></div>
{"".join(nav)}
<div class="nav-group"><a class="nav-h" href="#excluded">{U["excl"]}</a><a class="nav-h" href="#script">{U["script"]}</a><a class="nav-h" href="#labview">{U["lv"]}</a><a class="nav-h" href="#assumptions">{U["assum"]}</a></div>
</aside>
<main>
<section id="overview"><h1>{P["title"]}</h1>{P["overview"]}</section>

<section id="quick"><h2>{QUICK[code]["title"]}</h2>{QUICK[code]["intro"]}
<div class="code"><button class="copy" type="button" aria-label="{U["copy"]}">{U["copy"]}</button><pre><code>{QUICK[code]["seq"]}</code></pre></div>
<p>{QUICK[code]["one_intro"]}</p>
<div class="code"><button class="copy" type="button" aria-label="{U["copy"]}">{U["copy"]}</button><pre><code>{QUICK[code]["one"]}</code></pre></div>
{QUICK[code]["note"]}</section>

<section id="auth"><h2>{U["login"]}</h2>
<div class="url"><span class="m" style="background:var(--accent-bg);color:var(--accent)">POST</span><code>/cgi-bin/mpc105.fcgi</code></div>
<pre><code>curl -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" \\
     --data-raw "query=120&amp;username=Admin&amp;pwd={pwd_ph}"</code></pre>
{P["auth"]}</section>

<section id="conv"><h2>{U["conv"]}</h2>{P["conv"]}</section>

<section id="envelope"><h2>{U["env"]}</h2>{P["env_intro"]}
<pre><code>{env_json}</code></pre>
{table(P["env_th"], [(f"<code>{a}</code>",b) for a,b in P["env_fields"]])}
<p class="muted">{P["env_note"]}</p></section>

{"".join(cards)}

<section id="excluded"><h2>{U["excl"]}</h2>
<div class="callout bad">{P["excl_callout"]}</div>
{table(P["excl_th"], [(f"<code>{a}</code>",b) for a,b in P["excl"]])}</section>

<section id="script"><h2>{U["script"]}</h2>
<pre><code>REM_HOST=192.168.128.1 REM_USER=Admin REM_PASS='…' ./scripts/rem102-info.sh &gt; rem102.json

{P["script_dump"]}
REM_HOST=… REM_USER=… REM_PASS=… ./rem102/scripts/collect.sh</code></pre>
{table(P["script_th"], [(f"<code>{a}</code>",b,(f"<code>{c}</code>" if c.startswith(("192","query")) else c)) for a,b,c in P["script_vars"]])}
<p>{P["script_req"]}</p>
<pre><code>{jq}</code></pre>
{P["win_html"]}</section>

<section id="labview"><h2>{U["lv"]}</h2>{P["lv"]}</section>

<section id="assumptions"><h2>{U["assum"]}</h2>{P["assum"]}</section>
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
    open(f"{ROOT}/docs/{T['file']}","w",encoding="utf-8").write(page)


SESSION_URL = "https://claude.ai/code/session_01EnRG8vGUPDNmrrRkAUgc9q"

def build_index():
    """Hub page rem102/index.html: what was done and why, order of solutions, TODO, list of files."""
    def exists(rel):
        return os.path.exists(os.path.join(ROOT, rel))
    def status(rel):
        return '<span class="b ok">jest</span>' if exists(rel) else '<span class="b lvl">brak – powstaje po uruchomieniu na urządzeniu</span>'
    all_d = [load_sample(e) for e in eps]
    captured = sum(1 for d in all_d if is_ok(d))
    attempted = sum(1 for d in all_d if d is not None)
    def files(rows):
        h = "<tr><th>Plik</th><th>Opis</th><th>Stan</th></tr>"
        for rel, desc, st in rows:
            name = f'<code>{esc(rel)}</code>'
            if "<" not in rel and exists(rel):
                name = f'<a href="{esc(rel)}"><code>{esc(rel)}</code></a>'
            h += f'<tr><td>{name}</td><td>{desc}</td><td>{st}</td></tr>'
        return f'<div class="tablewrap"><table>{h}</table></div>'
    isok = '<span class="b ok">jest</span>'
    out_rows = [
        ("results/collected.json", "wszystko z jednego uruchomienia w jednym pliku: <code>device</code>, <code>login</code>, 65 pakietów (<code>http_status</code>, <code>content_type</code>, <code>body</code>, ewentualnie <code>post_retry</code>). <strong>To wystarczy przekazać dalej.</strong>", status("results/collected.json")),
        ("results/samples/<zakładka>/<id>.json", "ten sam wynik rozbity na pakiety; z nich generator wstawia przykłady do dokumentacji", status("results/samples")),
        ("results/discover.json", "wynik <code>-Discover</code>: własne pliki WWW urządzenia (strona logowania, <code>Config/*.json</code>, JS), prawdziwe nazwy CGI", status("results/discover.json")),
        ("results/archive/probe-2026-10-18.json", "wynik <code>-Probe</code> z urządzenia (Boa, ekran logowania, <code>mpc105.cgi</code>)", status("results/archive/probe-2026-10-18.json")),
        ("results/probe.json", "wynik <code>-Probe</code>: które porty i ścieżki odpowiadają (kod, serwer, początek treści)", status("results/probe.json")),
        ("results/archive/collected-2026-10-18_all-404.json", "pierwsze uruchomienie na urządzeniu: wszystko HTTP 404", status("results/archive/collected-2026-10-18_all-404.json")),
        ("results/collect.log", "log przebiegu: numer, nazwa pakietu, kod HTTP, rozmiar (bez hasła)", status("results/collect.log")),
    ]
    src_rows = [
        ("data/rem102-packages.tsv", "lista 65 pakietów: nazwa, zakładka, id, zapytanie, poziom dostępu, wymagane moduły – jedno źródło prawdy", isok),
        ("data/rem102-package-names.txt", "nazwy pakietów (<code>tab.id</code>) – pozycje enuma w LabVIEW", isok),
        ("data/rem102-package-requests.txt", "zapytania w tej samej kolejności – tablica stringów indeksowana enumem", isok),
        ("scripts/collect.sh", "pobiera po kolei wszystkie pakiety i zapisuje wynik do <code>results/</code>", isok),
        ("scripts/collect.ps1", "wersja dla Windows (PowerShell 5.1+, bez bash/curl/jq): ten sam odczyt i te same pliki wynikowe", isok),
        ("scripts/collect.cmd", "launcher dla <code>collect.ps1</code> (bez zmiany polityki wykonywania skryptów)", isok),
        ("scripts/rem102-info.sh", "skrót do <code>collect.sh</code>: ten sam odczyt, wynik JSON na stdout", isok),
        ("scripts/build-docs.py", "generuje strony HTML, sekcje „Przykłady odpowiedzi” w md i tę stronę", isok),
    ]
    doc_rows = [
        ("docs/rem102-api.html", "dokumentacja jak do API (PL)", isok),
        ("docs/rem102-api_en.html", "dokumentacja jak do API (EN)", isok),
        ("docs/rem102-info.md", "opis i przykłady (PL)", isok),
        ("docs/rem102-info_en.md", "opis i przykłady (EN)", isok),
    ]
    done = lambda t: f'<li>☑ {t}</li>'
    todo = lambda t: f'<li>☐ {t}</li>'
    page = f"""<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>REM102 – odczyt informacji</title>
<style>
{CSS}.sub{{margin:18px 0 6px;font-size:16px}} .b.ok{{background:var(--get-bg);color:var(--get)}} ul.chk{{list-style:none;padding-left:0}} ul.chk li{{margin:4px 0}} main{{margin:0 auto}} a,code{{overflow-wrap:anywhere}}
</style>
</head>
<body>
<main>
<h1>REM102 – odczyt informacji o urządzeniu</h1>
<p class="lead">Strona prowadząca do wątku, w którym powstał ten zestaw: <a href="{SESSION_URL}">{SESSION_URL}</a></p>
<div class="callout"><strong>Stan:</strong> skrypty sprawdzono na atrapie serwera. Pierwsze uruchomienie na prawdziwym urządzeniu (18.10.2026) zakończyło się błędem HTTP 404 dla wszystkich pakietów – patrz <a href="#first-run">Pierwsze uruchomienie</a>. Przykładowe odpowiedzi w dokumentacji są puste, dopóki nie zostaną zebrane z urządzenia (poprawne odpowiedzi: {captured} z {len(eps)} pakietów{", próbowano: " + str(attempted) if attempted else ""}).</div>

<h2>Cel</h2>
<p>Pełny opis podłączonego urządzenia REM102 (model, numer seryjny, numer artykułu i reszta informacji z zakładek Home, Setup, Advanced, Monitoring) pobierany przez CGI przy użyciu curl, razem z dokumentacją tych zapytań i danymi do użycia w LabVIEW.</p>

<h2 id="first-run">Pierwsze uruchomienie na urządzeniu (18.10.2026)</h2>
<p>Wynik: <strong>65 z 65 pakietów i logowanie zwróciły HTTP 404</strong> (<code>text/html; charset=ISO-8859-1</code>). Dla każdego z czterech plików CGI serwer odpowiedział tak samo: <code>404 Not Found – The requested URL /cgi-bin/&lt;plik&gt;.fcgi was not found on this server.</code> (<a href="results/archive/collected-2026-10-18_all-404.json"><code>results/archive/collected-2026-10-18_all-404.json</code></a>).</p>
<ul>
<li><strong>Co z tego wynika:</strong> pod adresem <code>192.168.128.1</code> działa serwer WWW (odpowiada), ale ścieżki <code>/cgi-bin/*.fcgi</code> nie istnieją na tym adresie i porcie. Żadnej odpowiedzi z samego CGI jeszcze nie ma, więc dokumentacja nie dostała przykładów (odpowiedzi 404 nie są przykładami).</li>
<li><strong>Możliwe przyczyny:</strong> interfejs WWW działa pod innym portem, schematem (HTTPS) albo prefiksem ścieżki; albo pod tym adresem odpowiada inne urządzenie niż to, z którego pochodzą pliki menu.</li>
<li><strong>Następny krok:</strong> patrz „Wynik -Probe” niżej.</li>
</ul>

<h2 id="probe">Wynik <code>-Probe</code> (18.10.2026)</h2>
<p>Plik: <a href="results/archive/probe-2026-10-18.json"><code>results/archive/probe-2026-10-18.json</code></a>.</p>
<ul>
<li><strong>Serwer:</strong> <code>Boa/0.94.14rc21</code> na porcie 80. Strona główna to ekran logowania („Log-in”, autor HaslerRail). Pozostałe porty (8080, 8000, 8081, 443, 8443) nie odpowiadały.</li>
<li><strong>Kluczowe:</strong> <code>/Config/settings.json</code> jest dostępny bez logowania i wskazuje <code>"cgi": "cgi-bin/mpc105.cgi"</code> (typ <code>LoginOnStart</code>). To urządzenie używa więc <strong>.cgi, a nie .fcgi</strong>.</li>
<li><code>GET /cgi-bin/mpc105.cgi?query=125</code> nie dał odpowiedzi HTTP (kod 0): CGI istnieje (nie ma 404), ale na takie żądanie bez logowania nie odpowiedziało. <code>/cgi-bin/mpc105.fcgi</code> i <code>/cgi-bin/rem.fcgi</code> to 404.</li>
<li><strong>Wniosek:</strong> pliki menu, z których powstała lista 65 zapytań, pochodzą z innej wersji firmware niż to urządzenie (z <code>.fcgi</code>). Lista zapytań i format logowania mogą się różnić i trzeba je odczytać z samego urządzenia.</li>
<li><strong>Następny krok (jedno uruchomienie, dwa pliki do wysłania):</strong>
<pre><code>cd C:\\rem102\\scripts
.\\collect.cmd -DeviceHost 192.168.128.1 -Discover
.\\collect.cmd -DeviceHost 192.168.128.1 -CgiExt cgi -User "Super Admin" -Password "&lt;hasło&gt;"</code></pre>
Wyślij <code>results\\discover.json</code> i <code>results\\collected.json</code>.</li>
</ul>

<h2>Działania i po co</h2>
<ul>
<li><strong>Odczytano menu WWW urządzenia</strong> (<code>home/setup/advanced/monitoring/settings.json</code>) – żeby poznać zapytania CGI bez dokumentacji producenta.</li>
<li><strong>Zebrano 65 zapytań tylko do odczytu</strong> i wykluczono zapis, reset, reboot oraz konta – żeby odczyt niczego nie zmieniał.</li>
<li><strong>Napisano <code>collect.sh</code></strong> – pobiera wszystko po kolei i zapisuje do plików, z których uzupełnia się dokumentację.</li>
<li><strong>Dokumentacja w md i HTML, PL i EN</strong> – opis API, sekwencja curl dla podstawowych informacji, przykłady.</li>
<li><strong>Tabele dla LabVIEW</strong> – nazwy do enuma i tablica zapytań, żeby jeden VI obsługiwał każdy pakiet.</li>
<li><strong>Generator dokumentacji</strong> – przykłady odpowiedzi trafiają do dokumentów tylko z danych zebranych z urządzenia, nic nie jest zmyślone.</li>
</ul>

<h2>Kolejność rozwiązań</h2>
<ol>
<li>Wyciągnięcie zapytań z plików menu i zamiana separatora <code>~</code> na <code>&amp;</code>.</li>
<li>Logowanie <code>query=120</code> i ciasteczka <code>CGIUSERNAME</code>/<code>CGIUSERLEVEL</code>.</li>
<li>Odczyt metodą GET; przy błędzie jednorazowa próba POST (<code>post_retry</code>).</li>
<li>Wynik każdego pakietu w kopercie JSON: <code>http_status</code>, <code>content_type</code>, <code>body</code> (JSON albo tekst).</li>
<li>Jedno źródło listy pakietów: <code>rem102-packages.tsv</code>; z niego nazwy, zapytania i dokumentacja.</li>
<li>Generator wstawia do dokumentów wyłącznie zebrane próbki; reszta jest oznaczona „do uzupełnienia”.</li>
<li>LabVIEW: enum wybiera zapytanie, a typ (typedef) wybiera parser – najlepiej malleable VI <code>Get Package.vim</code>.</li>
</ol>

<h2>TODO</h2>
<ul class="chk">
{done("Lista zapytań, skrypty, dokumentacja PL/EN, tabele dla LabVIEW, generator")}
{done("Ustalić, gdzie jest CGI: <code>-Probe</code> pokazał, że to <code>/cgi-bin/*.cgi</code> (Boa), nie <code>.fcgi</code>")}
{todo("Uruchomić <code>-Discover</code> i dostać własne pliki WWW urządzenia (<code>Config/*.json</code>, JS logowania) – z nich odtworzyć prawdziwą listę zapytań i format logowania")}
{todo("Uruchomić <code>collect.sh</code> (Windows: <code>collect.cmd</code>, w razie potrzeby z <code>-BaseUrl</code> i <code>-Insecure</code>) i dostać odpowiedzi HTTP 2xx (przykład: użytkownik <code>user</code>, hasło <code>password</code>)")}
{todo("Sprawdzić <code>collect.ps1</code> w Windows PowerShell 5.1 (testowano w PowerShell 7 na atrapie)")}
{todo("Przekazać wynik: <code>results/collected.json</code> (commit na gałąź lub załącznik) – dokumentację uzupełnia się z niego")}
{todo("Uruchomić <code>python3 rem102/scripts/build-docs.py</code> – znikną oznaczenia „do uzupełnienia”")}
{todo("Potwierdzić format logowania (pola <code>username</code>/<code>pwd</code>) – pole <code>login</code> w <code>collected.json</code>")}
{todo("Potwierdzić GET kontra POST – pola <code>post_retry</code> w pakietach")}
{todo("Sprawdzić format odpowiedzi (JSON czy tekst) – <code>content_type</code> i <code>body</code>")}
{todo("Zweryfikować poziomy dostępu (<code>min_level</code>) i zależności modułów (<code>requires</code>) na tle <code>features.*</code>")}
{todo("Potwierdzić, że odczyt <code>advanced.events</code> (<code>query=314</code>) jest bezpieczny – w menu to samo zapytanie służy też do zapisu")}
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
<p>Linux / macOS / Git Bash:</p>
<pre><code>REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py</code></pre>
<p>Windows (PowerShell) – <code>.sh</code> nie uruchomi się, użyj <code>collect.cmd</code> (nie wymaga bash, curl, jq ani Pythona):</p>
<pre><code>cd C:\\rem102\\scripts
.\\collect.cmd -DeviceHost 192.168.128.1 -User user -Password password</code></pre>
<p class="muted">Wersja bash wymaga <code>bash</code>, <code>curl</code>, <code>jq</code>; generator wymaga <code>python3</code> (uruchamiam go ja po otrzymaniu <code>collected.json</code>). Skrypt nie zapisuje hasła w plikach wynikowych ani w logu.</p>
</main>
</body>
</html>
"""
    with open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)


MD = {
 "pl": dict(file="docs/rem102-info.md", before="## Użycie w LabVIEW", title="## Przykłady odpowiedzi",
   intro="Przykłady pochodzą **wyłącznie** z odpowiedzi zebranych z prawdziwego urządzenia – nic nie jest zmyślone. Pakiety bez przykładu czekają na uzupełnienie po podłączeniu do urządzenia.",
   how="Jak uzupełnić (po podłączeniu do urządzenia):", last="ostatnia próba", count="Zebrano przykładów: {n} z {t}.",
   tbd="Do uzupełnienia ({m})"),
 "en": dict(file="docs/rem102-info_en.md", before="## Using it from LabVIEW", title="## Response examples",
   intro="The examples come **only** from responses captured on a real device – nothing is made up. Packages without an example are waiting to be filled in after connecting to the device.",
   how="How to fill them in (once connected to the device):", last="last attempt", count="Captured examples: {n} of {t}.",
   tbd="To be filled in ({m})"),
}
START, END = "<!-- rem102-samples:start -->", "<!-- rem102-samples:end -->"

def md_section(code):
    T = MD[code]
    have = [(e, load_sample(e)) for e in eps]
    done = [(e, d) for e, d in have if is_ok(d)]
    todo = [(e, d) for e, d in have if not is_ok(d)]
    o = [START, "", T["title"], "", T["intro"], "", T["count"].format(n=len(done), t=len(eps)), "",
         T["how"], "", "```bash",
         "REM_HOST=192.168.128.1 REM_USER=user REM_PASS=password ./rem102/scripts/collect.sh",
         "python3 rem102/scripts/build-docs.py", "```", ""]
    for e, d in done:
        o += [f"### `{e['name']}`", "", f"`GET {e['request']}` · HTTP {d.get('http_status')}", "",
              "```" + ("text" if isinstance(d.get("body"), str) else "json"), sample_text(d), "```", ""]
    if todo:
        o += [f"<details><summary>{T['tbd'].format(m=len(todo))}</summary>", ""]
        o += [f"- `{e['name']}`" + (f" ({T['last']}: HTTP {d.get('http_status')})" if d is not None else "") for e, d in todo]
        o += ["", "</details>", ""]
    o.append(END)
    return "\n".join(o)

def patch_md(code):
    path = os.path.join(ROOT, MD[code]["file"])
    with open(path, encoding="utf-8") as f:
        text = f.read()
    sec = md_section(code)
    if START in text:
        a, b = text.index(START), text.index(END) + len(END)
        text = text[:a] + sec + text[b:]
    else:
        text = text.replace(MD[code]["before"], sec + "\n\n" + MD[code]["before"], 1)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

for c in ("pl", "en"):
    build(c)
    patch_md(c)
build_index()
print("ok:", sum(1 for e in eps if is_ok(load_sample(e))), "of", len(eps), "packages have a captured HTTP 2xx sample")
