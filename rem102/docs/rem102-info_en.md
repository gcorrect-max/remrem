# REM-102 – CGI API (read-only)

> Polish version: [`rem102-info.md`](rem102-info.md) · HTML: [`rem102-api_en.html`](rem102-api_en.html) · hub page: [`../index.html`](../index.html)

## Overview

Description of the CGI requests that the web interface of the **REM-102** device (Boa server, vendor page by HaslerRail) uses to fetch data. The list comes from files the device serves itself (`Config/*.json`), read with `collect.ps1 -Discover`. Only read requests are included.

> **Status (2026-10-19).** The login, CGI names, session cookie, access levels and reply format come from the device page's own scripts (`Script/*.js`). The latest collection from the device (logged in): **65 of 66** packages returned a reply, 0 needed a login, 1 ended with an HTTP error. Credentials (user names and passwords in the configuration) are replaced with `<redacted>` in the documentation.

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

Notes: `--data-urlencode` encodes the password the way the page's form does (`@`, `!`, `&` are safe). In PowerShell `curl` is an alias of `Invoke-WebRequest`: use `curl.exe` or the `collect.cmd` script (see “Scripts”). A wrong password returns `{ "reference":"login", ..., "value":"fail" }`.

### Where the model, serial number and article number are in the reply

The reply of step 2 (`advanced.information_device_settings`) is an array of `{type, tag, label, value}` items. Pick the fields you want by `tag`:

| Data | `tag` | Device `label` |
|---|---|---|
| Model (device name) | `devname` | Device Name |
| Serial number | `sn` | Serial Number |
| Article number | `pn` | Product Number |
| Hostname | `hostname` | Local Hostname |
| MAC addresses | `ethaddr`, `eth1addr`, `eth2addr` | MAC ethernet 0 / 1 / 2 |
| Machine and device types | `machine`, `widev`, `gpsdev`, `mdmdev` | Machine Type, Wifi / GPS / Modem device |

Software versions (step 3, `advanced.information_version`) are in the fields `kernel`, `ramdisk`, `storage`, `t5`, `p_rnt`, `u_rnt`, `dsp_rnt`, `f_cfg`, `cksum`. Printing the basic data with one command:

```bash
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302" \
  | jq -r '.[] | select(.tag=="devname" or .tag=="sn" or .tag=="pn") | "\(.label): \(.value)"'
```

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

A request without a valid session gets this reply (HTTP 200), and so does a failed login. The collector scripts count it as “login required”, not as data. A successful login returns the same shape with `"value":"ok"` and sets the `CGISESSID` cookie.

### Other “reply” answers

When a module is unavailable, the device returns an object of the same shape with a different `reference`: e.g. `{"reference":"enable_RTP_page","tag":"reply","value":"fail",...}` (RTP100 module disabled) or `{"reference":"get_RTP100_var","tag":"reply","value":"error",...}`. Only `reference: login` means “login required”.

### Field list (default.html, eth.html pages)

An array of objects with `type`, `reference`, `tag`, `label`, `color`, `options`, `value`. Types (from `globalFunc.js`): `text` (read-only), `input`, `password`, `check`, `select` (followed by `option` items), `bar` (signal quality 1–5), `note`, `menu` and `enable` (module flag: `value` = `true`/`false`). `tag` is the name of the write form field. Real example: `monitoring.network_interfaces_mobile`.

### Events (`advanced.information_events`)

An array: items `{"type":"head","column_no":N,"column_name":"..."}` describe the columns, and an item `{"type":"data","events":[...]}` holds rows with `ID`, `DATATIME`, `CODE`, `USER`, `DESCRIPTION`, `TIMET`. A real example is below.

### Tables (`home.ch_*_measures`, archives)

An array with two items: `{"type":"header","table_head":[{column_no, column_name, column_label}]}` describes the columns and `{"type":"data","table_rows":[{...}]}` holds the rows (for measures: `ID`, `DATA`, `TIMET`, `EAP`, `ENP`, `ERP`, `ERNP`; one row every 15 s, newest first). Real example: `home.ch_a_measures` (shortened in the documentation).

### Memory reads (`query=7&...`)

Real reply (`home.summary_meter_status`, `home.ch_a_energy`, `home.digital_io`): an array of `{"type":"text","reference":"energy","tag":"remshm_<block_offset>_<offset>","label":<tag>,"color","options","value"}` items. Consecutive fields are 32 bytes apart (`string_size=32`), values are strings; the meaning of a field follows from its position (the pages map `tag` to descriptions).

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
| `home.archive_1_test_files` | `/cgi-bin/rem.cgi?query=112&id=1` | 0 | The reply holds the FTP user and password; replaced with `&lt;redacted&gt;` in the documentation. |
| `home.archive_2_waiting_files` | `/cgi-bin/rem.cgi?query=107&id=2` | 0 |  |
| `home.archive_2_sent_files` | `/cgi-bin/rem.cgi?query=108&id=2` | 0 |  |
| `home.archive_2_test_files` | `/cgi-bin/rem.cgi?query=112&id=2` | 0 | In the run of 19 Oct 2026: HTTP 502 “The CGI was not CGI/1.1 compliant” (GET and POST); the same query for archive 1 answers normally. Cause not established. |
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
| `monitoring.rtp100_rtp100_variables` | `/cgi-bin/rtp.cgi?query=441` | 0 | The RTP100 module is disabled on this device: reply `value: error` (`reference: get_RTP100_var`). Requires enabled module: `features.rtp100`. |
| `monitoring.rtp100_rtp100_files` | `/cgi-bin/rtp.cgi?query=444` | 0 | The RTP100 module is disabled on this device: reply `value: error`. Requires enabled module: `features.rtp100`. |
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
| `setup.meter_ftp_hosts` | `/cgi-bin/rem.cgi?query=101` | 0 | The reply holds FTP host user names and passwords; they are replaced with `&lt;redacted&gt;` in the documentation and in the tracked copy of the results. |
| `setup.meter_udp_clients` | `/cgi-bin/rem.cgi?query=102` | 0 |  |
| `setup.meter_messages` | `/cgi-bin/rem.cgi?query=103` | 0 |  |
| `setup.meter_calibration` | `/cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` | 3 | Shared-memory read; show_level 3 in the menu (Super Admin). |
| `setup.meter_thresholds_protection` | `/cgi-bin/rem.cgi?query=111` | 0 |  |
| `setup.rtp100_rtp100_command` | `/cgi-bin/rtp.cgi?query=442` | 0 | The RTP100 module is disabled on this device: reply `value: error` (`reference: get_RTP100_cmd_var`). Requires enabled module: `features.rtp100`. |
| `setup.ethernet_interfaces_ethernet_0` | `/cgi-bin/mpc105.cgi?query=103` | 0 |  |
| `setup.ethernet_interfaces_ethernet_1` | `/cgi-bin/mpc105.cgi?query=104` | 0 |  |
| `setup.ethernet_interfaces_ethernet_2` | `/cgi-bin/mpc105.cgi?query=105` | 0 |  |
| `setup.ethernet_interfaces_switch_ethernet` | `/cgi-bin/mpc105.cgi?query=107` | 0 |  |
| `setup.mobile_interface_mobile_settings` | `/cgi-bin/mpc105.cgi?query=101` | 0 | The reply holds the APN user and password; replaced with `&lt;redacted&gt;` in the documentation. |
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
| `advanced.information_device_settings` | `/cgi-bin/mpc105.cgi?query=302` | 1 | Model (`devname`), serial number (`sn`), article number (`pn`, “Product Number”), hostname, MAC addresses, machine and device types. In the menu: show_level 1, write_level 3. |
| `advanced.information_events` | `/cgi-bin/mpc105.cgi?query=314` | 0 | Answers without a login (run of 19 Oct 2026). The menu's “set” field is a date picker form (`datetime`, year/month/day) – a filter, not a settings write. |
| `advanced.information_version` | `/cgi-bin/mpc105.cgi?query=301` | 0 | Software versions: fields `cgi`, `kernel`, `ramdisk`, `storage`, `t5`, `p_rnt`, `u_rnt`, `dsp_rnt`, `f_cfg`, `cksum`. |

