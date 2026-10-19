# REM-102 – CGI API (read-only)

> Polish version: [`rem102-info.md`](rem102-info.md) · HTML: [`rem102-api_en.html`](rem102-api_en.html) · hub page: [`../index.html`](../index.html)

## Overview

Description of the CGI requests that the web interface of the **REM-102** device (Boa server, vendor page by HaslerRail) uses to fetch data. The list comes from files the device serves itself (`Config/*.json`), read with `collect.ps1 -Discover`. Only read requests are included.

> **Status (19 Oct 2026).** The login, CGI names, session cookie, access levels and reply format come from the device page's own scripts (`Script/*.js`). Real responses so far exist only for the packages that answer **without a login** (2 of 66). The login failed (password rejected), so the other packages returned the “login required” reply – see “Response examples”.

Base URL: `http://<HOST>` (default `192.168.128.1`, port 80). The device exposes four CGI files:

| CGI file | Scope |
|---|---|
| `/cgi-bin/mpc105.cgi` | platform: login, networking, GPS, modem, RTC, memories, device information |
| `/cgi-bin/mpc105j.cgi` | logout |
| `/cgi-bin/rem.cgi` | meter: channels A/B, energy, archives, configuration |
| `/cgi-bin/rtp.cgi` | RTP100 |

## Basic information – full curl sequence

Super Admin level (`login=3`), password `password` (use your own). Steps 2–6 return the model, serial number, article number and other identification data, plus the basic configuration.

```bash
HOST=192.168.128.1
JAR=$(mktemp)

# 1. login as Super Admin (login=3); the password is encoded like the page's form does
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" \
     --data "query=120" --data "login=3" --data-urlencode "pwd=password"
cat "$JAR"    # the CGISESSID cookie should be listed

# 2. model, serial number, article number and other device data (Advanced > Information > Device Settings)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302"

# 3. software versions (Advanced > Information > Version)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=301"

# 4. meter settings (Setup > Meter > Settings)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=105"

# 5. channels configuration (Setup > Meter > Channels Configuration)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/rem.cgi?query=100"

# 6. Ethernet 0 state (Monitoring > Network Interfaces)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=3"

# 7. logout (optional)
curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/mpc105j.cgi?query=122"
rm -f "$JAR"
```

Everything in one command (no logout), with a header before each response:

```bash
HOST=192.168.128.1; JAR=$(mktemp)
curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" --data "query=120" --data "login=3" --data-urlencode "pwd=password"
for r in mpc105.cgi?query=302 mpc105.cgi?query=301 rem.cgi?query=105 rem.cgi?query=100; do
  printf '\n== %s ==\n' "$r"
  curl -sS -w '\n' -b "$JAR" "http://$HOST/cgi-bin/$r"
done; rm -f "$JAR"
```

Notes: `--data-urlencode` encodes the password the way the page's form does (`@`, `!`, `&` are safe). In PowerShell `curl` is an alias of `Invoke-WebRequest`: use `curl.exe` or the `collect.cmd` script (see “Scripts”). A wrong level/password pair returns `{"value":"fail"}`.

## Login and access levels

Login is done by the page's form (`Script/mainParent.js`): `POST /cgi-bin/mpc105.cgi` with the form fields:

| Field | Meaning |
|---|---|
| `query` | always `120` (from `Config/settings.json`, type `LoginOnStart`) |
| `login` | level: `1` = User, `2` = Admin, `3` = Super Admin (not a user name) |
| `pwd` | password, URL-encoded |
| `change` | checked only when changing the password |

