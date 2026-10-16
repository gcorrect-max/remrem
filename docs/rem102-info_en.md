# REM102 – reading device information over CGI (curl)

> Polish version: [`rem102-info.md`](rem102-info.md) · HTML version: [`rem102-api_en.html`](rem102-api_en.html)

The `scripts/rem102-info.sh` script logs in to a REM102 device and collects **all read-only information packages** from the **Home, Setup, Advanced, Monitoring** tabs and from `settings.json` (project name/host). Each package is returned as a JSON object.

The request list comes from the configuration files of the device's web interface: `home.json`, `setup.json`, `advanced.json`, `monitoring.json`, `settings.json`.

> **Status:** the script was tested against a mock HTTP server (JSON assembly, output files, error handling), **not against a real device**. The format of the device's response bodies was not known – see [Assumptions](#assumptions-to-confirm).

## Requirements

- `bash`, `curl`, `jq`
- network access to the device (default `192.168.128.1`, as in `data/modulesCfg.ts`)
- an account with a sufficient level (pages with `show_level` 1–2 may need a higher level)

## Usage

```bash
# one JSON document on stdout
REM_HOST=192.168.128.1 REM_USER=Admin REM_PASS='...' ./scripts/rem102-info.sh > rem102.json

# additionally one file per package: ./dump/<tab>/<id>.json and ./dump/all.json
REM_OUT_DIR=./dump REM_HOST=... REM_USER=... REM_PASS=... ./scripts/rem102-info.sh > /dev/null
```

| Variable | Meaning | Default |
|---|---|---|
| `REM_HOST` | device address/host (may include a port) | `192.168.128.1` |
| `REM_USER` | login | – (required) |
| `REM_PASS` | password | – (required) |
| `REM_LOGIN_BODY` | full login request body (overrides the default) | `query=120&username=$REM_USER&pwd=$REM_PASS` |
| `REM_OUT_DIR` | directory for separate package JSON files | empty (disabled) |

Warnings (e.g. a failed login) go to stderr, so stdout always holds clean JSON.

## Basic information – full curl sequence

User `user`, password `password`, default address `192.168.128.1`. Steps 2–6 return the model, serial number, article number and the other identification data.

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# 1. login (cookies CGIUSERNAME / CGIUSERLEVEL are saved in $JAR)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" \
     --data-raw "query=120&username=user&pwd=password"
cat "$JAR"    # CGIUSERNAME and CGIUSERLEVEL should be listed

# 2. model, serial number, article number and other device data
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=302"

# 3. software versions (firmware, FPGA, DSP)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=301"

# 4. hostname
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=126"

# 5. meter settings
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/rem.fcgi" --data-raw "query=105"

# 6. DMeter serial number (only if the module is enabled)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/items.fcgi" --data-raw "query=407"

# 7. logout (optional)
curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=1983"
rm -f "$JAR"
```

Everything in one command (no logout), with a header before each response:

```bash
HOST=192.168.128.1; JAR=$(mktemp)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=120&username=user&pwd=password"
for r in mpc105.fcgi:302 mpc105.fcgi:301 mpc105.fcgi:126 rem.fcgi:105 items.fcgi:407; do
  printf '\n== %s?query=%s ==\n' "${r%%:*}" "${r##*:}"
  curl -sS -w '\n' -b "$JAR" -G "http://$HOST/cgi-bin/${r%%:*}" --data-raw "query=${r##*:}"
done; rm -f "$JAR"
```

Notes: the login field names (`username`, `pwd`) are an assumption (see [Assumptions](#assumptions-to-confirm)). A password with special characters (`&`, `+`, `%`) needs URL encoding in `--data-raw`, or use `--data-urlencode "pwd=..."`.

## Output format

One object: `device` (collection metadata) + one key per tab, and inside it the packages by `id`.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, serial no., article no.)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": { "...": "device response" }
    }
  },
  "home": { "...": "..." },
  "setup": { "...": "..." },
  "advanced": { "...": "..." },
  "monitoring": { "...": "..." },
  "features": { "...": "..." }
}
```

Package fields:

| Field | Description |
|---|---|
| `label` | path in the web menu the request comes from |
| `cgi`, `query` | exactly what was sent to the device |
| `http_status` | HTTP code; `0` = connection error/timeout |
| `body` | response: **JSON if it parses**; otherwise raw text; `null` when empty |

A failure of one package (e.g. a disabled module → 4xx/5xx or an empty response) **does not stop** the collection of the others.

## Packages

All requests are `GET http://$HOST<cgi>?<query>` with the session cookies.

### `identity` – model, serial number, article number, versions

