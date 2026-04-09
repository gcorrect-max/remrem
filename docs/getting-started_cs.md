# Getting Started – Spuštění od nuly

Kompletní průvodce spuštěním REMview v3 na novém počítači.

---

## Předpoklady

| Software | Verze | Odkaz |
|----------|-------|-------|
| Node.js | ≥ 18.0.0 | https://nodejs.org |
| Docker Desktop | ≥ 4.0 | https://www.docker.com/products/docker-desktop |
| Git | libovolná | https://git-scm.com |
| Editor kódu | VS Code (doporučeno) | https://code.visualstudio.com |

**Ověřte verze po instalaci:**
```bash
node --version    # v18.x.x nebo novější
npm --version     # 9.x.x nebo novější
docker --version  # 24.x.x nebo novější
git --version
```

---

## Krok 1 – Stáhněte zdrojový kód

```bash
# Naklonujte repozitář
git clone <repo-url> REMview_v3
cd REMview_v3/Frontend/hasler-dashboard
```

Nebo zkopírujte složku projektu a přejděte do adresáře:
```bash
cd D:\REMview_v3\Frontend\hasler-dashboard
```

**Struktura adresáře po stažení:**
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

## Krok 2 – Nastavte proměnné prostředí

```bash
# Zkopírujte vzorový soubor
copy .env.example .env
```

Otevřete `.env` a vyplňte hodnoty:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret        # změňte před produkcí

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=admin123               # změňte před produkcí
PGADMIN_PORT=5050

# ─── JWT autorizace ───────────────────────────────────
JWT_SECRET=change_this_to_at_least_32_char_random_string
JWT_EXPIRES_IN=8h

# ─── LabVIEW (nechte prázdné ve vývojovém režimu) ────
NUXT_PUBLIC_LABVIEW_BASE_URL=
NUXT_PUBLIC_WS_URL=
NUXT_PUBLIC_WS_PATH=/ws
```

> Ve vývojovém režimu mohou `NUXT_PUBLIC_LABVIEW_BASE_URL` a `NUXT_PUBLIC_WS_URL` zůstat prázdné — WebSocket se na `localhost` nepřipojí bez explicitní konfigurace.

---

## Krok 3 – Spusťte databázi (Docker)

```bash
# Spusťte PostgreSQL a pgAdmin na pozadí
docker-compose up -d
```

Počkejte dokud se stav nezmění na `healthy`:
```bash
docker-compose ps
# NAME                STATUS
# remview-postgres    Up (healthy)
# remview-pgadmin     Up
```

> První spuštění stáhne Docker obrazy (~200 MB). Další starty jsou okamžité.

**Pokud je port 5432 obsazen:**
```bash
# Zkontrolujte co port používá
netstat -ano | findstr :5432

# Nebo změňte port v .env:
POSTGRES_PORT=5433
# a aktualizujte docker-compose.yml: "5433:5432"
```

---

## Krok 4 – Inicializujte databázi

```bash
# Nainstalujte závislosti Node.js (pokud ještě nebylo provedeno)
npm install

# Spusťte seed skript
npm run db:seed
```

Očekávaný výstup:
```
Connecting to PostgreSQL…
Applying schema…
Schema applied.
Seeding data…
Seed data inserted.
Done.
```

**Výchozí uživatelé po seed:**

| Username | Heslo | Role |
|----------|-------|------|
| `admin` | `admin123` | Administrator |
| `operator` | `oper456` | Operátor |
| `viewer` | `view789` | Prohlížeč |
| `tech` | `tech321` | Operátor |

---

## Krok 5 – Nainstalujte závislosti Node.js

```bash
npm install
```

Nainstalované balíčky:
```
nuxt 3.9.x          - framework Vue 3 SSR/SPA
pinia               - správa stavu
tailwindcss         - utility CSS
postgres (porsager) - PostgreSQL driver
jsonwebtoken        - JWT autentizace
bcryptjs            - hashování hesel
tsx                 - TypeScript runner (dev)
```

---

## Krok 6 – Spusťte vývojový server

```bash
npm run dev
```

Očekávaný výstup:
```
Nuxt 3.9.3 with Nitro
  ➜ Local:   http://localhost:3000/
  ➜ Network: http://192.168.x.x:3000/

✔ Nitro built
```

Otevřete prohlížeč: **http://localhost:3000**

Přihlaste se: `admin` / `admin123`

---

## Krok 7 – Ověření funkčnosti

### Otestujte API

```bash
# Test veřejného endpointu
curl http://localhost:3000/api/hostname

# Test přihlášení
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

### Otestujte databázi

```bash
# Připojte se přes psql
docker exec -it remview-postgres psql -U remview -d remview

# Zkontrolujte tabulky
\dt

# Zkontrolujte uživatele
SELECT username, role, active FROM users;

# Ukončete
\q
```

### Otestujte pgAdmin (GUI)

Otevřete: **http://localhost:5050**  
Přihlášení: `admin@remview.local` / `admin123`

Přidejte server (pokud není automaticky přidán):
- Host: `postgres` ← ne `localhost`!
- Port: `5432`
- Database: `remview`
- Username: `remview`

---

## Typické problémy a řešení

### `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL není spuštěn.
```bash
docker-compose up -d
docker-compose ps   # zkontrolujte stav
```

### `npm run db:seed` — "password authentication failed"

Heslo v `.env` neodpovídá heslu v Docker volume. Resetujte volume:
```bash
docker-compose down -v
docker-compose up -d
npm run db:seed
```

### Port 3000 je obsazen

```bash
# Spusťte na jiném portu
npx nuxt dev --port 3001
```

### `[Vue Router warn] No match found for /ws`

Normální zpráva ve vývojovém režimu — WS store se nepřipojuje bez explicitně nastaveného `NUXT_PUBLIC_WS_URL`. Ignorujte nebo nastavte URL:
```env
NUXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Prázdná stránka po přihlášení

Zkontrolujte konzoli prohlížeče (F12). Nejčastější příčiny:
1. Chybějící tabulka v databázi → spusťte `npm run db:seed`
2. Chyba JWT_SECRET → zkontrolujte `.env`

---

## npm skripty

| Příkaz | Popis |
|--------|-------|
| `npm run dev` | Vývojový server s HMR |
| `npm run build` | Produkční build (SSR) |
| `npm run generate` | Statický build (pro LabVIEW) |
| `npm run preview` | Náhled produkčního buildu |
| `npm run db:seed` | Inicializace / reset databáze |

---

## Vývojové prostředí – zkratka

```bash
# Terminál 1 – databáze
docker-compose up -d

# Terminál 2 – dev server
cd hasler-dashboard
npm run dev

# Hotovo!
# http://localhost:3000
# http://localhost:5050 (pgAdmin)
```

---

## Rozšíření VS Code (doporučená)

```
Volar           - podpora Vue 3 + TypeScript
ESLint          - linting
Prettier        - formátování
Tailwind CSS Intelligence - nápověda tříd Tailwind
Thunder Client  - testování REST API (alternativa k Postman)
Docker          - správa kontejnerů
```

Nainstalujte jedním příkazem:
```bash
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
```
