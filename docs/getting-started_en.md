# Getting Started – Running from Scratch

A complete guide to setting up REMview v3 on a new computer.

---

## Prerequisites

| Software | Version | Link |
|----------|---------|------|
| Node.js | >= 18.0.0 | https://nodejs.org |
| Docker Desktop | >= 4.0 | https://www.docker.com/products/docker-desktop |
| Git | any | https://git-scm.com |
| Code editor | VS Code (recommended) | https://code.visualstudio.com |

**Check versions after installation:**
```bash
node --version    # v18.x.x or newer
npm --version     # 9.x.x or newer
docker --version  # 24.x.x or newer
git --version
```

---

## Step 1 – Get the Source Code

```bash
# Clone the repository
git clone <repo-url> REMview_v3
cd REMview_v3/Frontend/hasler-dashboard
```

Or copy the project folder and navigate to the directory:
```bash
cd D:\REMview_v3\Frontend\hasler-dashboard
```

**Directory structure after download:**
```
hasler-dashboard/
├── pages/
├── stores/
├── server/
│   └── db/
│       ├── schema.sql
│       ├── seed.sql
│       └── seed.ts
├── docker-compose.yml
├── .env.example
├── nuxt.config.ts
└── package.json
```

---

## Step 2 – Configure Environment Variables

```bash
# Copy the example file
copy .env.example .env
```

Open `.env` and fill in the values:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret        # change before production

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=admin123               # change before production
PGADMIN_PORT=5050

# ─── JWT Authorization ────────────────────────────────
JWT_SECRET=change_this_to_at_least_32_char_random_string
JWT_EXPIRES_IN=8h

# ─── LabVIEW (leave empty in dev mode) ───────────────
NUXT_PUBLIC_LABVIEW_BASE_URL=
NUXT_PUBLIC_WS_URL=
NUXT_PUBLIC_WS_PATH=/ws
```

> In development mode, `NUXT_PUBLIC_LABVIEW_BASE_URL` and `NUXT_PUBLIC_WS_URL` can remain empty — WebSocket will not connect on `localhost` without explicit configuration.

---

## Step 3 – Start the Database (Docker)

```bash
# Start PostgreSQL and pgAdmin in the background
docker-compose up -d
```

Wait until the status changes to `healthy`:
```bash
docker-compose ps
# NAME                STATUS
# remview-postgres    Up (healthy)
# remview-pgadmin     Up
```

> The first run downloads Docker images (~200 MB). Subsequent starts are immediate.

**If port 5432 is in use:**
```bash
# Check what is using the port
netstat -ano | findstr :5432

# Or change the port in .env:
POSTGRES_PORT=5433
# and update docker-compose.yml: "5433:5432"
```

---

## Step 4 – Initialize the Database

```bash
# Install Node.js dependencies (if not done yet)
npm install

# Run the seed script
npm run db:seed
```

Expected output:
```
Connecting to PostgreSQL…
Applying schema…
Schema applied.
Seeding data…
Seed data inserted.
Done.
```

**Default users after seed:**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator |
| `operator` | `oper456` | Operator |
| `viewer` | `view789` | Viewer |
| `tech` | `tech321` | Operator |

---

## Step 5 – Install Node.js Dependencies

```bash
npm install
```

Installed packages:
```
nuxt 3.9.x          - Vue 3 SSR/SPA framework
pinia               - state management
tailwindcss         - utility CSS
postgres (porsager) - PostgreSQL driver
jsonwebtoken        - JWT auth
bcryptjs            - password hashing
tsx                 - TypeScript runner (dev)
```

---

## Step 6 – Start the Development Server

```bash
npm run dev
```

Expected output:
```
Nuxt 3.9.3 with Nitro
  ➜ Local:   http://localhost:3000/
  ➜ Network: http://192.168.x.x:3000/

✔ Nitro built
```

Open your browser: **http://localhost:3000**

Log in with: `admin` / `admin123`

---

## Step 7 – Verify Operation

### Check the API

```bash
# Test the public endpoint
curl http://localhost:3000/api/hostname

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

### Check the Database

```bash
# Connect via psql
docker exec -it remview-postgres psql -U remview -d remview

# Check tables
\dt

# Check users
SELECT username, role, active FROM users;

# Exit
\q
```

### Check pgAdmin (GUI)

Open: **http://localhost:5050**  
Login: `admin@remview.local` / `admin123`

Add a server (if not added automatically):
- Host: `postgres` ← not `localhost`!
- Port: `5432`
- Database: `remview`
- Username: `remview`

---

## Common Issues and Solutions

### `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL is not running.
```bash
docker-compose up -d
docker-compose ps   # check status
```

### `npm run db:seed` — "password authentication failed"

The password in `.env` does not match the one in the Docker volume. Reset the volume:
```bash
docker-compose down -v
docker-compose up -d
npm run db:seed
```

### Port 3000 is in use

```bash
# Run on a different port
npx nuxt dev --port 3001
```

### `[Vue Router warn] No match found for /ws`

Normal message in dev mode — the WebSocket store does not connect without an explicitly set `NUXT_PUBLIC_WS_URL`. Ignore it or set the URL:
```env
NUXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Page is blank after login

Check the browser console (F12). Most common causes:
1. Missing table in the database → run `npm run db:seed`
2. JWT_SECRET error → check `.env`

---

## npm Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with HMR |
| `npm run build` | Production build (SSR) |
| `npm run generate` | Static build (for LabVIEW) |
| `npm run preview` | Preview of the production build |
| `npm run db:seed` | Database initialization / reset |

---

## Development Environment – Quick Start

```bash
# Terminal 1 – database
docker-compose up -d

# Terminal 2 – dev server
cd hasler-dashboard
npm run dev

# Ready!
# http://localhost:3000
# http://localhost:5050 (pgAdmin)
```

---

## VS Code Extensions (Recommended)

```
Volar           - Vue 3 + TypeScript support
ESLint          - linting
Prettier        - formatting
Tailwind CSS Intelligence - Tailwind class suggestions
Thunder Client  - REST API testing (alternative to Postman)
Docker          - container management
```

Install with a single command:
```bash
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
```
