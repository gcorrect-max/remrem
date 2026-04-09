# WebSocket Protocol – REMview v3

Protokol real-time komunikace mezi aplikací LabVIEW a prohlížečem (frontend Vue 3).

---

## Obsah

- [Připojení](#připojení)
- [Autentizace](#autentizace)
- [Formát zpráv](#formát-zpráv)
- [Zprávy: LabVIEW → Frontend](#zprávy-labview--frontend)
- [Zprávy: Frontend → LabVIEW](#zprávy-frontend--labview)
- [Ping / Pong – měření latence](#ping--pong--měření-latence)
- [Obsluha odpojení a reconnect](#obsluha-odpojení-a-reconnect)
- [Store ws.ts – API](#store-wsts--api)
- [Stavy připojení](#stavy-připojení)
- [Příklad kompletního průběhu relace](#příklad-kompletního-průběhu-relace)

---

## Připojení

```
ws://<host>:<port>/ws?token=<jwt>
```

| Prvek | Hodnota |
|-------|---------|
| Protokol | WebSocket (ws:// nebo wss://) |
| Cesta | `/ws` (konfigurovatelná přes `NUXT_PUBLIC_WS_PATH`) |
| Port | stejný jako HTTP (LabVIEW Webservice) |
| Auth | JWT token jako query param `?token=` |

**Příklad URL:**
```
ws://192.168.1.100:8080/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> Ve vývojovém režimu (`localhost`) je připojení WS **vynecháno**, pokud není `NUXT_PUBLIC_WS_URL` explicitně nastaven v `.env`.

---

## Autentizace

JWT token je předáván jako query parametr, protože prohlížečové WebSocket API nepodporuje vlastní HTTP hlavičky.

```typescript
// plugins/labview.client.ts
const url = `${wsUrl}/ws?token=${auth.token}`
ws.connect(url)
```

LabVIEW ověřuje token při každém připojení. Pokud token vypršel, připojení je odmítnuto.

---

## Formát zpráv

Všechny zprávy jsou **JSON** přenášený jako text (WebSocket `text` frame).

### Základní struktura

```json
{
  "type": "<typ_zprávy>",
  "data": { ... }
}
```

| Pole | Typ | Popis |
|------|-----|-------|
| `type` | string | Identifikátor typu zprávy |
| `data` | object | Payload specifický pro daný typ |

---

## Zprávy: LabVIEW → Frontend

### `session.started`
Odesláno když LabVIEW zahájí novou testovací relaci.

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

**Reakce frontendu:** store `dashboard.ts` vymaže předchozí data, nastaví `currentSessionId`.

---

### `session.update`
Aktualizace stavu aktuální relace (postup, aktuální krok).

```json
{
  "type": "session.update",
  "data": {
    "status":      "running",
    "currentStep": "Test vstupního napětí",
    "progress":    35
  }
}
```

| Pole | Typ | Popis |
|------|-----|-------|
| `status` | string | `running \| passed \| failed \| aborted` |
| `currentStep` | string | Název aktuálně prováděného kroku |
| `progress` | number | Procento dokončení 0–100 |

**Reakce frontendu:** aktualizuje ukazatel průběhu a záhlaví v `index.vue`.

---

### `test-step.update`
Aktualizace stavu konkrétního testovacího kroku.

```json
{
  "type": "test-step.update",
  "data": {
    "stepId":  "2",
    "name":    "Test vstupního napětí",
    "status":  "ok",
    "message": "V_in = 24.1 V – v normě"
  }
}
```

| Pole | Typ | Popis |
|------|-----|-------|
| `stepId` | string | ID kroku v databázi |
| `name` | string | Název kroku |
| `status` | string | `pending \| running \| ok \| fail \| skip` |
| `message` | string \| null | Volitelná výsledková zpráva |

**Reakce frontendu:** aktualizuje barvu a ikonu kroku v seznamu relace (`index.vue`).

---

### `test-result.add`
Nový výsledek měření připravený k zobrazení.

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

| Pole | Typ | Popis |
|------|-----|-------|
| `resultId` | string | ID výsledku v databázi |
| `testName` | string | Název testu |
| `status` | string | `ok \| fail \| running \| skip` |
| `params` | array | Seznam měřicích parametrů |

**Reakce frontendu:** přidá řádek do tabulky výsledků v `test-results.vue`, aktualizuje čítače PASS/FAIL.

---

### `test-result.log`
Log za běhu připojený k aktivnímu měření.

```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "13",
    "level":    "warn",
    "message":  "Retry #2 – opakuji měření",
    "ts":       "2024-01-15T10:10:05.123Z"
  }
}
```

| Pole | Typ | Popis |
|------|-----|-------|
| `resultId` | string | ID přidruženého výsledku |
| `level` | string | `info \| warn \| error \| debug` |
| `message` | string | Obsah logu |
| `ts` | string | Timestamp ISO 8601 |

**Reakce frontendu:** připojí log do rozbaleného řádku výsledku v `test-results.vue` (živý kurzor).

---

### `instruments.update`
Aktualizace stavu všech přístrojů (odesíláno cyklicky systémem LabVIEW).

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimetr HP 34401A",         "status": "online",  "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Napájecí zdroj Keysight E3631A", "status": "busy", "address": "GPIB0::5::INSTR"  },
      { "id": "3", "name": "NI-9205",                     "status": "online",  "address": "cDAQ1Mod1"         },
      { "id": "4", "name": "Osciloskop Tek MSO44",         "status": "offline", "address": "192.168.1.200"    }
    ]
  }
}
```

| Stav | Význam | Barva UI |
|------|--------|----------|
| `online` | Přístroj dostupný | 🟢 zelená |
| `offline` | Bez připojení | 🔴 červená |
| `error` | Chyba komunikace | 🟠 oranžová |
| `busy` | Probíhá měření | 🔵 modrá |

**Reakce frontendu:** obnoví celý seznam v `device-status.vue` prostřednictvím `dashboard.setInstruments()`.

---

### `ping`
Heartbeat od LabVIEW. Frontend musí odpovědět `pong` se stejným timestampem.

```json
{
  "type": "ping",
  "data": { "ts": 1705312200000 }
}
```

`ts` – Unix timestamp v milisekundách.

---

## Zprávy: Frontend → LabVIEW

### `pong`
Odpověď na `ping`. Slouží k výpočtu latence RTT.

```json
{
  "type": "pong",
  "data": { "ts": 1705312200000 }
}
```

> `ts` musí být identické s hodnotou z přijatého `ping`.  
> LabVIEW vypočítá RTT = `NOW() - ts`.  
> Frontend vypočítá vlastní RTT: `Date.now() - ts` a zobrazí v NavLeft jako latenci [ms].

---

## Ping / Pong – měření latence

```
LabVIEW                          Frontend
    |                                |
    |--- { type:"ping", ts:T1 } ---->|
    |                                |  RTT_frontend = Date.now() - T1
    |<--- { type:"pong", ts:T1 } ----|
    |  RTT_labview = NOW() - T1      |
    |                                |
```

**Implementace v `stores/ws.ts`:**
```typescript
ws.on('ping', (data) => {
  const rtt = Date.now() - data.ts
  latency.value = rtt
  ws.send('pong', { ts: data.ts })
})
```

**NavLeft zobrazí:** `● Connected  12 ms`

---

## Obsluha odpojení a reconnect

Store `ws.ts` implementuje automatický reconnect s exponential backoff:

| Pokus | Zpoždění |
|-------|---------|
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5+ | 16 s (max) |

```typescript
// Zjednodušené schéma logiky reconnect
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

**Reset čítače:** čítač pokusů se resetuje na 0 po každém úspěšném připojení.

**Stavy během reconnect:**
- `reconnecting` — čekání před pokusem
- `connecting` — pokus o TCP připojení
- `connected` — úspěch

---

## Store ws.ts – API

```typescript
const ws = useWsStore()

// Připojit
ws.connect('ws://192.168.1.100:8080/ws', token)

// Odpojit
ws.disconnect()

// Registrovat handler
ws.on('session.update', (data) => {
  console.log(data.currentStep)
})

// Odeslat zprávu
ws.send('pong', { ts: Date.now() })

// Reaktivní stav (Pinia)
ws.status       // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
ws.isConnected  // boolean
ws.latency      // number | null [ms]
ws.statusLabel  // 'Připojeno' | 'Odpojeno' | ...
ws.statusColor  // 'green' | 'red' | 'yellow' | ...
ws.statusDot    // '●' s příslušnou CSS barvou
```

---

## Stavy připojení

| Stav | `statusLabel` | Barva | Popis |
|------|--------------|-------|-------|
| `disconnected` | Odpojeno | 🔴 červená | Bez připojení, bez reconnect |
| `connecting` | Připojování… | 🟡 žlutá | První TCP připojení |
| `connected` | Připojeno | 🟢 zelená | Aktivní WS připojení |
| `reconnecting` | Opakuji… | 🟡 žlutá | Čekání před dalším pokusem |
| `error` | Chyba | 🔴 červená | Chyba protokolu nebo autentizace |

---

## Příklad kompletního průběhu relace

Níže je kompletní sekvence WS zpráv pro typickou testovací relaci:

```
[LabVIEW]                              [Frontend]
    |                                      |
    |-- ping { ts: T1 } ----------------->|
    |<- pong { ts: T1 } ------------------|  latency = T_now - T1
    |                                      |
    |-- session.started {                  |
    |     sessionId: "8",                  |  dashboard.startSession("8")
    |     operator: "jk",                  |  index.vue: "Relace #8 – jk"
    |     startedAt: "2024..." } -------->|
    |                                      |
    |-- session.update {                   |
    |     status: "running",               |  ukazatel průběhu = 10%
    |     currentStep: "Init",             |  index.vue: "Init"
    |     progress: 10 } ---------------->|
    |                                      |
    |-- test-step.update {                 |
    |     stepId: "1",                     |
    |     name: "Init",                    |  krok #1: ⟳ running
    |     status: "running" } ----------->|
    |                                      |
    |-- test-step.update {                 |
    |     stepId: "1",                     |
    |     status: "ok",                    |  krok #1: ✅ ok
    |     message: "OK" } -------------->|
    |                                      |
    |-- instruments.update {               |
    |     instruments: [...] } ---------->|  device-status.vue obnoven
    |                                      |
    |-- test-result.add {                  |
    |     resultId: "13",                  |
    |     testName: "Voltage Check",       |  nový řádek v test-results.vue
    |     status: "ok",                    |  čítač PASS++
    |     params: [...] } -------------->|
    |                                      |
    |-- test-result.log {                  |
    |     resultId: "13",                  |  živý log v rozbaleném řádku
    |     level: "info",                   |
    |     message: "V_in OK" } ---------->|
    |                                      |
    |-- session.update {                   |
    |     status: "passed",                |  relace ukončena
    |     progress: 100 } -------------->|  ukazatel průběhu zelený 100%
    |                                      |
    |-- ping { ts: T2 } ----------------->|
    |<- pong { ts: T2 } ------------------|
```
