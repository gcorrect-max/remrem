# WebSocket Protocol – REMview v3

Real-time communication protocol between the LabVIEW Application and the browser (Vue 3 frontend).

---

## Table of Contents

- [Connection](#connection)
- [Authentication](#authentication)
- [Message Format](#message-format)
- [Messages: LabVIEW → Frontend](#messages-labview--frontend)
- [Messages: Frontend → LabVIEW](#messages-frontend--labview)
- [Ping / Pong – Latency Measurement](#ping--pong--latency-measurement)
- [Disconnect Handling and Reconnect](#disconnect-handling-and-reconnect)
- [Store ws.ts – API](#store-wsts--api)
- [Connection States](#connection-states)
- [Full Session Flow Example](#full-session-flow-example)

---

## Connection

```
ws://<host>:<port>/ws?token=<jwt>
```

| Element | Value |
|---------|-------|
| Protocol | WebSocket (ws:// or wss://) |
| Path | `/ws` (configurable via `NUXT_PUBLIC_WS_PATH`) |
| Port | same as HTTP (LabVIEW Webservice) |
| Auth | JWT token as query param `?token=` |

**Example URL:**
```
ws://192.168.1.100:8080/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> In development mode (`localhost`) the WS connection is **skipped** unless `NUXT_PUBLIC_WS_URL` is explicitly set in `.env`.

---

## Authentication

The JWT token is passed as a query parameter because the browser's WebSocket API does not support custom HTTP headers.

```typescript
// plugins/labview.client.ts
const url = `${wsUrl}/ws?token=${auth.token}`
ws.connect(url)
```

LabVIEW verifies the token on every connection. If the token has expired, the connection is rejected.

---

## Message Format

All messages are **JSON** sent as text (WebSocket `text` frame).

### Base Structure

```json
{
  "type": "<message_type>",
  "data": { ... }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Message type identifier |
| `data` | object | Payload specific to the given type |

---

## Messages: LabVIEW → Frontend

### `session.started`
Sent when LabVIEW starts a new test session.

```json
{
  "type": "session.started",
  "data": {
    "sessionId": "8",
    "operator":  "jkowalski",
    "startedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

**Frontend reaction:** `dashboard.ts` store clears previous data, sets `currentSessionId`.

---

### `session.update`
Update of the current session state (progress, current step).

```json
{
  "type": "session.update",
  "data": {
    "status":      "running",
    "currentStep": "Input voltage test",
    "progress":    35
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `running \| passed \| failed \| aborted` |
| `currentStep` | string | Name of the currently executing step |
| `progress` | number | Completion percentage 0–100 |

**Frontend reaction:** updates the progress bar and header in `index.vue`.

---

### `test-step.update`
Update of a specific test step's status.

```json
{
  "type": "test-step.update",
  "data": {
    "stepId":  "2",
    "name":    "Input voltage test",
    "status":  "ok",
    "message": "V_in = 24.1 V – within limits"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `stepId` | string | Step ID in the database |
| `name` | string | Step name |
| `status` | string | `pending \| running \| ok \| fail \| skip` |
| `message` | string \| null | Optional result message |

**Frontend reaction:** updates the color and icon of the step in the session list (`index.vue`).

---

### `test-result.add`
New measurement result ready to display.

```json
{
  "type": "test-result.add",
  "data": {
    "resultId": "13",
    "testName": "Current Measurement",
    "status":   "fail",
    "params": [
      { "name": "I_out", "value": "2.85", "unit": "A", "lowLimit": 1.0, "highLimit": 2.5, "status": "fail" },
      { "name": "P_out", "value": "34.2", "unit": "W", "lowLimit": 0.0, "highLimit": 30.0, "status": "fail" }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | string | Result ID in the database |
| `testName` | string | Test name |
| `status` | string | `ok \| fail \| running \| skip` |
| `params` | array | List of measurement parameters |

**Frontend reaction:** adds a row to the results table in `test-results.vue`, updates PASS/FAIL counters.

---

### `test-result.log`
Live log attached to an active measurement.

```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "13",
    "level":    "warn",
    "message":  "Retry #2 – repeating measurement",
    "ts":       "2024-01-15T10:10:05.123Z"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `resultId` | string | ID of the associated result |
| `level` | string | `info \| warn \| error \| debug` |
| `message` | string | Log content |
| `ts` | string | ISO 8601 timestamp |

**Frontend reaction:** appends the log to the expanded result row in `test-results.vue` (live cursor).

---

### `instruments.update`
Status update for all instruments (sent periodically by LabVIEW).

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimeter HP 34401A",      "status": "online",  "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Power Supply Keysight E3631A", "status": "busy",    "address": "GPIB0::5::INSTR"  },
      { "id": "3", "name": "NI-9205",                   "status": "online",  "address": "cDAQ1Mod1"         },
      { "id": "4", "name": "Oscilloscope Tek MSO44",    "status": "offline", "address": "192.168.1.200"      }
    ]
  }
}
```

| Status | Meaning | UI Color |
|--------|---------|----------|
| `online` | Instrument available | green |
| `offline` | No connection | red |
| `error` | Communication error | orange |
| `busy` | Measurement in progress | blue |

**Frontend reaction:** refreshes the full list in `device-status.vue` via `dashboard.setInstruments()`.

---

### `ping`
Heartbeat from LabVIEW. The frontend must respond with `pong` containing the same timestamp.

```json
{
  "type": "ping",
  "data": { "ts": 1705312200000 }
}
```

`ts` – Unix timestamp in milliseconds.

---

## Messages: Frontend → LabVIEW

### `pong`
Response to `ping`. Used to calculate RTT latency.

```json
{
  "type": "pong",
  "data": { "ts": 1705312200000 }
}
```

> `ts` must be identical to the value from the received `ping`.  
> LabVIEW calculates RTT = `NOW() - ts`.  
> The frontend calculates its own RTT: `Date.now() - ts` and displays it in NavLeft as latency [ms].

---

## Ping / Pong – Latency Measurement

```
LabVIEW                          Frontend
    |                                |
    |--- { type:"ping", ts:T1 } ---->|
    |                                |  RTT_frontend = Date.now() - T1
    |<--- { type:"pong", ts:T1 } ----|
    |  RTT_labview = NOW() - T1      |
    |                                |
```

**Implementation in `stores/ws.ts`:**
```typescript
ws.on('ping', (data) => {
  const rtt = Date.now() - data.ts
  latency.value = rtt
  ws.send('pong', { ts: data.ts })
})
```

**NavLeft displays:** `● Connected  12 ms`

---

## Disconnect Handling and Reconnect

The `ws.ts` store implements automatic reconnect with exponential backoff:

| Attempt | Delay |
|---------|-------|
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5+ | 16 s (max) |

```typescript
// Simplified reconnect logic schema
let attempt = 0

function scheduleReconnect() {
  const delay = Math.min(1000 * 2 ** attempt, 16000)
  attempt++
  setTimeout(() => connect(lastUrl), delay)
}

socket.onclose = () => {
  status.value = 'reconnecting'
  scheduleReconnect()
}
```

**Counter reset:** the attempt counter is reset to 0 after each successful connection.

**States during reconnect:**
- `reconnecting` — waiting before next attempt
- `connecting` — TCP connection attempt
- `connected` — success

---

## Store ws.ts – API

```typescript
const ws = useWsStore()

// Connect
ws.connect('ws://192.168.1.100:8080/ws', token)

// Disconnect
ws.disconnect()

// Register handler
ws.on('session.update', (data) => {
  console.log(data.currentStep)
})

// Send message
ws.send('pong', { ts: Date.now() })

// Reactive state (Pinia)
ws.status       // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
ws.isConnected  // boolean
ws.latency      // number | null [ms]
ws.statusLabel  // 'Connected' | 'Disconnected' | ...
ws.statusColor  // 'green' | 'red' | 'yellow' | ...
ws.statusDot    // '●' with appropriate CSS color
```

---

## Connection States

| State | `statusLabel` | Color | Description |
|-------|--------------|-------|-------------|
| `disconnected` | Disconnected | red | No connection, no reconnect |
| `connecting` | Connecting… | yellow | First TCP connection |
| `connected` | Connected | green | Active WS connection |
| `reconnecting` | Reconnecting… | yellow | Waiting before next attempt |
| `error` | Error | red | Protocol or auth error |

---

## Full Session Flow Example

Below is the complete sequence of WS messages for a typical test session:

```
[LabVIEW]                              [Frontend]
    |                                      |
    |-- ping { ts: T1 } ----------------->|
    |<- pong { ts: T1 } ------------------|  latency = T_now - T1
    |                                      |
    |-- session.started {                  |
    |     sessionId: "8",                  |  dashboard.startSession("8")
    |     operator: "jk",                  |  index.vue: "Session #8 – jk"
    |     startedAt: "2024..." } -------->|
    |                                      |
    |-- session.update {                   |
    |     status: "running",               |  progress bar = 10%
    |     currentStep: "Init",             |  index.vue: "Init"
    |     progress: 10 } ---------------->|
    |                                      |
    |-- test-step.update {                 |
    |     stepId: "1",                     |
    |     name: "Init",                    |  step #1: ⟳ running
    |     status: "running" } ----------->|
    |                                      |
    |-- test-step.update {                 |
    |     stepId: "1",                     |
    |     status: "ok",                    |  step #1: ✅ ok
    |     message: "OK" } -------------->|
    |                                      |
    |-- instruments.update {               |
    |     instruments: [...] } ---------->|  device-status.vue refreshed
    |                                      |
    |-- test-result.add {                  |
    |     resultId: "13",                  |
    |     testName: "Voltage Check",       |  new row in test-results.vue
    |     status: "ok",                    |  PASS counter++
    |     params: [...] } -------------->|
    |                                      |
    |-- test-result.log {                  |
    |     resultId: "13",                  |  live log in expanded row
    |     level: "info",                   |
    |     message: "V_in OK" } ---------->|
    |                                      |
    |-- session.update {                   |
    |     status: "passed",                |  session finished
    |     progress: 100 } -------------->|  progress bar green 100%
    |                                      |
    |-- ping { ts: T2 } ----------------->|
    |<- pong { ts: T2 } ------------------|
```
