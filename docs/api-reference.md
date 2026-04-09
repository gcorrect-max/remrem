# API Reference – Nuxt Nitro Server

Bazowy URL w środowisku deweloperskim: `http://localhost:3000`  
W produkcji (LabVIEW Webservice): `http://<host>:<port>`

Wszystkie endpointy poza `/api/hostname` i `/api/auth/login` wymagają nagłówka:
```
Authorization: Bearer <jwt_token>
```

---

## Spis treści

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
Logowanie użytkownika. Zwraca JWT token.

**Brak wymaganego nagłówka Authorization.**

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
Wylogowanie — usuwa cookie `hasler-auth`.

**Response `200`:**
```json
{ "success": true }
```

---

## Users

### `GET /api/users`
Lista wszystkich użytkowników.

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
Tworzenie nowego użytkownika.

**Request:**
```json
{
  "username": "newuser",
  "password": "securepass",
  "displayName": "Nowy Użytkownik",
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
  "displayName": "Nowy Użytkownik",
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
Aktualizacja danych użytkownika. Wszystkie pola opcjonalne.

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
Usunięcie użytkownika.

**Response `200`:**
```json
{ "success": true }
```

---

## Device

### `GET /api/device`
Dane testowanego urządzenia (pierwszy rekord w tabeli `devices`).

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
Aktualizacja danych urządzenia. Wszystkie pola opcjonalne.

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
Lista podsystemów urządzenia.

**Response `200`:**
```json
[
  { "id": "1", "deviceId": "1", "name": "Power Supply Unit", "status": "ok", "description": "Zasilacz główny" },
  { "id": "2", "deviceId": "1", "name": "Communication Module", "status": "ok", "description": "Moduł MVB" },
  { "id": "3", "deviceId": "1", "name": "Safety Circuit", "status": "warning", "description": "Obwód bezpieczeństwa" }
]
```

---

## Instruments

### `GET /api/instruments`
Lista wszystkich przyrządów pomiarowych.

**Response `200`:**
```json
[
  {
    "id": "1",
    "name": "Multimetr HP 34401A",
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
    "name": "Zasilacz Keysight E3631A",
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
Aktualizacja statusu przyrządu (wywoływane przez LabVIEW).

**Request:**
```json
{
  "status": "online",
  "firmware": "10-5-3",
  "lastSeen": "2024-01-15T10:35:00.000Z"
}
```

Dostępne statusy: `online` | `offline` | `error` | `busy`

**Response `200`:**
```json
{
  "id": "1",
  "name": "Multimetr HP 34401A",
  "status": "online",
  "lastSeen": "2024-01-15T10:35:00.000Z"
}
```

---

## Session

### `GET /api/session`
Aktualnie uruchomiona sesja testowa (status = `running`) z krokami.

**Response `200` (sesja aktywna):**
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
    { "id": "1", "name": "Inicjalizacja przyrządów", "status": "ok",      "stepOrder": 1, "startedAt": "2024-01-15T10:00:05Z", "finishedAt": "2024-01-15T10:00:10Z", "message": null },
    { "id": "2", "name": "Test napięcia wejściowego",  "status": "running", "stepOrder": 2, "startedAt": "2024-01-15T10:00:11Z", "finishedAt": null, "message": null },
    { "id": "3", "name": "Test prądu wyjściowego",     "status": "pending", "stepOrder": 3, "startedAt": null, "finishedAt": null, "message": null }
  ]
}
```

**Response `200` (brak aktywnej sesji):**
```json
null
```

---

## Test Sessions

### `GET /api/test-sessions/search`
Zaawansowane wyszukiwanie historycznych sesji testowych (używane przez stronę Results DB).

**Query params:**

| Param | Typ | Kolumna DB | Opis |
|-------|-----|------------|------|
| `model` | string (ILIKE) | `devices.model` | Filtr po modelu urządzenia |
| `articleNo` | string (ILIKE) | `devices.article_number` | Filtr po numerze artykułu |
| `articleRev` | string (dokładny) | `devices.article_revision` | Filtr po rewizji artykułu |
| `articleName` | string (ILIKE) | `devices.article_name` | Filtr po nazwie artykułu |
| `serialNo` | string (ILIKE) | `devices.serial_no` | Filtr po numerze seryjnym |
| `operator` | string (ILIKE) | `test_sessions.operator` | Filtr po operatorze |
| `rtoName` | string (ILIKE) | `rto_documents.name` | Filtr po nazwie dokumentu RTO |
| `status` | string | `test_sessions.overall_status` | Filtr po statusie: `running\|passed\|failed\|aborted` |
| `stepResult` | string | EXISTS na `test_results` | Filtr po wyniku kroku: `ok\|fail\|skip` |
| `dateFrom` | ISO date | `test_sessions.start_time >=` | Data początkowa |
| `dateTo` | ISO date | `test_sessions.start_time <=` | Data końcowa |
| `limit` | number | 20 | Liczba wyników na stronę (max 100) |
| `offset` | number | 0 | Offset paginacji |

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
Lista sesji testowych z paginacją.

**Query params:**

| Param | Typ | Domyślnie | Opis |
|-------|-----|-----------|------|
| `limit` | number | 50 | Liczba wyników |
| `offset` | number | 0 | Offset paginacji |
| `status` | string | — | Filtr: `running\|passed\|failed\|aborted` |

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
Uruchomienie nowej sesji testowej. Automatycznie przerywa (`aborted`) każdą aktywną sesję.

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
Szczegóły sesji wraz z krokami i wynikami.

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
    { "id": "1", "name": "Inicjalizacja", "status": "ok", "stepOrder": 1, "message": null }
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
Zakończenie sesji testowej.

**Request:**
```json
{ "status": "passed" }
```

Dostępne statusy: `passed` | `failed` | `aborted`

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
Lista kroków dla podanej sesji.

**Query params:** `sessionId` (wymagane)

**Response `200`:**
```json
[
  { "id": "1", "sessionId": "7", "name": "Inicjalizacja przyrządów", "status": "ok",      "stepOrder": 1, "startedAt": "...", "finishedAt": "...", "message": null },
  { "id": "2", "sessionId": "7", "name": "Test napięcia wejściowego",  "status": "running", "stepOrder": 2, "startedAt": "...", "finishedAt": null,  "message": null },
  { "id": "3", "sessionId": "7", "name": "Test prądu wyjściowego",     "status": "pending", "stepOrder": 3, "startedAt": null,  "finishedAt": null,  "message": null }
]
```

---

### `PUT /api/test-steps/:id`
Aktualizacja statusu kroku (wywoływane przez LabVIEW).

**Request:**
```json
{
  "status": "ok",
  "message": "Napięcie w normie",
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z"
}
```

Dostępne statusy: `pending` | `running` | `ok` | `fail` | `skip`

**Response `200`:**
```json
{
  "id": "2",
  "sessionId": "7",
  "name": "Test napięcia wejściowego",
  "status": "ok",
  "stepOrder": 2,
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z",
  "message": "Napięcie w normie"
}
```

---

## Test Results

### `GET /api/test-results`
Lista wyników z parametrami.

**Query params:**

| Param | Opis |
|-------|------|
| `sessionId` | Filtr po sesji (opcjonalny) |
| `limit` | Domyślnie 100 |
| `offset` | Domyślnie 0 |

**Response `200`:**
```json
[
  {
    "id": "12",
    "sessionId": "7",
    "stepId": "4.7",
    "stepLabel": "4.7_AC_16Hz_Cal.vi",
    "stepName": "Kalibracja AC 16 Hz",
    "stepStart": "2026-04-09T12:53:22.000Z",
    "stepStop":  "2026-04-09T12:55:34.000Z",
    "result": "ok",
    "finished": true,
    "params": [
      { "name": "V_in", "value": "24.1", "unit": "V", "lowLimit": 23.0, "highLimit": 25.0, "status": "ok" }
    ]
  }
]
```

---

### `POST /api/test-results`
Dodanie wyniku pomiaru z parametrami i logami (wywoływane przez LabVIEW).

**Request:**
```json
{
  "sessionId":      7,
  "stepId":         "4.7",
  "stepLabel":      "4.7_AC_16Hz_Cal.vi",
  "stepName":       "Kalibracja AC 16 Hz",
  "stepDetails":    "Pomiar napięcia wejściowego",
  "stepStart":      "2026-04-09T12:53:22.000Z",
  "stepStop":       "2026-04-09T12:55:34.000Z",
  "result":         "ok",
  "finished":       true,
  "rtp100Index":    3,
  "bookmarkValues": { "U_in": 24.1, "I_out": 2.5 },
  "actions":        [{ "type": "relay", "id": "K1", "state": true }],
  "jsonReport":     { "raw": "..." },
  "params": [
    { "name": "V_in", "value": "24.1", "unit": "V", "lowLimit": 23.0, "highLimit": 25.0, "status": "ok" }
  ],
  "logs": [
    { "level": "info",  "message": "Pomiar napięcia wejściowego" },
    { "level": "warn",  "message": "V_in = 24.1 V – w normie" }
  ]
}
```

**Response `200`:**
```json
{
  "id": "13",
  "result": "ok",
  "createdAt": "2026-04-09T12:55:34.000Z"
}
```

---

### `GET /api/test-results/:id`
Szczegóły wyniku z pełnymi logami, wartościami zakładek i raportami.

**Response `200`:**
```json
{
  "id": "13",
  "sessionId": "7",
  "stepId": "4.8",
  "stepLabel": "4.8_DC_Accuracy.vi",
  "stepName": "Test dokładności DC",
  "stepDetails": "Pomiar błędu wskazania",
  "stepStart": "2026-04-09T12:55:40.000Z",
  "stepStop":  "2026-04-09T12:59:11.000Z",
  "result": "fail",
  "finished": true,
  "rtp100Index": 4,
  "bookmarkValues": { "U_ref": 230.0, "U_dut": 229.5, "error_pct": -0.22 },
  "actions": [],
  "jsonReport": { "raw": "..." },
  "params": [
    { "name": "Error_%", "value": "-0.22", "unit": "%", "lowLimit": -0.5, "highLimit": 0.5, "status": "ok" }
  ],
  "logs": [
    { "level": "info",  "message": "Start pomiaru", "ts": "2026-04-09T12:55:40.100Z" },
    { "level": "error", "message": "Błąd przekroczony", "ts": "2026-04-09T12:59:10.500Z" }
  ],
  "accuracyTests": [
    { "id": "5", "energyType": "EA", "measurementType": "DC", "createdAt": "2026-04-09T12:58:00Z" }
  ]
}
```

---

### `PUT /api/test-results/:id`
Aktualizacja statusu lub dołączenie logu na żywo.

**Request — zmiana statusu:**
```json
{ "result": "ok", "finished": true, "rtp100Index": 5 }
```

**Request — dołączenie logu:**
```json
{
  "log": {
    "level": "info",
    "message": "Retry #2 – pomiar ponowiony",
    "ts": "2026-04-09T12:59:05.000Z"
  }
}
```

**Response `200`:**
```json
{ "success": true }
```

---

## RTO Documents

Dokumenty RTO (Routine Test Overview) — definicje procedur testowych przesyłane z LabVIEW.

### `GET /api/rto-documents`
Lista dokumentów RTO (bez surowego JSON).

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
Upsert dokumentu RTO z LabVIEW (tworzy lub aktualizuje po nazwie + rewizji).  
Re-seeduje identyfikatory i kroki (delete + insert).

**Request (surowy format LabVIEW):**
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
        "StepName": "Kalibracja AC 16 Hz",
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
Szczegóły dokumentu z identyfikatorami i krokami.  
Parametr `?raw=1` dołącza surowy JSON z LabVIEW.

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
      "stepName": "Kalibracja AC 16 Hz",
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

Wyniki testów dokładności (z LabVIEW, powiązane z wynikami testów).

### `POST /api/accuracy-tests`
Dodanie pełnego testu dokładności z punktami pomiarowymi (wywoływane przez LabVIEW).

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
  "testNotes": "Warunki: 20°C, wilgotność 55%"
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
Pełne dane testu dokładności z punktami pomiarowymi.

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
  "testNotes": "Warunki: 20°C, wilgotność 55%",
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
Lista rysunków bez danych base64 (lekkie — do nawigacji).

**Response `200`:**
```json
[
  { "id": "1", "name": "Schemat stacji",    "description": "Widok główny",    "mimeType": "image/svg+xml", "hasImage": true,  "updatedAt": "2024-01-15T09:00:00.000Z" },
  { "id": "2", "name": "Schemat zasilania", "description": "Magistrala 24V",  "mimeType": "image/png",     "hasImage": false, "updatedAt": "2024-01-01T00:00:00.000Z" }
]
```

---

### `GET /api/drawings/:id`
Szczegóły rysunku **z danymi base64**.

**Response `200`:**
```json
{
  "id": "1",
  "name": "Schemat stacji",
  "description": "Widok główny stacji testowej",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnPjwvc3ZnPg==",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

> `imageBase64` to surowy base64 **bez prefiksu** `data:image/...;base64,`

---

### `PUT /api/drawings/:id`
Wgranie lub aktualizacja rysunku (wywoływane przez LabVIEW lub administratora).

**Request:**
```json
{
  "name": "Schemat stacji v2",
  "description": "Zaktualizowany widok po modernizacji",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjwvc3ZnPg=="
}
```

**Response `200`:**
```json
{
  "id": "1",
  "name": "Schemat stacji v2",
  "mimeType": "image/svg+xml",
  "hasImage": true,
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Module Configs

### `GET /api/module-configs`
Lista konfiguracji modułów NI.

**Query params:** `type` — opcjonalny filtr: `hardware` | `software`

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
Aktualizacja konfiguracji modułu.

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
Wszystkie ustawienia aplikacji jako obiekt klucz-wartość.

**Response `200`:**
```json
{
  "language":       "pl",
  "theme":          "dark",
  "timezone":       "Europe/Warsaw",
  "sessionTimeout": "28800",
  "autoLogout":     "true",
  "stationName":    "Stacja Testowa #1"
}
```

---

### `PUT /api/settings`
Upsert ustawień — przekaż tylko klucze które chcesz zmienić.

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
Informacje o serwerze LabVIEW. **Endpoint publiczny — brak wymaganej autoryzacji.**

Używany przez `login.vue` co 5 sekund do sprawdzenia dostępności serwera.

**Response `200`:**
```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

**Response `503`** (LabVIEW niedostępny — timeout lub brak odpowiedzi): brak odpowiedzi / błąd sieci.

---

## Kody błędów

| Kod | Znaczenie |
|-----|-----------|
| `400` | Nieprawidłowe dane wejściowe (brakujące pola, zły format) |
| `401` | Brak lub nieważny token JWT |
| `403` | Brak uprawnień do zasobu |
| `404` | Zasób nie znaleziony |
| `409` | Konflikt (np. duplikat username) |
| `500` | Błąd serwera / bazy danych |

Wszystkie błędy mają format:
```json
{
  "statusCode": 404,
  "statusMessage": "Not Found",
  "message": "User not found"
}
```
