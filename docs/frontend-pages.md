# Frontend Pages – Dokumentacja

Opis wszystkich stron Vue 3 w aplikacji REMview v3, ich stores, flow danych i zachowania.

---

## Spis treści

- [Architektura stron](#architektura-stron)
- [Pinia Stores](#pinia-stores)
  - [auth.ts](#authts)
  - [ws.ts](#wsts)
  - [dashboard.ts](#dashboardts)
- [Strony (Pages)](#strony-pages)
  - [login.vue](#loginvue)
  - [index.vue – Dashboard](#indexvue--dashboard)
  - [test-results.vue](#test-resultsvue)
  - [device-status.vue](#device-statusvue)
  - [authorization.vue](#authorizationvue)
  - [station-schema.vue](#station-schemavue)
  - [device-config/](#device-config)
  - [settings.vue](#settingsvue)
  - [help.vue](#helpvue)
- [Komponenty współdzielone](#komponenty-współdzielone)
  - [NavLeft.vue](#navleftvue)
- [Middleware](#middleware)
- [Plugin: labview.client.ts](#plugin-labviewclientts)

---

## Architektura stron

```
app.vue
└── NuxtLayout
    └── NavLeft.vue  (sidebar)
        └── NuxtPage
            ├── login.vue           /login
            ├── index.vue           /               (dashboard)
            ├── test-results.vue    /test-results
            ├── device-status.vue   /device-status
            ├── authorization.vue   /authorization
            ├── station-schema.vue  /station-schema
            ├── settings.vue        /settings
            ├── help.vue            /help
            └── device-config/
                ├── index.vue       /device-config
                ├── hardware.vue    /device-config/hardware
                ├── software.vue    /device-config/software
                └── modules-cfg/
                    ├── hardware/[module].vue
                    └── software/[module].vue
```

**Routing:** Nuxt 3 file-based routing. Wszystkie strony poza `/login` są chronione przez `middleware/auth.global.ts`.

---

## Pinia Stores

### auth.ts

**Plik:** `stores/auth.ts`

**Stan:**
```typescript
{
  token:       string | null    // JWT Bearer token
  user:        User | null      // zalogowany użytkownik
  users:       User[]           // lista użytkowników (admin)
  loading:     boolean
  error:       string | null
}
```

**Typ User:**
```typescript
interface User {
  id:          string
  username:    string
  displayName: string
  role:        'admin' | 'operator' | 'viewer'
  active:      boolean
  permissions: Record<string, boolean>
}
```

**Akcje:**

| Akcja | Opis | HTTP |
|-------|------|------|
| `login(username, password)` | Loguje użytkownika, zapisuje token w cookie | `POST /api/auth/login` |
| `logout()` | Wylogowuje, czyści cookie | `POST /api/auth/logout` |
| `fetchUsers()` | Pobiera listę użytkowników | `GET /api/users` |
| `addUser(data)` | Tworzy nowego użytkownika | `POST /api/users` |
| `updateUser(id, data)` | Aktualizuje dane użytkownika | `PUT /api/users/:id` |
| `removeUser(id)` | Usuwa użytkownika | `DELETE /api/users/:id` |

**Gettery:**
```typescript
isLoggedIn:    boolean   // !!token && !!user
isAdmin:       boolean   // user.role === 'admin'
can(permission: string): boolean  // user.permissions[permission]
```

---

### ws.ts

**Plik:** `stores/ws.ts`

**Stan:**
```typescript
{
  status:    'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  latency:   number | null     // RTT ping/pong w ms
  _socket:   WebSocket | null  // wewnętrzny
  _handlers: Map<string, Set<Function>>
}
```

**Gettery:**
```typescript
isConnected:  boolean   // status === 'connected'
statusLabel:  string    // 'Połączony' | 'Rozłączony' | ...
statusColor:  string    // 'green' | 'red' | 'yellow'
statusDot:    string    // HTML z kolorową kropką
```

**Akcje:**
```typescript
connect(url: string, token?: string): void
disconnect(): void
send(type: string, data: object): void
on(type: string, handler: Function): () => void   // zwraca unsubscribe
```

---

### dashboard.ts

**Plik:** `stores/dashboard.ts`

**Stan:**
```typescript
{
  session:     Session | null
  steps:       Step[]
  results:     TestResult[]
  instruments: Instrument[]
}
```

**Typy:**
```typescript
interface Session {
  id: string; operator: string; status: string
  startedAt: string; currentStep: string; progress: number
}
interface Step {
  id: string; name: string; status: string
  stepOrder: number; message: string | null
}
interface TestResult {
  id: string; testName: string; status: string
  measuredAt: string; params: Param[]
  logs: Log[]; expanded: boolean
}
interface Instrument {
  id: string; name: string; status: string; address: string
}
```

**Akcje:**
```typescript
startSession(data)              // ustawia session
updateSession(data)             // progress, status, currentStep
updateStep(stepId, data)        // aktualizuje status kroku
addResult(data)                 // dodaje wynik do listy
appendLog(resultId, log)        // dodaje log do wyniku
setInstruments(list)            // zastępuje całą listę przyrządów
toggleRow(resultId)             // expanded/collapsed w tabeli wyników
```

---

## Strony (Pages)

### login.vue

**Ścieżka:** `/login`  
**Auth:** ❌ publiczna (przekierowanie na `/` jeśli zalogowany)

**Funkcje:**
- Formularz logowania (username + password)
- Polling `GET /api/hostname` co **5 sekund** — sprawdzenie dostępności serwera LabVIEW
- Badge statusu LabVIEW Webservice: 🟢 online / 🔴 offline
- Blokada formularza gdy serwer offline
- Wyświetlenie informacji o serwerze: hostname, model, wersja RTO

**Dane z hostname (wyświetlane pod formularzem):**
```
Host: STATION-PC-01
RTO: rem102_main.rtexe
Revision: 1.2.3
```

**Flow danych:**
```
onMounted → startHostnamePolling()
  └── setInterval(5000):
        fetch('/api/hostname')
          ├── 200 OK → serverOnline = true, wyświetl info
          └── błąd   → serverOnline = false

submitLogin():
  └── auth.login(username, password)
        ├── 200 OK → navigateTo('/')
        └── błąd   → wyświetl komunikat błędu

onUnmounted → clearInterval()
```

**Stores używane:** `auth`  
**Komponenty:** brak (standalone page)

---

### index.vue – Dashboard

**Ścieżka:** `/`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.overview`

**Funkcje:**
- Pasek postępu sesji testowej (0-100%)
- Lista kroków z kolorowymi statusami
- Liczniki: PASS / FAIL / RUN / PEND
- Nagłówek sesji: operator, czas trwania, numer seryjny
- Automatyczna aktualizacja przez WebSocket (real-time)

**Ikony statusów kroków:**

| Status | Ikona | Kolor |
|--------|-------|-------|
| `ok` | ✅ | zielony |
| `fail` | ✗ | czerwony |
| `running` | ⟳ (animacja) | niebieski |
| `skip` | / | szary |
| `pending` | ◌ | szary |

**Pasek postępu:**
- Kolor zielony gdy `session.status === 'passed'`
- Kolor czerwony gdy `session.status === 'failed'`
- Kolor niebieski gdy `status === 'running'`
- Szerokość = `session.progress`%

**Flow danych:**
```
onMounted:
  └── fetch('/api/session')  → dashboard.startSession()

WS Events (z plugins/labview.client.ts):
  ├── session.started    → dashboard.startSession()
  ├── session.update     → dashboard.updateSession()
  └── test-step.update   → dashboard.updateStep()

Computed:
  ├── passCount   = steps.filter(ok).length
  ├── failCount   = steps.filter(fail).length
  ├── runCount    = steps.filter(running).length
  └── pendCount   = steps.filter(pending).length
```

**Stores używane:** `dashboard`, `auth`

---

### test-results.vue

**Ścieżka:** `/test-results`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.results`

**Funkcje:**
- Tabela wyników wszystkich pomiarów aktualnej sesji
- Filtr: All / PASS / FAIL / Running / Skip
- Rozwijane wiersze z parametrami i logami
- Log z kodowaniem kolorów (info=szary, warn=żółty, error=czerwony)
- Żywy kursor na końcu logu dla statusu `running`
- Eksport do CSV: `test-results-<serialNo>-<YYYY-MM-DD>.csv`
- Aktualizacja real-time przez WS

**Struktura tabeli:**
```
┌────────────────────────────────────────────────────────┐
│ Filter: [All] [PASS] [FAIL] [Running] [Skip]  [Export CSV] │
├──────┬─────────────────────┬────────┬──────────────────┤
│  #   │ Test Name           │ Status │ Measured At      │
├──────┼─────────────────────┼────────┼──────────────────┤
│  1   │ ▶ Voltage Check     │ ✅ PASS │ 10:05:00         │
│      │   V_in: 24.1V [23-25]  ██████████ OK            │
│      │   V_out: 12.05V [11.8-12.2] ██████████ OK       │
│      │   LOG: [info] V_in = 24.1 V – OK                │
├──────┼─────────────────────┼────────┼──────────────────┤
│  2   │ ▶ Current Check     │ ❌ FAIL │ 10:10:00         │
│      │   I_out: 2.85A [1.0-2.5] ████████████ FAIL     │
│      │   LOG: [error] Przekroczony limit prądu         │
└──────┴─────────────────────┴────────┴──────────────────┘
```

**Format CSV:**
```csv
#,Test Name,Status,Measured At,Parameter,Value,Unit,Low Limit,High Limit,Param Status
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_in,24.1,V,23,25,ok
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_out,12.05,V,11.8,12.2,ok
```

**Flow danych:**
```
onMounted:
  └── fetch('/api/test-results?sessionId=<current>')
        └── dashboard.results = data

WS Events:
  ├── test-result.add  → dashboard.addResult()
  └── test-result.log  → dashboard.appendLog()

toggleRow(id):
  └── dashboard.toggleRow(id) → expanded ↔ collapsed

exportCsv():
  └── map results → CSV string
      └── Blob → downloadLink.click()
```

**Stores używane:** `dashboard`, `auth`

---

### device-status.vue

**Ścieżka:** `/device-status`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.deviceStatus`

**Funkcje:**
- Siatka kart przyrządów pomiarowych
- Status real-time przez WebSocket (aktualizuje się bez reload)
- WS badge w nagłówku: `● Connected  12 ms` / `● Disconnected`
- Animacja pulsowania dla statusu `busy`
- Tooltip z adresem VISA/LAN/GPIB

**Karty przyrządów:**
```
┌─────────────────────────┐
│ 🟢 Multimetr HP 34401A  │
│ DMM                     │
│ GPIB0::22::INSTR        │
│ Last seen: 10:30:00     │
└─────────────────────────┘
```

| Status | Kolor karty | Ikona |
|--------|-------------|-------|
| `online` | zielona ramka | 🟢 |
| `offline` | czerwona ramka | 🔴 |
| `error` | pomarańczowa ramka | 🟠 |
| `busy` | niebieska ramka + pulsowanie | 🔵 |

**Flow danych:**
```
onMounted:
  └── fetch('/api/instruments')
        └── dashboard.setInstruments(data)

WS Events:
  └── instruments.update → dashboard.setInstruments(data.instruments)

Computed:
  └── instruments = dashboard.instruments  (reaktywne)
```

**Stores używane:** `dashboard`, `ws`

---

### authorization.vue

**Ścieżka:** `/authorization`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.authorization` (tylko admin)

**Funkcje:**
- Tabela wszystkich użytkowników systemu
- Dodawanie nowego użytkownika (modal)
- Edycja danych i uprawnień użytkownika (modal)
- Zmiana hasła (opcjonalne przy edycji)
- Toggle aktywności (active/inactive)
- Usuwanie użytkownika (z potwierdzeniem)
- Stany ładowania i błędów dla każdej operacji

**Modal – pola formularza:**
```
Username:     [____________]
Display Name: [____________]
Password:     [____________] (opcjonalne przy edycji)
Role:         [○ admin  ○ operator  ○ viewer]
Active:       [✓]

Permissions:
  [✓] Overview     [✓] Results    [ ] Config
  [✓] Device Status [ ] Schema    [ ] Settings
  [✓] Help          [ ] Authorization
```

**Flow danych:**
```
onMounted:
  └── auth.fetchUsers() → loading = true → users = data

openAddModal():
  └── resetForm() → showModal = true

openEditModal(user):
  └── form = { ...user } → showModal = true

saveModal():
  ├── Nowy:  auth.addUser(form)
  └── Edycja: auth.updateUser(id, form)
       └── success → closeModal → toast

toggleActive(user):
  └── auth.updateUser(user.id, { active: !user.active })

removeUser(id):
  └── confirm() → auth.removeUser(id)
```

**Stores używane:** `auth`

---

### station-schema.vue

**Ścieżka:** `/station-schema`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.stationSchema`

**Funkcje:**
- Wyświetlanie schematów graficznych stacji (PNG lub SVG)
- Lista rysunków z lewej (sidebar)
- Kliknięcie → ładuje i wyświetla rysunek
- Powiększanie i przewijanie (zoom + pan)
- Wskazanie czy rysunek jest dostępny (`hasImage`)

**Flow danych:**
```
onMounted:
  └── fetch('/api/drawings')
        └── drawings = data (lista bez base64)

selectDrawing(id):
  └── fetch('/api/drawings/<id>')
        └── activeDrawing = response
            └── imgSrc = `data:${mimeType};base64,${imageBase64}`
```

> Base64 jest ładowany na żądanie (nie przy starcie strony) — rysunki mogą być duże.

**Stores używane:** `auth`

---

### device-config/

**Ścieżka:** `/device-config` i podstrony  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.config`

**Podstrony:**

| Ścieżka | Zawartość |
|---------|-----------|
| `/device-config` | Dane urządzenia (model, S/N, RTO) |
| `/device-config/hardware` | Lista modułów hardware NI |
| `/device-config/software` | Lista modułów software |
| `/device-config/modules-cfg/hardware/[module]` | Edycja konfiguracji JSONB modułu HW |
| `/device-config/modules-cfg/software/[module]` | Edycja konfiguracji JSONB modułu SW |

**Główna strona – device-config/index.vue:**
```
fetch('/api/device')
  └── formularz z polami: model, S/N, articleNumber, rtoFile, rtoRevision
      └── PUT /api/device na submit
```

**Strona modułów – hardware.vue / software.vue:**
```
fetch('/api/module-configs?type=hardware')
  └── tabela modułów z slotIndex, enabled
      └── kliknięcie → /device-config/modules-cfg/hardware/<id>
```

**Edycja konfiguracji – [module].vue:**
```
fetch('/api/module-configs/<id>')
  └── wyświetl config JSONB jako formularz dynamiczny
      └── PUT /api/module-configs/<id> na submit
```

---

### settings.vue

**Ścieżka:** `/settings`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.settings`

**Funkcje:**
- Ustawienia aplikacji: język, motyw, strefa czasowa
- Nazwa stacji, timeout sesji, auto-logout
- Zapis przez `PUT /api/settings`

**Flow danych:**
```
onMounted:
  └── fetch('/api/settings')
        └── form = data

save():
  └── PUT /api/settings { language, theme, ... }
        └── success → toast "Zapisano"
```

---

### help.vue

**Ścieżka:** `/help`  
**Auth:** ✅ wymagana  
**Uprawnienie:** `permissions.help`

**Zawartość:** Statyczna strona z dokumentacją użytkownika: opis statusów, instrukcja obsługi, kontakt do serwisu.

---

## Komponenty współdzielone

### NavLeft.vue

**Plik:** `components/NavLeft.vue`

**Funkcje:**
- Sidebar nawigacyjny z linkami do stron
- Logo Hasler Rail + nazwa aplikacji
- WS status badge: kolorowa kropka + label + latencja [ms]
- Imię i rola zalogowanego użytkownika
- Przycisk wylogowania
- Zwijanie sidebar (mobile)

**WS Status Row:**
```
● Połączony  14 ms
```

Kolor kropki zależy od `ws.statusColor` (reaktywny).

**Strony w menu (zależne od uprawnień):**
```
if permissions.overview      → Dashboard
if permissions.results       → Wyniki Testów
if permissions.deviceStatus  → Status Przyrządów
if permissions.config        → Konfiguracja
if permissions.stationSchema → Schemat Stacji
if permissions.settings      → Ustawienia
if permissions.help          → Pomoc
if permissions.authorization → Autoryzacja
```

**Stores używane:** `auth`, `ws`

---

## Middleware

### middleware/auth.global.ts

Działa na **każdej zmianie trasy** (global middleware).

```typescript
export default defineNuxtRouteMiddleware((to) => {
  // 1. Pomiń ścieżki systemowe Nuxt i WebSocket
  if (to.path.startsWith('/_') || to.path === '/ws') return

  const auth = useAuthStore()

  // 2. Jeśli niezalogowany i nie jesteśmy na /login → przekieruj na /login
  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login')
  }

  // 3. Jeśli zalogowany i wchodzimy na /login → przekieruj na /
  if (auth.isLoggedIn && to.path === '/login') {
    return navigateTo('/')
  }
})
```

---

## Plugin: labview.client.ts

**Plik:** `plugins/labview.client.ts`

Odpowiedzialny za:
1. **Połączenie WebSocket** — gdy użytkownik się loguje
2. **Rozłączenie** — gdy wylogowuje
3. **Routing wiadomości WS** do odpowiednich store'ów

```typescript
// Uproszczony schemat

watch(auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    // Pomiń localhost bez explicite ustawionego WS URL
    if (location.hostname === 'localhost' && !wsUrl) return

    ws.connect(`${wsUrl}/ws`, auth.token)

    // Rejestruj handlery
    ws.on('session.started',    (d) => dashboard.startSession(d))
    ws.on('session.update',     (d) => dashboard.updateSession(d))
    ws.on('test-step.update',   (d) => dashboard.updateStep(d.stepId, d))
    ws.on('test-result.add',    (d) => dashboard.addResult(d))
    ws.on('test-result.log',    (d) => dashboard.appendLog(d.resultId, d))
    ws.on('instruments.update', (d) => dashboard.setInstruments(d.instruments))
  } else {
    ws.disconnect()
  }
})
```

---

## Flow danych – diagram

```
LabVIEW ─── WebSocket ──→ stores/ws.ts
                               │
                    plugins/labview.client.ts
                               │
                    ┌──────────┼──────────┐
                    ▼          ▼          ▼
              dashboard     auth        ws
                    │
          ┌─────────┼──────────┐
          ▼         ▼          ▼
       index   test-results  device-status
      (steps)  (results)    (instruments)

Browser ──── REST API ────→ Nitro Server ──→ PostgreSQL
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                 auth.ts   dashboard.ts  pages/*
               (users,     (initial      (device,
               login)       data load)   config)
```