- The reply is JSON with a `value` field: `"fail"` = wrong password, `"change"` = the password must be changed, any other value = logged in. The real reply to a failed login: `{ "reference":"login", "tag":"reply", "label":"reply", "value":"fail", "execute":"", "cancel":"" }`.
- Every failed login is recorded in the device's event log (`advanced.information_events`: `CODE` 2, `DESCRIPTION` “Login unauthorized”, `USER` e.g. `superadmin`), so do not guess passwords repeatedly. The scripts have a login-only test mode (`-LoginTest` / `REM_LOGIN_TEST=1`).
- The session is carried by the `CGISESSID` cookie; the page reads the level from the 5th character of its value (`A`..`D` = 0..3).
- Logout: `GET /cgi-bin/mpc105j.cgi?query=122`, the page then deletes the cookie.
- The page shows a menu entry when `show_level` ≤ the user level; writing needs `write_level`.
- A read without a valid session returns the same `value: fail` reply (the page then shows “Needed Authentication”). Only some queries answer without a login: in the run of 19 Oct 2026 `mpc105.cgi?query=13` and `mpc105.cgi?query=314`.

## Conventions

- Read requests are `GET <cgi>?<query>`; replies are JSON (the page uses `$.getJSON`).
- In the menu files the parameters of a query are separated with `~` (e.g. `query=7~block_offset=10240~…`). The page scripts (`iframe.js`, `energy.js`, …) replace it with `&` before sending; the package table writes it the same way.
- The `en_cgi`/`en_query` menu fields check whether a module is enabled – these are the packages in the Features tab.
- The `set`, `set1`, `set2` fields write configuration – they are **not** used.

## Device reply formats

CGI replies are JSON, but with the header `Content-type: text/html`. The format comes from the page scripts (`Script/globalFunc.js`, `iframe.js`, `iframeDB.js`, `tableMultiColPag.js`) and from the first real responses.

### Login required

```json
{ "reference":"login", "tag":"reply", "label":"reply", "value":"fail", "execute":"", "cancel":"" }
```

A request without a valid session gets this reply (HTTP 200), and so does a failed login. The collector scripts count it as “login required”, not as data.

### Field list (default.html, eth.html pages)

An array of objects with `type`, `reference`, `tag`, `label`, `color`, `options`, `value`. Types (from `globalFunc.js`): `text` (read-only), `input`, `password`, `check`, `select` (followed by `option` items), `bar` (signal quality 1–5), `note`, `menu` and `enable` (module flag: `value` = `true`/`false`). `tag` is the name of the write form field. Real example: `monitoring.network_interfaces_mobile`.

### Events (`advanced.information_events`)

An array: items `{"type":"head","column_no":N,"column_name":"..."}` describe the columns, and an item `{"type":"data","events":[...]}` holds rows with `ID`, `DATATIME`, `CODE`, `USER`, `DESCRIPTION`, `TIMET`. A real example is below.

### Archive tables (`home.archive_*`)

According to `tableMultiColPag.js`: an item `{"type":"header","table_head":[{column_no, column_label, column_name, cell_type, method}]}` and rows in `table_rows`. No real response yet.

### Memory reads (`query=7&...`)

Meter Status, Energy and Digital IO are arrays of objects with `tag`, `label`, `value`, `color`; the pages key on `tag` (e.g. power, voltage, current and energy fields in `energy.js`). No real response yet.

## Result format of the scripts

The collector scripts return one JSON object: `device` (metadata), `login` (login result) and a key per tab with packages keyed by `id`.

```json
{
  "device": { "base_url": "http://192.168.128.1", "collected_at": "<UTC time>", "packages_total": 66 },
  "login": { "http_status": 200, "ok": true, "value": "<reply>", "level_requested": 3, "level_from_cookie": 3 },
  "advanced": {
    "information_device_settings": {
      "label": "Advanced > Information > Device Settings",
      "cgi": "/cgi-bin/mpc105.cgi",
      "query": "query=302",
      "http_status": 200,
      "content_type": "<header>",
      "body": "<device response – to be filled in after connecting>"
    }
  }
}
```

| Field | Description |
|---|---|
| `label` | path in the web menu |
| `cgi`, `query` | exactly what was sent to the device |
| `http_status` | HTTP code; `0` = no HTTP answer (the `error` field gives the reason) |
| `content_type`, `server` | response headers |
| `body` | JSON if the response parses; otherwise text; `null` when empty |
| `post_retry` | only when GET failed: result of a single POST retry |

A failure of one package does not stop the collection of the others.

## Packages

