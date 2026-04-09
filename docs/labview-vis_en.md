# LabVIEW VIs – Implementation Documentation

Description of all Virtual Instruments (VIs) that must be implemented on the LabVIEW Application side for the integration with REMview v3 to work correctly.

---

## Table of Contents

- [LabVIEW Architecture](#labview-architecture)
- [VIs Exposed by LabVIEW](#vis-exposed-by-labview)
  - [VI 1: GET /api/hostname](#vi-1-get-apihostname)
  - [VI 2: WebSocket /ws](#vi-2-websocket-ws)
- [VIs Calling the Nitro REST API](#vis-calling-the-nitro-rest-api)
  - [VI 3: Auth Login](#vi-3-auth-login)
  - [VI 4: Start Session](#vi-4-start-session)
  - [VI 5: Finish Session](#vi-5-finish-session)
  - [VI 6: Update Step Status](#vi-6-update-step-status)
  - [VI 7: Add Test Result](#vi-7-add-test-result)
  - [VI 8: Append Result Log](#vi-8-append-result-log)
  - [VI 9: Update Instrument Status](#vi-9-update-instrument-status)
  - [VI 10: Upload Drawing](#vi-10-upload-drawing)
- [HTTP Client Configuration](#http-client-configuration)
- [Error Handling](#error-handling)
- [Suggested Call Order](#suggested-call-order)

---

## LabVIEW Architecture

```
LabVIEW Application
├── Webservice VIs (exposed)
│   ├── VI 1: GET /api/hostname
│   └── VI 2: WebSocket /ws
│
├── HTTP Client VIs (calling Nitro)
│   ├── VI 3: Auth Login  ─────────── call at application startup
│   ├── VI 4: Start Session ────────── call when test starts
│   ├── VI 5: Finish Session ───────── call when test ends
│   ├── VI 6: Update Step ──────────── call on every step change
│   ├── VI 7: Add Test Result ──────── call after each measurement
│   ├── VI 8: Append Result Log ────── call for live logs
│   └── VI 9: Update Instrument ────── call when instrument status changes
│
└── Startup VI
    └── VI 10: Upload Drawing ──────── call once at application startup
```

The JWT token obtained in VI 3 (Auth Login) must be stored as a **Global Variable** or **Functional Global** and passed to all remaining HTTP VIs.

---

## VIs Exposed by LabVIEW

### VI 1: GET /api/hostname

**Purpose:** Expose device information and the active RTO (Routine Test Overview) document details. Called by the frontend every 5 seconds to check server availability.

**VI Type:** HTTP GET Handler (NI Web Service)

**URL:** `GET /api/hostname`

**No authorization** — public endpoint.

#### Input Data (URL parameters)
No parameters.

#### Output Data (Response Body – JSON)

```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

| Field | LabVIEW Type | Source |
|-------|-------------|--------|
| `hostname` | String | `Get Computer Name.vi` or ENV variable |
| `model` | String | Constant in VI or configuration file |
| `rtoFile` | String | Name of the active RTO (Routine Test Overview) document file |
| `rtoRevision` | String | Revision of the RTO document retrieved from the CINNAMON database |

#### Implementation (G-code pseudocode)
```
1. Build JSON string (JSON Build Object):
   - "hostname"    ← Get Computer Name
   - "model"       ← constant "REM102"
   - "rtoFile"     ← name of the active RTO (Routine Test Overview) file, e.g. "rem102_main.rtexe"
   - "rtoRevision" ← revision of the RTO document retrieved from CINNAMON database, e.g. "A00"

2. HTTP Response:
   - Status Code: 200
   - Content-Type: application/json
   - Body: built JSON
```

---

### VI 2: WebSocket /ws

**Purpose:** Real-time push of session, step, result and instrument statuses to the frontend.

**VI Type:** WebSocket Server Handler (NI Web Service)

**URL:** `WS /ws?token=<jwt>`

**Authorization:** JWT verification from the query param `token`.

#### Connection Structure

```
Frontend opens WS → LabVIEW accepts connection
LabVIEW verifies ?token= (JWT HS256)
LabVIEW stores connection reference (WebSocket Connection Refnum)
Send Loop sends messages on demand from other VIs
```

#### Internal Architecture

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
│  │  Send Loop (sends JSON)        │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
         ▲
         │ other VIs push messages to the Queue
         │
   [VI 4 Start Session]
   [VI 6 Update Step]
   [VI 7 Add Result]
   [VI 9 Update Instruments]
```

#### Message Format to Send (Notifier payload)

```
Cluster:
  - type  (String): "session.update"
  - data  (String): "{\"status\":\"running\",\"progress\":35}"
```

#### Ping/Pong Handling

```
Receive Loop:
  1. Receive message (WebSocket Read)
  2. Parse JSON → get field "type"
  3. If type = "pong":
       - Skip (heartbeat confirmed)
  4. (other types are ignored)

Ping Timer (every 5 seconds):
  1. Build JSON: {"type":"ping","data":{"ts": <current_time_ms>}}
  2. Save ts_sent = current_time_ms
  3. Send via WebSocket Write
```

#### Message Types to Send – Table

| type | When to send | Initiating VI |
|------|-------------|---------------|
| `session.started` | Start of new session | VI 4 |
| `session.update` | Progress/status change | VI 4, VI 5 |
| `test-step.update` | Step status change | VI 6 |
| `test-result.add` | New measurement result | VI 7 |
| `test-result.log` | Live log | VI 8 |
| `instruments.update` | Instrument status change | VI 9 |
| `ping` | Every 5s (timer) | WS Loop |

---

## VIs Calling the Nitro REST API

All HTTP Client VIs use the NI HTTP Client (`HTTP Client Open Handle.vi`).

**Base URL:** `http://localhost:3000` (if Nitro is on the same PC)  
or configurable from an INI/JSON file.

---

### VI 3: Auth Login

**Purpose:** Obtain the JWT token used by all other VIs.  
**Call:** Once at application startup.

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

**Implementation:**
```
1. HTTP Client Open Handle
2. HTTP Client Set Header: Content-Type = application/json
3. HTTP Client POST:
   URL    = base_url + "/api/auth/login"
   Body   = JSON string with username/password
4. HTTP Client Get Response: StatusCode, Body
5. If StatusCode = 200:
   - Parse JSON → get "token"
   - Save token to Global Variable "JWT_TOKEN"
6. If StatusCode ≠ 200:
   - Log error, stop application
7. HTTP Client Close Handle
```

**Important:** Token expires after 8 hours (configurable). Implement automatic refresh or application restart.

---

### VI 4: Start Session

**Purpose:** Register the start of a test session in the database and notify the frontend via WS.

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

> `deviceId` = 1 (always, one REM102 per station)  
> `operator` = currently logged-in user (from the frontend) or operator ID from RFID card

**Response `200`:**
```json
{
  "id": "8",
  "status": "running",
  "startedAt": "2024-01-15T11:00:00.000Z"
}
```

**After successful response — send via WS Queue:**
```json
{ "type": "session.started", "data": { "sessionId": "8", "operator": "jkowalski", "startedAt": "2024-01-15T11:00:00.000Z" } }
{ "type": "session.update",  "data": { "status": "running", "currentStep": "", "progress": 0 } }
```

**Implementation:**
```
VI output:
  - sessionId (String): "8"  ← store for subsequent VIs
```

---

### VI 5: Finish Session

**Purpose:** Close the test session.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-sessions/<sessionId>`

**Request Body:**
```json
{ "status": "passed" }
```

Possible values: `passed` | `failed` | `aborted`

**Response `200`:**
```json
{ "id": "8", "status": "passed", "finishedAt": "2024-01-15T11:45:00.000Z" }
```

**After successful response — send via WS Queue:**
```json
{ "type": "session.update", "data": { "status": "passed", "currentStep": "", "progress": 100 } }
```

---

### VI 6: Update Step Status

**Purpose:** Update the status of a test step. Call on every state change (step start, end, error).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-steps/<stepId>`

**Request Body:**
```json
{
  "status":     "ok",
  "message":    "Voltage within limits: 24.1 V",
  "startedAt":  "2024-01-15T11:01:00.000Z",
  "finishedAt": "2024-01-15T11:05:30.000Z"
}
```

| Field | When to send |
|-------|-------------|
| `status: "running"` | At step start (omit `finishedAt`) |
| `status: "ok"/"fail"/"skip"` | At step end (include `finishedAt`) |

**VI Inputs:**

| Parameter | Type | Description |
|-----------|------|-------------|
| stepId | String | Step ID from DB |
| status | Enum | pending/running/ok/fail/skip |
| message | String | Optional message |
| startedAt | Timestamp | Start time |
| finishedAt | Timestamp | End time (null if running) |

**After successful response — send via WS Queue:**
```json
{ "type": "test-step.update", "data": { "stepId": "2", "name": "Voltage test", "status": "ok", "message": "OK" } }
```

---

### VI 7: Add Test Result

**Purpose:** Save a measurement result with parameters and optional logs.

**HTTP Method:** `POST`  
**URL:** `http://localhost:3000/api/test-results`

**Request Body — full example:**
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
    { "level": "info", "message": "Voltage measurement start" },
    { "level": "info", "message": "V_in = 24.1 V – OK" },
    { "level": "info", "message": "V_out = 12.05 V – OK" },
    { "level": "info", "message": "PASS" }
  ]
}
```

**Logic for determining status based on parameters:**
```
If ALL params.status = "ok" → status = "ok"
If ANY params.status = "fail" → status = "fail"
If measurement in progress → status = "running"
```

**Response `200`:**
```json
{ "id": "14", "status": "ok", "measuredAt": "2024-01-15T11:10:00.000Z" }
```

**After successful response — send via WS Queue:**
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

**Purpose:** Attach a live log to an ongoing measurement (before it finishes).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-results/<resultId>`

**Request Body:**
```json
{
  "log": {
    "level":   "info",
    "message": "Measuring voltage... V_in = 24.08 V",
    "ts":      "2024-01-15T11:10:02.500Z"
  }
}
```

**After successful response — send via WS Queue:**
```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "14",
    "level":    "info",
    "message":  "Measuring voltage... V_in = 24.08 V",
    "ts":       "2024-01-15T11:10:02.500Z"
  }
}
```

---

### VI 9: Update Instrument Status

**Purpose:** Update the status of a measurement instrument after every change (online/offline/busy/error).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/instruments/<instrumentId>`

**Request Body:**
```json
{
  "status":   "busy",
  "lastSeen": "2024-01-15T11:10:00.000Z"
}
```

**VI Inputs:**

| Parameter | Type | Description |
|-----------|------|-------------|
| instrumentId | I32 | Instrument ID from DB |
| status | Enum | online/offline/error/busy |
| lastSeen | Timestamp | Current time |

**Recommendation:** Call VI 9 for **all** instruments together, then send a single `instruments.update` WS message with statuses of all:

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimeter",   "status": "busy",   "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Power Supply", "status": "online", "address": "GPIB0::5::INSTR"  }
    ]
  }
}
```

---

### VI 10: Upload Drawing

**Purpose:** Upload a station graphic schematic as base64 to the database. Call **once at application startup**.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/drawings/<drawingId>`

**Request Body:**
```json
{
  "name":        "Station Schematic",
  "description": "Main view of the REM102 test station",
  "mimeType":    "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcn..."
}
```

**Convert file to base64 (G-code):**
```
1. Read File.vi → read PNG/SVG file bytes
2. Base64 Encode.vi → encode to base64 string
3. (optionally) remove newline characters from base64 string
4. Pass to HTTP Request Body
```

> Do not add the `data:image/...;base64,` prefix — the frontend does this automatically.

---

## HTTP Client Configuration

Recommended HTTP connection configuration in LabVIEW:

```
HTTP Client Open Handle:
  ├── Verify Server Certificate: FALSE (local environment)
  └── TLS Version: Auto

Timeouts:
  ├── Connection Timeout: 5000 ms
  ├── Read Timeout:       10000 ms
  └── Send Timeout:       10000 ms

Headers (global for all calls):
  ├── Content-Type: application/json
  ├── Accept: application/json
  └── Authorization: Bearer <JWT_TOKEN>  ← from Global Variable
```

**Handle management:** Open one handle at application startup, close at shutdown. Do not open/close on every call.

---

## Error Handling

### HTTP Codes and LabVIEW Responses

| Code | Situation | LabVIEW Action |
|------|-----------|---------------|
| `200` | Success | Continue normally |
| `401` | Token expired | Call VI 3 (Auth Login) again |
| `404` | Resource does not exist | Log warning, continue |
| `400` | Invalid data | Log error with payload |
| `5xx` | Server error | Retry with exponential backoff |
| Timeout | Server unavailable | Retry 3x, then log critical error |

### Retry Pattern (G-code)

```
For loop: 3 iterations
  │
  ├── HTTP Request (VI 7, 4, 6...)
  │
  ├── If StatusCode = 200 → break loop, success
  │
  ├── If StatusCode = 401:
  │     └── Call VI 3 (Auth Login)
  │         └── Retry with new token
  │
  └── If error / timeout:
        Wait: 500ms * 2^iteration (backoff)
        Continue loop
```

---

## Suggested Call Order

```
APPLICATION STARTUP
  │
  ├─ 1. VI 3: Auth Login ─────────────── get JWT token
  ├─ 2. VI 10: Upload Drawing ─────────── upload schematics (if new)
  └─ 3. VI 9: Update Instruments ──────── set all instruments to offline

TEST START
  │
  ├─ 4. VI 4: Start Session ───────────── create session, save sessionId
  └─ 5. VI 9: Update Instruments ──────── set statuses online/busy

FOR EACH STEP
  │
  ├─ 6.  VI 6: Update Step (running) ──── step starts
  ├─ 7.  VI 9: Update Instruments ──────── instrument → busy
  ├─ 8.  VI 7: Add Test Result ─────────── save result (status: "running")
  ├─ 9.  VI 8: Append Result Log ──────── live logs (multiple times)
  ├─ 10. VI 7: PUT result status ──────── update status (ok/fail)
  ├─ 11. VI 9: Update Instruments ──────── instrument → online
  └─ 12. VI 6: Update Step (ok/fail) ──── step finished

TEST END
  │
  ├─ 13. VI 5: Finish Session ─────────── close session (passed/failed)
  └─ 14. VI 9: Update Instruments ──────── all → online/offline

APPLICATION SHUTDOWN
  └─ 15. VI 9: Update Instruments ──────── all → offline
```
