# API Reference – Nuxt Nitro Server

Základní URL ve vývojovém prostředí: `http://localhost:3000`  
V produkci (LabVIEW Webservice): `http://<host>:<port>`

Všechny endpointy kromě `/api/hostname` a `/api/auth/login` vyžadují hlavičku:
```
Authorization: Bearer <jwt_token>
```

---

## Obsah

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
Přihlášení uživatele. Vrací JWT token.

**Hlavička Authorization není vyžadována.**

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
Odhlášení — smaže cookie `hasler-auth`.

**Response `200`:**
```json
{ "success": true }
```

---

## Users

### `GET /api/users`
Seznam všech uživatelů.

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
Vytvoření nového uživatele.

**Request:**
```json
{
  "username": "newuser",
  "password": "securepass",
  "displayName": "Nový uživatel",
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
  "displayName": "Nový uživatel",
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
Aktualizace údajů uživatele. Všechna pole jsou volitelná.

**Request:**
```json
{
  "displayName": "Jan Novák",
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
  "displayName": "Jan Novák",
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
Smazání uživatele.

**Response `200`:**
```json
{ "success": true }
```

---

## Device

### `GET /api/device`
Data testovaného zařízení (první záznam v tabulce `devices`).

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
Aktualizace dat zařízení. Všechna pole jsou volitelná.

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
Seznam subsystémů zařízení.

**Response `200`:**
```json
[
  { "id": "1", "deviceId": "1", "name": "Power Supply Unit", "status": "ok", "description": "Hlavní napájení" },
  { "id": "2", "deviceId": "1", "name": "Communication Module", "status": "ok", "description": "Modul MVB" },
  { "id": "3", "deviceId": "1", "name": "Safety Circuit", "status": "warning", "description": "Bezpečnostní obvod" }
]
```

---

## Instruments

### `GET /api/instruments`
Seznam všech měřicích přístrojů.

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
    "name": "Napájecí zdroj Keysight E3631A",
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
Aktualizace stavu přístroje (voláno systémem LabVIEW).

**Request:**
```json
{
  "status": "online",
  "firmware": "10-5-3",
  "lastSeen": "2024-01-15T10:35:00.000Z"
}
```

Dostupné stavy: `online` | `offline` | `error` | `busy`

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
Aktuálně spuštěná testovací relace (status = `running`) s kroky.

**Response `200` (aktivní relace):**
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
    { "id": "1", "name": "Inicializace přístrojů", "status": "ok",      "stepOrder": 1, "startedAt": "2024-01-15T10:00:05Z", "finishedAt": "2024-01-15T10:00:10Z", "message": null },
    { "id": "2", "name": "Test vstupního napětí",   "status": "running", "stepOrder": 2, "startedAt": "2024-01-15T10:00:11Z", "finishedAt": null, "message": null },
    { "id": "3", "name": "Test výstupního proudu",  "status": "pending", "stepOrder": 3, "startedAt": null, "finishedAt": null, "message": null }
  ]
}
```

**Response `200` (žádná aktivní relace):**
```json
null
```

---

## Test Sessions

### `GET /api/test-sessions`
Seznam testovacích relací se stránkováním.

**Query params:**

| Param | Typ | Výchozí | Popis |
|-------|-----|---------|-------|
| `limit` | number | 50 | Počet výsledků |
| `offset` | number | 0 | Offset stránkování |
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
Spuštění nové testovací relace. Automaticky přeruší (`aborted`) každou aktivní relaci.

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
Detail relace včetně kroků a výsledků.

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
    { "id": "1", "name": "Inicializace", "status": "ok", "stepOrder": 1, "message": null }
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
Ukončení testovací relace.

**Request:**
```json
{ "status": "passed" }
```

Dostupné stavy: `passed` | `failed` | `aborted`

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
Seznam kroků pro zadanou relaci.

**Query params:** `sessionId` (povinné)

**Response `200`:**
```json
[
  { "id": "1", "sessionId": "7", "name": "Inicializace přístrojů", "status": "ok",      "stepOrder": 1, "startedAt": "...", "finishedAt": "...", "message": null },
  { "id": "2", "sessionId": "7", "name": "Test vstupního napětí",  "status": "running", "stepOrder": 2, "startedAt": "...", "finishedAt": null,  "message": null },
  { "id": "3", "sessionId": "7", "name": "Test výstupního proudu", "status": "pending", "stepOrder": 3, "startedAt": null,  "finishedAt": null,  "message": null }
]
```

---

### `PUT /api/test-steps/:id`
Aktualizace stavu kroku (voláno systémem LabVIEW).

**Request:**
```json
{
  "status": "ok",
  "message": "Napětí v normě",
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z"
}
```

Dostupné stavy: `pending` | `running` | `ok` | `fail` | `skip`

**Response `200`:**
```json
{
  "id": "2",
  "sessionId": "7",
  "name": "Test vstupního napětí",
  "status": "ok",
  "stepOrder": 2,
  "startedAt": "2024-01-15T10:01:00.000Z",
  "finishedAt": "2024-01-15T10:05:30.000Z",
  "message": "Napětí v normě"
}
```

---

## Test Results

### `GET /api/test-results`
Seznam výsledků s parametry.

**Query params:**

| Param | Popis |
|-------|-------|
| `sessionId` | Filtr podle relace (volitelný) |
| `limit` | Výchozí 100 |
| `offset` | Výchozí 0 |

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
Přidání výsledku měření s parametry a logy (voláno systémem LabVIEW).

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
    { "level": "info",  "message": "Měření výstupního proudu" },
    { "level": "warn",  "message": "I_out = 2.85 A – překročen limit 2.5 A" },
    { "level": "error", "message": "FAIL – překročen proudový limit" }
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
Detail výsledku s kompletními logy.

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
    { "level": "info",  "message": "Měření výstupního proudu",      "ts": "2024-01-15T10:10:00.100Z" },
    { "level": "warn",  "message": "I_out = 2.85 A – překročen limit", "ts": "2024-01-15T10:10:01.200Z" },
    { "level": "error", "message": "FAIL – překročen limit",         "ts": "2024-01-15T10:10:01.500Z" }
  ]
}
```