### Home (`home`)

Meter readouts: channels A and B, energy, digital I/O, archives, networking.

| Name | Request | min. level | Notes |
|---|---|---|---|
| `home.summary_meter_status` | `/cgi-bin/rem.cgi?query=7&block_offset=10240&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=17&string_size=32` | 0 |  |
| `home.ch_a_energy` | `/cgi-bin/rem.cgi?query=7&block_offset=11264&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` | 0 |  |
| `home.ch_a_measures` | `/cgi-bin/rem.cgi?query=106&channel=0` | 0 | The menu's “set” field is an hour/date picker form (script `measure.js`) – a filter, not a settings write. |
| `home.ch_b_energy` | `/cgi-bin/rem.cgi?query=7&block_offset=12288&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` | 0 |  |
| `home.ch_b_measures` | `/cgi-bin/rem.cgi?query=106&channel=1` | 0 | The menu's “set” field is an hour/date picker form (script `measure.js`) – a filter, not a settings write. |
| `home.digital_io` | `/cgi-bin/rem.cgi?query=7&block_offset=13312&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=12&string_size=32` | 0 |  |
| `home.archive_1_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=1` | 0 |  |
| `home.archive_1_sent_files` | `/cgi-bin/rem.cgi?query=108&id=1` | 0 |  |
| `home.archive_1_test_files` | `/cgi-bin/rem.cgi?query=112&id=1` | 0 |  |
| `home.archive_2_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=2` | 0 |  |
| `home.archive_2_sent_files` | `/cgi-bin/rem.cgi?query=108&id=2` | 0 |  |
| `home.archive_2_test_files` | `/cgi-bin/rem.cgi?query=112&id=2` | 0 |  |
| `home.networking_interfaces` | `/cgi-bin/mpc105.cgi?query=500` | 0 |  |
| `home.networking_services` | `/cgi-bin/mpc105.cgi?query=501` | 0 |  |
| `home.networking_redirection` | `/cgi-bin/mpc105.cgi?query=502` | 0 |  |

### Monitoring (`monitoring`)

State of network interfaces, memories and hardware blocks, and RTP100.

| Name | Request | min. level | Notes |
|---|---|---|---|
| `monitoring.network_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=3` | 0 |  |
| `monitoring.network_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=4` | 0 |  |
| `monitoring.network_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=5` | 0 |  |
| `monitoring.network_interfaces_wlan` | `/cgi-bin/mpc105.cgi?query=6` | 0 |  |
| `monitoring.network_interfaces_mobile` | `/cgi-bin/mpc105.cgi?query=13` | 0 | Answers without a login (run of 19 Oct 2026). |
| `monitoring.network_interfaces_ethernet_switch` | `/cgi-bin/mpc105.cgi?query=14` | 0 |  |
| `monitoring.network_interfaces_gps` | `/cgi-bin/mpc105.cgi?query=16` | 0 |  |
| `monitoring.rtp100_rtp100_variables` | `/cgi-bin/rtp.cgi?query=441` | 0 | Requires enabled module: `features.rtp100`. |
| `monitoring.rtp100_rtp100_files` | `/cgi-bin/rtp.cgi?query=444` | 0 | Requires enabled module: `features.rtp100`. |
| `monitoring.memory_nand` | `/cgi-bin/mpc105.cgi?query=23` | 0 |  |
| `monitoring.memory_nor` | `/cgi-bin/mpc105.cgi?query=24` | 0 |  |
| `monitoring.memory_ram` | `/cgi-bin/mpc105.cgi?query=25` | 0 |  |
| `monitoring.other_devices_rtc` | `/cgi-bin/mpc105.cgi?query=7` | 0 |  |
| `monitoring.other_devices_fpga` | `/cgi-bin/mpc105.cgi?query=8` | 0 |  |
| `monitoring.other_devices_fram` | `/cgi-bin/mpc105.cgi?query=9` | 0 |  |
| `monitoring.other_devices_adc` | `/cgi-bin/mpc105.cgi?query=10` | 0 |  |
| `monitoring.other_devices_hdlc` | `/cgi-bin/mpc105.cgi?query=11` | 0 |  |
| `monitoring.other_devices_mvbcs` | `/cgi-bin/mpc105.cgi?query=12` | 0 |  |
| `monitoring.other_devices_modem` | `/cgi-bin/mpc105.cgi?query=17` | 0 |  |
| `monitoring.other_devices_wifi` | `/cgi-bin/mpc105.cgi?query=18` | 0 |  |

