# WebSocket Protocol – REMview v3

Protokół komunikacji real-time między LabVIEW Application a przeglądarką (frontend Vue 3).

---

## Spis treści

- [Połączenie](#połączenie)
- [Autentykacja](#autentykacja)
- [Format wiadomości](#format-wiadomości)
- [Wiadomości: LabVIEW → Frontend](#wiadomości-labview--frontend)
- [Wiadomości: Frontend → LabVIEW](#wiadomości-frontend--labview)
- [Ping / Pong – pomiar latencji](#ping--pong--pomiar-latencji)
- [Obsługa rozłączenia i reconnect](#obsługa-rozłączenia-i-reconnect)
- [Store ws.ts – API](#store-wsts--api)
- [Stany połączenia](#stany-połączenia)
- [Przykład pełnego flow sesji](#przykład-pełnego-flow-sesji)

---

## Połączenie

```
ws://<host>:<port>/ws?token=<jwt>
```

| Element | Wartość |
|---------|---------|
| Protokół | WebSocket (ws:// lub wss://) |
| Ścieżka | `/ws` (konfigurowalna przez `NUXT_PUBLIC_WS_PATH`) |
| Port | taki sam jak HTTP (LabVIEW Webservice) |
| Auth | JWT token jako query param `?token=` |

**Przykład URL:**
```
ws://192.168.1.100:8080/ws?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> W trybie deweloperskim (`localhost`) połączenie WS jest **pomijane** chyba że `NUXT_PUBLIC_WS_URL` jest jawnie ustawiony w `.env`.

---

## Autentykacja

Token JWT jest przekazywany jako query parameter ponieważ przeglądarkowy WebSocket API nie obsługuje własnych nagłówków HTTP.

```typescript
// plugins/labview.client.ts
const url = `${wsUrl}/ws?token=${auth.token}`
ws.connect(url)
```

LabVIEW weryfikuje token przy każdym połączeniu. Jeśli token wygasł, połączenie jest odrzucane.

---

## Format wiadomości

Wszystkie wiadomości to **JSON** przesyłany jako tekst (WebSocket `text` frame).

### Struktura bazowa

```json
{
  "type": "<typ_wiadomości>",
  "data": { ... }
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `type` | string | Identyfikator typu wiadomości |
| `data` | object | Payload specyficzny dla danego typu |

---

## Wiadomości: LabVIEW → Frontend

### `session.started`
Wysyłane gdy LabVIEW rozpoczyna nową sesję testową.

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

**Reakcja frontendu:** `dashboard.ts` store czyści poprzednie dane, ustawia `currentSessionId`.

---

### `session.update`
Aktualizacja stanu bieżącej sesji (postęp, aktualny krok).

```json
{
  "type": "session.update",
  "data": {
    "status":      "running",
    "currentStep": "Test napięcia wejściowego",
    "progress":    35
  }
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `status` | string | `running \| passed \| failed \| aborted` |
| `currentStep` | string | Nazwa aktualnie wykonywanego kroku |
| `progress` | number | Procent ukończenia 0–100 |

**Reakcja frontendu:** aktualizuje pasek postępu i nagłówek w `index.vue`.

---

### `test-step.update`
Aktualizacja statusu konkretnego kroku testowego.

```json
{
  "type": "test-step.update",
  "data": {
    "stepId":  "2",
    "name":    "Test napięcia wejściowego",
    "status":  "ok",
    "message": "V_in = 24.1 V – w normie"
  }
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `stepId` | string | ID kroku w bazie danych |
| `name` | string | Nazwa kroku |
| `status` | string | `pending \| running \| ok \| fail \| skip` |
| `message` | string \| null | Opcjonalna wiadomość wynikowa |

**Reakcja frontendu:** aktualizuje kolor i ikonę kroku w liście sesji (`index.vue`).

---

### `test-result.add`
Nowy wynik pomiaru gotowy do wyświetlenia.

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

| Pole | Typ | Opis |
|------|-----|------|
| `resultId` | string | ID wyniku w bazie |
| `testName` | string | Nazwa testu |
| `status` | string | `ok \| fail \| running \| skip` |
| `params` | array | Lista parametrów pomiarowych |

**Reakcja frontendu:** dodaje wiersz do tabeli wyników w `test-results.vue`, aktualizuje liczniki PASS/FAIL.

---

### `test-result.log`
Log na żywo dołączony do aktywnego pomiaru.

```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "13",
    "level":    "warn",
    "message":  "Retry #2 – ponawiam pomiar",
    "ts":       "2024-01-15T10:10:05.123Z"
  }
}
```

| Pole | Typ | Opis |
|------|-----|------|
| `resultId` | string | ID powiązanego wyniku |
| `level` | string | `info \| warn \| error \| debug` |
| `message` | string | Treść logu |
| `ts` | string | Timestamp ISO 8601 |

**Reakcja frontendu:** dołącza log do rozwiniętego wiersza wyniku w `test-results.vue` (live cursor).

---

### `instruments.update`
Aktualizacja statusu wszystkich przyrządów (wysyłane cyklicznie przez LabVIEW).

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimetr HP 34401A",     "status": "online",  "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Zasilacz Keysight E3631A", "status": "busy",    "address": "GPIB0::5::INSTR"  },
      { "id": "3", "name": "NI-9205",                 "status": "online",  "address": "cDAQ1Mod1"         },
      { "id": "4", "name": "Oscyloskop Tek MSO44",    "status": "offline", "address": "192.168.1.200"      }
    ]
  }
}
```

| Status | Znaczenie | Kolor UI |
|--------|-----------|----------|
| `online` | Przyrząd dostępny | 🟢 zielony |
| `offline` | Brak połączenia | 🔴 czerwony |
| `error` | Błąd komunikacji | 🟠 pomarańczowy |
| `busy` | Pomiar w toku | 🔵 niebieski |

**Reakcja frontendu:** odświeża całą listę w `device-status.vue` przez `dashboard.setInstruments()`.

---

### `ping`
Heartbeat od LabVIEW. Frontend musi odpowiedzieć `pong` z tym samym timestamp.

```json
{
  "type": "ping",
  "data": { "ts": 1705312200000 }
}
```

`ts` – Unix timestamp w milisekundach.

---

## Wiadomości: Frontend → LabVIEW

### `pong`
Odpowiedź na `ping`. Używana do obliczenia latencji RTT.

```json
{
  "type": "pong",
  "data": { "ts": 1705312200000 }
}
```

> `ts` musi być identyczne z wartością z odebranego `ping`.  
> LabVIEW oblicza RTT = `NOW() - ts`.  
> Frontend oblicza własne RTT: `Date.now() - ts` i wyświetla w NavLeft jako latencję [ms].

---

## Ping / Pong – pomiar latencji

```
LabVIEW                          Frontend
    |                                |
    |--- { type:"ping", ts:T1 } ---->|
    |                                |  RTT_frontend = Date.now() - T1
    |<--- { type:"pong", ts:T1 } ----|
    |  RTT_labview = NOW() - T1      |
    |                                |
```

**Implementacja w `stores/ws.ts`:**
```typescript
ws.on('ping', (data) => {
  const rtt = Date.now() - data.ts
  latency.value = rtt
  ws.send('pong', { ts: data.ts })
})
```

**NavLeft wyświetla:** `● Connected  12 ms`

---

## Obsługa rozłączenia i reconnect

Store `ws.ts` implementuje automatyczny reconnect z exponential backoff:

| Próba | Opóźnienie |
|-------|-----------|
| 1 | 1 s |
| 2 | 2 s |
| 3 | 4 s |
| 4 | 8 s |
| 5+ | 16 s (max) |

```typescript
// Uproszczony schemat logiki reconnect
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

**Reset licznika:** licznik próba jest resetowany do 0 po każdym udanym połączeniu.

**Stany podczas reconnect:**
- `reconnecting` — oczekiwanie przed próbą
- `connecting` — próba połączenia TCP
- `connected` — sukces

---

## Store ws.ts – API

```typescript
const ws = useWsStore()

// Połącz
ws.connect('ws://192.168.1.100:8080/ws', token)

// Rozłącz
ws.disconnect()

// Rejestruj handler
ws.on('session.update', (data) => {
  console.log(data.currentStep)
})

// Wyślij wiadomość
ws.send('pong', { ts: Date.now() })

// Stan reaktywny (Pinia)
ws.status       // 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error'
ws.isConnected  // boolean
ws.latency      // number | null [ms]
ws.statusLabel  // 'Połączony' | 'Rozłączony' | ...
ws.statusColor  // 'green' | 'red' | 'yellow' | ...
ws.statusDot    // '●' z odpowiednim kolorem CSS
```

---

## Stany połączenia

| Stan | `statusLabel` | Kolor | Opis |
|------|--------------|-------|------|
| `disconnected` | Rozłączony | 🔴 czerwony | Brak połączenia, brak reconnect |
| `connecting` | Łączenie… | 🟡 żółty | Pierwsze połączenie TCP |
| `connected` | Połączony | 🟢 zielony | Aktywne połączenie WS |
| `reconnecting` | Ponawiam… | 🟡 żółty | Oczekiwanie przed kolejną próbą |
| `error` | Błąd | 🔴 czerwony | Błąd protokołu lub auth |

---

## Przykład pełnego flow sesji

Poniżej kompletna sekwencja wiadomości WS dla typowej sesji testowej:

```
[LabVIEW]                              [Frontend]
    |                                      |
    |-- ping { ts: T1 } ----------------->|
    |<- pong { ts: T1 } ------------------|  latency = T_now - T1
    |                                      |
    |-- session.started {                  |
    |     sessionId: "8",                  |  dashboard.startSession("8")
    |     operator: "jk",                  |  index.vue: "Sesja #8 – jk"
    |     startedAt: "2024..." } -------->|
    |                                      |
    |-- session.update {                   |
    |     status: "running",               |  progress bar = 10%
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
    |     instruments: [...] } ---------->|  device-status.vue odświeżony
    |                                      |
    |-- test-result.add {                  |
    |     resultId: "13",                  |
    |     testName: "Voltage Check",       |  nowy wiersz w test-results.vue
    |     status: "ok",                    |  licznik PASS++
    |     params: [...] } -------------->|
    |                                      |
    |-- test-result.log {                  |
    |     resultId: "13",                  |  live log w rozwiniętym wierszu
    |     level: "info",                   |
    |     message: "V_in OK" } ---------->|
    |                                      |
    |-- session.update {                   |
    |     status: "passed",                |  sesja zakończona
    |     progress: 100 } -------------->|  progress bar zielony 100%
    |                                      |
    |-- ping { ts: T2 } ----------------->|
    |<- pong { ts: T2 } ------------------|
```