### Features (`features`)

Module enable flags (`en_query` from the menu).

| Name | Request | min. level | Notes |
|---|---|---|---|
| `features.rtp100` | `/cgi-bin/rem.cgi?query=430` | 0 | On this device the RTP100 module is disabled: `{"reference":"enable_RTP_page","tag":"reply","value":"fail"}`. This is not the “login required” reply (`reference` ≠ `login`). When the module is enabled, the reply contains an item `{"type":"enable","value":"true"}` (rule from the page script). |

## Response examples

The examples come **only** from responses captured on a real device – nothing is made up. Packages without an example are waiting to be filled in after connecting to the device. The “login required” reply (`value: fail`) and HTTP errors are not examples.

Captured examples: 65 of 66.

How to fill them in:

```bash
REM_HOST=192.168.128.1 REM_USER="Super Admin" REM_PASS='password' ./rem102/scripts/collect.sh
python3 rem102/scripts/build-docs.py
```

### `home.summary_meter_status`

`GET /cgi-bin/rem.cgi?query=7&block_offset=10240&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=17&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_0",
    "label": "remshm_10240_0",
    "color": "black",
    "options": "",
    "value": "2026-10-19 02:37:44"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_32",
    "label": "remshm_10240_32",
    "color": "black",
    "options": "",
    "value": "Run"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_64",
    "label": "remshm_10240_64",
    "color": "black",
    "options": "",
    "value": "Invalid"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_96",
    "label": "remshm_10240_96",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_128",
    "label": "remshm_10240_128",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_10240_160",
    "label": "remshm_10240_160",
    "color": "black",
    "options": "",
    "value": "0.0"
  },
  "... (11 more items omitted)"
]
```

### `home.ch_a_energy`

`GET /cgi-bin/rem.cgi?query=7&block_offset=11264&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_0",
    "label": "remshm_11264_0",
    "color": "black",
    "options": "",
    "value": "-0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_32",
    "label": "remshm_11264_32",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_64",
    "label": "remshm_11264_64",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_96",
    "label": "remshm_11264_96",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_128",
    "label": "remshm_11264_128",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_11264_160",
    "label": "remshm_11264_160",
    "color": "black",
    "options": "",
    "value": "1.00000"
  },
  "... (13 more items omitted)"
]
```

### `home.ch_a_measures`

`GET /cgi-bin/rem.cgi?query=106&channel=0` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "ID",
        "column_label": "Id"
      },
      {
        "column_no": 2,
        "column_name": "TIMET",
        "column_label": "Local Date"
      },
      {
        "column_no": 3,
        "column_name": "DATA",
        "column_label": "UTC Date"
      },
      {
        "column_no": 4,
        "column_name": "EAP",
        "column_label": "Consumed"
      },
      {
        "column_no": 5,
        "column_name": "ENP",
        "column_label": "Regenerate"
      },
      {
        "column_no": 6,
        "column_name": "ERP",
        "column_label": "React. C"
      },
      {
        "column_no": 7,
        "column_name": "ERNP",
        "column_label": "React. R"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "ID": "50309",
        "DATA": "2026/10/19 02:37:30",
        "TIMET": "2026-10-19 02:37:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50308",
        "DATA": "2026/10/19 02:37:15",
        "TIMET": "2026-10-19 02:37:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50307",
        "DATA": "2026/10/19 02:37:00",
        "TIMET": "2026-10-19 02:37:00",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50306",
        "DATA": "2026/10/19 02:36:45",
        "TIMET": "2026-10-19 02:36:45",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50305",
        "DATA": "2026/10/19 02:36:30",
        "TIMET": "2026-10-19 02:36:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50304",
        "DATA": "2026/10/19 02:36:15",
        "TIMET": "2026-10-19 02:36:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      "... (114 more items omitted)"
    ]
  }
]
```

### `home.ch_b_energy`

`GET /cgi-bin/rem.cgi?query=7&block_offset=12288&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=19&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_0",
    "label": "remshm_12288_0",
    "color": "black",
    "options": "",
    "value": "-0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_32",
    "label": "remshm_12288_32",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_64",
    "label": "remshm_12288_64",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_96",
    "label": "remshm_12288_96",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_128",
    "label": "remshm_12288_128",
    "color": "black",
    "options": "",
    "value": "0.00"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_12288_160",
    "label": "remshm_12288_160",
    "color": "black",
    "options": "",
    "value": "1.00000"
  },
  "... (13 more items omitted)"
]
```

### `home.ch_b_measures`

`GET /cgi-bin/rem.cgi?query=106&channel=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "ID",
        "column_label": "Id"
      },
      {
        "column_no": 2,
        "column_name": "TIMET",
        "column_label": "Local Date"
      },
      {
        "column_no": 3,
        "column_name": "DATA",
        "column_label": "UTC Date"
      },
      {
        "column_no": 4,
        "column_name": "EAP",
        "column_label": "Consumed"
      },
      {
        "column_no": 5,
        "column_name": "ENP",
        "column_label": "Regenerate"
      },
      {
        "column_no": 6,
        "column_name": "ERP",
        "column_label": "React. C"
      },
      {
        "column_no": 7,
        "column_name": "ERNP",
        "column_label": "React. R"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "ID": "50309",
        "DATA": "2026/10/19 02:37:30",
        "TIMET": "2026-10-19 02:37:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50308",
        "DATA": "2026/10/19 02:37:15",
        "TIMET": "2026-10-19 02:37:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50307",
        "DATA": "2026/10/19 02:37:00",
        "TIMET": "2026-10-19 02:37:00",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50306",
        "DATA": "2026/10/19 02:36:45",
        "TIMET": "2026-10-19 02:36:45",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50305",
        "DATA": "2026/10/19 02:36:30",
        "TIMET": "2026-10-19 02:36:30",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      {
        "cell_type": "text",
        "ID": "50304",
        "DATA": "2026/10/19 02:36:15",
        "TIMET": "2026-10-19 02:36:15",
        "EAP": "0.0",
        "ENP": "0.0",
        "ERP": "0.0",
        "ERNP": "0.0"
      },
      "... (114 more items omitted)"
    ]
  }
]
```

### `home.digital_io`

`GET /cgi-bin/rem.cgi?query=7&block_offset=13312&byte_offset=0&data_size=1024&type=STRING&name=energy&memory=remshm&number=12&string_size=32` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_0",
    "label": "remshm_13312_0",
    "color": "black",
    "options": "",
    "value": "LOW"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_32",
    "label": "remshm_13312_32",
    "color": "black",
    "options": "",
    "value": "LOW"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_64",
    "label": "remshm_13312_64",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_96",
    "label": "remshm_13312_96",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_128",
    "label": "remshm_13312_128",
    "color": "black",
    "options": "",
    "value": "OPEN"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_13312_160",
    "label": "remshm_13312_160",
    "color": "black",
    "options": "",
    "value": "OPEN"
  },
  "... (6 more items omitted)"
]
```

