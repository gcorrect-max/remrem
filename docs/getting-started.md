# Getting Started – Uruchomienie od zera

Kompletny przewodnik uruchomienia REMview v3 na nowym komputerze.

---

## Wymagania wstępne

| Oprogramowanie | Wersja | Link |
|----------------|--------|------|
| Node.js | ≥ 18.0.0 | https://nodejs.org |
| Docker Desktop | ≥ 4.0 | https://www.docker.com/products/docker-desktop |
| Git | dowolna | https://git-scm.com |
| Edytor kodu | VS Code (zalecany) | https://code.visualstudio.com |

**Sprawdź wersje po instalacji:**
```bash
node --version    # v18.x.x lub nowszy
npm --version     # 9.x.x lub nowszy
docker --version  # 24.x.x lub nowszy
git --version
```

---

## Krok 1 – Pobierz kod źródłowy

```bash
# Sklonuj repozytorium
git clone <repo-url> REMview_v3
cd REMview_v3/Frontend/hasler-dashboard
```

Lub skopiuj folder projektu i przejdź do katalogu:
```bash
cd D:\REMview_v3\Frontend\hasler-dashboard
```

**Struktura katalogu po pobraniu:**
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

## Krok 2 – Skonfiguruj zmienne środowiskowe

```bash
# Skopiuj plik przykładowy
copy .env.example .env
```

Otwórz `.env` i wypełnij wartości:

```env
# ─── PostgreSQL ───────────────────────────────────────
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=remview
POSTGRES_USER=remview
POSTGRES_PASSWORD=remview_secret        # zmień przed produkcją

# ─── pgAdmin ──────────────────────────────────────────
PGADMIN_EMAIL=admin@remview.local
PGADMIN_PASSWORD=admin123               # zmień przed produkcją
PGADMIN_PORT=5050

# ─── Autoryzacja JWT ──────────────────────────────────
JWT_SECRET=change_this_to_at_least_32_char_random_string
JWT_EXPIRES_IN=8h

# ─── LabVIEW (zostaw puste w trybie dev) ──────────────
NUXT_PUBLIC_LABVIEW_BASE_URL=
NUXT_PUBLIC_WS_URL=
NUXT_PUBLIC_WS_PATH=/ws
```

> W trybie deweloperskim `NUXT_PUBLIC_LABVIEW_BASE_URL` i `NUXT_PUBLIC_WS_URL` mogą pozostać puste — WebSocket nie połączy się na `localhost` bez jawnej konfiguracji.

---

## Krok 3 – Uruchom bazę danych (Docker)

```bash
# Uruchom PostgreSQL i pgAdmin w tle
docker-compose up -d
```

Poczekaj aż status zmieni się na `healthy`:
```bash
docker-compose ps
# NAME                STATUS
# remview-postgres    Up (healthy)
# remview-pgadmin     Up
```

> Pierwsze uruchomienie pobiera obrazy Docker (~200 MB). Kolejne starty są natychmiastowe.

**Jeśli port 5432 jest zajęty:**
```bash
# Sprawdź co używa portu
netstat -ano | findstr :5432

# Lub zmień port w .env:
POSTGRES_PORT=5433
# i zaktualizuj docker-compose.yml: "5433:5432"
```

---

## Krok 4 – Zainicjalizuj bazę danych

```bash
# Zainstaluj zależności Node.js (jeśli nie zrobione)
npm install

# Uruchom skrypt seed
npm run db:seed
```

Oczekiwane wyjście:
```
Connecting to PostgreSQL…
Applying schema…
Schema applied.
Seeding data…
Seed data inserted.
Done.
```

**Domyślni użytkownicy po seed:**

| Username | Hasło | Rola |
|----------|-------|------|
| `admin` | `admin123` | Administrator |
| `operator` | `oper456` | Operator |
| `viewer` | `view789` | Podgląd |
| `tech` | `tech321` | Operator |

---

## Krok 5 – Zainstaluj zależności Node.js

