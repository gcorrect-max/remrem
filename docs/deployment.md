# Deployment – Wdrożenie na LabVIEW RT Webservice

Przewodnik budowania statycznego buildu Nuxt i wdrożenia go na LabVIEW Real-Time Webservice.

---

## Spis treści

- [Architektura wdrożenia](#architektura-wdrożenia)
- [Krok 1 – Build statyczny Nuxt](#krok-1--build-statyczny-nuxt)
- [Krok 2 – Struktura plików output](#krok-2--struktura-plików-output)
- [Krok 3 – Konfiguracja LabVIEW Webservice](#krok-3--konfiguracja-labview-webservice)
- [Krok 4 – Wdrożenie plików na RT target](#krok-4--wdrożenie-plików-na-rt-target)
- [Krok 5 – Konfiguracja Nitro Server](#krok-5--konfiguracja-nitro-server)
- [Krok 6 – Konfiguracja PostgreSQL na PC przemysłowym](#krok-6--konfiguracja-postgresql-na-pc-przemysłowym)
- [Krok 7 – Weryfikacja wdrożenia](#krok-7--weryfikacja-wdrożenia)
- [Aktualizacja wdrożenia](#aktualizacja-wdrożenia)
- [Zmienne środowiskowe dla produkcji](#zmienne-środowiskowe-dla-produkcji)
- [Troubleshooting](#troubleshooting)

---

## Architektura wdrożenia

```
PC Przemysłowy (Windows 10/11)
│
├── LabVIEW RT Application (.rtexe)
│   └── Webservice
│       ├── GET /api/hostname  ← VI LabVIEW
│       ├── WS  /ws            ← VI LabVIEW
│       └── Static Files /     ← folder .output/public/
│
├── Nuxt Nitro Server (Node.js)
│   └── http://localhost:3000
│       └── REST API /api/*
│
└── Docker Desktop
    ├── PostgreSQL :5432
    └── pgAdmin   :5050
```

**Same-origin w produkcji:** LabVIEW serwuje statyczne pliki Nuxt ORAZ proxy-uje (lub bezpośrednio zwraca) dane. Frontend wywołuje API na tym samym hoście/porcie — brak problemów z CORS.

---

## Krok 1 – Build statyczny Nuxt

Na komputerze deweloperskim (nie na RT target):

```bash
cd D:\REMview_v3\Frontend\hasler-dashboard

# Ustaw produkcyjne zmienne środowiskowe
# Edytuj .env lub przekaż jako parametry

# Wygeneruj statyczny build
npm run generate
```

**Co robi `nuxt generate`:**
- Pre-renderuje wszystkie strony do HTML
- Bundluje JavaScript (Vue, Pinia, stores)
- Kopiuje assety (CSS, czcionki, ikony)
- Tworzy katalog `.output/public/`

**Wynik:**
```
hasler-dashboard/
└── .output/
    └── public/           ← te pliki wgrywamy na LabVIEW
        ├── index.html
        ├── _nuxt/
        │   ├── app.xxxxx.js
        │   ├── app.xxxxx.css
        │   └── ...
        ├── 404.html
        └── favicon.ico
```

### Konfiguracja przed buildem

W `.env` ustaw URL LabVIEW webservice (adres IP docelowego komputera):

```env
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws
```

> ⚠️ Te wartości są wbudowane w JavaScript podczas `npm run generate`. Zmiana adresu IP po buildzie wymaga ponownego buildu.

---

## Krok 2 – Struktura plików output

```
.output/public/
├── index.html              ← SPA entry point
├── 404.html                ← strona błędu
├── favicon.ico
└── _nuxt/                  ← bundled JS + CSS
    ├── app.[hash].js       ← główny bundle Vue
    ├── app.[hash].css      ← Tailwind styles
    ├── index.[hash].js     ← page chunk
    ├── test-results.[hash].js
    └── ...
```

Wszystkie pliki są statyczne (HTML + JS + CSS) — **brak serwera Node.js potrzebnego do serwowania tych plików**. LabVIEW serwuje je jako zwykłe pliki statyczne.

---

## Krok 3 – Konfiguracja LabVIEW Webservice

### W LabVIEW Project:

1. Kliknij prawym na projekt → **New → Web Service**
2. Nazwij: `REMview` (lub dowolna)
3. W ustawieniach Web Service:
   - **Port:** 8080 (lub wybrany, musi zgadzać się z `NUXT_PUBLIC_LABVIEW_BASE_URL`)
   - **Root URL:** `/`

### Dodaj Virtual Folder (pliki statyczne):

1. Prawym na Web Service → **Add Virtual Folder**
2. **URL Path:** `/`
3. **Local Path:** `<ścieżka do .output/public>` np. `C:\REMview\public\`
4. **Default Document:** `index.html`

```
Web Service
├── VIs/
│   ├── hostname.vi      → URL: /api/hostname
│   └── websocket.vi     → URL: /ws
└── Virtual Folders/
    └── /               → Local: C:\REMview\public\
```

### Konfiguracja HTTP Methods dla VIs:

| VI | URL Pattern | HTTP Method | Auth |
|----|-------------|-------------|------|
| hostname.vi | `/api/hostname` | GET | Brak |
| websocket.vi | `/ws` | WebSocket | Token w query |

### Routing SPA (ważne!):

LabVIEW Webservice musi przekierować wszystkie nieznane ścieżki do `index.html` (SPA routing).

Skonfiguruj **Default 404 handler** w Virtual Folder aby zwracał `index.html` zamiast błędu 404.

Alternatywnie: dodaj redirect VI jako ostatni handler:
```
URL: /{*}  → zwróć zawartość index.html
```

---

## Krok 4 – Wdrożenie plików na RT target

### Opcja A – Skopiuj przez sieć (FTP/SMB)

```bash
# Z komputera deweloperskiego
xcopy /E /I ".output\public\*" "\\192.168.1.100\c$\REMview\public\"
```

### Opcja B – LabVIEW Build Specification

1. W LabVIEW → **Build Specifications → New → Real-Time Application**
2. Zakładka **Source Files:** dodaj wszystkie VI
3. Zakładka **Additional Support Files:**
   - Źródło: `.output\public\`
   - Cel: `C:\REMview\public\`
4. **Build** → automatycznie kopiuje pliki podczas budowania RTO

### Opcja C – USB / pendrive

1. Skopiuj `.output/public/` na pendrive
2. Podłącz do komputera przemysłowego
3. Skopiuj do `C:\REMview\public\`

### Po wgraniu sprawdź:

```
C:\REMview\public\
├── index.html          ✓
├── _nuxt\
│   ├── app.xxxxx.js    ✓
│   └── app.xxxxx.css   ✓
└── favicon.ico         ✓
```

---

## Krok 5 – Konfiguracja Nitro Server

Nitro Server (Node.js) musi działać jako **Windows Service** na komputerze przemysłowym.

### Instalacja Node.js na PC produkcyjnym

Pobierz Node.js ≥ 18 LTS (Windows Installer) z https://nodejs.org

```bash
node --version   # sprawdź po instalacji
```

### Skopiuj kod serwera

Skopiuj na PC produkcyjny:
```
hasler-dashboard/
├── server/
├── nuxt.config.ts
├── package.json
└── .env           ← z produkcyjnymi wartościami
```

### Zainstaluj zależności

```bash
cd C:\REMview\hasler-dashboard
npm install --production
```

### Uruchom jako Windows Service (NSSM)

Pobierz NSSM (Non-Sucking Service Manager): https://nssm.cc/download

```cmd
# Zainstaluj serwis
nssm install REMviewNitro "C:\Program Files\nodejs\node.exe"

# Skonfiguruj
nssm set REMviewNitro AppDirectory "C:\REMview\hasler-dashboard"
nssm set REMviewNitro AppParameters "node .output\server\index.mjs"
nssm set REMviewNitro AppEnvironmentExtra "NODE_ENV=production"
nssm set REMviewNitro Start SERVICE_AUTO_START

# Uruchom
nssm start REMviewNitro
```

> Alternatywa: użyj `pm2` (Process Manager 2):
> ```bash
> npm install -g pm2
> pm2 start .output/server/index.mjs --name remview-nitro
> pm2 startup
> pm2 save
> ```

### Build serwera przed wdrożeniem

Przed kopiowaniem na PC produkcyjny wykonaj:
```bash
npm run build   # zamiast generate
```

`npm run build` generuje:
```
.output/
├── public/       ← pliki statyczne (dla LabVIEW)
└── server/
    └── index.mjs  ← serwer Nitro (Node.js)
```

---

## Krok 6 – Konfiguracja PostgreSQL na PC przemysłowym

### Zainstaluj Docker Desktop

Pobierz z https://www.docker.com/products/docker-desktop  
Włącz **Uruchamiaj Docker przy starcie Windows**.

### Skopiuj pliki Docker

```
C:\REMview\
├── docker-compose.yml
└── .env
```

### Uruchom bazę danych

```cmd
cd C:\REMview
docker-compose up -d
```

### Skonfiguruj automatyczny start

Docker Desktop → **Settings → General → Start Docker Desktop when you sign in** ✓

Kontenery z `restart: unless-stopped` startują automatycznie z Dockerem.

### Zainicjalizuj bazę

```cmd
cd C:\REMview\hasler-dashboard
npm run db:seed
```

---

## Krok 7 – Weryfikacja wdrożenia

### Test 1 – Statyczne pliki

Otwórz w przeglądarce na komputerze produkcyjnym:
```
http://localhost:8080
```
Powinna pojawić się strona logowania REMview.

### Test 2 – LabVIEW hostname VI

```bash
curl http://localhost:8080/api/hostname
# Oczekiwana odpowiedź:
# {"hostname":"...","model":"REM102","rtoFile":"...","rtoRevision":"..."}
```

### Test 3 – Nitro API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
# Oczekiwana odpowiedź: {"success":true,"token":"..."}
```

### Test 4 – WebSocket

Otwórz DevTools w przeglądarce (F12) → Network → WS  
Po zalogowaniu powinno pojawić się połączenie WS:
```
ws://localhost:8080/ws?token=...  [101 Switching Protocols]
```

### Test 5 – pgAdmin

```
http://localhost:5050
```
Zaloguj się i sprawdź tabele w bazie `remview`.

---

## Aktualizacja wdrożenia

Po zmianach w kodzie frontendowym:

```bash
# Na komputerze deweloperskim
npm run generate   # lub npm run build

# Skopiuj .output/public/ na PC produkcyjny
xcopy /E /I ".output\public\*" "\\<ip>\c$\REMview\public\" /Y

# Jeśli zmienił się kod serwera Nitro:
npm run build
# Skopiuj .output/server/ i zrestartuj serwis:
nssm restart REMviewNitro
# lub
pm2 restart remview-nitro
```

---

## Zmienne środowiskowe dla produkcji

Plik `.env` na komputerze produkcyjnym:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=<silne_haslo_produkcyjne>

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=<silne_haslo_produkcyjne>
PGADMIN_PORT=5050

# ─── Autoryzacja JWT ──────────────────────────────────
JWT_SECRET=<losowy_string_min_64_znaki>
JWT_EXPIRES_IN=8h

# ─── LabVIEW (adresy produkcyjne) ─────────────────────
# (te wartości są wbudowane podczas npm run generate)
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws

# ─── Node.js ──────────────────────────────────────────
NODE_ENV=production
```

---

## Troubleshooting

### Przeglądarka pokazuje białą stronę

1. Otwórz DevTools (F12) → Console
2. Sprawdź błędy JavaScript
3. Najczęstsze przyczyny:
   - Zły `NUXT_PUBLIC_LABVIEW_BASE_URL` wbudowany w build
   - Plik `index.html` nie jest serwowany dla ścieżki `/`
   - Brakujące pliki `_nuxt/*.js`

### API zwraca 401 po wdrożeniu

Sprawdź `JWT_SECRET` w `.env` na serwerze Nitro — musi być identyczny jak przy generowaniu tokenów.

### WebSocket nie łączy się

- Sprawdź czy VI `websocket.vi` jest uruchomiony w LabVIEW
- Sprawdź port w `NUXT_PUBLIC_WS_URL`
- Sprawdź firewall Windows: port 8080 musi być otwarty

```cmd
# Otwórz port w firewall
netsh advfirewall firewall add rule name="REMview" protocol=TCP dir=in localport=8080 action=allow
```

### Błąd 404 dla ścieżek `/test-results`, `/device-status` itp.

LabVIEW Virtual Folder nie przekierowuje do `index.html`. Dodaj catch-all handler w LabVIEW Webservice zwracający zawartość `index.html`.

### Nitro Server nie startuje jako serwis

```cmd
# Sprawdź logi NSSM
nssm status REMviewNitro
type "C:\ProgramData\nssm\REMviewNitro-stdout.log"

# Lub uruchom ręcznie aby zobaczyć błędy
cd C:\REMview\hasler-dashboard
node .output\server\index.mjs
```

### Docker nie startuje przy uruchomieniu PC

1. Docker Desktop → Settings → General → ✓ **Start Docker Desktop when you sign in**
2. Lub skonfiguruj jako Windows Service (Docker Engine)

### Dane znikają po restarcie Docker

Sprawdź volume w `docker-compose.yml`:
```yaml
volumes:
  postgres_data:   # to przechowuje dane między restartami
```
Dane są bezpieczne dopóki nie wykonasz `docker-compose down -v`.