### `home.archive_1_waiting_files`

`GET /cgi-bin/rem.cgi?query=107&id=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=109&id=1&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "Id": 1,
        "Start": "2026-10-19T02:23:30+0000",
        "Stop": "2026-10-19T02:30:45+0000",
        "filename": "rem102_1_21292853_1792377075.tgz"
      },
      {
        "Id": 2,
        "Start": "2026-10-19T02:16:00+0000",
        "Stop": "2026-10-19T02:23:15+0000",
        "filename": "rem102_1_21292853_1792376625.tgz"
      },
      {
        "Id": 3,
        "Start": "2026-10-19T02:08:30+0000",
        "Stop": "2026-10-19T02:15:45+0000",
        "filename": "rem102_1_21292853_1792376175.tgz"
      },
      {
        "Id": 4,
        "Start": "2026-10-19T02:01:00+0000",
        "Stop": "2026-10-19T02:08:15+0000",
        "filename": "rem102_1_21292853_1792375725.tgz"
      },
      {
        "Id": 5,
        "Start": "2026-10-19T01:53:30+0000",
        "Stop": "2026-10-19T02:00:45+0000",
        "filename": "rem102_1_21292853_1792375275.tgz"
      },
      {
        "Id": 6,
        "Start": "2026-10-19T01:46:00+0000",
        "Stop": "2026-10-19T01:53:15+0000",
        "filename": "rem102_1_21292853_1792374825.tgz"
      },
      "... (44 more items omitted)"
    ],
    "count": 1554
  }
]
```

### `home.archive_1_sent_files`

`GET /cgi-bin/rem.cgi?query=108&id=1` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=110&id=1&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [],
    "count": 4
  }
]
```

### `home.archive_1_test_files`

`GET /cgi-bin/rem.cgi?query=112&id=1` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "id",
    "label": "Archive",
    "color": "black",
    "options": "",
    "value": "1"
  },
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "destination1",
    "label": "Destination",
    "color": "black",
    "options": "",
    "value": "ftp.energyportal.com"
  },
  {
    "type": "text",
    "reference": "test_ftp",
    "tag": "remote1",
    "label": "Remote",
    "color": "black",
    "options": "",
    "value": "/"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "user1",
    "label": "User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "password1",
    "label": "Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  }
]
```

### `home.archive_2_waiting_files`

`GET /cgi-bin/rem.cgi?query=107&id=2` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=109&id=2&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [
      {
        "Id": 1,
        "Start": "2026-10-19T02:23:30+0000",
        "Stop": "2026-10-19T02:30:45+0000",
        "filename": "rem102_2_21292853_1792377075.tgz"
      },
      {
        "Id": 2,
        "Start": "2026-10-19T02:16:00+0000",
        "Stop": "2026-10-19T02:23:15+0000",
        "filename": "rem102_2_21292853_1792376625.tgz"
      },
      {
        "Id": 3,
        "Start": "2026-10-19T02:08:30+0000",
        "Stop": "2026-10-19T02:15:45+0000",
        "filename": "rem102_2_21292853_1792376175.tgz"
      },
      {
        "Id": 4,
        "Start": "2026-10-19T02:01:00+0000",
        "Stop": "2026-10-19T02:08:15+0000",
        "filename": "rem102_2_21292853_1792375725.tgz"
      },
      {
        "Id": 5,
        "Start": "2026-10-19T01:53:30+0000",
        "Stop": "2026-10-19T02:00:45+0000",
        "filename": "rem102_2_21292853_1792375275.tgz"
      },
      {
        "Id": 6,
        "Start": "2026-10-19T01:46:00+0000",
        "Stop": "2026-10-19T01:53:15+0000",
        "filename": "rem102_2_21292853_1792374825.tgz"
      },
      "... (44 more items omitted)"
    ],
    "count": 1557
  }
]
```

### `home.archive_2_sent_files`

`GET /cgi-bin/rem.cgi?query=108&id=2` · HTTP 200

```json
[
  {
    "type": "header",
    "table_head": [
      {
        "column_no": 1,
        "column_name": "Id",
        "column_label": "Id",
        "cell_type": "text"
      },
      {
        "column_no": 2,
        "column_name": "Start",
        "column_label": "Start (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 3,
        "column_name": "Stop",
        "column_label": "Stop (UTC)",
        "cell_type": "text"
      },
      {
        "column_no": 4,
        "column_name": "filename",
        "column_label": "File",
        "cell_type": "link",
        "method": "query=110&id=2&from=0"
      }
    ]
  },
  {
    "type": "data",
    "table_rows": [],
    "count": 4
  }
]
```

### `home.networking_interfaces`

`GET /cgi-bin/mpc105.cgi?query=500` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth0",
    "label": "ETH0",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth1",
    "label": "ETH1",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "eth2",
    "label": "ETH2",
    "color": "black",
    "options": "Down",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "wlan0",
    "label": "WLAN",
    "color": "black",
    "options": "Down",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "mobile",
    "label": "Mobile",
    "color": "black",
    "options": "Down",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "interface",
    "tag": "gps",
    "label": "GPS",
    "color": "black",
    "options": "Up",
    "value": "Enabled"
  },
  "... (3 more items omitted)"
]
```

### `home.networking_services`

`GET /cgi-bin/mpc105.cgi?query=501` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "services",
    "tag": "web",
    "label": "Web Server",
    "color": "green",
    "options": "",
    "value": "Enabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "ftp",
    "label": "FTP Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "telnet",
    "label": "Telnet Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "ssh",
    "label": "SSH Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "tftp",
    "label": "TFTP Server",
    "color": "grey",
    "options": "",
    "value": "Disabled"
  },
  {
    "type": "text",
    "reference": "services",
    "tag": "tftp",
    "label": "T5RUN PLC",
    "color": "green",
    "options": "",
    "value": "Enabled"
  },
  "... (4 more items omitted)"
]
```

### `home.networking_redirection`

`GET /cgi-bin/mpc105.cgi?query=502` · HTTP 200

```json
[]
```

### `monitoring.network_interfaces_ethernet_0`

`GET /cgi-bin/mpc105.cgi?query=3` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": "192.168.128.1"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "mac",
    "label": "Mac Address",
    "color": "black",
    "options": "",
    "value": "00:03:D9:01:0B:7E"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "ipbrod",
    "label": "IP Brodcast",
    "color": "black",
    "options": "",
    "value": "192.168.128.255"
  },
  {
    "type": "text",
    "reference": "eth0",
    "tag": "mask",
    "label": "IP Subnet Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  "... (14 more items omitted)"
]
```