```bash
npm install
```

Zainstalowane pakiety:
```
nuxt 3.9.x          - framework Vue 3 SSR/SPA
pinia               - state management
tailwindcss         - utility CSS
postgres (porsager) - PostgreSQL driver
jsonwebtoken        - JWT auth
bcryptjs            - hashowanie haseł
tsx                 - TypeScript runner (dev)
```

---

## Krok 6 – Uruchom serwer deweloperski

```bash
npm run dev
```

Oczekiwany output:
```
Nuxt 3.9.3 with Nitro
  ➜ Local:   http://localhost:3000/
  ➜ Network: http://192.168.x.x:3000/

✔ Nitro built
```

Otwórz przeglądarkę: **http://localhost:3000**

Zaloguj się danymi: `admin` / `admin123`

---

## Krok 7 – Weryfikacja działania

### Sprawdź API

```bash
# Test endpointu publicznego
curl http://localhost:3000/api/hostname

# Test logowania
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"admin\",\"password\":\"admin123\"}"
```

### Sprawdź bazę danych

```bash
# Połącz się przez psql
docker exec -it remview-postgres psql -U remview -d remview

# Sprawdź tabele
\dt

# Sprawdź użytkowników
SELECT username, role, active FROM users;

# Wyjdź
\q
```

### Sprawdź pgAdmin (GUI)

Otwórz: **http://localhost:5050**  
Login: `admin@remview.local` / `admin123`

Dodaj serwer (jeśli nie jest automatycznie dodany):
- Host: `postgres` ← nie `localhost`!
- Port: `5432`
- Database: `remview`
- Username: `remview`

---

## Typowe problemy i rozwiązania

### `Error: connect ECONNREFUSED 127.0.0.1:5432`

PostgreSQL nie jest uruchomiony.
```bash
docker-compose up -d
docker-compose ps   # sprawdź status
```

### `npm run db:seed` — "password authentication failed"

Hasło w `.env` nie zgadza się z tym w Docker volume. Resetuj volume:
```bash
docker-compose down -v
docker-compose up -d
npm run db:seed
```

### Port 3000 jest zajęty

```bash
# Uruchom na innym porcie
npx nuxt dev --port 3001
```

### `[Vue Router warn] No match found for /ws`

Normalny komunikat w trybie dev — WebSocket store nie łączy się bez jawnie ustawionego `NUXT_PUBLIC_WS_URL`. Ignoruj lub ustaw URL:
```env
NUXT_PUBLIC_WS_URL=ws://localhost:8080
```

### Strona pusta po zalogowaniu

Sprawdź konsolę przeglądarki (F12). Najczęstsze przyczyny:
1. Brak tabeli w bazie → uruchom `npm run db:seed`
2. Błąd JWT_SECRET → sprawdź `.env`

---

## Skrypty npm

| Komenda | Opis |
|---------|------|
| `npm run dev` | Serwer deweloperski z HMR |
| `npm run build` | Build produkcyjny (SSR) |
| `npm run generate` | Statyczny build (dla LabVIEW) |
| `npm run preview` | Podgląd buildu produkcyjnego |
| `npm run db:seed` | Inicjalizacja / reset bazy danych |

---

## Środowisko deweloperskie – skrót

```bash
# Terminal 1 – baza danych
docker-compose up -d

# Terminal 2 – dev server
cd hasler-dashboard
npm run dev

# Gotowe!
# http://localhost:3000
# http://localhost:5050 (pgAdmin)
```

---

## Rozszerzenia VS Code (zalecane)

```
Volar           - wsparcie Vue 3 + TypeScript
ESLint          - linting
Prettier        - formatowanie
Tailwind CSS Intelligence - podpowiedzi klas Tailwind
Thunder Client  - REST API testing (alternatywa dla Postman)
Docker          - zarządzanie kontenerami
```

Zainstaluj jedną komendą:
```bash
code --install-extension Vue.volar
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-azuretools.vscode-docker
```
