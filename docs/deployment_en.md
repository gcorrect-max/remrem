# Deployment – Deploying to LabVIEW RT Webservice

A guide to building a static Nuxt build and deploying it to the LabVIEW Real-Time Webservice.

---

## Table of Contents

- [Deployment Architecture](#deployment-architecture)
- [Step 1 – Nuxt Static Build](#step-1--nuxt-static-build)
- [Step 2 – Output File Structure](#step-2--output-file-structure)
- [Step 3 – LabVIEW Webservice Configuration](#step-3--labview-webservice-configuration)
- [Step 4 – Deploy Files to RT Target](#step-4--deploy-files-to-rt-target)
- [Step 5 – Nitro Server Configuration](#step-5--nitro-server-configuration)
- [Step 6 – PostgreSQL Configuration on the Industrial PC](#step-6--postgresql-configuration-on-the-industrial-pc)
- [Step 7 – Verify Deployment](#step-7--verify-deployment)
- [Updating the Deployment](#updating-the-deployment)
- [Production Environment Variables](#production-environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Deployment Architecture

```
Industrial PC (Windows 10/11)
│
├── LabVIEW RT Application (.rtexe)
│   └── Webservice
│       ├── GET /api/hostname  ← LabVIEW VI
│       ├── WS  /ws            ← LabVIEW VI
│       └── Static Files /     ← .output/public/ folder
│
├── Nuxt Nitro Server (Node.js)
│   └── http://localhost:3000
│       └── REST API /api/*
│
└── Docker Desktop
    ├── PostgreSQL :5432
    └── pgAdmin   :5050
```

**Same-origin in production:** LabVIEW serves the static Nuxt files AND proxies (or directly returns) data. The frontend calls the API on the same host/port — no CORS issues.

---

## Step 1 – Nuxt Static Build

On the development computer (not on the RT target):

```bash
cd D:\REMview_v3\Frontend\hasler-dashboard

# Set production environment variables
# Edit .env or pass as parameters

# Generate static build
npm run generate
```

**What `nuxt generate` does:**
- Pre-renders all pages to HTML
- Bundles JavaScript (Vue, Pinia, stores)
- Copies assets (CSS, fonts, icons)
- Creates the `.output/public/` directory

**Output:**
```
hasler-dashboard/
└── .output/
    └── public/           ← these files are uploaded to LabVIEW
        ├── index.html
        ├── _nuxt/
        │   ├── app.xxxxx.js
        │   ├── app.xxxxx.css
        │   └── ...
        ├── 404.html
        └── favicon.ico
```

### Configuration Before Build

In `.env`, set the LabVIEW webservice URL (IP address of the target computer):

```env
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws
```

> These values are embedded into the JavaScript during `npm run generate`. Changing the IP address after the build requires a new build.

---

## Step 2 – Output File Structure

```
.output/public/
├── index.html              ← SPA entry point
├── 404.html                ← error page
├── favicon.ico
└── _nuxt/                  ← bundled JS + CSS
    ├── app.[hash].js       ← main Vue bundle
    ├── app.[hash].css      ← Tailwind styles
    ├── index.[hash].js     ← page chunk
    ├── test-results.[hash].js
    └── ...
```

All files are static (HTML + JS + CSS) — **no Node.js server is needed to serve these files**. LabVIEW serves them as regular static files.

---

## Step 3 – LabVIEW Webservice Configuration

### In the LabVIEW Project:

1. Right-click the project → **New → Web Service**
2. Name it: `REMview` (or any name)
3. In the Web Service settings:
   - **Port:** 8080 (or chosen port, must match `NUXT_PUBLIC_LABVIEW_BASE_URL`)
   - **Root URL:** `/`

### Add Virtual Folder (static files):

1. Right-click on Web Service → **Add Virtual Folder**
2. **URL Path:** `/`
3. **Local Path:** `<path to .output/public>` e.g. `C:\REMview\public\`
4. **Default Document:** `index.html`

```
Web Service
├── VIs/
│   ├── hostname.vi      → URL: /api/hostname
│   └── websocket.vi     → URL: /ws
└── Virtual Folders/
    └── /               → Local: C:\REMview\public\
```

### HTTP Methods Configuration for VIs:

| VI | URL Pattern | HTTP Method | Auth |
|----|-------------|-------------|------|
| hostname.vi | `/api/hostname` | GET | None |
| websocket.vi | `/ws` | WebSocket | Token in query |

### SPA Routing (important!):

LabVIEW Webservice must redirect all unknown paths to `index.html` (SPA routing).

Configure the **Default 404 handler** in the Virtual Folder to return `index.html` instead of a 404 error.

Alternatively: add a redirect VI as the last handler:
```
URL: /{*}  → return the contents of index.html
```

---

## Step 4 – Deploy Files to RT Target

### Option A – Copy via Network (FTP/SMB)

```bash
# From the development computer
xcopy /E /I ".output\public\*" "\\192.168.1.100\c$\REMview\public\"
```

### Option B – LabVIEW Build Specification

1. In LabVIEW → **Build Specifications → New → Real-Time Application**
2. **Source Files** tab: add all VIs
3. **Additional Support Files** tab:
   - Source: `.output\public\`
   - Destination: `C:\REMview\public\`
4. **Build** → automatically copies files when building the RTO

### Option C – USB / Flash Drive

1. Copy `.output/public/` to a flash drive
2. Connect to the industrial computer
3. Copy to `C:\REMview\public\`

### After Upload, Verify:

```
C:\REMview\public\
├── index.html          ✓
├── _nuxt\
│   ├── app.xxxxx.js    ✓
│   └── app.xxxxx.css   ✓
└── favicon.ico         ✓
```

---

## Step 5 – Nitro Server Configuration

The Nitro Server (Node.js) must run as a **Windows Service** on the industrial computer.

### Install Node.js on the Production PC

Download Node.js >= 18 LTS (Windows Installer) from https://nodejs.org

```bash
node --version   # check after installation
```

### Copy Server Code

Copy to the production PC:
```
hasler-dashboard/
├── server/
├── nuxt.config.ts
├── package.json
└── .env           ← with production values
```

### Install Dependencies

```bash
cd C:\REMview\hasler-dashboard
npm install --production
```

### Run as a Windows Service (NSSM)

Download NSSM (Non-Sucking Service Manager): https://nssm.cc/download

```cmd
# Install the service
nssm install REMviewNitro "C:\Program Files\nodejs\node.exe"

# Configure
nssm set REMviewNitro AppDirectory "C:\REMview\hasler-dashboard"
nssm set REMviewNitro AppParameters "node .output\server\index.mjs"
nssm set REMviewNitro AppEnvironmentExtra "NODE_ENV=production"
nssm set REMviewNitro Start SERVICE_AUTO_START

# Start
nssm start REMviewNitro
```

> Alternative: use `pm2` (Process Manager 2):
> ```bash
> npm install -g pm2
> pm2 start .output/server/index.mjs --name remview-nitro
> pm2 startup
> pm2 save
> ```

### Build the Server Before Deployment

Before copying to the production PC, run:
```bash
npm run build   # instead of generate
```

`npm run build` generates:
```
.output/
├── public/       ← static files (for LabVIEW)
└── server/
    └── index.mjs  ← Nitro server (Node.js)
```

---

## Step 6 – PostgreSQL Configuration on the Industrial PC

### Install Docker Desktop

Download from https://www.docker.com/products/docker-desktop  
Enable **Start Docker Desktop when Windows starts**.

### Copy Docker Files

```
C:\REMview\
├── docker-compose.yml
└── .env
```

### Start the Database

```cmd
cd C:\REMview
docker-compose up -d
```

### Configure Automatic Startup

Docker Desktop → **Settings → General → Start Docker Desktop when you sign in** ✓

Containers with `restart: unless-stopped` start automatically with Docker.

### Initialize the Database

```cmd
cd C:\REMview\hasler-dashboard
npm run db:seed
```

---

## Step 7 – Verify Deployment

### Test 1 – Static Files

Open in the browser on the production computer:
```
http://localhost:8080
```
The REMview login page should appear.

### Test 2 – LabVIEW hostname VI

```bash
curl http://localhost:8080/api/hostname
# Expected response:
# {"hostname":"...","model":"REM102","rtoFile":"...","rtoRevision":"..."}
```

### Test 3 – Nitro API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
# Expected response: {"success":true,"token":"..."}
```

### Test 4 – WebSocket

Open DevTools in the browser (F12) → Network → WS  
After login, a WS connection should appear:
```
ws://localhost:8080/ws?token=...  [101 Switching Protocols]
```

### Test 5 – pgAdmin

```
http://localhost:5050
```
Log in and check tables in the `remview` database.

---

## Updating the Deployment

After changes to the frontend code:

```bash
# On the development computer
npm run generate   # or npm run build

# Copy .output/public/ to the production PC
xcopy /E /I ".output\public\*" "\\<ip>\c$\REMview\public\" /Y

# If the Nitro server code has changed:
npm run build
# Copy .output/server/ and restart the service:
nssm restart REMviewNitro
# or
pm2 restart remview-nitro
```

---

## Production Environment Variables

`.env` file on the production computer:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=<strong_production_password>

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=<strong_production_password>
PGADMIN_PORT=5050

# ─── JWT Authorization ────────────────────────────────
JWT_SECRET=<random_string_min_64_chars>
JWT_EXPIRES_IN=8h

# ─── LabVIEW (production addresses) ──────────────────
# (these values are embedded during npm run generate)
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080
NUXT_PUBLIC_WS_PATH=/ws

# ─── Node.js ──────────────────────────────────────────
NODE_ENV=production
```

---

## Troubleshooting

### Browser Shows a White Page

1. Open DevTools (F12) → Console
2. Check for JavaScript errors
3. Most common causes:
   - Wrong `NUXT_PUBLIC_LABVIEW_BASE_URL` embedded in the build
   - `index.html` is not being served for the `/` path
   - Missing `_nuxt/*.js` files

### API Returns 401 After Deployment

Check `JWT_SECRET` in `.env` on the Nitro server — it must be identical to the one used when generating tokens.

### WebSocket Does Not Connect

- Check whether the `websocket.vi` VI is running in LabVIEW
- Check the port in `NUXT_PUBLIC_WS_URL`
- Check Windows Firewall: port 8080 must be open

```cmd
# Open port in firewall
netsh advfirewall firewall add rule name="REMview" protocol=TCP dir=in localport=8080 action=allow
```

### 404 Error for Paths `/test-results`, `/device-status`, etc.

The LabVIEW Virtual Folder is not redirecting to `index.html`. Add a catch-all handler in the LabVIEW Webservice that returns the contents of `index.html`.

### Nitro Server Does Not Start as a Service

```cmd
# Check NSSM logs
nssm status REMviewNitro
type "C:\ProgramData\nssm\REMviewNitro-stdout.log"

# Or run manually to see errors
cd C:\REMview\hasler-dashboard
node .output\server\index.mjs
```

### Docker Does Not Start on PC Boot

1. Docker Desktop → Settings → General → ✓ **Start Docker Desktop when you sign in**
2. Or configure as a Windows Service (Docker Engine)

### Data Disappears After Docker Restart

Check volumes in `docker-compose.yml`:
```yaml
volumes:
  postgres_data:   # this stores data between restarts
```
Data is safe as long as you do not run `docker-compose down -v`.