### `monitoring.network_interfaces_ethernet_1`

`GET /cgi-bin/mpc105.cgi?query=4` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth1",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp ON"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": "RUNNING"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "mac",
    "label": "Mac Address",
    "color": "black",
    "options": "",
    "value": "00:03:D9:01:0B:7F"
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "ipbrod",
    "label": "IP Brodcast",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "eth1",
    "tag": "mask",
    "label": "IP Subnet Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  "... (14 more items omitted)"
]
```

### `monitoring.network_interfaces_ethernet_2`

`GET /cgi-bin/mpc105.cgi?query=5` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "eth2",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "eth2",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_wlan`

`GET /cgi-bin/mpc105.cgi?query=6` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wlan0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "wlan0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
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

### `monitoring.network_interfaces_ethernet_switch`

`GET /cgi-bin/mpc105.cgi?query=14` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "br0",
    "tag": "protocoltype",
    "label": "Protocol Type",
    "color": "black",
    "options": "",
    "value": "dhcp OFF"
  },
  {
    "type": "text",
    "reference": "br0",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.network_interfaces_gps`

`GET /cgi-bin/mpc105.cgi?query=16` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "rmc",
    "tag": "rmc",
    "label": "RMC  ",
    "color": "black",
    "options": "",
    "value": "$GNRMC,,V,,,,,,,,,,N*4D"
  },
  {
    "type": "text",
    "reference": "status",
    "tag": "status",
    "label": "Status",
    "color": "black",
    "options": "",
    "value": "Invalid"
  },
  {
    "type": "text",
    "reference": "time",
    "tag": "time",
    "label": "UTC Time",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "latitude",
    "tag": "latitude",
    "label": "Latitude (Decimal Degrees)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "longitude",
    "tag": "longitude",
    "label": "Longitude (Decimal Degrees)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "speed",
    "tag": "speed",
    "label": "Speed (Km/h)",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.rtp100_rtp100_variables`

`GET /cgi-bin/rtp.cgi?query=441` · HTTP 200

```json
{
  "reference": "get_RTP100_var",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `monitoring.rtp100_rtp100_files`

`GET /cgi-bin/rtp.cgi?query=444` · HTTP 200

```json
{
  "reference": "get_RTP100_files",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `monitoring.memory_nand`

`GET /cgi-bin/mpc105.cgi?query=23` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Size",
    "label": "Size",
    "color": "black",
    "options": "",
    "value": "1.8G"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "45.8M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "1.7G"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "2%"
  }
]
```

### `monitoring.memory_nor`

`GET /cgi-bin/mpc105.cgi?query=24` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Size",
    "label": "Size",
    "color": "black",
    "options": "",
    "value": "51.0M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "7.3M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "43.7M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "14%"
  }
]
```

### `monitoring.memory_ram`

`GET /cgi-bin/mpc105.cgi?query=25` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "nor",
    "tag": "Total",
    "label": "Total",
    "color": "black",
    "options": "",
    "value": "254.9M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Used",
    "label": "Used",
    "color": "black",
    "options": "",
    "value": "96.8M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Available",
    "label": "Available",
    "color": "black",
    "options": "",
    "value": "158.2M"
  },
  {
    "type": "text",
    "reference": "nor",
    "tag": "Use",
    "label": "Use",
    "color": "black",
    "options": "",
    "value": "38.0"
  }
]
```

### `monitoring.other_devices_rtc`

`GET /cgi-bin/mpc105.cgi?query=7` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "rtc",
    "tag": "RTC",
    "label": "UTC date and time",
    "color": "black",
    "options": "",
    "value": "2026-10-19 02:37:46"
  }
]
```

### `monitoring.other_devices_fpga`

`GET /cgi-bin/mpc105.cgi?query=8` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "fpga",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.3 [Jun 23 2016 13:30:09]"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Sw  ",
    "label": "FPGA Sw  ",
    "color": "black",
    "options": "",
    "value": "01.09"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Hw  ",
    "label": "FPGA Hw  ",
    "color": "black",
    "options": "",
    "value": "01"
  },
  {
    "type": "text",
    "reference": "fpga",
    "tag": "FPGA Info",
    "label": "FPGA Info",
    "color": "black",
    "options": "",
    "value": "07/02/2020 - 15:20:16"
  }
]
```

### `monitoring.other_devices_fram`

`GET /cgi-bin/mpc105.cgi?query=9` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "fram",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.0 [May 28 2013 10:31:14]"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "F-RAM    ",
    "label": "F-RAM    ",
    "color": "black",
    "options": "",
    "value": "Ramtron FM25V10"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "Size     ",
    "label": "Size     ",
    "color": "black",
    "options": "",
    "value": "131072 bytes"
  },
  {
    "type": "text",
    "reference": "fram",
    "tag": "Serial Num",
    "label": "Serial Num",
    "color": "black",
    "options": "",
    "value": "FFFFFFFFFFFFFF"
  }
]
```

### `monitoring.other_devices_adc`

`GET /cgi-bin/mpc105.cgi?query=10` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.0 [Oct 18 2013 10:55:41]"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_rtc_v_bat",
    "label": "RTC Voltage Battery",
    "color": "black",
    "options": "",
    "value": "3.16V"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_temp",
    "label": "Temperature",
    "color": "black",
    "options": "",
    "value": "41.21°C"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_33v",
    "label": "3.3V Voltage",
    "color": "black",
    "options": "",
    "value": "3.30V"
  },
  {
    "type": "text",
    "reference": "i2c_adc",
    "tag": "adc_5v",
    "label": "5V Voltage",
    "color": "black",
    "options": "",
    "value": "4.99V"
  }
]
```

### `monitoring.other_devices_hdlc`

`GET /cgi-bin/mpc105.cgi?query=11` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "hdlc",
    "tag": "Version  ",
    "label": "Not loaded",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `monitoring.other_devices_mvbcs`

`GET /cgi-bin/mpc105.cgi?query=12` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "1.4 [Feb 11 2020 10:20:45]"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Chip ID  ",
    "label": "Chip ID  ",
    "color": "black",
    "options": "",
    "value": "0x2005"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Model    ",
    "label": "Model    ",
    "color": "black",
    "options": "",
    "value": "MVBCS1"
  },
  {
    "type": "text",
    "reference": "mvbcf",
    "tag": "Version  ",
    "label": "Version  ",
    "color": "black",
    "options": "",
    "value": "5"
  }
]
```

### `monitoring.other_devices_modem`

`GET /cgi-bin/mpc105.cgi?query=17` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "modem",
    "tag": "mi",
    "label": "Manufactory",
    "color": "black",
    "options": "",
    "value": "Telit"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "mm",
    "label": "Model",
    "color": "black",
    "options": "",
    "value": "LE910C1-EU"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "mr",
    "label": "Version",
    "color": "black",
    "options": "",
    "value": "25.20.223"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "sd",
    "label": "SIM inserted",
    "color": "black",
    "options": "",
    "value": "No"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "si",
    "label": "IMSI",
    "color": "black",
    "options": "",
    "value": "+CMEERROR"
  },
  {
    "type": "text",
    "reference": "modem",
    "tag": "op",
    "label": "Operator Name",
    "color": "black",
    "options": "",
    "value": " Vodafone CZ "
  },
  "... (4 more items omitted)"
]
```

### `monitoring.other_devices_wifi`

`GET /cgi-bin/mpc105.cgi?query=18` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wifi",
    "tag": "essid",
    "label": "ESSID",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "mode",
    "label": "Mode",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "freq",
    "label": "Frequency (GHz)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "rate",
    "label": "Bit Rate (Mb/s)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "wifi",
    "tag": "linkq",
    "label": "Link Quality",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "bar",
    "reference": "wifi",
    "tag": "pw",
    "label": "Power Level",
    "color": "red",
    "options": "",
    "value": "0"
  }
]
```

