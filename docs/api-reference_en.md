# API Reference – Nuxt Nitro Server

Base URL in development environment: `http://localhost:3000`  
In production (LabVIEW Webservice): `http://<host>:<port>`

All endpoints except `/api/hostname` and `/api/auth/login` require the header:
```
Authorization: Bearer <jwt_token>
```

---

## Table of Contents

- [Auth](#auth)
- [Users](#users)
- [Device](#device)
- [Instruments](#instruments)
- [Session](#session)
- [Test Sessions](#test-sessions)
- [Test Steps](#test-steps)
- [Test Results](#test-results)
- [RTO Documents](#rto-documents)
- [Accuracy Tests](#accuracy-tests)
- [Drawings](#drawings)
- [Module Configs](#module-configs)
- [Settings](#settings)
- [Hostname (public)](#hostname-public)

---

## Auth

### `POST /api/auth/login`
User login. Returns a JWT token.

**No Authorization header required.**

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response `200`:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "username": "admin",
    "displayName": "Administrator",
    "role": "admin",
    "permissions": {
      "overview": true,
      "results": true,
      "config": true,
      "deviceStatus": true,
      "stationSchema": true,
      "settings": true,
      "help": true,
      "authorization": true
    }
  }
}
```

**Response `401`:**
```json
{ "statusCode": 401, "message": "Invalid credentials" }
```

---

### `POST /api/auth/logout`
Logout — deletes the `hasler-auth` cookie.

**Response `200`:**
```json
{ "success": true }
```

---

## Users

### `GET /api/users`
List of all users.

**Response `200`:**
```json
[
  {
    "id": "1",
    "username": "admin",
    "displayName": "Administrator",
    "role": "admin",
    "active": true,
    "permissions": { "overview": true, "results": true, "config": true, "deviceStatus": true, "stationSchema": true, "settings": true, "help": true, "authorization": true },
    "createdAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": "2",
    "username": "operator",
    "displayName": "Jan Kowalski",
    "role": "operator",
    "active": true,
    "permissions": { "overview": true, "results": true, "config": false, "deviceStatus": true, "stationSchema": false, "settings": false, "help": true, "authorization": false }
  }
]
```

---

### `POST /api/users`
Create a new user.

**Request:**
```json
{
  "username": "newuser",
  "password": "securepass",
  "displayName": "New User",
  "role": "viewer",
  "active": true,
  "permissions": {
    "overview": true,
    "results": true,
    "config": false,
    "deviceStatus": false,
    "stationSchema": false,
    "settings": false,
    "help": true,
    "authorization": false
  }
}
```

**Response `201`:**
```json
{
  "id": "5",
  "username": "newuser",
  "displayName": "New User",
  "role": "viewer",
  "active": true
}
```

**Response `400`:**
```json
{ "statusCode": 400, "message": "username and password are required" }
```

**Response `409`:**
```json
{ "statusCode": 409, "message": "Username already exists" }
```

---

### `PUT /api/users/:id`
Update user data. All fields are optional.

**Request:**
```json
{
  "displayName": "Jan Nowak",
  "role": "operator",
  "active": true,
  "password": "newpassword123",
  "permissions": {
    "overview": true,
    "results": true,
    "config": true,
    "deviceStatus": true,
    "stationSchema": false,
    "settings": false,
    "help": true,
    "authorization": false
  }
}
```

**Response `200`:**
```json
{
  "id": "2",
  "username": "operator",
  "displayName": "Jan Nowak",
  "role": "operator",
  "active": true
}
```

**Response `404`:**
```json
{ "statusCode": 404, "message": "User not found" }
```

---

### `DELETE /api/users/:id`
Delete a user.

**Response `200`:**
```json
{ "success": true }
```

---

## Device

### `GET /api/device`
Data of the tested device (first record in the `devices` table).

**Response `200`:**
```json
{
  "id": "1",
  "model": "REM102",
  "articleNumber": "ART-2024-001",
  "productionNumber": "PROD-2024-001",
  "serialNo": "SN-12345",
  "rtoFile": "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

---

### `PUT /api/device`
Update device data. All fields are optional.

**Request:**
```json
{
  "model": "REM102",
  "articleNumber": "ART-2024-001",
  "productionNumber": "PROD-2024-042",
  "serialNo": "SN-67890",
  "rtoFile": "rem102_main.rtexe",
  "rtoRevision": "1.3.0"
}
```

**Response `200`:**
```json
{
  "id": "1",
  "model": "REM102",
  "serialNo": "SN-67890",
  "rtoRevision": "1.3.0"
}
```

---

### `GET /api/device/subsystems`
List of device subsystems.

**Response `200`:**
```json
[
  { "id": "1", "deviceId": "1", "name": "Power Supply Unit", "status": "ok", "description": "Main power supply" },
  { "id": "2", "deviceId": "1", "name": "Communication Module", "status": "ok", "description": "MVB module" },
  { "id": "3", "deviceId": "1", "name": "Safety Circuit", "status": "warning", "description": "Safety circuit" }
]
```

---

## Instruments

### `GET /api/instruments`
List of all measurement instruments.

**Response `200`:**
```json
[
  {
    "id": "1",
    "name": "Multimeter HP 34401A",
    "type": "DMM",
    "status": "online",
    "address": "GPIB0::22::INSTR",
    "manufacturer": "Hewlett-Packard",
    "model": "34401A",
    "serialNo": "MY12345678",
    "firmware": "10-5-2",
    "lastSeen": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "2",
    "name": "Power Supply Keysight E3631A",
    "type": "PSU",
    "status": "offline",
    "address": "GPIB0::5::INSTR",
    "manufacturer": "Keysight",
    "model": "E3631A",
    "serialNo": "US12345678",
    "firmware": "1.4",
    "lastSeen": "2024-01-14T16:00:00.000Z"
  }
]
```

---

### `PUT /api/instruments/:id`
Update instrument status (called by LabVIEW).

**Request:**
```json
{
  "status": "online",
  "firmware": "10-5-3",
  "lastSeen": "2024-01-15T10:35:00.000Z"
}
```

Available statuses: `online` | `offline` | `error` | `busy`

**Response `200`:**
```json
{
  "id": "1",
  "name": "Multimeter HP 34401A",
  "status": "online",
  "lastSeen": "2024-01-15T10:35:00.000Z"
}
```

---

## Session

### `GET /api/session`
Currently running test session (status = `running`) with steps.

**Response `200` (active session):**
```json
{
  "id": "7",
  "deviceId": "1",
  "serialNo": "SN-12345",
  "deviceModel": "REM102",
  "operator": "jkowalski",
  "status": "running",
  "startedAt": "2024-01-15T10:00:00.000Z",
  "finishedAt": null,
  "steps": [
    { "id": "1", "name": "Instrument initialization", "status": "ok",      "stepOrder": 1, "startedAt": "2024-01-15T10:00:05Z", "finishedAt": "2024-01-15T10:00:10Z", "message": null },
    { "id": "2", "name": "Input voltage test",        "status": "running", "stepOrder": 2, "startedAt": "2024-01-15T10:00:11Z", "finishedAt": null, "message": null },
    { "id": "3", "name": "Output current test",       "status": "pending", "stepOrder": 3, "startedAt": null, "finishedAt": null, "message": null }
  ]
}
```

**Response `200` (no active session):**
```json
null
```

---

## Test Sessions

### `GET /api/test-sessions/search`
Advanced search for historical test sessions (used by the Results DB page).

**Query params:**

| Param | Type | DB Column | Description |
|-------|------|-----------|-------------|
| `model` | string (ILIKE) | `devices.model` | Filter by device model |
| `articleNo` | string (ILIKE) | `devices.article_number` | Filter by article number |
| `articleRev` | string (exact) | `devices.article_revision` | Filter by article revision |
| `articleName` | string (ILIKE) | `devices.article_name` | Filter by article name |
| `serialNo` | string (ILIKE) | `devices.serial_no` | Filter by serial number |
| `operator` | string (ILIKE) | `test_sessions.operator` | Filter by operator |
| `rtoName` | string (ILIKE) | `rto_documents.name` | Filter by RTO document name |
| `status` | string | `test_sessions.overall_status` | Filter by status: `running\|passed\|failed\|aborted` |
| `stepResult` | string | EXISTS on `test_results` | Filter by step result: `ok\|fail\|skip` |
| `dateFrom` | ISO date | `test_sessions.start_time >=` | Start date |
| `dateTo` | ISO date | `test_sessions.start_time <=` | End date |
| `limit` | number | 20 | Results per page (max 100) |
| `offset` | number | 0 | Pagination offset |

**Response `200`:**
```json
{
  "total": 87,
  "items": [
    {
      "id": "42",
      "startTime": "2026-04-09T10:35:22.000Z",
      "finishedAt": "2026-04-09T11:05:44.000Z",
      "operator": "operator",
      "overallStatus": "failed",
      "model": "REM102-G-G-S-T-W-8-GS-O-000",
      "articleNumber": "5.6602.013/01",
      "articleRevision": "A00",
      "articleName": "REM102 Main Controller",
      "serialNo": "21292853",
      "rtoName": "5.2901.047J01",
      "rtoRevision": "A51",
      "stepsOk": 4,
      "stepsFail": 1,
      "stepsSkip": 0,
      "stepsTotal": 5
    }
  ]
}
```

---

### `GET /api/test-sessions`
List of test sessions with pagination.

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | number | 50 | Number of results |
| `offset` | number | 0 | Pagination offset |
| `status` | string | — | Filter: `running\|passed\|failed\|aborted` |

**Response `200`:**
```json
{
  "total": 142,
  "items": [
    {
      "id": "7",
      "deviceId": "1",
      "serialNo": "SN-12345",
      "deviceModel": "REM102",
      "operator": "jkowalski",
      "status": "passed",
      "startedAt": "2024-01-15T10:00:00.000Z",
      "finishedAt": "2024-01-15T10:45:00.000Z"
    }
  ]
}
```

---

### `POST /api/test-sessions`
Start a new test session. Automatically aborts (`aborted`) any active session.

**Request:**
```json
{
  "deviceId": 1,
  "operator": "jkowalski"
}
```

**Response `200`:**
```json
{
  "id": "8",
  "status": "running",
  "startedAt": "2024-01-15T11:00:00.000Z"
}
```

---

### `GET /api/test-sessions/:id`
Session details including steps and results.

**Response `200`:**
```json
{
  "id": "7",
  "deviceId": "1",
  "serialNo": "SN-12345",
  "deviceModel": "REM102",
  "operator": "jkowalski",
  "status": "passed",
  "startedAt": "2024-01-15T10:00:00.000Z",
  "finishedAt": "2024-01-15T10:45:00.000Z",
  "steps": [
    { "id": "1", "name": "Initialization", "status": "ok", "stepOrder": 1, "message": null }
  ],
  "results": [
    {
      "id": "12",
      "testName": "Voltage Check",
      "status": "ok",
      "measuredAt": "2024-01-15T10:05:00.000Z",
      "params": [
        { "name": "V_in", "value": "24.1", "unit": "V", "low": 23.0, "high": 25.0, "status": "ok" }
      ]
    }
  ]
}
```

---

### `PUT /api/test-sessions/:id`
Finish a test session.

**Request:**
```json
{ "status": "passed" }
```

Available statuses: `passed` | `failed` | `aborted`

**Response `200`:**
```json
{
  "id": "7",
  "status": "passed",
  "startedAt": "2024-01-15T10:00:00.000Z",
  "finishedAt": "2024-01-15T10:45:00.000Z"
}
```

---

## Test Steps

### `GET /api/test-steps`
List of steps for a given session.

**Query params:** `sessionId` (required)

**Response `200`:**
```json
[
  { "id": "1", "sessionId": "7", "name": "Instrument initialization", "status": "ok",      "stepOrder": 1, "startedAt": "...", "finishedAt": "...", "message": null },
  { "id": "2", "sessionId": "7", "name": "Input voltage test",        "status": "running", "stepOrder": 2, "startedAt": "...", "finishedAt": null,  "message": null },
  { "id": "3", "sessionId": "7", "name": "Output current test",       "status": "pending", "stepOrder": 3, "startedAt": null,  "finishedAt": null,  "message": null }
]
```

---

### `PUT /api/test-steps/:id`
Update step status (called by LabVIEW).

**Request:**
```json
{
  "status": "ok",
  "message": "Voltage within limits",
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z"
}
```

Available statuses: `pending` | `running` | `ok` | `fail` | `skip`

**Response `200`:**
```json
{
  "id": "2",
  "sessionId": "7",
  "name": "Input voltage test",
  "status": "ok",
  "stepOrder": 2,
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z",
  "message": "Voltage within limits"
}
```

---

## Test Results

### `GET /api/test-results`
List of results with parameters.

**Query params:**

| Param | Description |
|-------|-------------|
| `sessionId` | Filter by session (optional) |
| `limit` | Default 100 |
| `offset` | Default 0 |

**Response `200`:**
```json
[
  {
    "id": "12",
    "sessionId": "7",
    "testName": "Voltage Check",
    "status": "ok",
    "measuredAt": "2024-01-15T10:05:00.000Z",
    "params": [
      { "name": "V_in",  "value": "24.1",  "unit": "V", "lowLimit": 23.0, "highLimit": 25.0, "status": "ok" },
      { "name": "V_out", "value": "12.05", "unit": "V", "lowLimit": 11.8, "highLimit": 12.2, "status": "ok" }
    ]
  }
]
```

---

### `POST /api/test-results`
Add a measurement result with parameters and logs (called by LabVIEW).

**Request:**
```json
{
  "sessionId": 7,
  "testName": "Current Measurement",
  "status": "fail",
  "measuredAt": "2024-01-15T10:10:00.000Z",
  "params": [
    { "name": "I_out", "value": "2.85", "unit": "A", "lowLimit": 1.0, "highLimit": 2.5, "status": "fail" },
    { "name": "P_out", "value": "34.2", "unit": "W", "lowLimit": 0.0, "highLimit": 30.0, "status": "fail" }
  ],
  "logs": [
    { "level": "info",  "message": "Output current measurement" },
    { "level": "warn",  "message": "I_out = 2.85 A – above limit 2.5 A" },
    { "level": "error", "message": "FAIL – current limit exceeded" }
  ]
}
```

**Response `200`:**
```json
{
  "id": "13",
  "status": "fail",
  "measuredAt": "2024-01-15T10:10:00.000Z"
}
```

---

### `GET /api/test-results/:id`
Result details with full logs.

**Response `200`:**
```json
{
  "id": "13",
  "sessionId": "7",
  "testName": "Current Measurement",
  "status": "fail",
  "measuredAt": "2024-01-15T10:10:00.000Z",
  "params": [
    { "name": "I_out", "value": "2.85", "unit": "A", "lowLimit": 1.0, "highLimit": 2.5, "status": "fail" }
  ],
  "logs": [
    { "level": "info",  "message": "Output current measurement",     "ts": "2024-01-15T10:10:00.100Z" },
    { "level": "warn",  "message": "I_out = 2.85 A – above limit",   "ts": "2024-01-15T10:10:01.200Z" },
    { "level": "error", "message": "FAIL – limit exceeded",          "ts": "2024-01-15T10:10:01.500Z" }
  ]
}
```

---

### `PUT /api/test-results/:id`
Update status or append a live log.

**Request — status change:**
```json
{ "status": "ok" }
```

**Request — append log:**
```json
{
  "log": {
    "level": "info",
    "message": "Retry #2 – measurement repeated",
    "ts": "2024-01-15T10:10:05.000Z"
  }
}
```

**Response `200`:**
```json
{ "success": true }
```

---

## RTO Documents

RTO (Routine Test Overview) documents — test procedure definitions sent from LabVIEW.

### `GET /api/rto-documents`
List of all RTO documents (without raw JSON blob).

**Response `200`:**
```json
[
  {
    "id": "1",
    "name": "5.2901.047J01",
    "revision": "A51",
    "description": "REMview Routine Test",
    "metrics": { "frequency": "16Hz", "voltage": "230V" },
    "createdAt": "2026-04-09T10:00:00.000Z",
    "updatedAt": "2026-04-09T10:00:00.000Z"
  }
]
```

---

### `POST /api/rto-documents`
Upsert an RTO document from LabVIEW (creates or updates by name + revision).  
Re-seeds identifiers and steps (delete + insert).

**Request (raw LabVIEW format):**
```json
{
  "DocumentName": "5.2901.047J01",
  "Revision": "A51",
  "Description": "REMview Routine Test",
  "Metrics": { "frequency": "16Hz" },
  "REM102": {
    "Identifier": [
      { "Key": "ArticleNumber", "Value": "5.6602.013/01" }
    ],
    "Steps": [
      {
        "StepID": "4.7",
        "StepLabel": "4.7_AC_16Hz_Cal.vi",
        "StepName": "AC 16 Hz Calibration",
        "StepDetails": "...",
        "RTP100Index": 3
      }
    ]
  }
}
```

**Response `200`:**
```json
{
  "id": "1",
  "name": "5.2901.047J01",
  "revision": "A51",
  "identifiersCount": 5,
  "stepsCount": 12
}
```

---

### `GET /api/rto-documents/:id`
Document details with identifiers and steps.  
`?raw=1` includes the raw LabVIEW JSON blob.

**Response `200`:**
```json
{
  "id": "1",
  "name": "5.2901.047J01",
  "revision": "A51",
  "description": "REMview Routine Test",
  "metrics": { "frequency": "16Hz" },
  "identifiers": [
    { "id": "1", "key": "ArticleNumber", "value": "5.6602.013/01" }
  ],
  "steps": [
    {
      "id": "1",
      "stepId": "4.7",
      "stepLabel": "4.7_AC_16Hz_Cal.vi",
      "stepName": "AC 16 Hz Calibration",
      "stepDetails": "...",
      "rtp100Index": 3,
      "stepOrder": 1
    }
  ],
  "rawJson": null
}
```

---

## Accuracy Tests

Accuracy test results linked to test results, sent from LabVIEW.

### `POST /api/accuracy-tests`
Add a full accuracy test with measurement points (called by LabVIEW).

**Request:**
```json
{
  "testResultId": 13,
  "deviceUnderTest": {
    "ArticleNumber": "5.6602.013/01",
    "SerialNumber": "21292853",
    "Revision": "A00"
  },
  "interfaceDetails": {
    "InterfaceType": "MVB",
    "Address": "0x10"
  },
  "referenceInstrument": {
    "Model": "Norma 5000",
    "SerialNumber": "N5K-12345",
    "CalibrationDate": "2025-12-01"
  },
  "testInformation": {
    "EnergyType": "EA",
    "MeasurementType": "DC",
    "ReadingID": "CEBD",
    "Frequency": 16,
    "Voltage": 230.0
  },
  "testResults": [
    {
      "NominalValue": 1000.0,
      "ReferenceValue": 999.8,
      "DUTReading": 999.5,
      "DUTError_pct": -0.03,
      "AppliedLimit_pct": 0.5,
      "ErrorLimit_pct": 2.0,
      "Status": "ok"
    }
  ],
  "testNotes": "Conditions: 20°C, humidity 55%"
}
```

**Response `200`:**
```json
{
  "id": "5",
  "testResultId": "13",
  "energyType": "EA",
  "measurementType": "DC",
  "pointsCount": 12
}
```

---

### `GET /api/accuracy-tests/:id`
Full accuracy test data with all measurement points.

**Response `200`:**
```json
{
  "id": "5",
  "testResultId": "13",
  "energyType": "EA",
  "measurementType": "DC",
  "readingId": "CEBD",
  "frequency": 16,
  "voltage": 230.0,
  "dutArticleNumber": "5.6602.013/01",
  "dutSerialNumber": "21292853",
  "dutRevision": "A00",
  "refModel": "Norma 5000",
  "refSerialNumber": "N5K-12345",
  "refCalibrationDate": "2025-12-01",
  "interfaceType": "MVB",
  "interfaceAddress": "0x10",
  "testNotes": "Conditions: 20°C, humidity 55%",
  "createdAt": "2026-04-09T12:58:00.000Z",
  "points": [
    {
      "id": "101",
      "nominalValue": 1000.0,
      "referenceValue": 999.8,
      "dutReading": 999.5,
      "dutError": -0.03,
      "appliedLimit": 0.5,
      "errorLimit": 2.0,
      "pointStatus": "ok",
      "pointOrder": 1
    }
  ]
}
```

---

## Drawings

### `GET /api/drawings`
List of drawings without base64 data (lightweight — for navigation).

**Response `200`:**
```json
[
  { "id": "1", "name": "Station Schematic",  "description": "Main view",      "mimeType": "image/svg+xml", "hasImage": true,  "updatedAt": "2024-01-15T09:00:00.000Z" },
  { "id": "2", "name": "Power Schematic",    "description": "24V bus",         "mimeType": "image/png",     "hasImage": false, "updatedAt": "2024-01-01T00:00:00.000Z" }
]
```

---

### `GET /api/drawings/:id`
Drawing details **with base64 data**.

**Response `200`:**
```json
{
  "id": "1",
  "name": "Station Schematic",
  "description": "Main view of the test station",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnPjwvc3ZnPg==",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

> `imageBase64` is raw base64 **without the prefix** `data:image/...;base64,`

---

### `PUT /api/drawings/:id`
Upload or update a drawing (called by LabVIEW or an administrator).

**Request:**
```json
{
  "name": "Station Schematic v2",
  "description": "Updated view after modernization",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjwvc3ZnPg=="
}
```

**Response `200`:**
```json
{
  "id": "1",
  "name": "Station Schematic v2",
  "mimeType": "image/svg+xml",
  "hasImage": true,
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Module Configs

### `GET /api/module-configs`
List of NI module configurations.

**Query params:** `type` — optional filter: `hardware` | `software`

**Response `200`:**
```json
[
  {
    "id": "1",
    "name": "NI-9205 Analog Input",
    "type": "hardware",
    "slotIndex": 1,
    "config": {
      "channels": 32,
      "sampleRate": 250000,
      "range": "-10 to +10 V",
      "enabled": true
    },
    "updatedAt": "2024-01-15T08:00:00.000Z"
  },
  {
    "id": "8",
    "name": "Test Sequencer",
    "type": "software",
    "slotIndex": null,
    "config": {
      "version": "2.1.0",
      "timeout": 30000,
      "retries": 3,
      "enabled": true
    },
    "updatedAt": "2024-01-15T08:00:00.000Z"
  }
]
```

---

### `PUT /api/module-configs/:id`
Update module configuration.

**Request:**
```json
{
  "name": "NI-9205 Analog Input",
  "slotIndex": 1,
  "config": {
    "channels": 32,
    "sampleRate": 500000,
    "range": "-5 to +5 V",
    "enabled": true,
    "coupling": "DC"
  }
}
```

**Response `200`:**
```json
{
  "id": "1",
  "name": "NI-9205 Analog Input",
  "type": "hardware",
  "slotIndex": 1,
  "config": { "channels": 32, "sampleRate": 500000, "range": "-5 to +5 V", "enabled": true, "coupling": "DC" },
  "updatedAt": "2024-01-15T13:00:00.000Z"
}
```

---

## Settings

### `GET /api/settings`
All application settings as a key-value object.

**Response `200`:**
```json
{
  "language":       "pl",
  "theme":          "dark",
  "timezone":       "Europe/Warsaw",
  "sessionTimeout": "28800",
  "autoLogout":     "true",
  "stationName":    "Test Station #1"
}
```

---

### `PUT /api/settings`
Upsert settings — pass only the keys you want to change.

**Request:**
```json
{
  "language":    "en",
  "theme":       "light",
  "stationName": "Test Station #1"
}
```

**Response `200`:**
```json
{ "updated": 3 }
```

---

## Hostname (public)

### `GET /api/hostname`
LabVIEW server information. **Public endpoint — no authorization required.**

Used by `login.vue` every 5 seconds to check server availability.

**Response `200`:**
```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

**Response `503`** (LabVIEW unavailable — timeout or no response): no response / network error.

---

## Error Codes

| Code | Meaning |
|------|---------|
| `400` | Invalid input data (missing fields, wrong format) |
| `401` | Missing or invalid JWT token |
| `403` | Insufficient permissions for the resource |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate username) |
| `500` | Server / database error |

All errors have the format:
```json
{
  "statusCode": 404,
  "statusMessage": "Not Found",
  "message": "User not found"
}
```
