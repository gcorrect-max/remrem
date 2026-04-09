# PostgreSQL 16 – Dokumentacja bazy danych REMview v3

## Spis treści

1. [Przegląd](#1-przegląd)
2. [Schemat bazy danych](#2-schemat-bazy-danych)
3. [Tabele – szczegóły](#3-tabele--szczegóły)
4. [Relacje między tabelami](#4-relacje-między-tabelami)
5. [Warstwa dostępu – postgres driver](#5-warstwa-dostępu--postgres-driver)
6. [Wzorce zapytań SQL](#6-wzorce-zapytań-sql)
7. [Inicjalizacja i seed](#7-inicjalizacja-i-seed)
8. [Indeksy i wydajność](#8-indeksy-i-wydajność)
9. [Typy specjalne: JSONB i TEXT base64](#9-typy-specjalne-jsonb-i-text-base64)
10. [Bezpieczeństwo i hasła](#10-bezpieczeństwo-i-hasła)
11. [Konfiguracja połączenia](#11-konfiguracja-połączenia)
12. [Przydatne zapytania diagnostyczne](#12-przydatne-zapytania-diagnostyczne)

---

## 1. Przegląd

Baza danych PostgreSQL 16 jest centralnym magazynem danych dla REMview v3. Przechowuje:

| Dane | Tabela |
|------|--------|
| Użytkownicy systemu i uprawnienia | `users` |
| Konfiguracja testowanego urządzenia | `devices`, `device_subsystems` |
| Przyrządy pomiarowe i ich status | `instruments` |
| Sesje testowe i ich wyniki | `test_sessions`, `test_steps`, `test_results` |
| Parametry i logi pomiarów | `test_result_params`, `test_result_logs` |
| Schematy graficzne (base64) | `drawings` |
| Konfiguracje modułów NI (JSONB) | `module_configs` |
| Ustawienia aplikacji | `app_settings` |

**Dostęp:** tylko przez Nuxt Nitro Server — frontend nigdy nie łączy się z bazą bezpośrednio. LabVIEW zapisuje dane przez wywołania REST API Nitro.

```
LabVIEW ──HTTP──→ Nitro Server ──SQL──→ PostgreSQL
Browser  ──HTTP──→ Nitro Server ──SQL──→ PostgreSQL
```

---

## 2. Schemat bazy danych

### Diagram ERD (uproszczony)

```
users
  id · username · password_hash · display_name · role · active · permissions

devices
  id · model · article_number · production_number · serial_no · rto_file · rto_revision
    └── device_subsystems
          id · device_id(FK) · name · status · description

instruments
  id · name · type · status · address · manufacturer · model · serial_no · firmware · last_seen

test_sessions
  id · device_id(FK) · operator · status · started_at · finished_at
    └── test_steps
    │     id · session_id(FK) · name · status · step_order · started_at · finished_at · message
    └── test_results
          id · session_id(FK) · test_name · status · measured_at
            └── test_result_params
            │     id · result_id(FK) · name · value · unit · low_limit · high_limit · status
            └── test_result_logs
                  id · result_id(FK) · level · message · ts

drawings
  id · name · description · mime_type · image_base64(TEXT) · updated_at

module_configs
  id · name · type · slot_index · config(JSONB) · updated_at

app_settings
  id · key(UNIQUE) · value · updated_at
```

---

## 3. Tabele – szczegóły

### `users`

```sql
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,           -- bcrypt hash
  display_name  VARCHAR(100),
  role          VARCHAR(20)  NOT NULL DEFAULT 'viewer',  -- admin|operator|viewer
  active        BOOLEAN      NOT NULL DEFAULT true,
  permissions   JSONB        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Przykład permissions JSONB:**
```json
{
  "overview":      true,
  "results":       true,
  "config":        false,
  "deviceStatus":  true,
  "stationSchema": false,
  "settings":      false,
  "help":          true,
  "authorization": false
}
```

---

### `devices`

```sql
CREATE TABLE devices (
  id                SERIAL PRIMARY KEY,
  model             VARCHAR(50),       -- np. "REM102"
  article_number    VARCHAR(50),
  production_number VARCHAR(50),
  serial_no         VARCHAR(50),
  rto_file          VARCHAR(200),      -- nazwa pliku .rtexe LabVIEW
  rto_revision      VARCHAR(20),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `device_subsystems`

```sql
CREATE TABLE device_subsystems (
  id          SERIAL PRIMARY KEY,
  device_id   INTEGER REFERENCES devices(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'unknown',
  description TEXT
);
```

---

### `instruments`

```sql
CREATE TABLE instruments (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(50),          -- DMM|OSC|PSU|DAQ|...
  status       VARCHAR(20)  NOT NULL DEFAULT 'offline',  -- online|offline|error|busy
  address      VARCHAR(100),         -- np. "GPIB0::22::INSTR"
  manufacturer VARCHAR(100),
  model        VARCHAR(100),
  serial_no    VARCHAR(50),
  firmware     VARCHAR(50),
  last_seen    TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### `test_sessions`

```sql
CREATE TABLE test_sessions (
  id          SERIAL PRIMARY KEY,
  device_id   INTEGER REFERENCES devices(id),
  operator    VARCHAR(100),
  status      VARCHAR(20)  NOT NULL DEFAULT 'running',  -- running|passed|failed|aborted
  started_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
```

---

### `test_steps`

```sql
CREATE TABLE test_steps (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER REFERENCES test_sessions(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending',  -- pending|running|ok|fail|skip
  step_order  INTEGER      NOT NULL DEFAULT 0,
  started_at  TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  message     TEXT
);
```

---

### `test_results`

```sql
CREATE TABLE test_results (
  id          SERIAL PRIMARY KEY,
  session_id  INTEGER REFERENCES test_sessions(id) ON DELETE CASCADE,
  test_name   VARCHAR(200) NOT NULL,
  status      VARCHAR(20)  NOT NULL DEFAULT 'ok',       -- ok|fail|running|skip
  measured_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

---

### `test_result_params`

```sql
CREATE TABLE test_result_params (
  id         SERIAL PRIMARY KEY,
  result_id  INTEGER REFERENCES test_results(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,   -- np. "V_in"
  value      VARCHAR(100) NOT NULL,   -- jako string, np. "24.1"
  unit       VARCHAR(20),             -- np. "V", "A", "Ω"
  low_limit  NUMERIC,
  high_limit NUMERIC,
  status     VARCHAR(20)              -- ok|fail
);
```

---

### `test_result_logs`

```sql
CREATE TABLE test_result_logs (
  id        SERIAL PRIMARY KEY,
  result_id INTEGER REFERENCES test_results(id) ON DELETE CASCADE,
  level     VARCHAR(10) NOT NULL DEFAULT 'info',  -- info|warn|error|debug
  message   TEXT        NOT NULL,
  ts        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `drawings`

```sql
CREATE TABLE drawings (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(200) NOT NULL,
  description  TEXT,
  mime_type    VARCHAR(50)  DEFAULT 'image/svg+xml',  -- image/svg+xml|image/png
  image_base64 TEXT,         -- surowy base64 BEZ prefiksu "data:image/...;base64,"
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

> ⚠️ `image_base64` przechowuje **surowy base64** bez prefiksu `data:image/...;base64,`. Prefiks dodawany jest we frontendzie przy wyświetlaniu:
> ```javascript
> `data:${drawing.mimeType};base64,${drawing.imageBase64}`
> ```

---

### `module_configs`

```sql
CREATE TABLE module_configs (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  type       VARCHAR(20)  NOT NULL DEFAULT 'hardware',  -- hardware|software
  slot_index INTEGER,               -- pozycja slotu w chassisie NI
  config     JSONB        NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Przykład config JSONB dla modułu hardware:**
```json
{
  "enabled":    true,
  "channels":   32,
  "sampleRate": 250000,
  "range":      "-10 to +10 V",
  "coupling":   "DC",
  "termination": "RSE"
}
```

**Przykład config JSONB dla modułu software:**
```json
{
  "version":     "2.1.0",
  "enabled":     true,
  "logLevel":    "info",
  "timeout":     5000,
  "retries":     3,
  "calibration": "2024-01-15"
}
```

---

### `app_settings`

```sql
CREATE TABLE app_settings (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(100) UNIQUE NOT NULL,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
```

**Wbudowane klucze ustawień:**

| Klucz | Przykład | Opis |
|-------|---------|------|
| `language` | `pl` | Język interfejsu (`pl`/`cs`/`en`) |
| `theme` | `dark` | Motyw (`dark`/`light`) |
| `timezone` | `Europe/Warsaw` | Strefa czasowa |
| `sessionTimeout` | `28800` | Czas sesji JWT w sekundach |
| `autoLogout` | `true` | Automatyczne wylogowanie |
| `stationName` | `Stacja #1` | Nazwa stacji |

---

## 4. Relacje między tabelami

```
devices (1) ──────────── (*) device_subsystems
devices (1) ──────────── (*) test_sessions
test_sessions (1) ─────── (*) test_steps
test_sessions (1) ─────── (*) test_results
test_results (1) ──────── (*) test_result_params
test_results (1) ──────── (*) test_result_logs
```

Wszystkie klucze obce mają `ON DELETE CASCADE` — usunięcie sesji testowej usuwa automatycznie kroki i wyniki.

---

## 5. Warstwa dostępu – postgres driver

Projekt używa pakietu **[postgres (porsager)](https://github.com/porsager/postgres)** — lekkiego klienta z interfejsem tagged template literals.

### Singleton połączenia (`server/db/client.ts`)

```typescript
import postgres from 'postgres'

let _sql: ReturnType<typeof postgres> | null = null

export function useDb() {
  if (_sql) return _sql
  _sql = postgres({
    host:     process.env.POSTGRES_HOST     ?? 'localhost',
    port:     Number(process.env.POSTGRES_PORT ?? 5432),
    database: process.env.POSTGRES_DB       ?? 'remview',
    username: process.env.POSTGRES_USER     ?? 'remview',
    password: process.env.POSTGRES_PASSWORD ?? 'remview_secret',
    max:      10,   // connection pool
  })
  return _sql
}
```

### Użycie w API endpoint

```typescript
import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const sql = useDb()
  const rows = await sql`SELECT * FROM users ORDER BY id`
  return rows
})
```

---

## 6. Wzorce zapytań SQL

### SELECT – podstawowy

```typescript
const sql = useDb()

// Wszystkie wiersze
const users = await sql`SELECT * FROM users ORDER BY id`

// Z warunkiem
const [user] = await sql`SELECT * FROM users WHERE username = ${username}`

// Pierwsza sesja uruchomiona
const [session] = await sql`
  SELECT * FROM test_sessions WHERE status = 'running' LIMIT 1
`
```

### SELECT – JOIN z agregatem

```typescript
// Wyniki testów razem z parametrami (jako zagregowana tablica JSON)
const results = await sql`
  SELECT
    tr.*,
    array_agg(
      json_build_object(
        'name',  trp.name,
        'value', trp.value,
        'unit',  trp.unit,
        'low',   trp.low_limit,
        'high',  trp.high_limit,
        'status',trp.status
      ) ORDER BY trp.id
    ) FILTER (WHERE trp.id IS NOT NULL) AS params
  FROM test_results tr
  LEFT JOIN test_result_params trp ON trp.result_id = tr.id
  WHERE tr.session_id = ${sessionId}
  GROUP BY tr.id
  ORDER BY tr.id
`
```

### INSERT – pojedynczy wiersz

```typescript
const [newSession] = await sql`
  INSERT INTO test_sessions (device_id, operator, status, started_at)
  VALUES (${deviceId}, ${operator}, 'running', NOW())
  RETURNING *
`
```

### INSERT – wiele wierszy naraz

```typescript
// Wstawianie tablicy parametrów w jednym zapytaniu
const paramRows = params.map(p => ({
  result_id:  resultId,
  name:       p.name,
  value:      p.value,
  unit:       p.unit       ?? null,
  low_limit:  p.lowLimit   ?? null,
  high_limit: p.highLimit  ?? null,
  status:     p.status     ?? null,
}))

await sql`INSERT INTO test_result_params ${sql(paramRows)}`
```

### UPDATE – dynamiczne SET

```typescript
// Budowanie obiektu updates w runtime
const sets: Record<string, unknown> = { updated_at: new Date() }

if (body.status  !== undefined) sets.status   = body.status
if (body.message !== undefined) sets.message  = body.message
if (body.model   !== undefined) sets.model    = body.model

// sql(sets) generuje "SET status=$1, message=$2, ..." bezpiecznie
const [updated] = await sql`
  UPDATE test_steps SET ${sql(sets)}
  WHERE id = ${stepId}
  RETURNING *
`
if (!updated) throw createError({ statusCode: 404, message: 'Not found' })
```

### UPDATE – JSONB

```typescript
// sql.json() wymagane dla kolumn JSONB
const sets = {
  config:     sql.json(body.config),
  updated_at: new Date(),
}

await sql`UPDATE module_configs SET ${sql(sets)} WHERE id = ${id}`
```

### UPSERT – INSERT … ON CONFLICT

```typescript
// Upsert ustawień aplikacji
const rows = entries.map(([key, value]) => ({
  key,
  value:      typeof value === 'string' ? value : JSON.stringify(value),
  updated_at: new Date(),
}))

await sql`
  INSERT INTO app_settings ${sql(rows)}
  ON CONFLICT (key) DO UPDATE
    SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
`
```

### Zapytanie warunkowe (bez if w SQL)

```typescript
// Filtr opcjonalny — dwa oddzielne zapytania, nie string concatenation
const rows = status
  ? await sql`SELECT * FROM test_sessions WHERE status = ${status} ORDER BY started_at DESC LIMIT ${limit}`
  : await sql`SELECT * FROM test_sessions ORDER BY started_at DESC LIMIT ${limit}`
```

### Transakcja

```typescript
await sql.begin(async sql => {
  // Abort running sessions
  await sql`
    UPDATE test_sessions SET status = 'aborted', finished_at = NOW()
    WHERE status = 'running'
  `
  // Start new session
  const [session] = await sql`
    INSERT INTO test_sessions (device_id, operator, status)
    VALUES (${deviceId}, ${operator}, 'running')
    RETURNING *
  `
  return session
})
```

---

## 7. Inicjalizacja i seed

### Automatyczna (Docker)

Docker Compose montuje pliki SQL do katalogu init:

```yaml
volumes:
  - ./server/db/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
  - ./server/db/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql:ro
```

Pliki te są wykonywane **tylko przy pierwszym uruchomieniu** pustego volume.

### Manualna (po zmianie schematu)

```bash
npm run db:seed
# uruchamia: tsx server/db/seed.ts
```

Skrypt seed.ts:
1. Aplikuje `schema.sql` (CREATE TABLE IF NOT EXISTS — bezpieczne przy powtórzeniu)
2. Aplikuje `seed.sql` (domyślne dane)

### Domyślni użytkownicy (seed.sql)

| Username   | Hasło      | Rola     |
|------------|------------|----------|
| `admin`    | `admin123` | admin    |
| `operator` | `oper456`  | operator |
| `viewer`   | `view789`  | viewer   |
| `tech`     | `tech321`  | operator |

Hasła są hashowane funkcją pgcrypto bezpośrednio w SQL:
```sql
INSERT INTO users (username, password_hash, display_name, role)
VALUES (
  'admin',
  crypt('admin123', gen_salt('bf', 10)),
  'Administrator',
  'admin'
);
```

> ⚠️ Zmień hasła przed wdrożeniem produkcyjnym!

---

## 8. Indeksy i wydajność

```sql
-- Szybkie wyszukiwanie użytkownika po loginie
CREATE INDEX idx_users_username ON users(username);

-- Filtrowanie sesji po statusie (live session lookup)
CREATE INDEX idx_test_sessions_status ON test_sessions(status);

-- Wyniki powiązane z sesją (najczęstsze zapytanie)
CREATE INDEX idx_test_results_session ON test_results(session_id);
CREATE INDEX idx_test_steps_session   ON test_steps(session_id);

-- Parametry i logi powiązane z wynikiem
CREATE INDEX idx_params_result ON test_result_params(result_id);
CREATE INDEX idx_logs_result   ON test_result_logs(result_id);
CREATE INDEX idx_logs_ts       ON test_result_logs(ts);

-- Moduły po typie (hardware/software)
CREATE INDEX idx_module_configs_type ON module_configs(type);

-- Ustawienia po kluczu (UNIQUE = automatyczny indeks)
-- (key UNIQUE NOT NULL)
```

**Connection pool:** ustawiony na `max: 10` w `client.ts`. Wystarczający dla jednoczesnego dostępu z frontendu i LabVIEW. Zwiększ do 20 jeśli wiele instancji LabVIEW lub intensywne raportowanie.

---

## 9. Typy specjalne: JSONB i TEXT base64

### JSONB (`module_configs.config`, `users.permissions`)

**Odczyt:** automatyczny deserialize do JS object przez driver.

```typescript
const [cfg] = await sql`SELECT * FROM module_configs WHERE id = ${id}`
console.log(cfg.config)           // już jest obiektem JS, nie stringiem
console.log(cfg.config.channels)  // 32
```

**Zapis:** wymagane `sql.json()` przy dynamicznym SET:

```typescript
const sets = {
  config: sql.json({ channels: 32, sampleRate: 250000 })
}
await sql`UPDATE module_configs SET ${sql(sets)} WHERE id = ${id}`
```

**Bez sql.json() — błąd:** driver próbuje traktować obiekt jako array wierszy do INSERT.

### TEXT base64 (`drawings.image_base64`)

**Zapis (LabVIEW → Nitro → DB):**
```typescript
// LabVIEW przesyła surowy base64 w body JSON
const body = await readBody(event)
// body.imageBase64 = "iVBORw0KGgoAAAANSUh..." (bez prefiksu)
await sql`
  UPDATE drawings SET image_base64 = ${body.imageBase64} WHERE id = ${id}
`
```

**Odczyt (DB → Nitro → Frontend):**
```typescript
// API zwraca surowy base64
return { imageBase64: drawing.image_base64 }
```

**Wyświetlanie we frontendzie:**
```javascript
// drawings.vue — prepend data-URI prefix
const src = computed(() =>
  drawing.imageBase64
    ? `data:${drawing.mimeType};base64,${drawing.imageBase64}`
    : '/placeholder.svg'
)
```

---

## 10. Bezpieczeństwo i hasła

### Hashowanie haseł (bcryptjs)

```typescript
// server/utils/auth.ts
import bcrypt from 'bcryptjs'

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10)   // cost factor 10
}

export function checkPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash)
}
```

### Login endpoint

```typescript
// server/api/auth/login.post.ts
const [user] = await sql`SELECT * FROM users WHERE username = ${username} AND active = true`

if (!user || !checkPassword(password, user.password_hash)) {
  throw createError({ statusCode: 401, message: 'Invalid credentials' })
}

const token = signToken({ userId: user.id, role: user.role, username: user.username })
```

### JWT token

```typescript
// server/utils/auth.ts
import jwt from 'jsonwebtoken'

export function signToken(payload: object): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h'
  })
}

export function verifyToken(token: string) {
  return jwt.verify(token, process.env.JWT_SECRET!)
}
```

### Middleware JWT (Nitro)

```typescript
// server/middleware/01.auth.ts
const PUBLIC = ['/api/auth/login', '/api/hostname']

export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (PUBLIC.some(p => path.startsWith(p))) return  // skip auth

  const auth  = getRequestHeader(event, 'authorization')
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw createError({ statusCode: 401 })

  try {
    event.context.user = verifyToken(token)
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
})
```

---

## 11. Konfiguracja połączenia

### Zmienne środowiskowe (`.env`)

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret
```

### Dostęp w Nitro (`nuxt.config.ts`)

```typescript
export default defineNuxtConfig({
  runtimeConfig: {
    postgresHost:     process.env.POSTGRES_HOST     ?? 'localhost',
    postgresPort:     process.env.POSTGRES_PORT     ?? '5432',
    postgresDb:       process.env.POSTGRES_DB       ?? 'remview',
    postgresUser:     process.env.POSTGRES_USER     ?? 'remview',
    postgresPassword: process.env.POSTGRES_PASSWORD ?? '',
    jwtSecret:        process.env.JWT_SECRET        ?? '',
    jwtExpiresIn:     process.env.JWT_EXPIRES_IN    ?? '8h',
  }
})
```

### Połączenie (host vs. Docker)

| Skąd | Hostname | Port |
|------|----------|------|
| Nitro Server (host) | `localhost` | `5432` |
| pgAdmin (Docker) | `postgres` | `5432` |
| LabVIEW (host) | `localhost` | `5432` |
| Inny kontener Docker | `postgres` | `5432` |

> Wewnątrz sieci Docker nazwa hosta to nazwa serwisu z `docker-compose.yml` (`postgres`), nie `localhost`.

---

## 12. Przydatne zapytania diagnostyczne

### Stan sesji testowych

```sql
-- Aktualna uruchomiona sesja
SELECT ts.*, d.serial_no, d.model
FROM test_sessions ts
JOIN devices d ON d.id = ts.device_id
WHERE ts.status = 'running';

-- Ostatnie 10 sesji z podsumowaniem wyników
SELECT
  ts.id,
  ts.status,
  ts.operator,
  ts.started_at,
  COUNT(CASE WHEN tr.status = 'ok'   THEN 1 END) AS pass,
  COUNT(CASE WHEN tr.status = 'fail' THEN 1 END) AS fail,
  COUNT(tr.id)                                    AS total
FROM test_sessions ts
LEFT JOIN test_results tr ON tr.session_id = ts.id
GROUP BY ts.id
ORDER BY ts.started_at DESC
LIMIT 10;
```

### Status przyrządów

```sql
-- Wszystkie przyrządy z aktualnym statusem
SELECT name, type, status, address, last_seen
FROM instruments
ORDER BY type, name;

-- Przyrządy offline lub w błędzie
SELECT name, status, last_seen
FROM instruments
WHERE status IN ('offline', 'error')
ORDER BY last_seen DESC NULLS LAST;
```

### Użytkownicy i uprawnienia

```sql
-- Aktywni użytkownicy z rolami
SELECT username, display_name, role, active,
       permissions->>'authorization' AS can_authorize
FROM users
ORDER BY role, username;
```

### Rysunki i konfiguracje

```sql
-- Stan rysunków (czy wgrany plik)
SELECT id, name, mime_type,
       LENGTH(image_base64) AS base64_length,
       (image_base64 IS NOT NULL AND image_base64 <> '') AS has_image,
       updated_at
FROM drawings
ORDER BY id;

-- Moduły hardware z ich konfiguracją
SELECT id, name, slot_index, config->>'enabled' AS enabled
FROM module_configs
WHERE type = 'hardware'
ORDER BY slot_index;
```

### Diagnostyka rozmiaru tabel

```sql
-- Rozmiar każdej tabeli
SELECT
  relname AS table_name,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid))        AS table_size,
  n_live_tup                                     AS row_count
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

### Reset danych testowych (bez usuwania konfiguracji)

```sql
-- Uwaga: kasuje wszystkie wyniki i sesje!
TRUNCATE test_result_logs, test_result_params, test_results,
         test_steps, test_sessions
RESTART IDENTITY CASCADE;
```

### Szybkie sprawdzenie połączenia

```bash
docker exec -it remview-postgres psql -U remview -d remview \
  -c "SELECT version(); SELECT COUNT(*) FROM users;"
```