| id | cgi | query | Menu source |
|---|---|---|---|
| `device_settings` | `mpc105.fcgi` | `query=302` | Advanced › Information › Device Settings (**model, serial no., article no.**) |
| `version` | `mpc105.fcgi` | `query=301` | Advanced › Information › Version |
| `host` | `mpc105.fcgi` | `query=126` | settings.json › host |
| `auth_message` | `mpc105.fcgi` | `query=125` | settings.json › auth_message |
| `meter_settings` | `rem.fcgi` | `query=105` | Setup › Meter › Settings |
| `dmeter_serial` | `items.fcgi` | `query=407` | Setup › DMeter › Serial Number |

The project name in `settings.json` is `REM102-S2` (the likely model).

### `home`

| id | cgi | query |
|---|---|---|
| `meter_status` | `rem.fcgi` | `query=10` |
| `emf_status` | `rem.fcgi` | `query=406` |
| `emf_measures` | `rem.fcgi` | `query=407` |
| `emf_cebd` | `rem.fcgi` | `query=409` |
| `dhs_memory` | `rem.fcgi` | `query=459` |
| `digital_io` | `rem.fcgi` | `query=11` |
| `net_interfaces` | `mpc105.fcgi` | `query=500` |
| `net_services` | `mpc105.fcgi` | `query=501` |

### `setup`

| id | cgi | query |
|---|---|---|
| `channels_configuration` | `rem.fcgi` | `query=100` |
| `dcs_user_1` … `dcs_user_4` | `rem.fcgi` | `query=450&user=N` |
| `dcs_communication` | `rem.fcgi` | `query=452` |
| `dcs_binding` | `rem.fcgi` | `query=457` |
| `dcs_conn_test` | `rem.fcgi` | `query=455` |
| `ethernet_0` / `ethernet_1` | `mpc105.fcgi` | `query=103` / `query=104` |
| `mobile_settings` | `mpc105.fcgi` | `query=101` |
| `dhcp_client` | `mpc105.fcgi` | `query=200` |
| `gateway_dns` | `mpc105.fcgi` | `query=201` |
| `servers` | `mpc105.fcgi` | `query=202` |
| `ntp_servers` | `mpc105.fcgi` | `query=203` |
| `ems_time_servers` | `mpc105.fcgi` | `query=230` |
| `gps` | `mpc105.fcgi` | `query=205` |

### `advanced`

| id | cgi | query |
|---|---|---|
| `rtc_time` | `mpc105.fcgi` | `query=303` |
| `events` | `mpc105.fcgi` | `query=314` |

(`Device Settings` and `Version` are in the `identity` package group.)

### `monitoring`

| id | cgi | query |
|---|---|---|
| `eth_0`, `eth_1`, `mobile`, `gps` | `mpc105.fcgi` | `query=3`, `4`, `13`, `16` |
| `dcs_stats_user_1` … `_4` | `rem.fcgi` | `query=461&user=N` |
| `dmeter_status` | `items.fcgi` | `query=409` |
| `rtp100_vars`, `rtp100_files` | `rtp.fcgi` | `query=441`, `444` |
| `mem_nand`, `mem_nor`, `mem_ram` | `mpc105.fcgi` | `query=23`, `24`, `25` |
| `dev_rtc`, `dev_fpga`, `dev_fram`, `dev_adc`, `dev_dsp`, `dev_mvbcs`, `dev_modem` | `mpc105.fcgi` | `query=7`, `8`, `9`, `10`, `11`, `12`, `17` |

### `features` – which modules are enabled (`en_query` from the menu)

`dcs` (463), `dcs_user_1..4` (`462&user=N`), `dmeter_rem` (420), `dmeter_items` (`items.fcgi` 400), `rtp100` (430), `mobile` (`mpc105` 14), `gps` (`mpc105` 15), `dsp_digitalio` (`mpc105` 18).
They explain why, for example, the DCS or GPS packages are empty.

## Intentionally excluded

| Request | Why |
|---|---|
| `rem.fcgi query=440` (Restore Factory Default) | resets the device to factory settings |
| `mpc105.fcgi query=1982` (reboot) | reboots the device |
| `rem.fcgi query=402` (Export SIC Configuration) | an export action, not information readout |
| `mpc105.fcgi query=122` (Accounts Management) | user account data |
| all `set` / `set1` fields | write configuration |
| `items.fcgi query=410`, `rtp.fcgi query=442/443/445` | RTP100 and DMeter writes/commands |

## Examples

### Single curl requests (manual)

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# log in (the CGIUSERNAME / CGIUSERLEVEL cookies go to $JAR)
curl -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.fcgi" \
     --data-raw "query=120&username=Admin&pwd=PASSWORD"

# model, serial number, article number
curl -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=302"