### `setup.meter_settings`

`GET /cgi-bin/rem.cgi?query=105` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "settings",
    "tag": "evn",
    "label": "EMS Addressing (EMSn.EVNn.ns)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period:",
    "color": "black",
    "options": "",
    "value": "15"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "15 seconds",
    "value": "15"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "30 seconds",
    "value": "30"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "1 minute",
    "value": "60"
  },
  {
    "type": "option",
    "reference": "settings",
    "tag": "period",
    "label": "Time Reference Period",
    "color": "black",
    "options": "5 minutes (legal)",
    "value": "300"
  },
  {
    "type": "check",
    "reference": "settings",
    "tag": "disable_dhs",
    "label": "Disable DHS",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.meter_channels_configuration`

`GET /cgi-bin/rem.cgi?query=100` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "tool",
    "tag": "enable0",
    "label": "Line A",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "select",
    "reference": "tool",
    "tag": "type0",
    "label": "- Type",
    "color": "black",
    "options": "",
    "value": "DC"
  },
  {
    "type": "option",
    "reference": "tool",
    "tag": "type0",
    "label": "Type",
    "color": "black",
    "options": "AC",
    "value": "AC"
  },
  {
    "type": "option",
    "reference": "tool",
    "tag": "type0",
    "label": "Type",
    "color": "black",
    "options": "DC",
    "value": "DC"
  },
  {
    "type": "input",
    "reference": "tool",
    "tag": "Vn0",
    "label": "- Nominal Voltage Sensor (Vn)",
    "color": "black",
    "options": "",
    "value": "3000"
  },
  {
    "type": "input",
    "reference": "tool",
    "tag": "In0",
    "label": "- Nominal Current Sensor (In)",
    "color": "black",
    "options": "",
    "value": "2000"
  },
  "... (18 more items omitted)"
]
```

### `setup.meter_ftp_hosts`

`GET /cgi-bin/rem.cgi?query=101` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ftp",
    "tag": "enable0",
    "label": "Server #1",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "destination0",
    "label": "- Destination",
    "color": "black",
    "options": "",
    "value": "ftp.energyportal.com"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "remote0",
    "label": "- Remote",
    "color": "black",
    "options": "",
    "value": "/"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "user0",
    "label": "- User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "password0",
    "label": "- Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ftp",
    "tag": "interval0",
    "label": "- Samples for file",
    "color": "black",
    "options": "",
    "value": "30"
  },
  "... (16 more items omitted)"
]
```

### `setup.meter_udp_clients`

`GET /cgi-bin/rem.cgi?query=102` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "udp",
    "tag": "enable0",
    "label": "Server #1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "udp",
    "tag": "broadcast0",
    "label": "- Broadcast",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "udp",
    "tag": "interface0",
    "label": "- Interface",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "eth0",
    "value": "eth0"
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "eth1",
    "value": "eth1"
  },
  {
    "type": "option",
    "reference": "udp",
    "tag": "interface0",
    "label": "Interface",
    "color": "black",
    "options": "ppp0",
    "value": "ppp0"
  },
  "... (12 more items omitted)"
]
```

### `setup.meter_messages`

`GET /cgi-bin/rem.cgi?query=103` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVI",
    "label": "Voltages and Currents (VI) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enER",
    "label": "Powers (ER) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enES",
    "label": "Energy Summary (ES) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enTL",
    "label": "Location and Time (TL) ",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVSHA",
    "label": "Custom on CH A",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "msg",
    "tag": "enVSHB",
    "label": "Custom on CH B",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.meter_calibration`

`GET /cgi-bin/rem.cgi?query=7&block_offset=8192&byte_offset=0&data_size=1024&type=DINT&name=energy&memory=remshm&number=2` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_8192_0",
    "label": "remshm_8192_0",
    "color": "black",
    "options": "",
    "value": "0"
  },
  {
    "type": "text",
    "reference": "energy",
    "tag": "remshm_8192_4",
    "label": "remshm_8192_4",
    "color": "black",
    "options": "",
    "value": "0"
  }
]
```

### `setup.meter_thresholds_protection`

`GET /cgi-bin/rem.cgi?query=111` · HTTP 200

```json
[
  {
    "type": "select",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "",
    "value": "-1"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "None",
    "value": "-1"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "A",
    "value": "0"
  },
  {
    "type": "option",
    "reference": "protection",
    "tag": "chn",
    "label": "Line To Protect",
    "color": "black",
    "options": "B",
    "value": "1"
  },
  {
    "type": "input",
    "reference": "protection",
    "tag": "ovmh",
    "label": "Over Voltage Max High [%Vn]",
    "color": "black",
    "options": "",
    "value": "124"
  },
  {
    "type": "input",
    "reference": "protection",
    "tag": "ovml",
    "label": "Over Voltage Max Low [%Vn]",
    "color": "black",
    "options": "",
    "value": "116"
  },
  "... (9 more items omitted)"
]
```

### `setup.rtp100_rtp100_command`

`GET /cgi-bin/rtp.cgi?query=442` · HTTP 200

```json
{
  "reference": "get_RTP100_cmd_var",
  "tag": "reply",
  "label": "reply",
  "value": "error",
  "execute": "",
  "cancel": ""
}
```

### `setup.ethernet_interfaces_ethernet_0`

`GET /cgi-bin/mpc105.cgi?query=103` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "eth0",
    "tag": "bonding",
    "label": "Redundancy on ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "eth0",
    "tag": "mirroring",
    "label": "Mirroring on ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "eth0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": "192.168.128.1"
  },
  {
    "type": "input",
    "reference": "eth0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  {
    "type": "select",
    "reference": "eth0",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "auto"
  },
  "... (5 more items omitted)"
]
```

### `setup.ethernet_interfaces_ethernet_1`

`GET /cgi-bin/mpc105.cgi?query=104` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "eth1",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth1",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth1",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "auto",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth1",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-FD",
    "value": "100BaseT-FD"
  },
  "... (3 more items omitted)"
]
```

### `setup.ethernet_interfaces_ethernet_2`

`GET /cgi-bin/mpc105.cgi?query=105` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "eth2",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "eth2",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": "255.255.255.0"
  },
  {
    "type": "select",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": "10BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "auto",
    "value": "auto"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-FD",
    "value": "100BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "100BaseT-HD",
    "value": "100BaseT-HD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "10BaseT-FD",
    "value": "10BaseT-FD"
  },
  {
    "type": "option",
    "reference": "eth2",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "10BaseT-HD",
    "value": "10BaseT-HD"
  }
]
```

### `setup.ethernet_interfaces_switch_ethernet`

`GET /cgi-bin/mpc105.cgi?query=107` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "br0",
    "tag": "switch1_2",
    "label": "Enable switch ETH0 and ETH1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "br0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "br0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "br0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.mobile_interface_mobile_settings`