---

### `PUT /api/test-results/:id`
Aktualizace stavu nebo připojení logu za běhu.

**Request — změna stavu:**
```json
{ "status": "ok" }
```

**Request — připojení logu:**
```json
{
  "log": {
    "level": "info",
    "message": "Retry #2 – měření opakováno",
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
Seznam výkresů bez dat base64 (lehký endpoint — pro navigaci).

**Response `200`:**
```json
[
  { "id": "1", "name": "Schéma stanice",    "description": "Hlavní pohled",    "mimeType": "image/svg+xml", "hasImage": true,  "updatedAt": "2024-01-15T09:00:00.000Z" },
  { "id": "2", "name": "Schéma napájení",   "description": "Sběrnice 24V",     "mimeType": "image/png",     "hasImage": false, "updatedAt": "2024-01-01T00:00:00.000Z" }
]
```

---

### `GET /api/drawings/:id`
Detail výkresu **s daty base64**.

**Response `200`:**
```json
{
  "id": "1",
  "name": "Schéma stanice",
  "description": "Hlavní pohled testovací stanice",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnPjwvc3ZnPg==",
  "updatedAt": "2024-01-15T09:00:00.000Z"
}
```

> `imageBase64` je surový base64 **bez prefixu** `data:image/...;base64,`

---

### `PUT /api/drawings/:id`
Nahrání nebo aktualizace výkresu (voláno systémem LabVIEW nebo správcem).

**Request:**
```json
{
  "name": "Schéma stanice v2",
  "description": "Aktualizovaný pohled po modernizaci",
  "mimeType": "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnPjwvc3ZnPg=="
}
```

**Response `200`:**
```json
{
  "id": "1",
  "name": "Schéma stanice v2",
  "mimeType": "image/svg+xml",
  "hasImage": true,
  "updatedAt": "2024-01-15T12:00:00.000Z"
}
```

---

## Module Configs

### `GET /api/module-configs`
Seznam konfigurací modulů NI.

**Query params:** `type` — volitelný filtr: `hardware` | `software`

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
Aktualizace konfigurace modulu.

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
Všechna nastavení aplikace jako objekt klíč-hodnota.

**Response `200`:**
```json
{
  "language":       "cs",
  "theme":          "dark",
  "timezone":       "Europe/Prague",
  "sessionTimeout": "28800",
  "autoLogout":     "true",
  "stationName":    "Testovací stanice #1"
}
```

---

### `PUT /api/settings`
Upsert nastavení — předejte pouze klíče, které chcete změnit.

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
Informace o serveru LabVIEW. **Veřejný endpoint — autorizace není vyžadována.**

Používá ho `login.vue` každých 5 sekund ke kontrole dostupnosti serveru.

**Response `200`:**
```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

**Response `503`** (LabVIEW nedostupný — timeout nebo žádná odpověď): žádná odpověď / chyba sítě.

---

## Chybové kódy

| Kód | Význam |
|-----|--------|
| `400` | Neplatná vstupní data (chybějící pole, špatný formát) |
| `401` | Chybějící nebo neplatný JWT token |
| `403` | Nedostatečná oprávnění k prostředku |
| `404` | Prostředek nebyl nalezen |
| `409` | Konflikt (např. duplicitní username) |
| `500` | Chyba serveru / databáze |

Všechny chyby mají formát:
```json
{
  "statusCode": 404,
  "statusMessage": "Not Found",
  "message": "User not found"
}
```
