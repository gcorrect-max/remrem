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
Dodanie wyniku pomiaru z parametrami i logami (wywoływane przez LabVIEW).

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
    { "level": "info",  "message": "Pomiar prądu wyjściowego" },
    { "level": "warn",  "message": "I_out = 2.85 A – powyżej limitu 2.5 A" },
    { "level": "error", "message": "FAIL – przekroczony limit prądu" }
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
Szczegóły wyniku z pełnymi logami.

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
    { "level": "info",  "message": "Pomiar prądu wyjściowego",     "ts": "2024-01-15T10:10:00.100Z" },
    { "level": "warn",  "message": "I_out = 2.85 A – powyżej limitu", "ts": "2024-01-15T10:10:01.200Z" },
    { "level": "error", "message": "FAIL – przekroczony limit",    "ts": "2024-01-15T10:10:01.500Z" }
  ]
}
```

---

### `PUT /api/test-results/:id`
Aktualizacja statusu lub dołączenie logu na żywo.

**Request — zmiana statusu:**
```json
{ "status": "ok" }
```

**Request — dołączenie logu:**
```json
{
  "log": {
    "level": "info",
    "message": "Retry #2 – pomiar ponowiony",
    "ts": "2024-01-15T10:10:05.000Z"
  }
}
```

**Response `200`:**
```json
{ "success": true }
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