`GET /cgi-bin/mpc105.cgi?query=101` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ppp",
    "tag": "modem",
    "label": "Start on boot",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ppp",
    "tag": "prio",
    "label": "PPP priority",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ppp",
    "tag": "dns",
    "label": "DNS priority",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "timeout",
    "label": "Connection Timeout",
    "color": "black",
    "options": "",
    "value": "300"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "apn",
    "label": "APN",
    "color": "black",
    "options": "",
    "value": "internet"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "phone",
    "label": "Phone Number",
    "color": "black",
    "options": "",
    "value": "*99***4#"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "user",
    "label": "User",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  },
  {
    "type": "input",
    "reference": "ppp",
    "tag": "password",
    "label": "Password",
    "color": "black",
    "options": "",
    "value": "<redacted>"
  }
]
```

### `setup.wireless_interface_wlan`

`GET /cgi-bin/mpc105.cgi?query=106` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "wlan0",
    "tag": "wifi",
    "label": "Start on boot",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "wlan0",
    "tag": "dhcp",
    "label": "DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "ip",
    "label": "IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "mask",
    "label": "Mask",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "wlan0",
    "tag": "speed",
    "label": "Speed",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.wireless_interface_client_access`

`GET /cgi-bin/mpc105.cgi?query=204` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "wifi",
    "tag": "Priority 4",
    "label": "Network",
    "color": "black",
    "options": "",
    "value": "Priority 4"
  },
  {
    "type": "input",
    "reference": "wifi",
    "tag": "ssid0",
    "label": "ESSID",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "NONE",
    "value": "NONE"
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "WEP",
    "value": "WEP"
  },
  {
    "type": "option",
    "reference": "wifi",
    "tag": "key_mgmt0",
    "label": "Key management protocols",
    "color": "black",
    "options": "WPA-PSK",
    "value": "WPA-PSK"
  },
  "... (34 more items omitted)"
]
```

### `setup.dhcp_client_settings`

`GET /cgi-bin/mpc105.cgi?query=200` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "hostname",
    "label": "DHCP Hostname (option 12)",
    "color": "black",
    "options": "",
    "value": "REM102"
  },
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "clientID",
    "label": "DHCP Client ID (option 61)",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "dhcpc",
    "tag": "timeout",
    "label": "DHCP Timeout (0 = DHCP Mode 2)",
    "color": "black",
    "options": "",
    "value": "0"
  }
]
```

### `setup.dhcp_server_settings`

`GET /cgi-bin/mpc105.cgi?query=208` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "dhcps",
    "tag": "server",
    "label": "Enable DHCP server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "select",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "",
    "value": "ETH0"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "ETH0",
    "value": "ETH0"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "ETH1",
    "value": "ETH1"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "SWITCH",
    "value": "SWITCH"
  },
  {
    "type": "option",
    "reference": "dhcps",
    "tag": "interface",
    "label": "Interface",
    "color": "black",
    "options": "WLAN",
    "value": "WLAN"
  },
  "... (3 more items omitted)"
]
```

### `setup.dhcp_address_reservation`

`GET /cgi-bin/mpc105.cgi?query=209` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "resip",
    "tag": "Host00",
    "label": "row00",
    "color": "black",
    "options": "col00",
    "value": "Host00"
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_ID00",
    "label": "row00",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_IP00",
    "label": "row00",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  {
    "type": "text",
    "reference": "resip",
    "tag": "Host01",
    "label": "row01",
    "color": "black",
    "options": "col00",
    "value": "Host01"
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_ID01",
    "label": "row01",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "resip",
    "tag": "DHCP_HOST_IP01",
    "label": "row01",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  "... (24 more items omitted)"
]
```

### `setup.services_gateway_dns`

`GET /cgi-bin/mpc105.cgi?query=201` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "gateway",
    "tag": "defgw",
    "label": "Default Gateway IP Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gateway",
    "tag": "dns1",
    "label": "DNS1",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gateway",
    "tag": "dns2",
    "label": "DNS2",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.services_servers`

`GET /cgi-bin/mpc105.cgi?query=202` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "server",
    "tag": "httpd",
    "label": "Enable WEB server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "webpwd",
    "label": "WEB user to system user",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "root",
    "label": "Disable root login",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "telnetd",
    "label": "Disable TELNET server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "sshd",
    "label": "Disable SSH server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "server",
    "tag": "ftpd",
    "label": "Disable FTP server",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  "... (9 more items omitted)"
]
```

### `setup.services_ntp_servers`

`GET /cgi-bin/mpc105.cgi?query=203` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "ntp",
    "tag": "service",
    "label": "Run as server on port 123",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ntp",
    "tag": "oneshot",
    "label": "Quit after clock is set",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ntp",
    "tag": "ntpdhcp",
    "label": "NTP Server Address from DHCP",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ntp",
    "tag": "ntp1",
    "label": "NTP Server 1 Address",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "input",
    "reference": "ntp",
    "tag": "ntp2",
    "label": "NTP Server 2 Address",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `setup.services_gps`

`GET /cgi-bin/mpc105.cgi?query=205` · HTTP 200

```json
[
  {
    "type": "check",
    "reference": "gps",
    "tag": "gps",
    "label": "Start on boot",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "gps",
    "tag": "update",
    "label": "Update clock",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "input",
    "reference": "gps",
    "tag": "dtime",
    "label": "Synchronization deviation [s] ",
    "color": "black",
    "options": "",
    "value": "2"
  },
  {
    "type": "select",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "",
    "value": "ttyS3"
  },
  {
    "type": "option",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "slave",
    "value": "slave"
  },
  {
    "type": "option",
    "reference": "gps",
    "tag": "device",
    "label": "Serial device",
    "color": "black",
    "options": "ttyS1",
    "value": "ttyS1"
  },
  "... (23 more items omitted)"
]
```

### `setup.services_port_forwarding`

`GET /cgi-bin/mpc105.cgi?query=207` · HTTP 200

```json
[
  {
    "FORWARDING": ""
  },
  {
    "rule0": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT00",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT00",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP00",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO00",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule1": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT01",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT01",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP01",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO01",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule2": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT02",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT02",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP02",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO02",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule3": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT03",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT03",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP03",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO03",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule4": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT04",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT04",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP04",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO04",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule5": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT05",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT05",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP05",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO05",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule6": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT06",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT06",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP06",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO06",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule7": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT07",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT07",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP07",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO07",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule8": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT08",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT08",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP08",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO08",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule9": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT09",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT09",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP09",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO09",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule10": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT10",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT10",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP10",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO10",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule11": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT11",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT11",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP11",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO11",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule12": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT12",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT12",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP12",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO12",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule13": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT13",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT13",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP13",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO13",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule14": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT14",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT14",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP14",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO14",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule15": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT15",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT15",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP15",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO15",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule16": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT16",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT16",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP16",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO16",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule17": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT17",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT17",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP17",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO17",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule18": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT18",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT18",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP18",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO18",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ],
    "rule19": [
      {
        "type": "input",
        "reference": "pfw",
        "tag": "SRCPORT19",
        "label": "Source port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTPORT19",
        "label": "Destination port",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "input",
        "reference": "pfw",
        "tag": "DSTIP19",
        "label": "Destination address",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "select",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "",
        "value": ""
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "tcp",
        "value": "tcp"
      },
      {
        "type": "option",
        "reference": "pfw",
        "tag": "PROTO19",
        "label": "Protocol",
        "color": "black",
        "options": "udp",
        "value": "udp"
      }
    ]
  }
]
```