### Setup (`setup`)

Meter, network interface, DHCP and service configuration.

| Name | Request | min. level | Notes |
|---|---|---|---|
| `setup.meter_settings` | `/cgi-bin/rem.cgi?query=105` | 0 | Meter settings (rem.cgi, not mpc105.cgi). |
| `setup.meter_channels_configuration` | `/cgi-bin/rem.cgi?query=100` | 0 |  |
| `setup.meter_ftp_hosts` | `/cgi-bin/rem.cgi?query=101` | 0 |  |
| `setup.meter_udp_clients` | `/cgi-bin/rem.cgi?query=102` | 0 |  |
| `setup.meter_messages` | `/cgi-bin/rem.cgi?query=103` | 0 |  |
| `setup.meter_calibration` | `/cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` | 3 | Shared-memory read; show_level 3 in the menu (Super Admin). |
| `setup.meter_thresholds_protection` | `/cgi-bin/rem.cgi?query=111` | 0 |  |
| `setup.rtp100_rtp100_command` | `/cgi-bin/rtp.cgi?query=442` | 0 | Requires enabled module: `features.rtp100`. |
| `setup.ethernet_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=103` | 0 |  |
| `setup.ethernet_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=104` | 0 |  |
| `setup.ethernet_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=105` | 0 |  |
| `setup.ethernet_interfaces_switch_ethernet` | `/cgi-bin/mpc105.cgi?query=107` | 0 |  |
| `setup.mobile_interface_mobile_settings` | `/cgi-bin/mpc105.cgi?query=101` | 0 |  |
| `setup.wireless_interface_wlan` | `/cgi-bin/mpc105.cgi?query=106` | 0 |  |
| `setup.wireless_interface_client_access` | `/cgi-bin/mpc105.cgi?query=204` | 0 |  |
| `setup.dhcp_client_settings` | `/cgi-bin/mpc105.cgi?query=200` | 0 |  |
| `setup.dhcp_server_settings` | `/cgi-bin/mpc105.cgi?query=208` | 0 |  |
| `setup.dhcp_address_reservation` | `/cgi-bin/mpc105.cgi?query=209` | 0 |  |
| `setup.services_gateway_dns` | `/cgi-bin/mpc105.cgi?query=201` | 0 |  |
| `setup.services_servers` | `/cgi-bin/mpc105.cgi?query=202` | 0 |  |
| `setup.services_ntp_servers` | `/cgi-bin/mpc105.cgi?query=203` | 0 |  |
| `setup.services_gps` | `/cgi-bin/mpc105.cgi?query=205` | 0 |  |
| `setup.services_port_forwarding` | `/cgi-bin/mpc105.cgi?query=207` | 0 |  |
| `setup.services_proxy_settings` | `/cgi-bin/mpc105.cgi?query=220` | 0 |  |

### Advanced (`advanced`)

RTC time, configuration and device information (model, serial number, versions, events).

| Name | Request | min. level | Notes |
|---|---|---|---|
| `advanced.rtc_time_settings` | `/cgi-bin/mpc105.cgi?query=303` | 0 |  |
| `advanced.rtc_time_zones` | `/cgi-bin/mpc105.cgi?query=305` | 0 |  |
| `advanced.configuration_settings` | `/cgi-bin/rem.cgi?query=113` | 0 |  |
| `advanced.information_device_settings` | `/cgi-bin/mpc105.cgi?query=302` | 1 | Model, serial number, article number and other device data. In the menu: show_level 1, write_level 3. |
| `advanced.information_events` | `/cgi-bin/mpc105.cgi?query=314` | 0 | Answers without a login (run of 19 Oct 2026). The menu's “set” field is a date picker form (`datetime`, year/month/day) – a filter, not a settings write. |
| `advanced.information_version` | `/cgi-bin/mpc105.cgi?query=301` | 0 | Software versions. |

