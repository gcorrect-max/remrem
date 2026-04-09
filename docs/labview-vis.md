# LabVIEW VIs – Dokumentacja implementacji

Opis wszystkich Virtual Instruments (VI) które muszą być zaimplementowane po stronie LabVIEW Application, aby integracja z REMview v3 działała poprawnie.

---

## Spis treści

- [Architektura LabVIEW](#architektura-labview)
- [VIs wystawiane przez LabVIEW](#vis-wystawiane-przez-labview)
  - [VI 1: GET /api/hostname](#vi-1-get-apihostname)
  - [VI 2: WebSocket /ws](#vi-2-websocket-ws)
- [VIs wywołujące Nitro REST API](#vis-wywołujące-nitro-rest-api)
  - [VI 3: Auth Login](#vi-3-auth-login)
  - [VI 4: Start Session](#vi-4-start-session)
  - [VI 5: Finish Session](#vi-5-finish-session)
  - [VI 6: Update Step Status](#vi-6-update-step-status)
  - [VI 7: Add Test Result](#vi-7-add-test-result)
  - [VI 8: Append Result Log](#vi-8-append-result-log)
  - [VI 9: Update Instrument Status](#vi-9-update-instrument-status)
  - [VI 10: Upload Drawing](#vi-10-upload-drawing)
- [Konfiguracja HTTP Client](#konfiguracja-http-client)
- [Obsługa błędów](#obsługa-błędów)
- [Sugerowana kolejność wywołań](#sugerowana-kolejność-wywołań)

---

## Architektura LabVIEW

```
LabVIEW Application
├── Webservice VIs (wystawiane)
│   ├── VI 1: GET /api/hostname
│   └── VI 2: WebSocket /ws
│
├── HTTP Client VIs (wywołujące Nitro)
│   ├── VI 3: Auth Login  ─────────── wywołaj przy starcie RTO
│   ├── VI 4: Start Session ────────── wywołaj gdy test startuje
│   ├── VI 5: Finish Session ───────── wywołaj gdy test kończy
│   ├── VI 6: Update Step ──────────── wywołaj przy każdej zmianie kroku
│   ├── VI 7: Add Test Result ──────── wywołaj po każdym pomiarze
│   ├── VI 8: Append Result Log ────── wywołaj dla logów na żywo
│   └── VI 9: Update Instrument ────── wywołaj gdy zmienia się status przyrządu
│
└── Startup VI
    └── VI 10: Upload Drawing ──────── wywołaj jednorazowo przy starcie RTO
```

Token JWT uzyskany w VI 3 (Auth Login) musi być przechowywany jako **Global Variable** lub **Functional Global** i przekazywany do wszystkich pozostałych VI HTTP.

---

## VIs wystawiane przez LabVIEW

### VI 1: GET /api/hostname

**Cel:** Udostępnienie informacji o urządzeniu i RTO. Wywoływany przez frontend co 5 sekund do sprawdzenia dostępności serwera.

**Typ VI:** HTTP GET Handler (NI Web Service)

**URL:** `GET /api/hostname`

**Brak autoryzacji** — endpoint publiczny.

#### Dane wejściowe (parametry URL)
Brak parametrów.

#### Dane wyjściowe (Response Body – JSON)

```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

| Pole | Typ LabVIEW | Źródło |
|------|-------------|--------|
| `hostname` | String | `Get Computer Name.vi` lub ENV variable |
| `model` | String | Stała w VI lub plik konfiguracyjny |
| `rtoFile` | String | Nazwa pliku `.rtexe` bieżącego projektu |
| `rtoRevision` | String | Stała wersja wkompilowana w RTO |

#### Implementacja (G-code pseudokod)
```
1. Buduj JSON string (JSON Build Object):
   - "hostname"    ← Get Computer Name
   - "model"       ← stała "REM102"
   - "rtoFile"     ← stała "rem102_main.rtexe"
   - "rtoRevision" ← stała "1.2.3"

2. HTTP Response:
   - Status Code: 200
   - Content-Type: application/json
   - Body: zbudowany JSON
```

---

### VI 2: WebSocket /ws

**Cel:** Real-time push statusów sesji, kroków, wyników i przyrządów do frontendu.

**Typ VI:** WebSocket Server Handler (NI Web Service)

**URL:** `WS /ws?token=<jwt>`

**Autoryzacja:** Weryfikacja JWT z query param `token`.

#### Struktura połączenia

```
Frontend otwiera WS → LabVIEW przyjmuje połączenie
LabVIEW weryfikuje ?token= (JWT HS256)
LabVIEW przechowuje referencję do połączenia (WebSocket Connection Refnum)
Pętla Send Loop wysyła wiadomości na żądanie innych VI
```

#### Architektura wewnętrzna

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
│  │  Send Loop (wysyła JSON)       │ │
│  └────────────────────────────────┘ │
└─────────────────────────────────────┘
         ▲
         │ inne VI wrzucają wiadomości do Queue
         │
   [VI 4 Start Session]
   [VI 6 Update Step]
   [VI 7 Add Result]
   [VI 9 Update Instruments]
```

#### Format wiadomości do wysłania (Notifier payload)

```
Cluster:
  - type  (String): "session.update"
  - data  (String): "{\"status\":\"running\",\"progress\":35}"
```

#### Obsługa Ping/Pong

```
Receive Loop:
  1. Odbierz wiadomość (WebSocket Read)
  2. Parsuj JSON → pobierz pole "type"
  3. Jeśli type = "pong":
       - Pomiń (heartbeat potwierdzony)
  4. (inne typy ignoruj)

Ping Timer (co 5 sekund):
  1. Buduj JSON: {"type":"ping","data":{"ts": <current_time_ms>}}
  2. Zapisz ts_sent = current_time_ms
  3. Wyślij przez WebSocket Write
```

#### Typy wiadomości do wysłania – tabela

| type | Kiedy wysyłać | VI inicjujące |
|------|---------------|---------------|
| `session.started` | Start nowej sesji | VI 4 |
| `session.update` | Zmiana postępu/statusu | VI 4, VI 5 |
| `test-step.update` | Zmiana statusu kroku | VI 6 |
| `test-result.add` | Nowy wynik pomiaru | VI 7 |
| `test-result.log` | Log na żywo | VI 8 |
| `instruments.update` | Zmiana statusu przyrządów | VI 9 |
| `ping` | Co 5s (timer) | WS Loop |

---

## VIs wywołujące Nitro REST API

Wszystkie HTTP Client VIs korzystają z NI HTTP Client (`HTTP Client Open Handle.vi`).

**Base URL:** `http://localhost:3000` (jeśli Nitro na tym samym PC)  
lub konfigurowalny z pliku INI/JSON.

---

### VI 3: Auth Login

**Cel:** Pobranie JWT token używanego przez wszystkie pozostałe VIs.  
**Wywołaj:** Jednorazowo przy starcie RTO.

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

**Implementacja:**
```
1. HTTP Client Open Handle
2. HTTP Client Set Header: Content-Type = application/json
3. HTTP Client POST:
   URL    = base_url + "/api/auth/login"
   Body   = JSON string z username/password
4. HTTP Client Get Response: StatusCode, Body
5. Jeśli StatusCode = 200:
   - Parsuj JSON → pobierz "token"
   - Zapisz token do Global Variable "JWT_TOKEN"
6. Jeśli StatusCode ≠ 200:
   - Loguj błąd, zatrzymaj RTO
7. HTTP Client Close Handle
```

**Ważne:** Token wygasa po 8 godzinach (konfigurowalne). Zaimplementuj automatyczne odświeżanie lub restart RTO.

---

### VI 4: Start Session

**Cel:** Zarejestrowanie startu sesji testowej w bazie danych i powiadomienie frontendu przez WS.

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

> `deviceId` = 1 (zawsze, jeden REM102 na stację)  
> `operator` = aktualnie zalogowany użytkownik (z frontendu) lub ID operatora z karty RFID

**Response `200`:**
```json
{
  "id": "8",
  "status": "running",
  "startedAt": "2024-01-15T11:00:00.000Z"
}
```

**Po udanej odpowiedzi — wyślij przez WS Queue:**
```json
{ "type": "session.started", "data": { "sessionId": "8", "operator": "jkowalski", "startedAt": "2024-01-15T11:00:00.000Z" } }
{ "type": "session.update",  "data": { "status": "running", "currentStep": "", "progress": 0 } }
```

**Implementacja:**
```
Wyjście VI:
  - sessionId (String): "8"  ← przechowaj dla kolejnych VI
```

---

### VI 5: Finish Session

**Cel:** Zamknięcie sesji testowej.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-sessions/<sessionId>`

**Request Body:**
```json
{ "status": "passed" }
```

Możliwe wartości: `passed` | `failed` | `aborted`

**Response `200`:**
```json
{ "id": "8", "status": "passed", "finishedAt": "2024-01-15T11:45:00.000Z" }
```

**Po udanej odpowiedzi — wyślij przez WS Queue:**
```json
{ "type": "session.update", "data": { "status": "passed", "currentStep": "", "progress": 100 } }
```

---

### VI 6: Update Step Status

**Cel:** Aktualizacja statusu kroku testowego. Wywoływać przy każdej zmianie stanu (start kroku, koniec, błąd).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-steps/<stepId>`

**Request Body:**
```json
{
  "status":     "ok",
  "message":    "Napięcie w normie: 24.1 V",
  "startedAt":  "2024-01-15T11:01:00.000Z",
  "finishedAt": "2024-01-15T11:05:30.000Z"
}
```

| Pole | Kiedy wysłać |
|------|-------------|
| `status: "running"` | Na starcie kroku (pomiń `finishedAt`) |
| `status: "ok"/"fail"/"skip"` | Na końcu kroku (dołącz `finishedAt`) |

**Wejścia VI:**

| Parametr | Typ | Opis |
|----------|-----|------|
| stepId | String | ID kroku z DB |
| status | Enum | pending/running/ok/fail/skip |
| message | String | Opcjonalny komunikat |
| startedAt | Timestamp | Czas startu |
| finishedAt | Timestamp | Czas zakończenia (null jeśli running) |

**Po udanej odpowiedzi — wyślij przez WS Queue:**
```json
{ "type": "test-step.update", "data": { "stepId": "2", "name": "Test napięcia", "status": "ok", "message": "OK" } }
```

---

### VI 7: Add Test Result

**Cel:** Zapisanie wyniku pomiaru z parametrami i opcjonalnymi logami.

**HTTP Method:** `POST`  
**URL:** `http://localhost:3000/api/test-results`

**Request Body — pełny przykład:**
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
    { "level": "info", "message": "Start pomiaru napięcia" },
    { "level": "info", "message": "V_in = 24.1 V – OK" },
    { "level": "info", "message": "V_out = 12.05 V – OK" },
    { "level": "info", "message": "PASS" }
  ]
}
```

**Logika wyznaczania status na podstawie parametrów:**
```
Jeśli WSZYSTKIE params.status = "ok" → status = "ok"
Jeśli KTÓRYKOLWIEK params.status = "fail" → status = "fail"
Jeśli pomiar w toku → status = "running"
```

**Response `200`:**
```json
{ "id": "14", "status": "ok", "measuredAt": "2024-01-15T11:10:00.000Z" }
```

**Po udanej odpowiedzi — wyślij przez WS Queue:**
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

**Cel:** Dołączenie logu na żywo do trwającego pomiaru (przed jego zakończeniem).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/test-results/<resultId>`

**Request Body:**
```json
{
  "log": {
    "level":   "info",
    "message": "Mierzę napięcie... V_in = 24.08 V",
    "ts":      "2024-01-15T11:10:02.500Z"
  }
}
```

**Po udanej odpowiedzi — wyślij przez WS Queue:**
```json
{
  "type": "test-result.log",
  "data": {
    "resultId": "14",
    "level":    "info",
    "message":  "Mierzę napięcie... V_in = 24.08 V",
    "ts":       "2024-01-15T11:10:02.500Z"
  }
}
```

---

### VI 9: Update Instrument Status

**Cel:** Aktualizacja statusu przyrządu pomiarowego po każdej zmianie (online/offline/busy/error).

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/instruments/<instrumentId>`

**Request Body:**
```json
{
  "status":   "busy",
  "lastSeen": "2024-01-15T11:10:00.000Z"
}
```

**Wejścia VI:**

| Parametr | Typ | Opis |
|----------|-----|------|
| instrumentId | I32 | ID przyrządu z DB |
| status | Enum | online/offline/error/busy |
| lastSeen | Timestamp | Aktualny czas |

**Rekomendacja:** Wywoływać VI 9 dla **wszystkich** przyrządów łącznie, a następnie wysyłać jedną wiadomość WS `instruments.update` ze statusami wszystkich:

```json
{
  "type": "instruments.update",
  "data": {
    "instruments": [
      { "id": "1", "name": "Multimetr", "status": "busy",   "address": "GPIB0::22::INSTR" },
      { "id": "2", "name": "Zasilacz",  "status": "online", "address": "GPIB0::5::INSTR"  }
    ]
  }
}
```

---

### VI 10: Upload Drawing

**Cel:** Wgranie schematu graficznego stacji jako base64 do bazy danych. Wywołać **jednorazowo przy starcie RTO**.

**HTTP Method:** `PUT`  
**URL:** `http://localhost:3000/api/drawings/<drawingId>`

**Request Body:**
```json
{
  "name":        "Schemat stacji",
  "description": "Widok główny stacji testowej REM102",
  "mimeType":    "image/svg+xml",
  "imageBase64": "PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcn..."
}
```

**Konwersja pliku do base64 (G-code):**
```
1. Read File.vi → odczytaj bajty pliku PNG/SVG
2. Base64 Encode.vi → zakoduj do string base64
3. (opcjonalnie) usuń znaki nowej linii z base64 string
4. Przekaż do HTTP Request Body
```

> ⚠️ Nie dodawaj prefiksu `data:image/...;base64,` — frontend robi to automatycznie.

---

## Konfiguracja HTTP Client

Zalecana konfiguracja połączeń HTTP w LabVIEW:

```
HTTP Client Open Handle:
  ├── Verify Server Certificate: FALSE (środowisko lokalne)
  └── TLS Version: Auto

Timeouts:
  ├── Connection Timeout: 5000 ms
  ├── Read Timeout:       10000 ms
  └── Send Timeout:       10000 ms

Headers (globalne dla wszystkich wywołań):
  ├── Content-Type: application/json
  ├── Accept: application/json
  └── Authorization: Bearer <JWT_TOKEN>  ← z Global Variable
```

**Zarządzanie handle:** Otwierać jeden handle na starcie RTO, zamykać przy shutdown. Nie otwierać/zamykać w każdym wywołaniu.

---

## Obsługa błędów

### Kody HTTP i reakcje LabVIEW

| Kod | Sytuacja | Akcja LabVIEW |
|-----|----------|---------------|
| `200` | Sukces | Kontynuuj normalnie |
| `401` | Token wygasł | Wywołaj VI 3 (Auth Login) ponownie |
| `404` | Zasób nie istnieje | Loguj ostrzeżenie, kontynuuj |
| `400` | Nieprawidłowe dane | Loguj błąd z payloadem |
| `5xx` | Błąd serwera | Retry z exponential backoff |
| Timeout | Serwer niedostępny | Retry 3x, potem loguj krytyczny błąd |

### Wzorzec retry (G-code)

```
For loop: 3 iteracje
  │
  ├── HTTP Request (VI 7, 4, 6...)
  │
  ├── Jeśli StatusCode = 200 → break loop, sukces
  │
  ├── Jeśli StatusCode = 401:
  │     └── Wywołaj VI 3 (Auth Login)
  │         └── Retry z nowym tokenem
  │
  └── Jeśli błąd / timeout:
        Wait: 500ms * 2^iteration (backoff)
        Kontynuuj pętlę
```

---

## Sugerowana kolejność wywołań

```
STARTUP RTO
  │
  ├─ 1. VI 3: Auth Login ─────────────── pobierz JWT token
  ├─ 2. VI 10: Upload Drawing ─────────── wgraj schematy (jeśli nowe)
  └─ 3. VI 9: Update Instruments ──────── ustaw statusy offline dla wszystkich

TEST START
  │
  ├─ 4. VI 4: Start Session ───────────── utwórz sesję, zapisz sessionId
  └─ 5. VI 9: Update Instruments ──────── ustaw statusy online/busy

DLA KAŻDEGO KROKU
  │
  ├─ 6.  VI 6: Update Step (running) ──── krok startuje
  ├─ 7.  VI 9: Update Instruments ──────── przyrząd → busy
  ├─ 8.  VI 7: Add Test Result ─────────── zapisz wynik (status: "running")
  ├─ 9.  VI 8: Append Result Log ──────── logi na żywo (wielokrotnie)
  ├─ 10. VI 7: PUT result status ──────── zaktualizuj status (ok/fail)
  ├─ 11. VI 9: Update Instruments ──────── przyrząd → online
  └─ 12. VI 6: Update Step (ok/fail) ──── krok zakończony

TEST END
  │
  ├─ 13. VI 5: Finish Session ─────────── zamknij sesję (passed/failed)
  └─ 14. VI 9: Update Instruments ──────── wszystkie → online/offline

SHUTDOWN RTO
  └─ 15. VI 9: Update Instruments ──────── wszystkie → offline
```
