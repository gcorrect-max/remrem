# Frontend Pages – Documentation

Description of all Vue 3 pages in the REMview v3 application, their stores, data flow, and behavior.

---

## Table of Contents

- [Page Architecture](#page-architecture)
- [Pinia Stores](#pinia-stores)
  - [auth.ts](#authts)
  - [ws.ts](#wsts)
  - [dashboard.ts](#dashboardts)
- [Pages](#pages)
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
- [Shared Components](#shared-components)
  - [NavLeft.vue](#navleftvue)
- [Middleware](#middleware)
- [Plugin: labview.client.ts](#plugin-labviewclientts)

---

## Page Architecture

```
app.vue
└── NuxtLayout
    └── NavLeft.vue  (sidebar)
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

**Routing:** Nuxt 3 file-based routing. All pages except `/login` are protected by `middleware/auth.global.ts`.

---

## Pinia Stores

### auth.ts

**File:** `stores/auth.ts`

**State:**
```typescript
{
  token:       string | null    // JWT Bearer token
  user:        User | null      // logged-in user
  users:       User[]           // user list (admin)
  loading:     boolean
  error:       string | null
}
```

**User type:**
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

**Actions:**

| Action | Description | HTTP |
|--------|-------------|------|
| `login(username, password)` | Logs in the user, saves token in cookie | `POST /api/auth/login` |
| `logout()` | Logs out, clears cookie | `POST /api/auth/logout` |
| `fetchUsers()` | Fetches user list | `GET /api/users` |
| `addUser(data)` | Creates a new user | `POST /api/users` |
| `updateUser(id, data)` | Updates user data | `PUT /api/users/:id` |
| `removeUser(id)` | Deletes a user | `DELETE /api/users/:id` |

**Getters:**
```typescript
isLoggedIn:    boolean   // !!token && !!user
isAdmin:       boolean   // user.role === 'admin'
can(permission: string): boolean  // user.permissions[permission]
```

---

### ws.ts

**File:** `stores/ws.ts`

**State:**
```typescript
{
  status:    'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
  latency:   number | null     // ping/pong RTT in ms
  _socket:   WebSocket | null  // internal
  _handlers: Map<string, Set<Function>>
}
```

**Getters:**
```typescript
isConnected:  boolean   // status === 'connected'
statusLabel:  string    // 'Connected' | 'Disconnected' | ...
statusColor:  string    // 'green' | 'red' | 'yellow'
statusDot:    string    // HTML with colored dot
```

**Actions:**
```typescript
connect(url: string, token?: string): void
disconnect(): void
send(type: string, data: object): void
on(type: string, handler: Function): () => void   // returns unsubscribe
```

---

### dashboard.ts

**File:** `stores/dashboard.ts`

**State:**
```typescript
{
  session:     Session | null
  steps:       Step[]
  results:     TestResult[]
  instruments: Instrument[]
}
```

**Types:**
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

**Actions:**
```typescript
startSession(data)              // sets session
updateSession(data)             // progress, status, currentStep
updateStep(stepId, data)        // updates step status
addResult(data)                 // adds result to list
appendLog(resultId, log)        // adds log to result
setInstruments(list)            // replaces entire instrument list
toggleRow(resultId)             // expanded/collapsed in results table
```

---

## Pages

### login.vue

**Path:** `/login`  
**Auth:** no (public — redirect to `/` if logged in)

**Features:**
- Login form (username + password)
- Polling `GET /api/hostname` every **5 seconds** — checks LabVIEW server availability
- LabVIEW Webservice status badge: online / offline
- Form disabled when server is offline
- Display server info: hostname, model, RTO (Routine Test Overview) document name and revision

**Data from hostname (displayed below the form):**
```
Host: STATION-PC-01
RTO: rem102_main.rtexe
Revision: 1.2.3
```

**Data Flow:**
```
onMounted → startHostnamePolling()
  └── setInterval(5000):
        fetch('/api/hostname')
          ├── 200 OK → serverOnline = true, display info
          └── error  → serverOnline = false

submitLogin():
  └── auth.login(username, password)
        ├── 200 OK → navigateTo('/')
        └── error  → display error message

onUnmounted → clearInterval()
```

**Stores used:** `auth`  
**Components:** none (standalone page)

---

### index.vue – Dashboard

**Path:** `/`  
**Auth:** required  
**Permission:** `permissions.overview`

**Features:**
- Test session progress bar (0–100%)
- Step list with colored statuses
- Counters: PASS / FAIL / RUN / PEND
- Session header: operator, duration, serial number
- Automatic update via WebSocket (real-time)

**Step status icons:**

| Status | Icon | Color |
|--------|------|-------|
| `ok` | ✅ | green |
| `fail` | ✗ | red |
| `running` | ⟳ (animated) | blue |
| `skip` | / | gray |
| `pending` | ◌ | gray |

**Progress bar:**
- Green when `session.status === 'passed'`
- Red when `session.status === 'failed'`
- Blue when `status === 'running'`
- Width = `session.progress`%

**Data Flow:**
```
onMounted:
  └── fetch('/api/session')  → dashboard.startSession()

WS Events (from plugins/labview.client.ts):
  ├── session.started    → dashboard.startSession()
  ├── session.update     → dashboard.updateSession()
  └── test-step.update   → dashboard.updateStep()

Computed:
  ├── passCount   = steps.filter(ok).length
  ├── failCount   = steps.filter(fail).length
  ├── runCount    = steps.filter(running).length
  └── pendCount   = steps.filter(pending).length
```

**Stores used:** `dashboard`, `auth`

---

### test-results.vue

**Path:** `/test-results`  
**Auth:** required  
**Permission:** `permissions.results`

**Features:**
- Table of all step results for the **current session** (live view)
- Filter: All / PASS / FAIL / Running / Skip
- Expandable rows with parameters and logs
- Color-coded logs (info=gray, warn=yellow, error=red)
- Live cursor at the end of logs for `running` status
- CSV export: `test-results-<serialNo>-<YYYY-MM-DD>.csv`
- Real-time update via WS

**Table structure:**
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
│      │   LOG: [error] Current limit exceeded           │
└──────┴─────────────────────┴────────┴──────────────────┘
```

**CSV format:**
```csv
#,Test Name,Status,Measured At,Parameter,Value,Unit,Low Limit,High Limit,Param Status
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_in,24.1,V,23,25,ok
1,Voltage Check,ok,2024-01-15T10:05:00Z,V_out,12.05,V,11.8,12.2,ok
```

**Data Flow:**
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

**Stores used:** `dashboard`, `auth`

---

### results-db.vue

**Path:** `/results-db`  
**Auth:** required  
**Permission:** `permissions.results`

**Features:**
- Search through all historical test sessions stored in the database
- Filter panel with 11 criteria fields
- Sessions table with expandable rows (steps loaded on demand)
- Pagination (20 sessions / page, max 100)
- CSV export of the currently visible sessions

**Filter fields:**

| Field | Type | DB column |
|-------|------|-----------|
| Model | text ILIKE | `devices.model` |
| Article No. | text ILIKE | `devices.article_number` |
| Art. Revision | exact text | `devices.article_revision` |
| Article Name | text ILIKE | `devices.article_name` |
| Serial No. | text ILIKE | `devices.serial_no` |
| Operator | text ILIKE | `test_sessions.operator` |
| RTO Document | text ILIKE | `rto_documents.name` |
| Session Status | select | `test_sessions.overall_status` |
| Has Step Result | select (OK/FAIL/SKIP) | EXISTS sub-query on `test_results` |
| Date From | date | `test_sessions.start_time >=` |
| Date To | date | `test_sessions.start_time <=` |

**Session table structure:**
```
┌──────────────────────────────────────────────────────────────────────┐
│ Date/Time  │ Device Model   │ Art.No/Rev │ S/N   │ RTO  │ Op │ Steps │ Status │
├──────────────────────────────────────────────────────────────────────┤
│ ▶ 09/04/26 │ REM102-G-G-S-T │ 5.6602/A00 │ 21292 │ J01  │ op │  4/1/5 │ FAIL   │
├──────────────────────────────────────────────────────────────────────┤
│  ↳ Expanded: device detail strip + test steps                        │
│    Step │ VI Name                │ Start    │ Stop     │ Result   │
│    4.7  │ 4.7_AC_16Hz_Cal.vi    │ 12:53:22 │ 12:55:34 │ OK       │
│    4.8  │ 4.8_DC_Accuracy.vi    │ 12:55:40 │ 12:59:11 │ FAIL     │
└──────────────────────────────────────────────────────────────────────┘
```

**Steps bar (mini progress bar):**
- Green segment = OK steps
- Red segment = FAIL steps
- Text: `<ok>/<fail>/<total>`

**CSV export format:**
```csv
Session ID,Date,Time,Device Model,Article No.,Art. Rev.,Article Name,Serial No.,RTO Doc,RTO Rev,Operator,Status,Steps Total,Steps OK,Steps FAIL,Steps SKIP
42,09/04/2026,10:35:22,REM102-G-G-S-T-W-8-GS-O-000,5.6602.013/01,A00,...,21292853,5.2901.047J01,A51,operator,FAIL,5,4,1,0
```

**Data flow:**
```
onMounted:
  └── fetch('/api/test-sessions/search?limit=20&offset=0')
        └── sessions = data.items, total = data.total

applyFilters():
  └── applied = form, offset = 0 → fetch()

toggleSession(id):
  └── expanded[id] = !expanded[id]
      └── if true: fetch('/api/test-results?sessionId=<id>&limit=200')
                     └── sessionResults[id] = data

goOffset(n):
  └── offset = n → fetch()
```

**API:** `GET /api/test-sessions/search` — dynamic WHERE built from `sql\`\`` fragments  
**Stores used:** none (direct `$fetch` calls)

---

### device-status.vue

**Path:** `/device-status`  
**Auth:** required  
**Permission:** `permissions.deviceStatus`

**Features:**
- Grid of measurement instrument cards
- Real-time status via WebSocket (updates without reload)
- WS badge in header: `● Connected  12 ms` / `● Disconnected`
- Pulsing animation for `busy` status
- Tooltip with VISA/LAN/GPIB address

**Instrument cards:**
```
┌─────────────────────────┐
│  Multimeter HP 34401A   │
│ DMM                     │
│ GPIB0::22::INSTR        │
│ Last seen: 10:30:00     │
└─────────────────────────┘
```

| Status | Card color | Icon |
|--------|-----------|------|
| `online` | green border | green dot |
| `offline` | red border | red dot |
| `error` | orange border | orange dot |
| `busy` | blue border + pulsing | blue dot |

**Data Flow:**
```
onMounted:
  └── fetch('/api/instruments')
        └── dashboard.setInstruments(data)

WS Events:
  └── instruments.update → dashboard.setInstruments(data.instruments)

Computed:
  └── instruments = dashboard.instruments  (reactive)
```

**Stores used:** `dashboard`, `ws`

---

### authorization.vue

**Path:** `/authorization`  
**Auth:** required  
**Permission:** `permissions.authorization` (admin only)

**Features:**
- Table of all system users
- Add new user (modal)
- Edit user data and permissions (modal)
- Password change (optional during edit)
- Toggle active status (active/inactive)
- Delete user (with confirmation)
- Loading and error states for each operation

**Modal – form fields:**
```
Username:     [____________]
Display Name: [____________]
Password:     [____________] (optional during edit)
Role:         [○ admin  ○ operator  ○ viewer]
Active:       [✓]

Permissions:
  [✓] Overview     [✓] Results    [ ] Config
  [✓] Device Status [ ] Schema    [ ] Settings
  [✓] Help          [ ] Authorization
```

**Data Flow:**
```
onMounted:
  └── auth.fetchUsers() → loading = true → users = data

openAddModal():
  └── resetForm() → showModal = true

openEditModal(user):
  └── form = { ...user } → showModal = true

saveModal():
  ├── New:  auth.addUser(form)
  └── Edit: auth.updateUser(id, form)
       └── success → closeModal → toast

toggleActive(user):
  └── auth.updateUser(user.id, { active: !user.active })

removeUser(id):
  └── confirm() → auth.removeUser(id)
```

**Stores used:** `auth`

---

### station-schema.vue

**Path:** `/station-schema`  
**Auth:** required  
**Permission:** `permissions.stationSchema`

**Features:**
- Display station graphic schematics (PNG or SVG)
- Drawing list on the left (sidebar)
- Click → loads and displays the drawing
- Zoom and pan
- Indicates whether a drawing is available (`hasImage`)

**Data Flow:**
```
onMounted:
  └── fetch('/api/drawings')
        └── drawings = data (list without base64)

selectDrawing(id):
  └── fetch('/api/drawings/<id>')
        └── activeDrawing = response
            └── imgSrc = `data:${mimeType};base64,${imageBase64}`
```

> Base64 is loaded on demand (not at page startup) — drawings can be large.

**Stores used:** `auth`

---

### device-config/

**Path:** `/device-config` and sub-pages  
**Auth:** required  
**Permission:** `permissions.config`

**Sub-pages:**

| Path | Content |
|------|---------|
| `/device-config` | Device data (model, S/N, RTO) |
| `/device-config/hardware` | List of NI hardware modules |
| `/device-config/software` | List of software modules |
| `/device-config/modules-cfg/hardware/[module]` | Edit JSONB configuration of HW module |
| `/device-config/modules-cfg/software/[module]` | Edit JSONB configuration of SW module |

**Main page – device-config/index.vue:**
```
fetch('/api/device')
  └── form with fields: model, S/N, articleNumber, rtoFile, rtoRevision
      └── PUT /api/device on submit
```

**Modules page – hardware.vue / software.vue:**
```
fetch('/api/module-configs?type=hardware')
  └── table of modules with slotIndex, enabled
      └── click → /device-config/modules-cfg/hardware/<id>
```

**Config editor – [module].vue:**
```
fetch('/api/module-configs/<id>')
  └── display config JSONB as dynamic form
      └── PUT /api/module-configs/<id> on submit
```

---

### settings.vue

**Path:** `/settings`  
**Auth:** required  
**Permission:** `permissions.settings`

**Features:**
- Application settings: language, theme, timezone
- Station name, session timeout, auto-logout
- Save via `PUT /api/settings`

**Data Flow:**
```
onMounted:
  └── fetch('/api/settings')
        └── form = data

save():
  └── PUT /api/settings { language, theme, ... }
        └── success → toast "Saved"
```

---

### help.vue

**Path:** `/help`  
**Auth:** required  
**Permission:** `permissions.help`

**Content:** Static page with user documentation: status descriptions, operating instructions, service contact.

---

## Shared Components

### NavLeft.vue

**File:** `components/NavLeft.vue`

**Features:**
- Navigation sidebar with links to pages
- Hasler Rail logo + application name
- WS status badge: colored dot + label + latency [ms]
- Name and role of the logged-in user
- Logout button
- Collapsible sidebar (mobile)

**WS Status Row:**
```
● Connected  14 ms
```

Dot color depends on `ws.statusColor` (reactive).

**Menu pages (permission-dependent):**
```
if permissions.overview      → Overview        /
if permissions.results       → Results         /test-results
if permissions.results       → Results DB      /results-db
if permissions.config        → Config          /device-config (expandable group)
if permissions.deviceStatus  → Device Status   /device-status
if permissions.stationSchema → Station Schema  /station-schema
if permissions.settings      → Settings        /settings
if permissions.help          → Help            /help
if permissions.authorization → Authorization   /authorization
```

**Stores used:** `auth`, `ws`

---

## Middleware

### middleware/auth.global.ts

Runs on **every route change** (global middleware).

```typescript
export default defineNuxtRouteMiddleware((to) => {
  // 1. Skip Nuxt system paths and WebSocket
  if (to.path.startsWith('/_') || to.path === '/ws') return

  const auth = useAuthStore()

  // 2. If not logged in and not on /login → redirect to /login
  if (!auth.isLoggedIn && to.path !== '/login') {
    return navigateTo('/login')
  }

  // 3. If logged in and navigating to /login → redirect to /
  if (auth.isLoggedIn && to.path === '/login') {
    return navigateTo('/')
  }
})
```

**Path → permission mapping:**

| Path | Required permission |
|------|---------------------|
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

**File:** `plugins/labview.client.ts`

Responsible for:
1. **WebSocket connection** — when the user logs in
2. **Disconnection** — when the user logs out
3. **WS message routing** to the appropriate stores

```typescript
// Simplified schema

watch(auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    // Skip localhost without an explicitly set WS URL
    if (location.hostname === 'localhost' && !wsUrl) return

    ws.connect(`${wsUrl}/ws`, auth.token)

    // Register handlers
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

## Data Flow – Diagram

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
