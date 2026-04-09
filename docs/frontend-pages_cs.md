# Frontend Pages – Dokumentace

Popis všech stránek Vue 3 v aplikaci REMview v3, jejich stores, datových toků a chování.

---

## Obsah

- [Architektura stránek](#architektura-stránek)
- [Pinia Stores](#pinia-stores)
  - [auth.ts](#authts)
  - [ws.ts](#wsts)
  - [dashboard.ts](#dashboardts)
- [Stránky (Pages)](#stránky-pages)
  - [login.vue](#loginvue)
  - [index.vue – Dashboard](#indexvue--dashboard)
  - [test-results.vue](#test-resultsvue)
  - [results-db.vue](#results-dbvue)
  - [device-status.vue](#device-statusvue)
  - [authorization.vue](#authorizationvue)
  - [station-schema.vue](#station-schemavue)
  - [device-config/](#device-config)
  - [settings.vue](#settingsvue)
  - [help.vue](#helpvue)
- [Sdílené komponenty](#sdílené-komponenty)
  - [NavLeft.vue](#navleftvue)
- [Middleware](#middleware)
- [Plugin: labview.client.ts](#plugin-labviewclientts)

---

## Architektura stránek

```
app.vue
└── NuxtLayout
    └── NavLeft.vue  (postranní panel)
        └── NuxtPage
            ├── login.vue           /login
            ├── index.vue           /               (dashboard)
            ├── test-results.vue    /test-results
            ├── results-db.vue      /results-db
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

**Routing:** Nuxt 3 file-based routing. Všechny stránky kromě `/login` jsou chráněny pomocí `middleware/auth.global.ts`.

---

## Pinia Stores

### auth.ts

**Soubor:** `stores/auth.ts`

**Stav:**
```typescript
{
  token:       string | null    // JWT Bearer token
  user:        User | null      // přihlášený uživatel
  users:       User[]           // seznam uživatelů (admin)
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

**Akce:**

| Akce | Popis | HTTP |
|------|-------|------|
| `login(username, password)` | Přihlásí uživatele, uloží token do cookie | `POST /api/auth/login` |
| `logout()` | Odhlásí, vymaže cookie | `POST /api/auth/logout` |
| `fetchUsers()` | Načte seznam uživatelů | `GET /api/users` |
| `addUser(data)` | Vytvoří nového uživatele | `POST /api/users` |
| `updateUser(id, data)` | Aktualizuje údaje uživatele | `PUT /api/users/:id` |
| `removeUser(id)` | Smaže uživatele | `DELETE /api/users/:id` |

**Gettery:**
```typescript
isLoggedIn:    boolean   // !!token && !!user
isAdmin:       boolean   // user.role === 'admin'
can(permission: string): boolean  // user.permissions[permission]
```

---

### ws.ts

**Soubor:** `stores/ws.ts`

**Stav:**
```typescript
{
  status:    'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  latency:   number | null     // RTT ping/pong v ms
  _socket:   WebSocket | null  // interní
  _handlers: Map<string, Set<Function>>
}
```

**Gettery:**
```typescript
isConnected:  boolean   // status === 'connected'
statusLabel:  string    // 'Připojeno' | 'Odpojeno' | ...
statusColor:  string    // 'green' | 'red' | 'yellow'
statusDot:    string    // HTML s barevnou tečkou
```

**Akce:**
```typescript
connect(url: string, token?: string): void
disconnect(): void
send(type: string, data: object): void
on(type: string, handler: Function): () => void   // vrací unsubscribe
```

---

### dashboard.ts

**Soubor:** `stores/dashboard.ts`

**Stav:**
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

**Akce:**
```typescript
startSession(data)              // nastaví session
updateSession(data)             // progress, status, currentStep
updateStep(stepId, data)        // aktualizuje stav kroku
addResult(data)                 // přidá výsledek do seznamu
appendLog(resultId, log)        // přidá log k výsledku
setInstruments(list)            // nahradí celý seznam přístrojů
toggleRow(resultId)             // expanded/collapsed v tabulce výsledků
```

---

## Stránky (Pages)

### login.vue

**Cesta:** `/login`  
**Auth:** ❌ veřejná (přesměrování na `/` pokud je přihlášen)

**Funkce:**
- Přihlašovací formulář (username + password)
- Polling `GET /api/hostname` každých **5 sekund** — kontrola dostupnosti serveru LabVIEW
- Badge stavu LabVIEW Webservice: 🟢 online / 🔴 offline
- Blokování formuláře když je server offline
- Zobrazení informací o serveru: hostname, model, název a revize dokumentu RTO (Routine Test Overview)

**Data z hostname (zobrazená pod formulářem):**
```
Host: STATION-PC-01
RTO: rem102_main.rtexe
Revision: 1.2.3
```

**Datový tok:**
```
onMounted → startHostnamePolling()
  └── setInterval(5000):
        fetch('/api/hostname')
          ├── 200 OK → serverOnline = true, zobrazit info
          └── chyba  → serverOnline = false

submitLogin():
  └── auth.login(username, password)
        ├── 200 OK → navigateTo('/')
        └── chyba  → zobrazit chybovou zprávu

onUnmounted → clearInterval()
```

**Používané stores:** `auth`  
**Komponenty:** žádné (samostatná stránka)

---

### index.vue – Dashboard

**Cesta:** `/`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.overview`

**Funkce:**
- Ukazatel průběhu testovací relace (0-100%)
- Seznam kroků s barevnými stavy
- Čítače: PASS / FAIL / RUN / PEND
- Záhlaví relace: operátor, doba trvání, sériové číslo
- Automatická aktualizace přes WebSocket (real-time)

**Ikony stavů kroků:**

| Stav | Ikona | Barva |
|------|-------|-------|
| `ok` | ✅ | zelená |
| `fail` | ✗ | červená |
| `running` | ⟳ (animace) | modrá |
| `skip` | / | šedá |
| `pending` | ◌ | šedá |

**Ukazatel průběhu:**
- Zelená barva když `session.status === 'passed'`
- Červená barva když `session.status === 'failed'`
- Modrá barva když `status === 'running'`
- Šířka = `session.progress`%

**Datový tok:**
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

**Používané stores:** `dashboard`, `auth`

---

### test-results.vue

**Cesta:** `/test-results`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.results`

**Funkce:**
- Tabulka výsledků všech kroků **aktuální relace** (live view)
- Filtr: All / PASS / FAIL / Running / Skip
- Rozbalitelné řádky s parametry a logy
- Log s barevným kódováním (info=šedá, warn=žlutá, error=červená)
- Živý kurzor na konci logu pro stav `running`
- Export do CSV: `test-results-<serialNo>-<YYYY-MM-DD>.csv`
- Aktualizace v reálném čase přes WS

**Struktura tabulky:**
```
┌────────────────────────────────────────────────────────┐
│ Filtr: [All] [PASS] [FAIL] [Running] [Skip]  [Export CSV] │
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
│      │   LOG: [error] Překročen proudový limit         │
└──────┴─────────────────────┴────────┴──────────────────┘
```

**Formát CSV:**
```csv
#,Test Name,Status,Measured At,Parameter,Value,Unit,Low Limit,High Limit,Param Status
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_in,24.1,V,23,25,ok
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_out,12.05,V,11.8,12.2,ok
```

**Datový tok:**
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

**Používané stores:** `dashboard`, `auth`

---

### results-db.vue

**Cesta:** `/results-db`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.results`

**Funkce:**
- Prohledávání historických testovacích relací z databáze
- Panel filtrů s 11 kritérii
- Tabulka relací s rozbalovacími řádky (kroky načítány na vyžádání)
- Stránkování (20 relací / stránka, max 100)
- Export viditelných relací do CSV

**Pole filtrů:**

| Pole | Typ | Sloupec DB |
|------|-----|------------|
| Model | text ILIKE | `devices.model` |
| Article No. | text ILIKE | `devices.article_number` |
| Art. Revision | text přesný | `devices.article_revision` |
| Article Name | text ILIKE | `devices.article_name` |
| Serial No. | text ILIKE | `devices.serial_no` |
| Operator | text ILIKE | `test_sessions.operator` |
| RTO Document | text ILIKE | `rto_documents.name` |
| Session Status | select | `test_sessions.overall_status` |
| Has Step Result | select (OK/FAIL/SKIP) | EXISTS poddotaz na `test_results` |
| Date From | datum | `test_sessions.start_time >=` |
| Date To | datum | `test_sessions.start_time <=` |

**Struktura tabulky relací:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Datum/čas  │ Model zařízení │ Art.No/Rev │ S/N   │ RTO  │ Op │ Kroky │ Stav │
├──────────────────────────────────────────────────────────────────────┤
│ ▶ 09/04/26 │ REM102-G-G-S-T │ 5.6602/A00 │ 21292 │ J01  │ op │  4/1/5 │ FAIL │
├──────────────────────────────────────────────────────────────────────┤
│  ↳ Rozbaleno: detail zařízení + kroky testu                          │
│    Krok │ Název VI               │ Start    │ Stop     │ Výsledek │
│    4.7  │ 4.7_AC_16Hz_Cal.vi    │ 12:53:22 │ 12:55:34 │ OK       │
│    4.8  │ 4.8_DC_Accuracy.vi    │ 12:55:40 │ 12:59:11 │ FAIL     │
└──────────────────────────────────────────────────────────────────────┘
```

**Datový tok:**
```
onMounted:
  └── fetch('/api/test-sessions/search?limit=20&offset=0')
        └── sessions = data.items, total = data.total

applyFilters():
  └── applied = form, offset = 0 → fetch()

toggleSession(id):
  └── expanded[id] = !expanded[id]
      └── pokud true: fetch('/api/test-results?sessionId=<id>&limit=200')
                        └── sessionResults[id] = data
```

**API:** `GET /api/test-sessions/search`  
**Používané stores:** žádné (přímé volání `$fetch`)

---

### device-status.vue

**Cesta:** `/device-status`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.deviceStatus`

**Funkce:**
- Mřížka karet měřicích přístrojů
- Real-time stav přes WebSocket (aktualizuje se bez reload)
- WS badge v záhlaví: `● Connected  12 ms` / `● Disconnected`
- Pulsující animace pro stav `busy`
- Tooltip s adresou VISA/LAN/GPIB

**Karty přístrojů:**
```
┌─────────────────────────┐
│ 🟢 Multimetr HP 34401A  │
│ DMM                     │
│ GPIB0::22::INSTR        │
│ Last seen: 10:30:00     │
└─────────────────────────┘
```

| Stav | Barva karty | Ikona |
|------|-------------|-------|
| `online` | zelený rámeček | 🟢 |
| `offline` | červený rámeček | 🔴 |
| `error` | oranžový rámeček | 🟠 |
| `busy` | modrý rámeček + pulsování | 🔵 |

**Datový tok:**
```
onMounted:
  └── fetch('/api/instruments')
        └── dashboard.setInstruments(data)

WS Events:
  └── instruments.update → dashboard.setInstruments(data.instruments)

Computed:
  └── instruments = dashboard.instruments  (reaktivní)
```

**Používané stores:** `dashboard`, `ws`

---

### authorization.vue

**Cesta:** `/authorization`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.authorization` (pouze admin)

**Funkce:**
- Tabulka všech uživatelů systému
- Přidání nového uživatele (modal)
- Editace údajů a oprávnění uživatele (modal)
- Změna hesla (volitelné při editaci)
- Toggle aktivity (active/inactive)
- Smazání uživatele (s potvrzením)
- Stavy načítání a chyb pro každou operaci

**Modal – pole formuláře:**
```
Username:     [____________]
Display Name: [____________]
Password:     [____________] (volitelné při editaci)
Role:         [○ admin  ○ operator  ○ viewer]
Active:       [✓]

Oprávnění:
  [✓] Overview     [✓] Results    [ ] Config
  [✓] Device Status [ ] Schema    [ ] Settings
  [✓] Help          [ ] Authorization
```

**Datový tok:**
```
onMounted:
  └── auth.fetchUsers() → loading = true → users = data

openAddModal():
  └── resetForm() → showModal = true

openEditModal(user):
  └── form = { ...user } → showModal = true

saveModal():
  ├── Nový:  auth.addUser(form)
  └── Editace: auth.updateUser(id, form)
       └── success → closeModal → toast

toggleActive(user):
  └── auth.updateUser(user.id, { active: !user.active })

removeUser(id):
  └── confirm() → auth.removeUser(id)
```

**Používané stores:** `auth`

---

### station-schema.vue

**Cesta:** `/station-schema`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.stationSchema`

**Funkce:**
- Zobrazení grafických schémat stanice (PNG nebo SVG)
- Seznam výkresů vlevo (postranní panel)
- Kliknutí → načte a zobrazí výkres
- Přiblížení a posouvání (zoom + pan)
- Indikace zda je výkres dostupný (`hasImage`)

**Datový tok:**
```
onMounted:
  └── fetch('/api/drawings')
        └── drawings = data (seznam bez base64)

selectDrawing(id):
  └── fetch('/api/drawings/<id>')
        └── activeDrawing = response
            └── imgSrc = `data:${mimeType};base64,${imageBase64}`
```

> Base64 se načítá na vyžádání (ne při startu stránky) — výkresy mohou být velké.

**Používané stores:** `auth`

---

### device-config/

**Cesta:** `/device-config` a podstránky  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.config`

**Podstránky:**

| Cesta | Obsah |
|-------|-------|
| `/device-config` | Data zařízení (model, S/N, RTO) |
| `/device-config/hardware` | Seznam hardwarových modulů NI |
| `/device-config/software` | Seznam softwarových modulů |
| `/device-config/modules-cfg/hardware/[module]` | Editace JSONB konfigurace HW modulu |
| `/device-config/modules-cfg/software/[module]` | Editace JSONB konfigurace SW modulu |

**Hlavní stránka – device-config/index.vue:**
```
fetch('/api/device')
  └── formulář s poli: model, S/N, articleNumber, rtoFile, rtoRevision
      └── PUT /api/device při odeslání
```

**Stránka modulů – hardware.vue / software.vue:**
```
fetch('/api/module-configs?type=hardware')
  └── tabulka modulů se slotIndex, enabled
      └── kliknutí → /device-config/modules-cfg/hardware/<id>
```

**Editace konfigurace – [module].vue:**
```
fetch('/api/module-configs/<id>')
  └── zobrazit config JSONB jako dynamický formulář
      └── PUT /api/module-configs/<id> při odeslání
```

---

### settings.vue

**Cesta:** `/settings`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.settings`

**Funkce:**
- Nastavení aplikace: jazyk, motiv, časové pásmo
- Název stanice, timeout relace, auto-logout
- Uložení přes `PUT /api/settings`

**Datový tok:**
```
onMounted:
  └── fetch('/api/settings')
        └── form = data

save():
  └── PUT /api/settings { language, theme, ... }
        └── success → toast "Uloženo"
```

---

### help.vue

**Cesta:** `/help`  
**Auth:** ✅ vyžadována  
**Oprávnění:** `permissions.help`

**Obsah:** Statická stránka s uživatelskou dokumentací: popis stavů, návod k obsluze, kontakt na servis.

---

## Sdílené komponenty

### NavLeft.vue

**Soubor:** `components/NavLeft.vue`

**Funkce:**
- Navigační postranní panel s odkazy na stránky
- Logo Hasler Rail + název aplikace
- WS status badge: barevná tečka + label + latence [ms]
- Jméno a role přihlášeného uživatele
- Tlačítko odhlášení
- Sbalení postranního panelu (mobilní zařízení)

**Řádek stavu WS:**
```
● Připojeno  14 ms
```

Barva tečky závisí na `ws.statusColor` (reaktivní).

**Stránky v menu (závislé na oprávněních):**
```
if permissions.overview      → Overview        /
if permissions.results       → Results ▶ (rozbalovací skupina)
                                  ├── Test DUT   /test-results   (live session log)
                                  └── DB         /results-db     (historické vyhledávání)
if permissions.config        → Config ▶ (rozbalovací skupina)   /device-config
if permissions.deviceStatus  → Device Status   /device-status
if permissions.stationSchema → Station Schema  /station-schema
if permissions.settings      → Settings        /settings
if permissions.help          → Help            /help
if permissions.authorization → Authorization   /authorization
```

**Používané stores:** `auth`, `ws`

---

## Middleware

### middleware/auth.global.ts

Spouští se při **každé změně trasy** (global middleware).

```typescript
export default defineNuxtRouteMiddleware((to) => {
  // 1. Přeskočit systémové cesty Nuxt a WebSocket
  if (to.path.startsWith('/_') || to.path === '/ws') return

  const auth = useAuthStore()

  // 2. Pokud není přihlášen a nejsme na /login → přesměrovat na /login
  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login')
  }

  // 3. Pokud je přihlášen a vstupujeme na /login → přesměrovat na /
  if (auth.isLoggedIn && to.path === '/login') {
    return navigateTo('/')
  }
})
```

**Mapování cest → oprávnění:**

| Cesta | Požadované oprávnění |
|-------|----------------------|
| `/` | `overview` |
| `/test-results` | `results` |
| `/results-db` | `results` |
| `/device-config*` | `config` |
| `/device-status` | `deviceStatus` |
| `/station-schema` | `stationSchema` |
| `/settings` | `settings` |
| `/help` | `help` |
| `/authorization` | `authorization` |

---

## Plugin: labview.client.ts

**Soubor:** `plugins/labview.client.ts`

Odpovídá za:
1. **Připojení WebSocket** — když se uživatel přihlásí
2. **Odpojení** — když se odhlásí
3. **Směrování WS zpráv** do příslušných stores

```typescript
// Zjednodušené schéma

watch(auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    // Přeskočit localhost bez explicitně nastaveného WS URL
    if (location.hostname === 'localhost' && !wsUrl) return

    ws.connect(`${wsUrl}/ws`, auth.token)

    // Registrovat handlery
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

## Datový tok – diagram

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
