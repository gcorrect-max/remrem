# How to: Docker – PostgreSQL + pgAdmin for REMview v3

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Files present in project root:
  - `docker-compose.yml`
  - `.env` (copy from `.env.example` and fill in values)

---

## 1. First-time setup

### 1.1 Copy environment file

```bash
cd hasler-dashboard
cp .env.example .env
```

Edit `.env` and set your passwords:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret        # change this

PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=admin123               # change this
PGADMIN_PORT=5050

JWT_SECRET=change_this_to_a_long_random_string_min_32_chars
JWT_EXPIRES_IN=8h

NUXT_PUBLIC_LABVIEW_BASE_URL=
NUXT_PUBLIC_WS_URL=
NUXT_PUBLIC_WS_PATH=/ws
```

### 1.2 Start containers

```bash
docker-compose up -d
```

Expected output:
```
[+] Running 3/3
 ✔ Network hasler-dashboard_default  Created
 ✔ Container remview-postgres        Started
 ✔ Container remview-pgadmin         Started
```

### 1.3 Verify containers are running

```bash
docker-compose ps
```

```
NAME                STATUS          PORTS
remview-postgres    Up (healthy)    0.0.0.0:5432->5432/tcp
remview-pgadmin     Up              0.0.0.0:5050->80/tcp
```

> The `postgres` container uses a **healthcheck** — wait for status `healthy` before proceeding.

---

## 2. Initialize database schema + seed data

Run once after first start:

```bash
cd hasler-dashboard
npm install          # if not done yet
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

This runs `server/db/seed.ts` which applies:
- `server/db/schema.sql` — creates all tables, indexes, extensions
- `server/db/seed.sql` — inserts default users, device, instruments, module configs

### Default users after seed

| Username  | Password   | Role    |
|-----------|------------|---------|
| `admin`   | `admin123` | admin   |
| `operator`| `oper456`  | operator|
| `viewer`  | `view789`  | viewer  |
| `tech`    | `tech321`  | operator|

> **Change all passwords immediately in production!**

---

## 3. Daily usage

### Start (after PC reboot)

```bash
docker-compose up -d
```

### Stop (graceful)

```bash
docker-compose stop
```

### Stop and remove containers (data is preserved in volume)

```bash
docker-compose down
```

### Stop and DELETE all data (destructive!)

```bash
docker-compose down -v
```

---

## 4. pgAdmin – database GUI

Open in browser: **http://localhost:5050**

Login with credentials from `.env`:
- Email: `admin@remview.local` (or your `PGADMIN_EMAIL`)
- Password: `admin123` (or your `PGADMIN_PASSWORD`)

### Add server connection in pgAdmin

1. Right-click **Servers** → **Register** → **Server…**
2. **General** tab → Name: `REMview`
3. **Connection** tab:
   - Host: `postgres` *(Docker internal hostname, NOT localhost)*
   - Port: `5432`
   - Database: `remview`
   - Username: `remview`
   - Password: *(from `.env`)*
4. Click **Save**

> Inside Docker network the hostname is `postgres` (service name), not `localhost`.

---

## 5. Connect from Nuxt Nitro server

The Nitro server connects using values from `.env`:

```env
POSTGRES_HOST=localhost    # from host machine perspective
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret
```

Connection is managed by `server/db/client.ts`:

```typescript
import postgres from 'postgres'
const sql = postgres({
  host:     process.env.POSTGRES_HOST,
  port:     Number(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  max:      10,
})
```

---

## 6. Useful commands

### View live logs

```bash
# Both containers
docker-compose logs -f

# PostgreSQL only
docker-compose logs -f postgres

# pgAdmin only
docker-compose logs -f pgadmin
```

### Connect to PostgreSQL via CLI

```bash
docker exec -it remview-postgres psql -U remview -d remview
```

Useful SQL commands inside psql:
```sql
\dt                          -- list all tables
\d users                     -- describe users table
SELECT * FROM users;         -- list all users
SELECT COUNT(*) FROM test_results;
\q                           -- quit
```

### Re-run seed (reset to defaults)

> WARNING: This truncates all data and re-inserts defaults.

```bash
npm run db:seed
```

To manually reset a single table:
```bash
docker exec -it remview-postgres psql -U remview -d remview \
  -c "TRUNCATE test_results, test_result_params, test_result_logs, test_steps, test_sessions RESTART IDENTITY CASCADE;"
```

### Backup database

```bash
docker exec remview-postgres pg_dump -U remview remview > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from backup

```bash
docker exec -i remview-postgres psql -U remview remview < backup_20240115_103000.sql
```

---

## 7. Moving to another PC

The entire database is portable. Copy these files:

```
hasler-dashboard/
├── docker-compose.yml
├── .env                     ← keep secret!
└── server/db/
    ├── schema.sql
    └── seed.sql
```

On the new PC:
```bash
docker-compose up -d
npm install
npm run db:seed              # initializes fresh database
```

Or restore from backup:
```bash
docker-compose up -d
# wait for 'healthy' status, then:
docker exec -i remview-postgres psql -U remview remview < backup.sql
```

---

## 8. Troubleshooting

### Port 5432 already in use

Another PostgreSQL instance is running. Options:
- Stop local PostgreSQL: `net stop postgresql` (Windows)
- Or change port in `.env`: `POSTGRES_PORT=5433`
  and in `docker-compose.yml`: `"5433:5432"`

### Port 5050 already in use

Change pgAdmin port in `.env`: `PGADMIN_PORT=5051`
and in `docker-compose.yml`: `"5051:80"`

### Container exits immediately

Check logs:
```bash
docker-compose logs postgres
```

Common causes:
- Wrong `POSTGRES_PASSWORD` format (avoid special shell characters)
- Volume permissions issue → `docker-compose down -v && docker-compose up -d`

### `npm run db:seed` fails: "connection refused"

PostgreSQL container is not yet healthy. Wait 10-15 seconds and retry:
```bash
docker-compose ps         # check status
npm run db:seed
```

### pgAdmin shows "Server not found"

Use `postgres` as hostname (not `localhost`) — inside Docker network, service names are used as hostnames.

---

## 9. docker-compose.yml reference

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: remview-postgres
    environment:
      POSTGRES_DB:       ${POSTGRES_DB}
      POSTGRES_USER:     ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/db/schema.sql:/docker-entrypoint-initdb.d/01_schema.sql:ro
      - ./server/db/seed.sql:/docker-entrypoint-initdb.d/02_seed.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 10

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: remview-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL:    ${PGADMIN_EMAIL}
      PGADMIN_DEFAULT_PASSWORD: ${PGADMIN_PASSWORD}
    ports:
      - "${PGADMIN_PORT:-5050}:80"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  postgres_data:
```

---

## 10. Quick reference

| Action | Command |
|--------|---------|
| Start Docker | `docker-compose up -d` |
| Stop Docker | `docker-compose stop` |
| Remove containers | `docker-compose down` |
| Remove containers + data | `docker-compose down -v` |
| Init/reset DB | `npm run db:seed` |
| View logs | `docker-compose logs -f` |
| psql CLI | `docker exec -it remview-postgres psql -U remview -d remview` |
| Backup | `docker exec remview-postgres pg_dump -U remview remview > backup.sql` |
| Restore | `docker exec -i remview-postgres psql -U remview remview < backup.sql` |
| pgAdmin GUI | http://localhost:5050 |
