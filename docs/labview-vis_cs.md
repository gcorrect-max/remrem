# LabVIEW VIs – Dokumentace implementace

Popis všech Virtual Instruments (VI), které musí být implementovány na straně aplikace LabVIEW, aby integrace s REMview v3 fungovala správně.

---

## Obsah

- [Architektura LabVIEW](#architektura-labview)
- [VIs vystavované LabVIEW](#vis-vystavované-labview)
  - [VI 1: GET /api/hostname](#vi-1-get-apihostname)
  - [VI 2: WebSocket /ws](#vi-2-websocket-ws)
- [VIs volající Nitro REST API](#vis-volající-nitro-rest-api)
  - [VI 3: Auth Login](#vi-3-auth-login)
  - [VI 4: Start Session](#vi-4-start-session)
  - [VI 5: Finish Session](#vi-5-finish-session)
  - [VI 6: Update Step Status](#vi-6-update-step-status)
  - [VI 7: Add Test Result](#vi-7-add-test-result)
  - [VI 8: Append Result Log](#vi-8-append-result-log)
  - [VI 9: Update Instrument Status](#vi-9-update-instrument-status)
  - [VI 10: Upload Drawing](#vi-10-upload-drawing)
- [Konfigurace HTTP Client](#konfigurace-http-client)
- [Obsluha chyb](#obsluha-chyb)
- [Doporučené pořadí volání](#doporučené-pořadí-volání)

---

## Architektura LabVIEW

```
LabVIEW Application
├── Webservice VIs (vystavované)
│   ├── VI 1: GET /api/hostname
│   └── VI 2: WebSocket /ws
│
├── HTTP Client VIs (volající Nitro)
│   ├── VI 3: Auth Login  ─────────── volat při startu aplikace
│   ├── VI 4: Start Session ────────── volat při spuštění testu
│   ├── VI 5: Finish Session ───────── volat při ukončení testu
│   ├── VI 6: Update Step ──────────── volat při každé změně kroku
│   ├── VI 7: Add Test Result ──────── volat po každém měření
│   ├── VI 8: Append Result Log ────── volat pro živé logy
│   └── VI 9: Update Instrument ────── volat při změně stavu přístroje
│
└── Startup VI
    └── VI 10: Upload Drawing ──────── volat jednorázově při startu aplikace
```

JWT token získaný ve VI 3 (Auth Login) musí být uložen jako **Global Variable** nebo **Functional Global** a předáván do všech ostatních HTTP VI.

---

## VIs vystavované LabVIEW

### VI 1: GET /api/hostname

**Účel:** Zpřístupnění informací o zařízení a aktivním dokumentu RTO (Routine Test Overview). Voláno frontendem každých 5 sekund ke kontrole dostupnosti serveru.

**Typ VI:** HTTP GET Handler (NI Web Service)

**URL:** `GET /api/hostname`

**Bez autorizace** — veřejný endpoint.

#### Vstupní data (parametry URL)
Žádné parametry.

#### Výstupní data (Response Body – JSON)

```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

| Pole | Typ LabVIEW | Zdroj |
|------|-------------|-------|
| `hostname` | String | `Get Computer Name.vi` nebo ENV proměnná |
| `model` | String | Konstanta ve VI nebo konfigurační soubor |
| `rtoFile` | String | Název aktivního souboru dokumentu RTO (Routine Test Overview) |
| `rtoRevision` | String | Revize dokumentu RTO získaná z databáze CINNAMON |

#### Implementace (pseudokód G-code)
```
1. Sestavit JSON string (JSON Build Object):
   - "hostname"    ← Get Computer Name
   - "model"       ← konstanta "REM102"
   - "rtoFile"     ← název aktivního souboru RTO (Routine Test Overview), např. "rem102_main.rtexe"
   - "rtoRevision" ← revize dokumentu RTO z databáze CINNAMON, např. "A00"

2. HTTP Response:
   - Status Code: 200
   - Content-Type: application/json
   - Body: sestavený JSON
```

---

### VI 2: WebSocket /ws

**Účel:** Real-time push stavů relace, kroků, výsledků a přístrojů do frontendu.

**Typ VI:** WebSocket Server Handler (NI Web Service)

**URL:** `WS /ws?token=<jwt>`

**Autorizace:** Ověření JWT z query param `token`.

#### Struktura připojení

```
Frontend otevře WS → LabVIEW přijme připojení
LabVIEW ověří ?token= (JWT HS256)
LabVIEW uloží referenci na připojení (WebSocket Connection Refnum)
Smyčka Send Loop odesílá zprávy na žádost ostatních VI
```

#### Interní architektura

```
┌─────────────────────────────────────┐
│  WS Server Loop                     │
│  ┌─────────────┐  ┌───────────────┐ │
│  │ Accept Loop │  │ Receive Loop  │ │
│  │ (TCP/WS)    │  │ (ping→pong)   │ │
│  └──────┬──────┘  └───────┬───────┘ │
│         │                 │         │
│  ┌──────▼─────────────────▼───────┐ │
│  │  Send Queue (Notifier/Queue)   │ │
│  └──────────────┬─────────────────┘ │
│                 │                   │
│  ┌──────────────▼─────────────────┐ │
│  │  Send Loop (odesílá JSON)      │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
         ▲
         │ ostatní VI vkládají zprávy do Queue
         │
   [VI 4 Start Session]
   [VI 6 Update Step]
   [VI 7 Add Result]
   [VI 9 Update Instruments]
```

#### Formát zprávy k odeslání (Notifier payload)

```
Cluster:
  - type  (String): "session.update"
  - data  (String): "{\"status\":\"running\",\"progress\":35}"
```

#### Obsluha Ping/Pong

```
Receive Loop:
  1. Přijmout zprávu (WebSocket Read)
  2. Parsovat JSON → načíst pole "type"
  3. Pokud type = "pong":
       - Přeskočit (heartbeat potvrzen)
  4. (ostatní typy ignorovat)

Ping Timer (každých 5 sekund):
  1. Sestavit JSON: {"type":"ping","data":{"ts": <current_time_ms>}}
  2. Uložit ts_sent = current_time_ms
  3. Odeslat přes WebSocket Write
```

#### Typy zpráv k odeslání – tabulka

| type | Kdy odesílat | Iniciující VI |
|------|--------------|---------------|
| `session.started` | Start nové relace | VI 4 |
| `session.update` | Změna průběhu/stavu | VI 4, VI 5 |
| `test-step.update` | Změna stavu kroku | VI 6 |
| `test-result.add` | Nový výsledek měření | VI 7 |
| `test-result.log` | Živý log | VI 8 |
| `instruments.update` | Změna stavu přístrojů | VI 9 |
| `ping` | Každých 5s (timer) | WS Loop |

---

## VIs volající Nitro REST API

Všechna HTTP Client VI používají NI HTTP Client (`HTTP Client Open Handle.vi`).

**Base URL:** `http://localhost:3000` (pokud je Nitro na stejném PC)  
nebo konfigurovatelný z INI/JSON souboru.

---

### VI 3: Auth Login

**Účel:** Získání JWT tokenu používaného všemi ostatními VIs.  
**Volat:** Jednorázově při startu aplikace.

**HTTP Method:** `POST`  
**URL:** `http://localhost:3000/api/auth/login`  
**Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "username": "labview_svc",
  "password": "service_password"
}
```

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "5", "role": "operator" }
}
```

**Implementace:**
```
1. HTTP Client Open Handle
2. HTTP Client Set Header: Content-Type = application/json
3. HTTP Client POST:
   URL    = base_url + "/api/auth/login"
   Body   = JSON string s username/password
4. HTTP Client Get Response: StatusCode, Body
5. Pokud StatusCode = 200:
   - Parsovat JSON → načíst "token"
   - Uložit token do Global Variable "JWT_TOKEN"
6. Pokud StatusCode ≠ 200:
   - Zalogovat chybu, zastavit aplikaci
7. HTTP Client Close Handle
```

**Důležité:** Token vyprší po 8 hodinách (konfigurovatelné). Implementujte automatické obnovení nebo restart aplikace.

---

### VI 4: Start Session

**Účel:** Zaregistrování startu testovací relace v databázi a oznámení frontendu přes WS.

**HTTP Method:** `POST`  
**URL:** `http://localhost:3000/api/test-sessions`  
**Headers:** `Authorization: Bearer <JWT_TOKEN>`, `Content-Type: application/json`

**Request Body:**
```json
{
  "deviceId": 1,
  "operator": "jkowalski"
}
```

> `deviceId` = 1 (vždy, jeden REM102 na stanici)  
> `operator` = aktuálně přihlášený uživatel (z frontendu) nebo ID operátora z RFID karty

**Response `200`:**
```json
{
  "id": "8",
  "status": "running",
  "startedAt": "2024-01-15T11:00:00.000Z"
}
```

**Po úspěšné odpovědi — odeslat přes WS Queue:**
```json
{ "type": "session.started", "data": { "sessionId": "8", "operator": "jkowalski", "startedAt": "2024-01-15T11:00:00.000Z" } }
{ "type": "session.update",  "data": { "status": "running", "currentStep": "", "progress": 0 } }
```

**Implementace:**
```
Výstup VI:
  - sessionId (String): "8"  ← uložit pro následující VI
```

---

### VI 5: Finish Session

**Účel:** Uzavření testovací relace.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-sessions/<sessionId>`

**Request Body:**
```json
{ "status": "passed" }
```

Možné hodnoty: `passed` | `failed` | `aborted`

**Response `200`:**
```json
{ "id": "8", "status": "passed", "finishedAt": "2024-01-15T11:45:00.000Z" }
```

**Po úspěšné odpovědi — odeslat přes WS Queue:**
```json
{ "type": "session.update", "data": { "status": "passed", "currentStep": "", "progress": 100 } }
```

---

### VI 6: Update Step Status

**Účel:** Aktualizace stavu testovacího kroku. Volat při každé změně stavu (start kroku, konec, chyba).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-steps/<stepId>`

**Request Body:**
```json
{
  "status":     "ok",
  "message":    "Napětí v normě: 24.1 V",
  "startedAt":  "2024-01-15T11:01:00.000Z",
  "finishedAt": "2024-01-15T11:05:30.000Z"
}
```

| Pole | Kdy odeslat |
|------|------------|
| `status: "running"` | Při startu kroku (vynechat `finishedAt`) |
| `status: "ok"/"fail"/"skip"` | Na konci kroku (přidat `finishedAt`) |

**Vstupy VI:**

| Parametr | Typ | Popis |
|----------|-----|-------|
| stepId | String | ID kroku z DB |
| status | Enum | pending/running/ok/fail/skip |
| message | String | Volitelná zpráva |
| startedAt | Timestamp | Čas spuštění |
| finishedAt | Timestamp | Čas ukončení (null pokud running) |

**Po úspěšné odpovědi — odeslat přes WS Queue:**
```json
{ "type": "test-step.update", "data": { "stepId": "2", "name": "Test napětí", "status": "ok", "message": "OK" } }
```

---

### VI 7: Add Test Result

**Účel:** Uložení výsledku měření s parametry a volitelnými logy.

**HTTP Method:** `POST`  
**URL:** `http://localhost:3000/api/test-results`

**Request Body — kompletní příklad:**
```json
{
  "sessionId":  8,
  "testName":   "Voltage Check",
  "status":     "ok",
  "measuredAt": "2024-01-15T11:10:00.000Z",
  "params": [
    { "name": "V_in",  "value": "24.1",  "unit": "V", "lowLimit": 23.0, "highLimit": 25.0, "status": "ok" },
    { "name": "V_out", "value": "12.05", "unit": "V", "lowLimit": 11.8, "highLimit": 12.2, "status": "ok" },
    { "name": "I_out", "value": "1.23",  "unit": "A", "lowLimit": 0.5,  "highLimit": 2.0,  "status": "ok" }
  ],
  "logs": [
    { "level": "info", "message": "Start měření napětí" },
    { "level": "info", "message": "V_in = 24.1 V – OK" },
    { "level": "info", "message": "V_out = 12.05 V – OK" },
    { "level": "info", "message": "PASS" }
  ]
}
```

**Logika stanovení stavu na základě parametrů:**
```
Pokud VŠECHNY params.status = "ok" → status = "ok"
Pokud JAKÝKOLIV params.status = "fail" → status = "fail"
Pokud měření probíhá → status = "running"
```

**Response `200`:**
```json
{ "id": "14", "status": "ok", "measuredAt": "2024-01-15T11:10:00.000Z" }
```

**Po úspěšné odpovědi — odeslat přes WS Queue:**
```json
{
  "type": "test-result.add",
  "data": {
    "resultId": "14",
    "testName": "Voltage Check",
    "status":   "ok",
    "params":   [ ... ]
  }
}
```

---

### VI 8: Append Result Log

**Účel:** Připojení živého logu k probíhajícímu měření (před jeho ukončením).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-results/<resultId>`

**Request Body:**
```json
{
  "log": {
    "level":   "info",
    "message": "Měřím napětí... V_in = 24.08 V",
    "ts":      "2024-01-15T11:10:02.500Z"
  }
}
```

**Po úspěšné odpovědi — odeslat přes WS Queue:**
```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "14",
    "level":    "info",
    "message":  "Měřím napětí... V_in = 24.08 V",
    "ts":       "2024-01-15T11:10:02.500Z"
  }
}
```

---

### VI 9: Update Instrument Status

**Účel:** Aktualizace stavu měřicího přístroje při každé změně (online/offline/busy/error).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/instruments/<instrumentId>`

**Request Body:**
```json
{
  "status":   "busy",
  "lastSeen": "2024-01-15T11:10:00.000Z"
}
```

**Vstupy VI:**

| Parametr | Typ | Popis |
|----------|-----|-------|
| instrumentId | I32 | ID přístroje z DB |
| status | Enum | online/offline/error/busy |
| lastSeen | Timestamp | Aktuální čas |

**Doporučení:** Volat VI 9 pro **všechny** přístroje najednou a poté odeslat jednu WS zprávu `instruments.update` se stavy všech:

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimetr",       "status": "busy",   "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Napájecí zdroj",  "status": "online", "address": "GPIB0::5::INSTR"  }
    ]
  }
}
```

---

### VI 10: Upload Drawing

**Účel:** Nahrání grafického schématu stanice jako base64 do databáze. Volat **jednorázově při startu aplikace**.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/drawings/<drawingId>`

**Request Body:**
```json
{
  "name":        "Schéma stanice",
  "description": "Hlavní pohled testovací stanice REM102",
  "mimeType":    "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcn..."
}
```

**Konverze souboru do base64 (G-code):**
```
1. Read File.vi → načíst bajty souboru PNG/SVG
2. Base64 Encode.vi → zakódovat do base64 stringu
3. (volitelně) odstranit znaky nového řádku z base64 stringu
4. Předat do HTTP Request Body
```

> ⚠️ Nepřidávat prefix `data:image/...;base64,` — frontend to dělá automaticky.

---

## Konfigurace HTTP Client

Doporučená konfigurace HTTP připojení v LabVIEW:

```
HTTP Client Open Handle:
  ├── Verify Server Certificate: FALSE (lokální prostředí)
  └── TLS Version: Auto

Timeouts:
  ├── Connection Timeout: 5000 ms
  ├── Read Timeout:       10000 ms
  └── Send Timeout:       10000 ms

Headers (globální pro všechna volání):
  ├── Content-Type: application/json
  ├── Accept: application/json
  └── Authorization: Bearer <JWT_TOKEN>  ← z Global Variable
```

**Správa handle:** Otevřít jeden handle při startu aplikace, zavřít při shutdown. Neotvírat/nezavírat při každém volání.

---

## Obsluha chyb

### HTTP kódy a reakce LabVIEW

| Kód | Situace | Akce LabVIEW |
|-----|---------|--------------|
| `200` | Úspěch | Pokračovat normálně |
| `401` | Token vypršel | Volat VI 3 (Auth Login) znovu |
| `404` | Prostředek neexistuje | Zalogovat varování, pokračovat |
| `400` | Neplatná data | Zalogovat chybu s payloadem |
| `5xx` | Chyba serveru | Retry s exponential backoff |
| Timeout | Server nedostupný | Retry 3x, poté zalogovat kritickou chybu |

### Vzor retry (G-code)

```
For loop: 3 iterace
  │
  ├── HTTP Request (VI 7, 4, 6...)
  │
  ├── Pokud StatusCode = 200 → break loop, úspěch
  │
  ├── Pokud StatusCode = 401:
  │     └── Volat VI 3 (Auth Login)
  │         └── Retry s novým tokenem
  │
  └── Pokud chyba / timeout:
        Wait: 500ms * 2^iteration (backoff)
        Pokračovat smyčku
```

---

## Doporučené pořadí volání

```
STARTUP APLIKACE
  │
  ├─ 1. VI 3: Auth Login ─────────────── získat JWT token
  ├─ 2. VI 10: Upload Drawing ─────────── nahrát schémata (pokud jsou nová)
  └─ 3. VI 9: Update Instruments ──────── nastavit stavy offline pro všechny

TEST START
  │
  ├─ 4. VI 4: Start Session ───────────── vytvořit relaci, uložit sessionId
  └─ 5. VI 9: Update Instruments ──────── nastavit stavy online/busy

PRO KAŽDÝ KROK
  │
  ├─ 6.  VI 6: Update Step (running) ──── krok spuštěn
  ├─ 7.  VI 9: Update Instruments ──────── přístroj → busy
  ├─ 8.  VI 7: Add Test Result ─────────── uložit výsledek (status: "running")
  ├─ 9.  VI 8: Append Result Log ──────── živé logy (opakovaně)
  ├─ 10. VI 7: PUT result status ──────── aktualizovat stav (ok/fail)
  ├─ 11. VI 9: Update Instruments ──────── přístroj → online
  └─ 12. VI 6: Update Step (ok/fail) ──── krok ukončen

TEST END
  │
  ├─ 13. VI 5: Finish Session ─────────── uzavřít relaci (passed/failed)
  └─ 14. VI 9: Update Instruments ──────── všechny → online/offline

SHUTDOWN APLIKACE
  └─ 15. VI 9: Update Instruments ──────── všechny → offline
```