### `setup.services_proxy_settings`

`GET /cgi-bin/mpc105.cgi?query=220` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_HOST00",
    "label": "row00",
    "color": "black",
    "options": "col00",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_LPATH00",
    "label": "row00",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_RPATH00",
    "label": "row00",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_HOST01",
    "label": "row01",
    "color": "black",
    "options": "col00",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_LPATH01",
    "label": "row01",
    "color": "black",
    "options": "col01",
    "value": ""
  },
  {
    "type": "input",
    "reference": "proxy",
    "tag": "PROXY_RPATH01",
    "label": "row01",
    "color": "black",
    "options": "col02",
    "value": ""
  },
  "... (24 more items omitted)"
]
```

### `advanced.rtc_time_settings`

`GET /cgi-bin/mpc105.cgi?query=303` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "update",
    "tag": "update",
    "label": "Update",
    "color": "black",
    "options": "",
    "value": "disable"
  },
  {
    "type": "input",
    "reference": "year",
    "tag": "year",
    "label": "Year",
    "color": "black",
    "options": "",
    "value": "2026"
  },
  {
    "type": "input",
    "reference": "month",
    "tag": "month",
    "label": "Month",
    "color": "black",
    "options": "",
    "value": "10"
  },
  {
    "type": "input",
    "reference": "day",
    "tag": "day",
    "label": "Day",
    "color": "black",
    "options": "",
    "value": "19"
  },
  {
    "type": "input",
    "reference": "hour",
    "tag": "hour",
    "label": "Hour",
    "color": "black",
    "options": "",
    "value": "02"
  },
  {
    "type": "input",
    "reference": "minute",
    "tag": "minute",
    "label": "Minute",
    "color": "black",
    "options": "",
    "value": "37"
  },
  {
    "type": "input",
    "reference": "second",
    "tag": "second",
    "label": "Second",
    "color": "black",
    "options": "",
    "value": "50"
  }
]
```

### `advanced.rtc_time_zones`

`GET /cgi-bin/mpc105.cgi?query=305` · HTTP 200

```json
[
  {
    "type": "select",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Time Zone",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Universal Time Coordinated",
    "color": "black",
    "options": "Universal Time Coordinated",
    "value": "UTC"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Central European Time",
    "color": "black",
    "options": "Central European Time",
    "value": "CET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Eastern European Time",
    "color": "black",
    "options": "Eastern European Time",
    "value": "EET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "Western European Time",
    "color": "black",
    "options": "Western European Time",
    "value": "WET"
  },
  {
    "type": "option",
    "reference": "timezone",
    "tag": "timezone",
    "label": "India",
    "color": "black",
    "options": "India Time",
    "value": "Calcutta"
  },
  "... (36 more items omitted)"
]
```

### `advanced.configuration_settings`

`GET /cgi-bin/rem.cgi?query=113` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "ftp",
    "tag": "ftphost0",
    "label": "FTP Server #1",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "uploaddcs0",
    "label": " - Upload to server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "downloaddcs0",
    "label": " - Download from server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "text",
    "reference": "ftp",
    "tag": "ftphost1",
    "label": "FTP Server #2",
    "color": "black",
    "options": "checked",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "uploaddcs1",
    "label": " - Upload to server",
    "color": "black",
    "options": "",
    "value": ""
  },
  {
    "type": "check",
    "reference": "ftp",
    "tag": "downloaddcs1",
    "label": " - Download from server",
    "color": "black",
    "options": "",
    "value": ""
  }
]
```

### `advanced.information_device_settings`

`GET /cgi-bin/mpc105.cgi?query=302` · HTTP 200

```json
[
  {
    "type": "input",
    "reference": "info",
    "tag": "sn",
    "label": "Serial Number",
    "color": "black",
    "options": "",
    "value": "21292853"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "pn",
    "label": "Product Number",
    "color": "blalk",
    "options": "",
    "value": "5.6602.013/01_A"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "devname",
    "label": "Device Name",
    "color": "blalk",
    "options": "",
    "value": "REM102-G-G-S-T-W-8-GS-O-000"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "hostname",
    "label": "Local Hostname",
    "color": "blalk",
    "options": "",
    "value": "REM102"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "ethaddr",
    "label": "MAC ethernet 0",
    "color": "blalk",
    "options": "",
    "value": "00:03:D9:01:0B:7E"
  },
  {
    "type": "input",
    "reference": "info",
    "tag": "eth1addr",
    "label": "MAC ethernet 1",
    "color": "blalk",
    "options": "",
    "value": "00:03:D9:01:0B:7F"
  },
  "... (18 more items omitted)"
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
        "ID": "3739",
        "DATATIME": "2026-10-19 02:37:44",
        "CODE": "1",
        "USER": "superadmin",
        "DESCRIPTION": "Login authorized",
        "TIMET": "1792377464"
      },
      {
        "ID": "3738",
        "DATATIME": "2026-10-19 02:37:14",
        "CODE": "1",
        "USER": "superadmin",
        "DESCRIPTION": "Login authorized",
        "TIMET": "1792377434"
      },
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

### `advanced.information_version`

`GET /cgi-bin/mpc105.cgi?query=301` · HTTP 200

```json
[
  {
    "type": "text",
    "reference": "cgi",
    "tag": "cgi",
    "label": "MCG105",
    "color": "black",
    "options": "",
    "value": "1.5. 27423"
  },
  {
    "type": "text",
    "reference": "kernel",
    "tag": "kernel",
    "label": "Kernel",
    "color": "black",
    "options": "",
    "value": "Linux 2.6.29.1-rem102-1.0.0 #349 PREEMPT Thu Jan 23 17:11:05 CET 2020"
  },
  {
    "type": "text",
    "reference": "ramdisk",
    "tag": "ramdisk",
    "label": "System Disk",
    "color": "black",
    "options": "",
    "value": "01.21.00 build 4"
  },
  {
    "type": "text",
    "reference": "storage",
    "tag": "storage",
    "label": "Application Disk",
    "color": "black",
    "options": "",
    "value": "01.21.00 build 4"
  },
  {
    "type": "text",
    "reference": "t5",
    "tag": "t5",
    "label": "T5RUN PLC",
    "color": "black",
    "options": "",
    "value": "PRISMA runtime - Linux Multithreaded - V8.6 000217-RNT041."
  },
  {
    "type": "text",
    "reference": "p_rnt",
    "tag": "p_rnt",
    "label": "Production RNT",
    "color": "black",
    "options": "",
    "value": "000178-RNT172-31 October 26, 2017 - 12:00:00 UTC"
  },
  "... (5 more items omitted)"
]
```

### `features.rtp100`

`GET /cgi-bin/rem.cgi?query=430` · HTTP 200

