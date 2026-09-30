# Komunikacja LabVIEW ↔ REMview v3

Przegląd tego, jak LabVIEW Web Service komunikuje się z aplikacją: role, endpointy, format danych i przebieg testu. Szczegóły w dokumentach źródłowych:

- [`labview-vis.md`](labview-vis.md) – opis wszystkich VI po stronie LabVIEW
- [`websocket-protocol.md`](websocket-protocol.md) – protokół WebSocket
- [`api-reference.md`](api-reference.md) – REST API (Nitro)

## Spis treści

- [Role](#role)
- [Co wystawia LabVIEW](#co-wystawia-labview)
- [Co LabVIEW wywołuje w Nitro](#co-labview-wywołuje-w-nitro)
- [Format WebSocketu](#format-websocketu)
- [Przebieg testu](#przebieg-testu)
- [Rozbieżności dokumentacja ↔ kod](#rozbieżności-dokumentacja--kod)

---

## Role

| Strona | Rola |
|--------|------|
| **LabVIEW RT Web Service** | Serwuje zbudowany frontend Nuxt (pliki statyczne) i wystawia dwa endpointy. Uruchamia sekwencer testów (VISA / DAQmx / GPIB). |
| **Nuxt Nitro (Node.js)** | Serwer REST z bazą PostgreSQL. Weryfikuje JWT, zapisuje sesje, kroki, wyniki, przyrządy i rysunki. |
| **Przeglądarka** | Frontend Vue. Pobiera dane przez REST i słucha WebSocketu. |

```
Przeglądarka ──HTTP GET /api/hostname (co 5 s)──▶ LabVIEW Web Service
Przeglądarka ◀──────────── WS /ws?token=JWT ────── LabVIEW Web Service
Przeglądarka ──REST (Bearer JWT)──▶ Nitro ──SQL──▶ PostgreSQL
LabVIEW App  ──REST (Bearer JWT)──▶ Nitro
```

---

## Co wystawia LabVIEW

### `GET /api/hostname`

Endpoint publiczny, bez autoryzacji. Ekran logowania odpytuje go co 5 s. Odpowiedź `200` oznacza „LabVIEW Webservice online".

```json
{
  "hostname":    "STATION-PC-01",
  "model":       "REM102",
  "rtoFile":     "rem102_main.rtexe",
  "rtoRevision": "1.2.3"
}
```

### `WS /ws?token=<jwt>`

Serwer WebSocket do wysyłania danych na żywo do przeglądarki.

| Element | Wartość |
|---------|---------|
| Adres | `ws://<host>:<port>/ws?token=<jwt>` (`wss://` przy HTTPS) |
| Ścieżka | `/ws`, konfigurowalna przez `NUXT_PUBLIC_WS_PATH` |
| Autoryzacja | JWT (HS256) w query stringu, bo API WebSocket w przeglądarce nie pozwala ustawić nagłówków |
| Ramki | tekstowe, JSON |

W trybie dev na `localhost` połączenie WebSocket jest pomijane, chyba że ustawiono `NUXT_PUBLIC_WS_URL`.

---

## Co LabVIEW wywołuje w Nitro

LabVIEW jest klientem REST (NI HTTP Client) i zapisuje dane do bazy przez Nitro. Format: JSON, nagłówek `Authorization: Bearer <JWT>`. Bazowy adres to zwykle `http://localhost:3000`.

| VI | Wywołanie | Kiedy |
|----|-----------|-------|
| Auth Login | `POST /api/auth/login` (konto serwisowe) | raz przy starcie; token ważny 8 h |
| Start Session | `POST /api/test-sessions` | początek testu |
| Finish Session | `PUT /api/test-sessions/:id` (`passed` / `failed` / `aborted`) | koniec testu |
| Update Step | `PUT /api/test-steps/:id` (`pending` / `running` / `ok` / `fail` / `skip`) | każda zmiana kroku |
| Add Test Result | `POST /api/test-results` (parametry, limity, logi) | po pomiarze |
| Append Log | `PUT /api/test-results/:id` | logi na żywo |
| Update Instrument | `PUT /api/instruments/:id` (`online` / `offline` / `busy` / `error`) | zmiana stanu przyrządu |
| Upload Drawing | `PUT /api/drawings/:id` (obraz w base64) | raz przy starcie |

Po każdym udanym zapisie LabVIEW wysyła odpowiednią wiadomość przez WebSocket, żeby przeglądarka zobaczyła zmianę bez odświeżania.

Obsługa błędów po stronie LabVIEW: `401` → ponowny login, `5xx` lub timeout → 3 próby z wykładniczym opóźnieniem, `400` → log błędu z payloadem.

---

## Format WebSocketu

Każda wiadomość ma postać:

```json
{ "type": "<typ>", "data": { } }
```

### LabVIEW → przeglądarka

| `type` | Znaczenie |
|--------|-----------|
| `session.started` | start nowej sesji (`sessionId`, `operator`, `startedAt`) |
| `session.update` | `status` (`running` / `passed` / `failed` / `aborted`), `currentStep`, `progress` 0–100 |
| `test-step.update` | zmiana statusu kroku |
| `test-result.add` | nowy wynik z tablicą parametrów |
| `test-result.log` | linia logu przypisana do wyniku |
| `instruments.update` | statusy przyrządów |
| `ping` | heartbeat (patrz [rozbieżności](#rozbieżności-dokumentacja--kod)) |

Przykład wyniku:

```json
{
  "type": "test-result.add",
  "data": {
    "resultId": "13",
    "testName": "Current Measurement",
    "status":   "fail",
    "params": [
      { "name": "I_out", "value": "2.85", "unit": "A", "lowLimit": 1.0, "highLimit": 2.5, "status": "fail" }
    ]
  }
}
```

### Przeglądarka → LabVIEW

Tylko `pong` z tym samym `ts`, który przyszedł w `ping`:

```json
{ "type": "pong", "data": { "ts": 1705312200000 } }
```

### Ponowne łączenie

Po zerwaniu połączenia przeglądarka łączy się ponownie z rosnącym opóźnieniem (1 s, 2 s, 4 s … maks. 30 s). Licznik prób zeruje się po udanym połączeniu.

---

## Przebieg testu

```
start:  Login → (rysunek) → instrumenty offline
test:   Start Session  ──REST──▶ baza   ──WS session.started──▶ UI
krok:   Update Step / Add Result / Append Log ──REST──▶ baza
                        ──WS test-step.update, test-result.add, test-result.log──▶ UI
koniec: Finish Session ──REST──▶ baza   ──WS session.update (passed / failed)──▶ UI
```

---

## Rozbieżności dokumentacja ↔ kod

Stan na commit z tym dokumentem. Do uzgodnienia z osobą piszącą VI po stronie LabVIEW.

| Temat | Dokumentacja | Kod |
|-------|--------------|-----|
| Ping / pong | LabVIEW wysyła `ping` co 5 s, przeglądarka odpowiada `pong` | `stores/ws.ts`: przeglądarka sama wysyła `ping` co 30 s i mierzy opóźnienie po `pong`. Obsługi przychodzącego `ping` nie znaleziono. |
| `test-step.update` | pole `stepId` | `plugins/labview.client.ts` szuka pola `id` |
| `test-result.log` | pola `resultId`, `message`, `level`, `ts` | kod używa `stepId` i `line` |
| `instruments.update` | `{ "instruments": [ ... ] }` | kod oczekuje samej tablicy |
| Dodatkowe typy | – | kod obsługuje też `device.update`, `device.subsystems`, `instrument.update`, `test-steps.reset`, `test-results.reset` |
| `/api/hostname` | wystawia LabVIEW | istnieje także w Nitro (`server/api/hostname.get.ts`, zwraca tylko `hostname`) |