# software versions
curl -b "$JAR" -G "http://$HOST/cgi-bin/mpc105.fcgi" --data-raw "query=301"

# DCS User 2 (the menu JSONs write "query=450~user=2"; "~" = "&")
curl -b "$JAR" -G "http://$HOST/cgi-bin/rem.fcgi" --data-raw "query=450&user=2"
```

### Extracting data from the result (`jq`)

```bash
# device identification
jq '.identity | {device_settings: .device_settings.body, version: .version.body}' rem102.json

# which packages failed (HTTP status != 200)
jq -r 'del(.device) | to_entries[] | .key as $t | .value | to_entries[]
       | select(.value.http_status != 200) | "\($t)/\(.key): HTTP \(.value.http_status)"' rem102.json

# all packages as a flat id -> body list
jq 'del(.device) | [to_entries[] | .key as $t | .value | to_entries[]
       | {id: "\($t)/\(.key)", body: .value.body}]' rem102.json

# one tab
jq '.monitoring' rem102.json
```

### Example output (illustrative)

> The response `body` below is **made up** and only shows the envelope structure. The real field names are returned by the device.

```json
{
  "device": { "host": "192.168.128.1", "collected_at": "2026-10-16T22:32:11Z" },
  "identity": {
    "device_settings": {
      "label": "Advanced > Information > Device Settings (model, serial no., article no.)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=302",
      "http_status": 200,
      "body": { "model": "<model>", "serial": "<serial number>", "article": "<article number>" }
    },
    "version": {
      "label": "Advanced > Information > Version (firmware/FPGA/DSP)",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=301",
      "http_status": 200,
      "body": "plain-text response when it is not JSON"
    }
  },
  "advanced": {
    "events": {
      "label": "Advanced > Information > Events",
      "cgi": "/cgi-bin/mpc105.fcgi",
      "query": "query=314",
      "http_status": 500,
      "body": null
    }
  }
}
```

## Using it from LabVIEW

The request list is available as files in `data/rem102/`. Row order is identical in all files.

| File | Content | Use |
|---|---|---|
| `rem102-package-names.txt` | one package name per line (`tab.id`) | enum items (typedef) |
| `rem102-package-requests.txt` | one request per line, e.g. `/cgi-bin/mpc105.fcgi?query=302` | string array indexed by the enum value |
| `rem102-packages.tsv` | columns with a header: `index, name, tab, id, cgi, query, request, method, min_level, requires, label` | lookup by name, gating on `min_level` and `requires` |

Names are `tab.id` because a bare `id` repeats (e.g. `gps` exists in Setup, Monitoring and Features).

Flow:

1. **Enum.** A typedef `REM102 Package` with the items from `rem102-package-names.txt`. The enum value is the 0-based line number.
2. **Request array.** *Read from Text File* (with end-of-line conversion), split into lines into a `String[]`. Load it once at start-up.
3. **Request.** *Index Array* with the enum value gives the path. Prepend `http://` and the host.
4. **GET.** *HTTP Client* with the session cookies from login (`query=120`) returns the response body as a string.
5. **Parsing.** *Unflatten From JSON* into the typedef of that package.

### Polymorphic VI

A polymorphic VI picks its instance by the **type** of the wired data, not by an enum value. So the enum selects the request and the type selects the parser. For a single VI that handles every package, a **malleable VI** (`.vim`, LabVIEW 2017 or newer) fits best:

```text
Get Package.vim
  inputs:   Package (enum REM102 Package), Type (any typedef – type specifier), Host, session
  outputs:  Data (of type Type), Raw Body (string), HTTP Status, error out
  inside:   Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)
```

Each package only needs its own cluster typedef, with no separate instance. A classic polymorphic `.vi` also works but needs one instance per typedef.

Until you know the real responses, use a `Get Package (Raw).vi` that returns just the string. Build the typedefs from samples collected with the script (`REM_OUT_DIR`) on a real device. Before reading, check the `min_level` and `requires` columns in the tsv (the `features.*` package tells whether the module is enabled).

## Assumptions to confirm

1. **Login.** The menu files give only `query=120`. The `username` and `pwd` field names come from the LabVIEW configuration (`data/modulesCfg.ts`), as do the `CGIUSERNAME`/`CGIUSERLEVEL` cookies. If login fails, the script prints a warning – capture the real request in DevTools and pass it in `REM_LOGIN_BODY`.
2. **GET vs POST.** Read requests are sent with GET. If the device returns empty responses, try POST (`-X POST --data-raw ...`) – change the call in the `q` function.
3. **Response format.** It is not known whether the device answers with JSON. The script accepts both (JSON → parsed, anything else → raw text in `body`).
4. **Separator `~`.** In the `query` field of the menu files it means `&`.