```json
{
  "reference": "enable_RTP_page",
  "tag": "reply",
  "label": "reply",
  "value": "fail",
  "execute": "",
  "cancel": ""
}
```

<details><summary>To be filled in (1)</summary>

- `home.archive_2_test_files` (last attempt: HTTP 502)

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

### Login, read and logout – ready-made scripts with parameters

The user and the password are given on the command line (`User`, `Admin`, `Super Admin` or the level `1`, `2`, `3`). The scripts log in, read the device data (`query=302`) and the versions (`query=301`), and log out.

```bash
./rem102/scripts/rem102-curl.sh "Super Admin" 'password' [host]
```

```powershell
cd C:\rem102\scripts
.\rem102-curl.cmd "Super Admin" 'password' [host]
```

The `.cmd` file lives in `rem102\scripts`, so run it from that folder or by its full path: `C:\rem102\scripts\rem102-curl.cmd "Super Admin" 'password'`. If the password contains `%`, `^`, `&` or `"`, leave the password argument out: the script then asks for it and nothing gets mangled.

The password reaches `curl` through stdin or a temporary file, so it does not show in the process list. The bare `curl` calls (level 3):

```bash
LEVEL=3; PASS='password'; HOST=192.168.128.1; JAR=$(mktemp)
printf '%s' "$PASS" | curl -sS -w '\n' -c "$JAR" -X POST "http://$HOST/cgi-bin/mpc105.cgi" --data "query=120" --data "login=$LEVEL" --data-urlencode "pwd@-"
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=302"
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105.cgi?query=301"
curl -sS -b "$JAR" "http://$HOST/cgi-bin/mpc105j.cgi?query=122"
rm -f "$JAR"
```

The logout (`mpc105j.cgi?query=122`) comes from the page's scripts and has not been run against the device yet.

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

### Simplest: one `System Exec` call

One command line does the login, the data read and the logout: `curl` handles several requests in one run and keeps the session in a cookie file, so there is no session id to extract. *Format Into String* parameters in order: cookie file (any writable path, e.g. in the temp folder), host, level (1/2/3), password, cookie file, host, cookie file, host.

```text
"C:\Windows\System32\curl.exe" -sS --max-time 20 -w "\n#END#\n" -c "%s" -X POST "http://%s/cgi-bin/mpc105.cgi" --data "query=120" --data "login=%d" --data-urlencode "pwd=%s" --next -sS -w "\n#END#\n" -b "%s" "http://%s/cgi-bin/mpc105.cgi?query=302" --next -sS -w "\n#END#\n" -b "%s" "http://%s/cgi-bin/mpc105j.cgi?query=122"
```

Split *standard output* on the `#END#` marker (*Search and Split String*) into three parts: (1) the login reply (`"value":"ok"` or `fail`), (2) the device data (a JSON array, see below), (3) the logout reply. With a wrong password part (2) holds the “login required” reply. Without the logout, drop the third group (from the second `--next`). A password with `%`, `^`, `&` or `"` may break the line – then use the password-file version below. Tested with `curl` against a mock device.

Without `System Exec`: *HTTP Client Open Handle* (with a cookie file) → *HTTP Client POST* (body `query=120&login=3&pwd=<URL-encoded password>`, header `Content-Type: application/x-www-form-urlencoded`) → *HTTP Client GET* → *HTTP Client Close Handle*. Not tested against this device.

### Separate `System Exec` calls (curl, with the password-file version)

`System Exec.vi` runs `curl.exe` (Windows 10 and later). Every call is a separate process, so the session is carried by the `CGISESSID` cookie value, which you read from the login reply. `System Exec` inputs: *command line*, *working directory* (e.g. the application folder), *wait until completion* = TRUE; outputs: *standard output*, *standard error*, *return code* (0 = curl performed the request; 7 = could not connect, 28 = timeout). Build the command lines with *Format Into String* (`%s` = string, `%d` = number).

1. **Login** (`%s` = host, `%d` = level 1/2/3, `%s` = path of the password file):

```text
"C:\Windows\System32\curl.exe" -sS -i --max-time 10 -X POST "http://%s/cgi-bin/mpc105.cgi" --data "query=120" --data "login=%d" --data-urlencode "pwd@%s"
```

   From *standard output* (headers + body) extract with *Match Regular Expression*: the session id `CGISESSID=([^;\s]+)` (sub-match 1) and the result `"value"\s*:\s*"([^"]*)"` (`ok` or `fail`). No session id or `fail` = login error (wrong level or password); every failed login is recorded in the device's event log.

2. **Read the device data** (`%s` = session id, `%s` = host):

```text
"C:\Windows\System32\curl.exe" -sS --max-time 10 -H "Cookie: CGISESSID=%s" "http://%s/cgi-bin/mpc105.cgi?query=302"
```

   *Standard output* is a JSON array; *Unflatten From JSON* into an array of a cluster with the string fields `type`, `reference`, `tag`, `label`, `color`, `options`, `value`. Find a field by `tag`: `devname` (model), `sn` (serial number), `pn` (article number). Software versions: the same call with `query=301`; any other package from `rem102-package-requests.txt` – put its path in place of `/cgi-bin/mpc105.cgi?query=302`.

3. **Logout**:

```text
"C:\Windows\System32\curl.exe" -sS --max-time 10 -H "Cookie: CGISESSID=%s" "http://%s/cgi-bin/mpc105j.cgi?query=122"
```

Notes:

- **Password:** write it with *Write to Text File* to a temporary file (no end-of-line), pass the path in `pwd@<file>` (curl URL-encodes the value) and delete the file after the login. That way special characters (`%`, `^`, `&`, `"`) cannot break the command line and the password does not stay in the process command line. A simpler but less robust form: `--data-urlencode "pwd=%s"`.
- **32-bit LabVIEW** on 64-bit Windows does not see `C:\Windows\System32\curl.exe` (redirected to `SysWOW64`). Use `C:\Windows\Sysnative\curl.exe` or ship a `curl.exe` with your application and give its full path.
- Do not use redirections (`>`) or pipes (`|`) in the command line; use curl's `-o` and `-D` options to write to a file.
- The logout (`mpc105j.cgi?query=122`) comes from the page's scripts and has not been run against the device yet.

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

Established from the device's own web files and from real responses (no longer assumptions): login `query=120` with the `login` (level) and `pwd` fields (confirmed by logging in as Super Admin), the `CGISESSID` cookie, reads over GET with JSON replies, the `.cgi` CGI names, the request list from `Config/*.json`, the `~` separator being replaced by `&`, the “login required” reply format, and the “set” fields of events and measures being date filters (not writes).

1. **Admin and User accounts.** The collection was made as Super Admin (level 3). Whether `show_level` and `write_level` behave as described and which packages are available to lower levels is to be checked.
2. **`home.archive_2_test_files`** returns 502 (GET and POST) while the same query for archive 1 works; the cause is not established.
3. **The RTP100 module** is disabled on this device; its replies (`value: error` / `fail`) describe the missing module, not the data format. They must be collected again on a device with RTP100 enabled.
4. **The 502 “The CGI was not CGI/1.1 compliant” reply** appeared for non-existent query numbers in the old list; with correct queries it does not occur.
