# Deployment – Nasazení na LabVIEW RT Webservice

Průvodce sestavením statického buildu Nuxt a jeho nasazením na LabVIEW Real-Time Webservice.

---

## Obsah

- [Architektura nasazení](#architektura-nasazení)
- [Krok 1 – Statický build Nuxt](#krok-1--statický-build-nuxt)
- [Krok 2 – Struktura výstupních souborů](#krok-2--struktura-výstupních-souborů)
- [Krok 3 – Konfigurace LabVIEW Webservice](#krok-3--konfigurace-labview-webservice)
- [Krok 4 – Nasazení souborů na RT target](#krok-4--nasazení-souborů-na-rt-target)
- [Krok 5 – Konfigurace Nitro Server](#krok-5--konfigurace-nitro-server)
- [Krok 6 – Konfigurace PostgreSQL na průmyslovém PC](#krok-6--konfigurace-postgresql-na-průmyslovém-pc)
- [Krok 7 – Ověření nasazení](#krok-7--ověření-nasazení)
- [Aktualizace nasazení](#aktualizace-nasazení)
- [Proměnné prostředí pro produkci](#proměnné-prostředí-pro-produkci)
- [Troubleshooting](#troubleshooting)

---

## Architektura nasazení

```
Průmyslový PC (Windows 10/11)
│
├── LabVIEW RT Application (.rtexe)
│   └── Webservice
│       ├── GET /api/hostname  ← VI LabVIEW
│       ├── WS  /ws            ← VI LabVIEW
│       └── Static Files /     ← složka .output/public/
│
├── Nuxt Nitro Server (Node.js)
│   └── http://localhost:3000
│       └── REST API /api/*
│
└── Docker Desktop
    ├── PostgreSQL :5432
    └── pgAdmin   :5050
```

**Same-origin v produkci:** LabVIEW obsluhuje statické soubory Nuxt A zároveň proxy-uje (nebo přímo vrací) data. Frontend volá API na stejném hostu/portu — žádné problémy s CORS.

---

## Krok 1 – Statický build Nuxt

Na vývojovém počítači (ne na RT target):

```bash
cd D:\REMview_v3\Frontend\hasler-dashboard

# Nastavte produkční proměnné prostředí
# Upravte .env nebo předejte jako parametry

# Vygenerujte statický build
npm run generate
```

**Co dělá `nuxt generate`:**
- Pre-renderuje všechny stránky do HTML
- Bundluje JavaScript (Vue, Pinia, stores)
- Kopíruje assety (CSS, fonty, ikony)
- Vytvoří adresář `.output/public/`

**Výsledek:**
```
hasler-dashboard/
└── .output/
    └── public/           ← tyto soubory nahrajeme na LabVIEW
        ├── index.html
        ├── _nuxt/
        │   ├── app.xxxxx.js
        │   ├── app.xxxxx.css
        │   └── ...
        ├── 404.html
        └── favicon.ico
```

### Konfigurace před buildem

V `.env` nastavte URL LabVIEW webservice (IP adresa cílového počítače):

```env
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws
```

> ⚠️ Tyto hodnoty jsou zabudovány do JavaScriptu při `npm run generate`. Změna IP adresy po buildu vyžaduje nový build.

---

## Krok 2 – Struktura výstupních souborů

```
.output/public/
├── index.html              ← vstupní bod SPA
├── 404.html                ← chybová stránka
├── favicon.ico
└── _nuxt/                  ← bundlovaný JS + CSS
    ├── app.[hash].js       ← hlavní Vue bundle
    ├── app.[hash].css      ← Tailwind styly
    ├── index.[hash].js     ← chunk stránky
    ├── test-results.[hash].js
    └── ...
```

Všechny soubory jsou statické (HTML + JS + CSS) — **žádný Node.js server není potřeba pro obsluhu těchto souborů**. LabVIEW je obsluhuje jako běžné statické soubory.

---

## Krok 3 – Konfigurace LabVIEW Webservice

### V LabVIEW Project:

1. Klikněte pravým tlačítkem na projekt → **New → Web Service**
2. Pojmenujte: `REMview` (nebo libovolně)
3. V nastavení Web Service:
   - **Port:** 8080 (nebo zvolený, musí odpovídat `NUXT_PUBLIC_LABVIEW_BASE_URL`)
   - **Root URL:** `/`

### Přidejte Virtual Folder (statické soubory):

1. Pravým tlačítkem na Web Service → **Add Virtual Folder**
2. **URL Path:** `/`
3. **Local Path:** `<cesta k .output/public>` např. `C:\REMview\public\`
4. **Default Document:** `index.html`

```
Web Service
├── VIs/
│   ├── hostname.vi      → URL: /api/hostname
│   └── websocket.vi     → URL: /ws
└── Virtual Folders/
    └── /               → Local: C:\REMview\public\
```

### Konfigurace HTTP Methods pro VIs:

| VI | URL Pattern | HTTP Method | Auth |
|----|-------------|-------------|------|
| hostname.vi | `/api/hostname` | GET | Žádná |
| websocket.vi | `/ws` | WebSocket | Token v query |

### Routing SPA (důležité!):

LabVIEW Webservice musí přesměrovat všechny neznámé cesty na `index.html` (SPA routing).

Nakonfigurujte **Default 404 handler** ve Virtual Folder tak, aby vracel `index.html` místo chyby 404.

Alternativně: přidejte redirect VI jako poslední handler:
```
URL: /{*}  → vrátit obsah index.html
```

---

## Krok 4 – Nasazení souborů na RT target

### Varianta A – Kopírování přes síť (FTP/SMB)

```bash
# Z vývojového počítače
xcopy /E /I ".output\public\*" "\\192.168.1.100\c$\REMview\public\"
```

### Varianta B – LabVIEW Build Specification

1. V LabVIEW → **Build Specifications → New → Real-Time Application**
2. Záložka **Source Files:** přidejte všechna VI
3. Záložka **Additional Support Files:**
   - Zdroj: `.output\public\`
   - Cíl: `C:\REMview\public\`
4. **Build** → automaticky kopíruje soubory při sestavení RTO

### Varianta C – USB / flash disk

1. Zkopírujte `.output/public/` na flash disk
2. Připojte k průmyslovému počítači
3. Zkopírujte do `C:\REMview\public\`

### Po nahrání ověřte:

```
C:\REMview\public\
├── index.html          ✓
├── _nuxt\
│   ├── app.xxxxx.js    ✓
│   └── app.xxxxx.css   ✓
└── favicon.ico         ✓
```

---

## Krok 5 – Konfigurace Nitro Server

Nitro Server (Node.js) musí běžet jako **Windows Service** na průmyslovém počítači.

### Instalace Node.js na produkční PC

Stáhněte Node.js ≥ 18 LTS (Windows Installer) z https://nodejs.org

```bash
node --version   # ověřte po instalaci
```

### Zkopírujte kód serveru

Zkopírujte na produkční PC:
```
hasler-dashboard/
├── server/
├── nuxt.config.ts
├── package.json
└── .env           ← s produkčními hodnotami
```

### Nainstalujte závislosti

```bash
cd C:\REMview\hasler-dashboard
npm install --production
```

### Spusťte jako Windows Service (NSSM)

Stáhněte NSSM (Non-Sucking Service Manager): https://nssm.cc/download

```cmd
# Nainstalujte službu
nssm install REMviewNitro "C:\Program Files\nodejs\node.exe"

# Nakonfigurujte
nssm set REMviewNitro AppDirectory "C:\REMview\hasler-dashboard"
nssm set REMviewNitro AppParameters "node .output\server\index.mjs"
nssm set REMviewNitro AppEnvironmentExtra "NODE_ENV=production"
nssm set REMviewNitro Start SERVICE_AUTO_START

# Spusťte
nssm start REMviewNitro
```

> Alternativa: použijte `pm2` (Process Manager 2):
> ```bash
> npm install -g pm2
> pm2 start .output/server/index.mjs --name remview-nitro
> pm2 startup
> pm2 save
> ```

### Build serveru před nasazením

Před kopírováním na produkční PC proveďte:
```bash
npm run build   # místo generate
```

`npm run build` vygeneruje:
```
.output/
├── public/       ← statické soubory (pro LabVIEW)
└── server/
    └── index.mjs  ← Nitro server (Node.js)
```

---

## Krok 6 – Konfigurace PostgreSQL na průmyslovém PC

### Nainstalujte Docker Desktop

Stáhněte z https://www.docker.com/products/docker-desktop  
Povolte **Spouštět Docker při startu Windows**.

### Zkopírujte Docker soubory

```
C:\REMview\
├── docker-compose.yml
└── .env
```

### Spusťte databázi

```cmd
cd C:\REMview
docker-compose up -d
```

### Nakonfigurujte automatický start

Docker Desktop → **Settings → General → Start Docker Desktop when you sign in** ✓

Kontejnery s `restart: unless-stopped` se startují automaticky s Dockerem.

### Inicializujte databázi

```cmd
cd C:\REMview\hasler-dashboard
npm run db:seed
```

---

## Krok 7 – Ověření nasazení

### Test 1 – Statické soubory

Otevřete v prohlížeči na produkčním počítači:
```
http://localhost:8080
```
Měla by se zobrazit přihlašovací stránka REMview.

### Test 2 – LabVIEW hostname VI

```bash
curl http://localhost:8080/api/hostname
# Očekávaná odpověď:
# {"hostname":"...","model":"REM102","rtoFile":"...","rtoRevision":"..."}
```

### Test 3 – Nitro API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
# Očekávaná odpověď: {"success":true,"token":"..."}
```

### Test 4 – WebSocket

Otevřete DevTools v prohlížeči (F12) → Network → WS  
Po přihlášení by se mělo zobrazit WS připojení:
```
ws://localhost:8080/ws?token=...  [101 Switching Protocols]
```

### Test 5 – pgAdmin

```
http://localhost:5050
```
Přihlaste se a zkontrolujte tabulky v databázi `remview`.

---

## Aktualizace nasazení

Po změnách ve frontendovém kódu:

```bash
# Na vývojovém počítači
npm run generate   # nebo npm run build

# Zkopírujte .output/public/ na produkční PC
xcopy /E /I ".output\public\*" "\\<ip>\c$\REMview\public\" /Y

# Pokud se změnil kód Nitro serveru:
npm run build
# Zkopírujte .output/server/ a restartujte službu:
nssm restart REMviewNitro
# nebo
pm2 restart remview-nitro
```

---

## Proměnné prostředí pro produkci

Soubor `.env` na produkčním počítači:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=<silné_produkční_heslo>

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=<silné_produkční_heslo>
PGADMIN_PORT=5050

# ─── JWT autorizace ───────────────────────────────────
JWT_SECRET=<náhodný_string_min_64_znaků>
JWT_EXPIRES_IN=8h

# ─── LabVIEW (produkční adresy) ───────────────────────
# (tyto hodnoty jsou zabudovány při npm run generate)
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws

# ─── Node.js ──────────────────────────────────────────
NODE_ENV=production
```

---

## Troubleshooting

### Prohlížeč zobrazuje bílou stránku

1. Otevřete DevTools (F12) → Console
2. Zkontrolujte chyby JavaScript
3. Nejčastější příčiny:
   - Špatný `NUXT_PUBLIC_LABVIEW_BASE_URL` zabudovaný v buildu
   - Soubor `index.html` není obsluhován pro cestu `/`
   - Chybějící soubory `_nuxt/*.js`

### API vrací 401 po nasazení

Zkontrolujte `JWT_SECRET` v `.env` na Nitro serveru — musí být identický jako při generování tokenů.

### WebSocket se nepřipojuje

- Zkontrolujte zda je VI `websocket.vi` spuštěno v LabVIEW
- Zkontrolujte port v `NUXT_PUBLIC_WS_URL`
- Zkontrolujte Windows firewall: port 8080 musí být otevřen

```cmd
# Otevřete port ve firewall
netsh advfirewall firewall add rule name="REMview" protocol=TCP dir=in localport=8080 action=allow
```

### Chyba 404 pro cesty `/test-results`, `/device-status` atd.

LabVIEW Virtual Folder nepřesměrovává na `index.html`. Přidejte catch-all handler v LabVIEW Webservice vracející obsah `index.html`.

### Nitro Server se nespustí jako služba

```cmd
# Zkontrolujte logy NSSM
nssm status REMviewNitro
type "C:\ProgramData\nssm\REMviewNitro-stdout.log"

# Nebo spusťte ručně pro zobrazení chyb
cd C:\REMview\hasler-dashboard
node .output\server\index.mjs
```

### Docker se nespouští při startu PC

1. Docker Desktop → Settings → General → ✓ **Start Docker Desktop when you sign in**
2. Nebo nakonfigurujte jako Windows Service (Docker Engine)

### Data zmizí po restartu Docker

Zkontrolujte volume v `docker-compose.yml`:
```yaml
volumes:
  postgres_data:   # toto uchovává data mezi restarty
```
Data jsou v bezpečí pokud neprovedete `docker-compose down -v`.
