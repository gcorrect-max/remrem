<#
.SYNOPSIS
  Windows (PowerShell) collector for the REM-102 web CGI: fetches ALL packages from rem102-packages.tsv one by one
  and saves the result for the documentation generator.

.DESCRIPTION
  Read-only requests only; write/reset/reboot/account queries are on a deny list.
  Needs only Windows PowerShell 5.1 (or PowerShell 7). No curl, jq, bash or python required.
  Plain http:// is spoken over a raw TCP socket (HTTP/1.0), so non-standard CGI replies are still captured.

  Login, as the device's own web page does it (Script/mainParent.js):
    POST /cgi-bin/mpc105.cgi   query=120&login=<1|2|3>&pwd=<password>      1 = User, 2 = Admin, 3 = Super Admin
    reply: JSON {"value":"fail"} on a wrong password; the session cookie is CGISESSID.
  Reads are plain GET requests with JSON replies; {"value":"fail"} means "authentication needed".

  Output (default: ..\results\):
    collected.json                 everything in one file (device, login, packages)  <- send this file on
    samples\<tab>\<id>.json        the same data split per package
    collect.log                    run log (no password)

.EXAMPLE
  .\collect.cmd -DeviceHost 192.168.128.1 -User "Super Admin" -Password 'secret'

.EXAMPLE
  .\collect.cmd -DeviceHost 192.168.128.1 -Level 3        (asks for the password)
  .\collect.cmd -DeviceHost 192.168.128.1 -Discover       (no login: reads the device's own web files)
  .\collect.cmd -DeviceHost 192.168.128.1 -Probe          (no login: finds ports/paths that answer)
  .\collect.cmd -DeviceHost 192.168.128.1 -Level 3 -LoginTest   (one login attempt only, then stop)

.NOTES
  This file is ASCII only on purpose (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#>
[CmdletBinding()]
param(
  [string]$DeviceHost = $(if ($env:REM_HOST) { $env:REM_HOST } else { '192.168.128.1' }),
  [string]$User       = $env:REM_USER,
  [string]$Password   = $env:REM_PASS,
  [int]$Level         = 0,
  [string]$LoginBody  = $env:REM_LOGIN_BODY,
  [string]$OutDir     = $env:REM_OUT_DIR,
  [int]$TimeoutSec    = 10,
  [int]$DelayMs       = 0,
  [string]$Tsv        = $env:REM_TSV,
  [string]$BaseUrl    = $env:REM_BASE_URL,
  [switch]$Insecure,
  [switch]$Probe,
  [switch]$Discover,
  [switch]$LoginTest,
  [switch]$StdOut
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$Base = Split-Path -Parent $PSScriptRoot
if (-not $BaseUrl) { $BaseUrl = "http://$DeviceHost" }
$BaseUrl = $BaseUrl.TrimEnd('/')
if (-not $Tsv)    { $Tsv = Join-Path $Base 'data\rem102-packages.tsv' }
if (-not $OutDir -and -not $StdOut) { $OutDir = Join-Path $Base 'results' }

$Utf8   = New-Object System.Text.UTF8Encoding($false)   # UTF-8 without BOM
$Latin1 = [System.Text.Encoding]::GetEncoding(28591)
$Deny   = 'query=(440|1982|402|401|122|121|1983|310|443|445)(&|$)'
$LoginPath = '/cgi-bin/mpc105.cgi'
$script:ReqTimeout = $TimeoutSec
$script:Cookies = @{}

$LogLines = New-Object System.Collections.Generic.List[string]
function Log([string]$m) { Write-Host $m; $LogLines.Add($m) }

# JSON string literal (quotes + escapes); $null -> null
function J([object]$v) {
  if ($null -eq $v) { return 'null' }
  return (ConvertTo-Json -InputObject ([string]$v) -Compress)
}

# body text -> JSON value: raw JSON when it parses, otherwise a JSON string, empty -> null
function BodyJson([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return 'null' }
  try { $null = ConvertFrom-Json -InputObject $text; return $text.Trim() } catch { return (J $text) }
}

function LevelFromUser([string]$u) {
  switch -regex ($u.Trim().ToLower()) {
    '^(1|user)$'         { return 1 }
    '^(2|admin)$'        { return 2 }
    '^(3|super ?admin)$' { return 3 }
  }
  return 0
}

if (-not $Probe -and -not $Discover) {   # -Probe and -Discover send no credentials
  if ($Level -lt 1) {
    if (-not $User) { $User = Read-Host 'User (User / Admin / Super Admin) or level 1/2/3' }
    $Level = LevelFromUser $User
    if ($Level -lt 1) { throw "Cannot map user '$User' to a level; use -Level 1 (User), 2 (Admin) or 3 (Super Admin)" }
  }
  if (-not $Password) {
    $sec = Read-Host 'Password' -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    try { $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
  }
  if (-not $LoginBody) { $LoginBody = 'query=120&login=' + $Level + '&pwd=' + [Uri]::EscapeDataString($Password) }
  if (-not (Test-Path -LiteralPath $Tsv)) { throw "Package list not found: $Tsv" }
}

Add-Type -AssemblyName System.Net.Http
if ($Insecure) { [Net.ServicePointManager]::ServerCertificateValidationCallback = { $true } }
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]'Tls,Tls11,Tls12' } catch { }

function CookieHeader {
  return (($script:Cookies.GetEnumerator() | ForEach-Object { $_.Key + '=' + $_.Value }) -join '; ')
}
function StoreCookie([string]$setCookie) {
  $pair = ($setCookie -split ';')[0]
  $i = $pair.IndexOf('=')
  if ($i -lt 1) { return }
  $n = $pair.Substring(0, $i).Trim(); $v = $pair.Substring($i + 1).Trim()
  if ($v -eq '' -or $v -eq 'deleted') { $script:Cookies.Remove($n) } else { $script:Cookies[$n] = $v }
}
# header lines for the log/JSON with the session value masked
function MaskHeaders([string[]]$lines) {
  return @($lines | ForEach-Object { $_ -replace '(?i)^(set-cookie:\s*[^=]+=)[^;]*', '$1<masked>' })
}

function Decode-Chunked([byte[]]$b) {
  $out = New-Object System.IO.MemoryStream
  $i = 0
  while ($i -lt $b.Length) {
    $j = $i
    while ($j -lt $b.Length -and $b[$j] -ne 10) { $j++ }
    $line = [System.Text.Encoding]::ASCII.GetString($b, $i, $j - $i).Trim()
    $semi = $line.IndexOf(';'); if ($semi -ge 0) { $line = $line.Substring(0, $semi) }
    if ($line -eq '') { $i = $j + 1; continue }
    try { $size = [Convert]::ToInt32($line, 16) } catch { break }
    if ($size -eq 0) { break }
    $i = $j + 1
    $take = [Math]::Min($size, $b.Length - $i)
    $out.Write($b, $i, $take)
    $i += $size
  }
  return , $out.ToArray()
}

# Raw HTTP/1.0 over TCP (http:// only). Returns Code, ContentType, Server, Error, Body, Headers (log-safe lines)
function Send-Raw([string]$Method, [string]$PathAndQuery, [string]$PostBody, [string]$Root) {
  $uri = [Uri]$Root
  $ms = New-Object System.IO.MemoryStream
  $tcp = New-Object System.Net.Sockets.TcpClient
  $err = $null
  try {
    $tmo = $script:ReqTimeout * 1000
    if (-not $tcp.ConnectAsync($uri.Host, $uri.Port).Wait($tmo)) { throw 'connect timeout' }
    $ns = $tcp.GetStream(); $ns.ReadTimeout = $tmo; $ns.WriteTimeout = $tmo
    $hostHdr = $uri.Host; if (-not $uri.IsDefaultPort) { $hostHdr = $uri.Host + ':' + $uri.Port }
    $bodyBytes = New-Object byte[] 0
    if ($Method -eq 'POST') { $bodyBytes = $Utf8.GetBytes($PostBody) }
    $h = "$Method $PathAndQuery HTTP/1.0`r`nHost: $hostHdr`r`nUser-Agent: rem102-collect`r`nAccept: */*`r`n"
    $ck = CookieHeader
    if ($ck) { $h += "Cookie: $ck`r`n" }
    if ($Method -eq 'POST') { $h += "Content-Type: application/x-www-form-urlencoded`r`nContent-Length: $($bodyBytes.Length)`r`n" }
    $h += "Connection: close`r`n`r`n"
    $hb = [System.Text.Encoding]::ASCII.GetBytes($h)
    $ns.Write($hb, 0, $hb.Length)
    if ($bodyBytes.Length -gt 0) { $ns.Write($bodyBytes, 0, $bodyBytes.Length) }
    $buf = New-Object byte[] 8192
    try {
      while (($n = $ns.Read($buf, 0, $buf.Length)) -gt 0) { $ms.Write($buf, 0, $n) }
    } catch [System.IO.IOException] { $err = 'read timeout or connection reset (partial reply kept)' }
  } catch {
    $e = $_.Exception
    while ($e.InnerException) { $e = $e.InnerException }
    $err = $e.Message
  } finally { $tcp.Close() }

  $bytes = $ms.ToArray()
  if ($bytes.Length -eq 0) {
    if (-not $err) { $err = 'empty reply (connection closed without data)' }
    return @{ Code = 0; ContentType = $null; Server = $null; Error = $err; Body = ''; Headers = @() }
  }
  # split headers / body
  $idx = -1; $skip = 0
  $lim = [Math]::Min($bytes.Length - 3, 16384)
  for ($k = 0; $k -lt $lim; $k++) {
    if ($bytes[$k] -eq 13 -and $bytes[$k + 1] -eq 10 -and $bytes[$k + 2] -eq 13 -and $bytes[$k + 3] -eq 10) { $idx = $k; $skip = 4; break }
    if ($bytes[$k] -eq 10 -and $bytes[$k + 1] -eq 10) { $idx = $k; $skip = 2; break }
  }
  if ($idx -lt 0) {
    $snip = $Latin1.GetString($bytes, 0, [Math]::Min(200, $bytes.Length)) -replace '\s+', ' '
    return @{ Code = 0; ContentType = $null; Server = $null; Error = "no HTTP header terminator in reply: $snip"; Body = $Utf8.GetString($bytes); Headers = @() }
  }
  $headText = $Latin1.GetString($bytes, 0, $idx)
  $lines = @($headText -split "`r?`n")
  if ($lines[0] -notmatch '^HTTP/\d\.\d\s+(\d{3})') {
    return @{ Code = 0; ContentType = $null; Server = $null; Error = ('no HTTP status line: ' + $lines[0]); Body = $Utf8.GetString($bytes); Headers = @(MaskHeaders $lines) }
  }
  $code = [int]$Matches[1]
  $ct = $null; $srv = $null; $chunked = $false
  foreach ($l in $lines | Select-Object -Skip 1) {
    if ($l -match '^([^:]+):\s*(.*)$') {
      $hn = $Matches[1].ToLower(); $hv = $Matches[2]
      if ($hn -eq 'content-type') { $ct = $hv }
      elseif ($hn -eq 'server') { $srv = $hv }
      elseif ($hn -eq 'set-cookie') { StoreCookie $hv }
      elseif ($hn -eq 'transfer-encoding' -and $hv -match 'chunked') { $chunked = $true }
    }
  }
  $bstart = $idx + $skip
  $body = New-Object byte[] ($bytes.Length - $bstart)
  [Array]::Copy($bytes, $bstart, $body, 0, $body.Length)
  if ($chunked) { $body = [byte[]](Decode-Chunked $body) }
  $enc = $Utf8
  if ($ct -and $ct -match 'charset=([A-Za-z0-9_-]+)') { try { $enc = [System.Text.Encoding]::GetEncoding($Matches[1]) } catch { } }
  return @{ Code = $code; ContentType = $ct; Server = $srv; Error = $err; Body = $enc.GetString($body); Headers = @(MaskHeaders $lines) }
}

# HttpClient path for https:// (cookies are handled by hand, like in Send-Raw)
$Handler = New-Object System.Net.Http.HttpClientHandler
$Handler.UseCookies = $false; $Handler.UseProxy = $false; $Handler.AllowAutoRedirect = $false
try { if ($Insecure) { $Handler.ServerCertificateCustomValidationCallback = [System.Net.Http.HttpClientHandler]::DangerousAcceptAnyServerCertificateValidator } } catch { }
$Client = New-Object System.Net.Http.HttpClient($Handler)
$Client.Timeout = [TimeSpan]::FromSeconds([Math]::Max(1, $TimeoutSec))

function Send-Http([string]$Method, [string]$PathAndQuery, [string]$PostBody, [string]$Root) {
  try {
    $meth = New-Object System.Net.Http.HttpMethod($Method)
    $req = New-Object System.Net.Http.HttpRequestMessage($meth, ($Root + $PathAndQuery))
    $ck = CookieHeader
    if ($ck) { $null = $req.Headers.TryAddWithoutValidation('Cookie', $ck) }
    if ($Method -eq 'POST') { $req.Content = New-Object System.Net.Http.StringContent($PostBody, $Utf8, 'application/x-www-form-urlencoded') }
    $resp = $Client.SendAsync($req).Result
    $ct = $null; if ($resp.Content.Headers.ContentType) { $ct = $resp.Content.Headers.ContentType.ToString() }
    $srv = $null; if ($resp.Headers.Server) { $srv = ($resp.Headers.Server | ForEach-Object { $_.ToString() }) -join ' ' }
    $hl = New-Object System.Collections.Generic.List[string]
    $hl.Add(('HTTP/' + $resp.Version + ' ' + [int]$resp.StatusCode))
    foreach ($hh in $resp.Headers) { foreach ($vv in $hh.Value) { $hl.Add($hh.Key + ': ' + $vv); if ($hh.Key -eq 'Set-Cookie') { StoreCookie $vv } } }
    return @{ Code = [int]$resp.StatusCode; ContentType = $ct; Server = $srv; Error = $null; Body = $resp.Content.ReadAsStringAsync().Result; Headers = @(MaskHeaders $hl.ToArray()) }
  } catch {
    $e = $_.Exception
    while ($e.InnerException) { $e = $e.InnerException }
    return @{ Code = 0; ContentType = $null; Server = $null; Error = $e.Message; Body = ''; Headers = @() }
  }
}

# Send-Req <GET|POST> <path-with-optional-query> [post-body] [root-url]
function Send-Req([string]$Method, [string]$PathAndQuery, [string]$PostBody, [string]$Root) {
  if (-not $Root) { $Root = $BaseUrl }
  if ($Root -like 'https://*') { return (Send-Http $Method $PathAndQuery $PostBody $Root) }
  return (Send-Raw $Method $PathAndQuery $PostBody $Root)
}

function RespJson($r) {
  if ($r.Code -eq 0) {   # no HTTP answer at all: keep the reason (timeout, connection closed, bad reply, ...)
    return ('{{"http_status":0,"content_type":null,"server":null,"error":{0},"body":{1}}}' -f (J $r.Error), (BodyJson $r.Body))
  }
  return ('{{"http_status":{0},"content_type":{1},"server":{2},"body":{3}}}' -f $r.Code, (J $r.ContentType), (J $r.Server), (BodyJson $r.Body))
}
# the device answers a read without a valid session with {"reference":"login","tag":"reply","value":"fail",...}
function IsAuthFail([string]$body) {
  try {
    $o = ConvertFrom-Json -InputObject $body
    return (($o -is [pscustomobject]) -and ($o.PSObject.Properties.Name -contains 'value') -and (([string]$o.value) -ieq 'fail'))
  } catch { return $false }
}

# ---------- -Probe: find where the web interface is (no login, harmless GETs only) ----------
if ($Probe) {
  $script:ReqTimeout = 5
  $hostOnly = ($DeviceHost -replace ':\d+$', '')
  $bases = @($BaseUrl, "http://$hostOnly", "http://${hostOnly}:8080", "http://${hostOnly}:8000", "http://${hostOnly}:8081",
             "https://$hostOnly", "https://${hostOnly}:8443") | Select-Object -Unique
  $paths = @('/', '/Config/settings.json', '/cgi-bin/mpc105.cgi?query=301', '/cgi-bin/rem.cgi?query=105')
  Log "== probe: looking for the web interface on $hostOnly (no credentials are sent)"
  $rowsJson = New-Object System.Collections.Generic.List[string]
  foreach ($b in $bases) {
    $u = [Uri]$b; $open = $false
    try { $tc = New-Object System.Net.Sockets.TcpClient; $open = $tc.ConnectAsync($u.Host, $u.Port).Wait(2000); $tc.Close() } catch { }
    if (-not $open) { Log ("{0}  port closed / no answer" -f $b); continue }
    foreach ($path in $paths) {
      $r = Send-Req 'GET' $path '' $b
      $snippet = (([string]$r.Body) -replace '\s+', ' ')
      if ($snippet.Length -gt 160) { $snippet = $snippet.Substring(0, 160) }
      Log ("{0}{1}  HTTP {2}  {3}  server={4}  {5} {6}" -f $b, $path, $r.Code, $r.ContentType, $r.Server, $snippet, $r.Error)
      $rowsJson.Add(('{{"base":{0},"path":{1},"http_status":{2},"content_type":{3},"server":{4},"error":{5},"bytes":{6},"snippet":{7}}}' -f `
        (J $b), (J $path), $r.Code, (J $r.ContentType), (J $r.Server), (J $r.Error), $Utf8.GetByteCount([string]$r.Body), (J $snippet)))
    }
  }
  if ($OutDir) {
    $null = New-Item -ItemType Directory -Force -Path $OutDir
    [IO.File]::WriteAllText((Join-Path $OutDir 'probe.json'), ('{{"host":{0},"probed_at":{1},"results":[{2}]}}' -f (J $hostOnly), (J (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')), ($rowsJson -join ',')), $Utf8)
    [IO.File]::WriteAllText((Join-Path $OutDir 'probe.log'), (($LogLines -join "`r`n") + "`r`n"), $Utf8)
    Write-Host "Saved: $OutDir\probe.json, $OutDir\probe.log  (send probe.json)"
  }
  return
}

# ---------- -Discover: read the device's OWN web files (no login) ----------
if ($Discover) {
  Log "== discover: reading the device web files from $BaseUrl (no credentials are sent)"
  $maxBytes = 1048576
  $files = New-Object System.Collections.Generic.List[string]
  $seen = @{}
  $queue = New-Object System.Collections.Queue
  foreach ($f in @('/', '/Config/settings.json', '/Config/home.json', '/Config/monitoring.json', '/Config/setup.json', '/Config/advanced.json')) { $queue.Enqueue($f) }
  $foundCgi = @{}; $foundCfg = @{}
  while ($queue.Count -gt 0 -and $seen.Count -lt 150) {
    $path = [string]$queue.Dequeue()
    if ($seen.ContainsKey($path)) { continue }
    $seen[$path] = $true
    $r = Send-Req 'GET' $path '' ''
    $bytes = $Utf8.GetByteCount([string]$r.Body)
    $bodyJson = 'null'
    if ($bytes -le $maxBytes -and -not [string]::IsNullOrEmpty($r.Body)) { $bodyJson = J $r.Body }
    Log ("{0}  HTTP {1}  {2}  {3} B  {4}" -f $path, $r.Code, $r.ContentType, $bytes, $r.Error)
    $files.Add(('{{"path":{0},"http_status":{1},"content_type":{2},"server":{3},"bytes":{4},"error":{5},"body":{6}}}' -f `
      (J $path), $r.Code, (J $r.ContentType), (J $r.Server), $bytes, (J $r.Error), $bodyJson))
    if ($r.Code -ne 200 -or $bytes -gt $maxBytes) { continue }
    $text = [string]$r.Body
    foreach ($m in [regex]::Matches($text, '(?i)<script[^>]+src\s*=\s*[''"]([^''"]+)[''"]')) {
      $u = $m.Groups[1].Value
      if ($u -notmatch '^(https?:)?//') { $queue.Enqueue($(if ($u.StartsWith('/')) { $u } else { '/' + $u })) }
    }
    foreach ($m in [regex]::Matches($text, '(?i)Config/[A-Za-z0-9_./-]+\.json')) { $foundCfg[$m.Value] = $true; $queue.Enqueue('/' + $m.Value) }
    foreach ($m in [regex]::Matches($text, '(?i)"web"\s*:\s*"([A-Za-z0-9_./-]+\.html)"')) { $queue.Enqueue('/' + $m.Groups[1].Value.TrimStart('/')) }
    foreach ($m in [regex]::Matches($text, '(?i)(cgi-bin/[A-Za-z0-9_.-]+|/file_upload)')) { $foundCgi[$m.Value] = $true }
  }
  # unauthenticated reads: show the real CGI answers ({"value":"fail"} = login needed)
  $checks = New-Object System.Collections.Generic.List[string]
  foreach ($p in @('/cgi-bin/mpc105.cgi?query=301', '/cgi-bin/rem.cgi?query=105', '/cgi-bin/rem.cgi?query=430', '/cgi-bin/rtp.cgi?query=441')) {
    $r = Send-Req 'GET' $p '' ''
    Log ("GET {0}  HTTP {1}  {2} {3}" -f $p, $r.Code, $r.Error, (([string]$r.Body) -replace '\s+', ' '))
    $checks.Add(('{{"method":"GET","path":{0},"response":{1},"headers":[{2}]}}' -f (J $p), (RespJson $r), (($r.Headers | ForEach-Object { J $_ }) -join ',')))
  }
  $cgiJson = '[' + ((($foundCgi.Keys | Sort-Object) | ForEach-Object { J $_ }) -join ',') + ']'
  $cfgJson = '[' + ((($foundCfg.Keys | Sort-Object) | ForEach-Object { J $_ }) -join ',') + ']'
  $out = ('{{"base_url":{0},"discovered_at":{1},"cgi_paths_mentioned":{2},"config_files_mentioned":{3},"cgi_checks":[{4}],"files":[{5}]}}' -f `
    (J $BaseUrl), (J (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')), $cgiJson, $cfgJson, ($checks -join ','), ($files -join ','))
  if ($StdOut) { Write-Output $out }
  if ($OutDir) {
    $null = New-Item -ItemType Directory -Force -Path $OutDir
    [IO.File]::WriteAllText((Join-Path $OutDir 'discover.json'), $out, $Utf8)
    [IO.File]::WriteAllText((Join-Path $OutDir 'discover.log'), (($LogLines -join "`r`n") + "`r`n"), $Utf8)
    Write-Host "Saved: $OutDir\discover.json, $OutDir\discover.log  (send discover.json)"
  }
  return
}

# ---------- login ----------
Log "== login: POST $BaseUrl$LoginPath (query=120, login=$Level)"
$lr = Send-Req 'POST' $LoginPath $LoginBody ''
$lv = $null
try { $lv = [string](ConvertFrom-Json -InputObject $lr.Body).value } catch { }
$sid = $null
if ($script:Cookies.ContainsKey('CGISESSID')) { $sid = [string]$script:Cookies['CGISESSID'] }
$levelFromCookie = $null
if ($sid -and $sid.Length -gt 4) { $levelFromCookie = 'ABCD'.IndexOf($sid.Substring(4, 1)) }   # same rule as the device's JS: slice(4,5)
$loginOk = ($null -ne $sid) -and ($lv -notmatch '(?i)^fail$') -and ($lr.Code -eq 200)
$namesJson = '[' + (($script:Cookies.Keys | ForEach-Object { J $_ }) -join ',') + ']'
$hdrJson = '[' + ((@($lr.Headers) | ForEach-Object { J $_ }) -join ',') + ']'
$lcJson = 'null'
if ($null -ne $levelFromCookie -and $levelFromCookie -ge 0) { $lcJson = [string]$levelFromCookie }
$loginJson = ('{{"http_status":{0},"content_type":{1},"server":{2},"error":{3},"headers":{4},"body":{5},"ok":{6},"value":{7},"cookie_names":{8},"level_requested":{9},"level_from_cookie":{10}}}' -f `
  $lr.Code, (J $lr.ContentType), (J $lr.Server), (J $lr.Error), $hdrJson, (BodyJson $lr.Body), $loginOk.ToString().ToLower(), (J $lv), $namesJson, $Level, $lcJson)
if ($loginOk) { Log ("   OK (HTTP {0}, value={1}); cookies: {2}; level from cookie: {3}" -f $lr.Code, $lv, ($script:Cookies.Keys -join ', '), $levelFromCookie) }
else { Log ("   WARNING: login did not succeed (HTTP {0}, value={1}, cookies: {2}) {3}" -f $lr.Code, $lv, ($script:Cookies.Keys -join ', '), $lr.Error)
       Log "   Check the password: every failed login is recorded in the device event log. Packages that need a login will come back as value=fail." }
if ($LoginTest) { Log "== login test only (-LoginTest): nothing else was requested"; $Client.Dispose(); return }

# ---------- packages, one by one ----------
$rows = @(Import-Csv -LiteralPath $Tsv -Delimiter "`t" -Encoding UTF8)
$total = $rows.Count
Log "== fetching $total packages (list: $Tsv)"
$entries = New-Object System.Collections.Generic.List[object]
$n = 0; $ok = 0; $bad = 0; $authFail = 0; $skipped = 0
foreach ($row in $rows) {
  $n++
  $request = $row.request
  $q = $request.IndexOf('?')
  $cgi = $request.Substring(0, $q); $query = $request.Substring($q + 1)
  if ($query -match $Deny) {
    Log "[$n/$total] $($row.name)  SKIPPED (deny list)"; $skipped++; continue
  }
  $r = Send-Req 'GET' $request '' ''
  $bytes = $Utf8.GetByteCount([string]$r.Body)
  $json = RespJson $r
  $note = ''
  if (($r.Code -lt 200) -or ($r.Code -ge 300) -or ($bytes -eq 0)) {
    $p = Send-Req 'POST' $cgi $query ''
    $json = $json.Substring(0, $json.Length - 1) + ',"post_retry":' + (RespJson $p) + '}'
    $note = "  (GET failed; POST: HTTP $($p.Code))"
  }
  $envelope = ('"label":{0},"cgi":{1},"query":{2},' -f (J $row.label), (J $cgi), (J $query)) + $json.Substring(1)
  $entries.Add([pscustomobject]@{ Tab = $row.tab; Id = $row.id; Json = '{' + $envelope })
  if (IsAuthFail $r.Body) { $authFail++; $note += '  LOGIN REQUIRED (value=fail)' }
  elseif (($r.Code -ge 200) -and ($r.Code -lt 300)) { $ok++ } else { $bad++ }
  Log ("[{0}/{1}] {2}  HTTP {3}  {4} B{5}" -f $n, $total, $row.name, $r.Code, $bytes, $note)
  if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
}

# ---------- assemble: { device, login, <tab>: { <id>: package } } ----------
$ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$dev = ('{{"base_url":{0},"collected_at":{1},"script":"collect.ps1","packages_total":{2},"packages_ok":{3},"packages_login_required":{4},"packages_failed":{5},"packages_skipped":{6}}}' -f `
  (J $BaseUrl), (J $ts), $total, $ok, $authFail, $bad, $skipped)
$parts = New-Object System.Collections.Generic.List[string]
$parts.Add('"device":' + $dev); $parts.Add('"login":' + $loginJson)
foreach ($tab in ($entries | ForEach-Object { $_.Tab } | Select-Object -Unique)) {
  $items = @($entries | Where-Object { $_.Tab -eq $tab } | ForEach-Object { (J $_.Id) + ':' + $_.Json })
  $parts.Add((J $tab) + ':{' + ($items -join ',') + '}')
}
$result = '{' + ($parts -join ',') + '}'
Log "== done: $ok of $total packages answered with data, $authFail need login, $bad failed, $skipped skipped"

if ($StdOut) { Write-Output $result }

if ($OutDir) {
  $null = New-Item -ItemType Directory -Force -Path (Join-Path $OutDir 'samples')
  [IO.File]::WriteAllText((Join-Path $OutDir 'collected.json'), $result, $Utf8)
  foreach ($e in $entries) {
    $dir = Join-Path $OutDir ('samples\' + $e.Tab)
    $null = New-Item -ItemType Directory -Force -Path $dir
    [IO.File]::WriteAllText((Join-Path $dir ($e.Id + '.json')), $e.Json, $Utf8)   # envelope without tab/id (they are the path)
  }
  [IO.File]::WriteAllText((Join-Path $OutDir 'collect.log'), (($LogLines -join "`r`n") + "`r`n"), $Utf8)
  Write-Host "Saved: $OutDir\collected.json, $OutDir\samples\, $OutDir\collect.log"
  Write-Host 'Next: send collected.json (the documentation is filled in from it).'
}
$Client.Dispose()
