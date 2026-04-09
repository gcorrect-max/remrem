# REMview v3

**Przemysłowy dashboard stacji testowej dla Hasler Rail**

Aplikacja webowa do monitorowania i zarządzania procesem testowania urządzeń kolejowych (REM102) w czasie rzeczywistym. Integruje się z oprogramowaniem LabVIEW RT przez WebSocket i REST API, a wszystkie dane testowe zapisuje w bazie PostgreSQL.

---

## Spis treści

- [Podgląd](#podgląd)
- [Funkcje](#funkcje)
- [Architektura](#architektura)
- [Stack technologiczny](#stack-technologiczny)
- [Szybki start](#szybki-start)
- [Struktura projektu](#struktura-projektu)
- [API](#api)
- [WebSocket](#websocket)
- [Baza danych](#baza-danych)
- [Dokumentacja](#dokumentacja)
- [Wdrożenie](#wdrożenie)

---

## Podgląd

| Strona | Opis |
|--------|------|
| **Login** | Logowanie z polling statusu LabVIEW co 5s |
| **Dashboard** | Live sesja testowa — kroki, postęp, liczniki PASS/FAIL |
| **Wyniki testów** | Tabela pomiarów z parametrami, logami i eksportem CSV |
| **Status przyrządów** | Karty przyrządów GPIB/USB/LAN aktualizowane przez WS |
| **Konfiguracja** | Edycja danych urządzenia i modułów NI (JSONB) |
| **Schematy** | Przeglądarka rysunków technicznych (base64 PNG/SVG) |
| **Autoryzacja** | CRUD użytkowników z matrycą uprawnień |

---

## Funkcje

- 🔴 **Real-time** — WebSocket push z LabVIEW: statusy kroków, wyniki, przyrządy
- 🔐 **Autoryzacja JWT** — token 8h, role (admin/operator/viewer), uprawnienia per-strona
- 📊 **Sesje testowe** — pełna historia: sesje → kroki → wyniki → parametry → logi
- 🧪 **Parametry pomiarów** — wartość, jednostka, limity min/max, status OK/FAIL
- 📁 **Rysunki techniczne** — przechowywane jako base64 w PostgreSQL, podgląd SVG/PNG
- ⚙️ **Konfiguracja modułów** — JSONB dla modułów hardware/software NI (cDAQ/cRIO)
- 📤 **Eksport CSV** — wyniki testów z parametrami
- 🐳 **Docker** — PostgreSQL 16 + pgAdmin 4 gotowe na dowolny PC
- 📖 **Dokumentacja** — 21 plików MD w 3 językach (PL/CS/EN)

---

## Architektura

```
┌─────────────────────────────────────────────────────────────────┐
│  PRZEGLĄDARKA (Browser)                                         │
│  Vue 3 / Nuxt 3 · Pinia · Tailwind CSS                         │
│                                                                  │
│  Pages: login · dashboard · test-results · device-status · ...  │
│  Stores: auth · ws · dashboard                                   │
└────────┬──────────────────────────┬────────────────────────────┘
         │ HTTP polling             │ REST API (Bearer JWT)
         │ GET /api/hostname        │ /api/users, /api/test-sessions...
         │ WebSocket /ws            │
         ▼                          ▼
┌─────────────────┐      ┌──────────────────────────────────────┐
│ LABVIEW RT      │      │ NUXT NITRO SERVER (Node.js)          │
│ WEBSERVICE      │      │                                      │
│                 │ HTTP │ Middleware: JWT validation            │
│ VI: GET         │ ←──→ │ API: auth · users · device           │
│   /api/hostname │      │      instruments · test-sessions     │
│                 │      │      test-results · drawings         │
│ VI: WebSocket   │      │      module-configs · settings       │
│   /ws           │      │                                      │
│                 │      │ server/db/client.ts (pool max=10)    │
│ Static files    │      └─────────────────┬────────────────────┘
│ (Nuxt build)    │                        │ SQL
│                 │                        ▼
│ LabVIEW App     │      ┌──────────────────────────────────────┐
│ Test Sequencer  │ HTTP │ DOCKER                               │
│ VISA/DAQmx      │ ──→  │ PostgreSQL 16  ·  pgAdmin 4          │
│ HTTP Client     │      │ port 5432      ·  port 5050          │
└─────────────────┘      └──────────────────────────────────────┘
```

---

## Stack technologiczny

| Warstwa | Technologia |
|---------|-------------|
| Frontend | [Nuxt 3](https://nuxt.com) (Vue 3, Vite) |
| State management | [Pinia](https://pinia.vuejs.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Backend | Nuxt Nitro (Node.js) |
| Baza danych | PostgreSQL 16 (Docker) |
| DB driver | [postgres (porsager)](https://github.com/porsager/postgres) |
| Auth | JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) |
| Real-time | WebSocket (natywny API przeglądarki) |
| Konteneryzacja | Docker Compose |
| Instrumenty | LabVIEW RT + NI-DAQmx / VISA / GPIB |

---

## Szybki start

### Wymagania

- [Node.js](https://nodejs.org) ≥ 18
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

### Instalacja

```bash
# 1. Klonuj repo
git clone https://github.com/gcorrect-max/remrem.git
cd remrem

# 2. Skonfiguruj zmienne środowiskowe
cp .env.example .env
# edytuj .env — zmień hasła i JWT_SECRET

# 3. Uruchom bazę danych
docker-compose up -d

# 4. Zainstaluj zależności
npm install

# 5. Zainicjalizuj bazę
npm run db:seed

# 6. Uruchom serwer deweloperski
npm run dev
```

Otwórz **http://localhost:3000** i zaloguj się: `admin` / `admin123`

> Szczegółowy przewodnik: [`docs/getting-started.md`](docs/getting-started.md)

---

## Struktura projektu

```
hasler-dashboard/
├── pages/                      # Strony Vue (file-based routing)
│   ├── login.vue
│   ├── index.vue               # Dashboard (sesja live)
│   ├── test-results.vue        # Tabela wyników
│   ├── device-status.vue       # Status przyrządów (WS)
│   ├── authorization.vue       # Zarządzanie użytkownikami
│   ├── station-schema.vue      # Schematy graficzne
│   └── device-config/          # Konfiguracja urządzenia i modułów
│
├── stores/
│   ├── auth.ts                 # Login, users CRUD
│   ├── ws.ts                   # WebSocket (connect, reconnect, latency)
│   └── dashboard.ts            # Sesja, kroki, wyniki, przyrządy
│
├── plugins/
│   └── labview.client.ts       # Routing wiadomości WS → stores
│
├── server/
│   ├── middleware/01.auth.ts   # JWT guard dla /api/*
│   ├── utils/auth.ts           # signToken, verifyToken, hashPassword
│   ├── db/
│   │   ├── client.ts           # postgres singleton (pool 10)
│   │   ├── schema.sql          # Schemat bazy danych
│   │   ├── seed.sql            # Dane startowe
│   │   └── seed.ts             # Skrypt migracji
│   └── api/                    # 33 endpointy REST
│       ├── hostname.get.ts     # PUBLIC
│       ├── auth/
│       ├── users/
│       ├── device/
│       ├── instruments/
│       ├── session/
│       ├── test-sessions/
│       ├── test-steps/
│       ├── test-results/
│       ├── drawings/
│       ├── module-configs/
│       └── settings/
│
├── docs/                       # Dokumentacja (PL/CS/EN)
├── postman/                    # Kolekcja Postman
├── docker-compose.yml
├── .env.example
└── nuxt.config.ts
```

---

## API

Wszystkie endpointy (poza `/api/hostname` i `/api/auth/login`) wymagają nagłówka:
```
Authorization: Bearer <jwt_token>
```

| Endpoint | Metody | Opis |
|----------|--------|------|
| `/api/hostname` | GET | Dane serwera LabVIEW (public) |
| `/api/auth/login` | POST | Logowanie → JWT token |
| `/api/users` | GET POST | Lista i tworzenie użytkowników |
| `/api/users/:id` | PUT DELETE | Edycja i usuwanie użytkownika |
| `/api/device` | GET PUT | Dane urządzenia REM102 |
| `/api/device/subsystems` | GET | Podsystemy urządzenia |
| `/api/instruments` | GET | Lista przyrządów pomiarowych |
| `/api/instruments/:id` | PUT | Aktualizacja statusu przyrządu |
| `/api/session` | GET | Aktualnie uruchomiona sesja |
| `/api/test-sessions` | GET POST | Historia i start sesji |
| `/api/test-sessions/:id` | GET PUT | Szczegóły i zakończenie sesji |
| `/api/test-steps` | GET | Kroki sesji (`?sessionId=`) |
| `/api/test-steps/:id` | PUT | Aktualizacja statusu kroku |
| `/api/test-results` | GET POST | Wyniki pomiarów z parametrami |
| `/api/test-results/:id` | GET PUT | Szczegóły + dołączenie logu |
| `/api/drawings` | GET | Lista schematów (bez base64) |
| `/api/drawings/:id` | GET PUT | Schemat z base64 / upload |
| `/api/module-configs` | GET | Konfiguracje modułów NI |
| `/api/module-configs/:id` | PUT | Zapis konfiguracji JSONB |
| `/api/settings` | GET PUT | Ustawienia aplikacji (upsert) |

> Pełna dokumentacja z przykładami: [`docs/api-reference.md`](docs/api-reference.md)

---

## WebSocket

Połączenie: `ws://<host>/ws?token=<jwt>`

### Wiadomości LabVIEW → Frontend

| Typ | Kiedy |
|-----|-------|
| `session.started` | Start nowej sesji testowej |
| `session.update` | Zmiana postępu / statusu sesji |
| `test-step.update` | Zmiana statusu kroku |
| `test-result.add` | Nowy wynik pomiaru |
| `test-result.log` | Log na żywo do aktywnego pomiaru |
| `instruments.update` | Aktualizacja statusów przyrządów |
| `ping` | Heartbeat → frontend odpowiada `pong` |

> Pełna specyfikacja: [`docs/websocket-protocol.md`](docs/websocket-protocol.md)

---

## Baza danych

**PostgreSQL 16** w Docker. Tabele:

```
users · devices · device_subsystems · instruments
test_sessions · test_steps · test_results
test_result_params · test_result_logs
drawings (TEXT base64) · module_configs (JSONB) · app_settings
```

### Skrypty

```bash
docker-compose up -d          # Uruchom PostgreSQL + pgAdmin
npm run db:seed               # Inicjalizuj schemat i dane startowe
```

**pgAdmin:** http://localhost:5050  
**PostgreSQL:** localhost:5432 (user: `remview`, db: `remview`)

> Szczegółowy opis: [`docs/postgresql.md`](docs/postgresql.md)  
> Instrukcja Docker: [`docs/how-to-docker.md`](docs/how-to-docker.md)

---

## Dokumentacja

Pełna dokumentacja dostępna w katalogu [`docs/`](docs/) w trzech językach:

| Dokument | PL | CS | EN |
|----------|:--:|:--:|:--:|
| [API Reference](docs/api-reference.md) | ✅ | ✅ | ✅ |
| [WebSocket Protocol](docs/websocket-protocol.md) | ✅ | ✅ | ✅ |
| [LabVIEW VIs](docs/labview-vis.md) | ✅ | ✅ | ✅ |
| [Frontend Pages](docs/frontend-pages.md) | ✅ | ✅ | ✅ |
| [Getting Started](docs/getting-started.md) | ✅ | ✅ | ✅ |
| [Deployment](docs/deployment.md) | ✅ | ✅ | ✅ |
| [PostgreSQL](docs/postgresql.md) | ✅ | — | — |
| [Docker How-To](docs/how-to-docker.md) | ✅ | — | — |
| [Architecture (draw.io)](docs/architecture.drawio) | ✅ | ✅ | ✅ |

---

## Wdrożenie

### Build statyczny (dla LabVIEW Webservice)

```bash
# Ustaw adresy IP w .env
NUXT_PUBLIC_LABVIEW_BASE_URL=http://192.168.1.100:8080
NUXT_PUBLIC_WS_URL=ws://192.168.1.100:8080

# Generuj build
npm run generate

# Skopiuj .output/public/ do LabVIEW Virtual Folder
```

### LabVIEW Webservice konfiguracja

- Dodaj **Virtual Folder** `→` `/` wskazujący na `.output/public/`
- Dodaj VI `GET /api/hostname` (publiczny, brak auth)
- Dodaj VI `WS /ws` (WebSocket, JWT w query param)

> Pełny przewodnik wdrożenia: [`docs/deployment.md`](docs/deployment.md)

---

## Licencja

Projekt wewnętrzny Hasler Rail. Wszelkie prawa zastrzeżone.