### Features (`features`)

Module enable flags (`en_query` from the menu).

| Name | Request | min. level | Notes |
|---|---|---|---|
| `features.rtp100` | `/cgi-bin/rem.cgi?query=430` | 0 | The reply is an array of objects; `{"type":"enable","value":"true"}` means the module is enabled (rule from the page's script). |

## Response examples

The examples come **only** from responses captured on a real device – nothing is made up. Packages without an example are waiting to be filled in after connecting to the device. The “login required” reply (`value: fail`) and HTTP errors are not examples.

Captured examples: 2 of 66.

How to fill them in:

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

### `monitoring.network_interfaces_mobile`

`GET /cgi-bin/mpc105.cgi?query=13` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "ppp0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "PPP"
  },
  {
    "type": "text",
    "reference": "ppp0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `advanced.information_events`

`GET /cgi-bin/mpc105.cgi?query=314` · HTTP 200

```json
[
  {
    "type": "head",
    "column_no": 1,
    "column_name": "ID"
  },
  {
    "type": "head",
    "column_no": 2,
    "column_name": "DATATIME"
  },
  {
    "type": "head",
    "column_no": 3,
    "column_name": "CODE"
  },
  {
    "type": "head",
    "column_no": 4,
    "column_name": "USER"
  },
  {
    "type": "head",
    "column_no": 5,
    "column_name": "DESCRIPTION"
  },
  {
    "type": "data",
    "events": [
      {
        "ID": "3737",
        "DATATIME": "2026-10-19 02:27:53",
        "CODE": "2",
        "USER": "superadmin",
        "DESCRIPTION": "Login unauthorized",
        "TIMET": "1792376873"
      }
    ]
  }
]
```

<details><summary>To be filled in (64)</summary>

- `home.summary_meter_status` (last attempt: login required)
- `home.ch_a_energy` (last attempt: login required)
- `home.ch_a_measures` (last attempt: login required)
- `home.ch_b_energy` (last attempt: login required)
- `home.ch_b_measures` (last attempt: login required)
- `home.digital_io` (last attempt: login required)
- `home.archive_1_waiting_files` (last attempt: login required)
- `home.archive_1_sent_files` (last attempt: login required)
- `home.archive_1_test_files` (last attempt: login required)
- `home.archive_2_waiting_files` (last attempt: login required)
- `home.archive_2_sent_files` (last attempt: login required)
- `home.archive_2_test_files` (last attempt: login required)
- `home.networking_interfaces` (last attempt: login required)
- `home.networking_services` (last attempt: login required)
- `home.networking_redirection` (last attempt: login required)
- `monitoring.network_interfaces_ethernet_0` (last attempt: login required)
- `monitoring.network_interfaces_ethernet_1` (last attempt: login required)
- `monitoring.network_interfaces_ethernet_2` (last attempt: login required)
- `monitoring.network_interfaces_wlan` (last attempt: login required)
- `monitoring.network_interfaces_ethernet_switch` (last attempt: login required)
- `monitoring.network_interfaces_gps` (last attempt: login required)
- `monitoring.rtp100_rtp100_variables` (last attempt: login required)
- `monitoring.rtp100_rtp100_files` (last attempt: login required)
- `monitoring.memory_nand` (last attempt: login required)
- `monitoring.memory_nor` (last attempt: login required)
- `monitoring.memory_ram` (last attempt: login required)
- `monitoring.other_devices_rtc` (last attempt: login required)
- `monitoring.other_devices_fpga` (last attempt: login required)
- `monitoring.other_devices_fram` (last attempt: login required)
- `monitoring.other_devices_adc` (last attempt: login required)
- `monitoring.other_devices_hdlc` (last attempt: login required)
- `monitoring.other_devices_mvbcs` (last attempt: login required)
- `monitoring.other_devices_modem` (last attempt: login required)
- `monitoring.other_devices_wifi` (last attempt: login required)
- `setup.meter_settings` (last attempt: login required)
- `setup.meter_channels_configuration` (last attempt: login required)
- `setup.meter_ftp_hosts` (last attempt: login required)
- `setup.meter_udp_clients` (last attempt: login required)
- `setup.meter_messages` (last attempt: login required)
- `setup.meter_calibration` (last attempt: login required)
- `setup.meter_thresholds_protection` (last attempt: login required)
- `setup.rtp100_rtp100_command` (last attempt: login required)
- `setup.ethernet_interfaces_ethernet_0` (last attempt: login required)
- `setup.ethernet_interfaces_ethernet_1` (last attempt: login required)
- `setup.ethernet_interfaces_ethernet_2` (last attempt: login required)
- `setup.ethernet_interfaces_switch_ethernet` (last attempt: login required)
- `setup.mobile_interface_mobile_settings` (last attempt: login required)
- `setup.wireless_interface_wlan` (last attempt: login required)
- `setup.wireless_interface_client_access` (last attempt: login required)
- `setup.dhcp_client_settings` (last attempt: login required)
- `setup.dhcp_server_settings` (last attempt: login required)
- `setup.dhcp_address_reservation` (last attempt: login required)
- `setup.services_gateway_dns` (last attempt: login required)
- `setup.services_servers` (last attempt: login required)
- `setup.services_ntp_servers` (last attempt: login required)
- `setup.services_gps` (last attempt: login required)
- `setup.services_port_forwarding` (last attempt: login required)
- `setup.services_proxy_settings` (last attempt: login required)
- `advanced.rtc_time_settings` (last attempt: login required)
- `advanced.rtc_time_zones` (last attempt: login required)
- `advanced.configuration_settings` (last attempt: login required)
- `advanced.information_device_settings` (last attempt: login required)
- `advanced.information_version` (last attempt: login required)
- `features.rtp100` (last attempt: login required)

</details>

## Excluded requests

> The scripts do **not** send the requests below – they change device state, end the session or are used to upload files.

| Request | Reason |
|---|---|
| `rem.cgi?query=440` | Restore Factory Default – resets the device to factory settings |
| `mpc105.cgi?query=1982` | device reboot |
| `mpc105j.cgi?query=122` | logout (ends the session) |
| `mpc105.cgi?query=121` | change password |
| `rem.cgi?query=402` | Export (configuration download action) |
| `rem.cgi?query=401`, `mpc105.cgi?query=310` | configuration Import and Firmware Upgrade (file uploads) |
| `rtp.cgi?query=440`, `443`, `445` | RTP100 writes and commands |
| all `set`, `set1`, `set2` fields | configuration writes |

## Scripts

Collecting all packages one by one: `rem102/scripts/collect.sh` (bash, curl, jq) or `rem102/scripts/collect.ps1` (Windows PowerShell 5.1+, no extra tools). Both write `collected.json`, `samples/<tab>/<id>.json` and `collect.log` to `rem102/results/`. `rem102-info.sh` is a shortcut to `collect.sh` that prints the result to stdout.

### Linux / macOS / Git Bash

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

| Variable | Meaning | Default |
|---|---|---|
| `REM_HOST` | device address | `192.168.128.1` |
| `REM_USER` / `REM_LEVEL` | `User`, `Admin`, `Super Admin` or level `1`, `2`, `3` | – (one of the two required) |
| `REM_PASS` | password | – (required) |
| `REM_BASE_URL` | full base URL (other port, HTTPS, prefix) | `http://$REM_HOST` |
| `REM_INSECURE` | `1` = accept a self-signed certificate | – |
| `REM_OUT_DIR` | output directory | `rem102/results/` |
| `REM_TIMEOUT`, `REM_DELAY` | per-request time limit and pause between requests, s | `10`, `0` |
| `REM_LOGIN_BODY` | full login body (overrides the default) | – |

### Windows (PowerShell)

`.sh` files do not run on Windows. Use `collect.cmd` (it runs `collect.ps1` with `-ExecutionPolicy Bypass`):

```powershell
cd C:\rem102\scripts
.\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'password'
```

- Without `-Password` the script asks for it (the simplest way, no quoting problems). Quote a name with a space; instead of the name you can pass `-Level 3`.
- `-LoginTest` makes a single login attempt and stops – a good way to check the password without many failed attempts.
- `-Discover` reads the device's own web files (no login) and writes `results\discover.json`; `-Probe` checks ports and paths (`results\probe.json`).
- `-BaseUrl https://192.168.128.1:8443 -Insecure` – another base URL or a self-signed certificate.
- Plain HTTP goes over a raw TCP connection, so unusual CGI replies are captured too (the reason is in the `error` field).
- If you run the `.ps1` directly and get an error about blocked scripts: `Unblock-File .\collect.ps1`.
- `collect.ps1` was tested in PowerShell 7 against a mock server, not yet in Windows PowerShell 5.1.

## Using it from LabVIEW

The request list is available as files in `rem102/data/`. Row order is identical in all files.

| File | Content | Use |
|---|---|---|
| `rem102-package-names.txt` | one package name per line (`tab.id`) | enum items (typedef) |
| `rem102-package-requests.txt` | one request per line, e.g. `/cgi-bin/mpc105.cgi?query=302` | string array indexed by the enum value |
| `rem102-packages.tsv` | columns with a header: `index, name, tab, id, cgi, query, request, method, min_level, requires, label, cyclic_ms, note` | lookup by name, gating on `min_level` and `requires` |

Names are `tab.id` because a bare `id` could repeat between tabs.

1. **Enum.** A typedef `REM102 Package` with the items from `rem102-package-names.txt`; the enum value is the 0-based line number.
2. **Request array.** *Read from Text File* (with end-of-line conversion), split into lines into a `String[]`; load it once at start-up.
3. **Login.** `POST /cgi-bin/mpc105.cgi` with `query=120&login=<1|2|3>&pwd=<password>`; keep the `CGISESSID` cookie and send it in the `Cookie` header.
4. **Request.** *Index Array* with the enum value → path with query; *HTTP Client* GET → response body as a string.
5. **Parsing.** *Unflatten From JSON* into the typedef of that package.

### Polymorphic VI

A polymorphic VI picks its instance by the **type** of the wired data, not by an enum value. So the enum selects the request and the type selects the parser. For a single VI that handles every package, a **malleable VI** (`.vim`, LabVIEW 2017 or newer) fits best:

```text
Get Package.vim
  inputs:   Package (enum REM102 Package), Type (any typedef – type specifier), Host, session (CGISESSID)
  outputs:  Data (of type Type), Raw Body (string), HTTP Status, error out
  inside:   Index Array(requests, Package) → HTTP GET → Unflatten From JSON(Type)
```

Each package only needs its own cluster typedef, with no separate instance. Until you know the real responses, use a `Get Package (Raw).vi` that returns just the string. Build the typedefs from samples collected with the script on a real device. Before reading, check the `min_level` (account level) and `requires` columns in the tsv (the `features.*` package tells whether the module is enabled).

## Assumptions and open points

Established from the device's own web files and from real responses (no longer assumptions): login `query=120` with the `login` (level) and `pwd` fields, the `CGISESSID` cookie, reads over GET with JSON replies, the `.cgi` CGI names, the request list from `Config/*.json`, the `~` separator being replaced by `&`, the “login required” reply format, and the “set” fields of events and measures being date filters (not writes).

1. **Password.** The last login (level 3) was rejected; until there is a valid session, 64 of 66 packages return “login required”.
2. **Content of the other replies.** Real replies are known only for `monitoring.network_interfaces_mobile` and `advanced.information_events`.
3. **Access levels.** `show_level` is understood as the minimum user level needed to show the menu entry; to be checked with the Admin and User accounts.
4. **The 502 “The CGI was not CGI/1.1 compliant” reply** appeared for non-existent query numbers in the old list; with correct queries it does not occur.
