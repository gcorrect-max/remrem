<#
.SYNOPSIS
  Windows (PowerShell) version of collect.sh: fetches ALL packages from rem102-packages.tsv one by one
  and saves the result for the documentation generator.

.DESCRIPTION
  Read-only requests only; write/reset/reboot/account queries are on a deny list.
  Needs only Windows PowerShell 5.1 (or PowerShell 7). No curl, jq, bash or python required.

  Output (default: ..\results\):
    collected.json                 everything in one file (device, login, packages)  <- send this file on
    samples\<tab>\<id>.json        the same data split per package
    collect.log                    run log (no password)

.EXAMPLE
  .\collect.cmd -DeviceHost 192.168.128.1 -User user -Password password

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\collect.ps1 -DeviceHost 192.168.128.1 -User user
  (without -Password you are asked for it)

.NOTES
  Assumptions to be confirmed by this very data set (see the "login" and "post_retry" fields):
    - login: POST /cgi-bin/mpc105.fcgi, query=120, fields username/pwd; cookies CGIUSERNAME/CGIUSERLEVEL
    - reads: GET; if GET fails (code != 2xx or empty body), one POST retry is made
  This file is ASCII only on purpose (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#>
[CmdletBinding()]
param(
  [string]$DeviceHost = $(if ($env:REM_HOST) { $env:REM_HOST } else { '192.168.128.1' }),
  [string]$User       = $env:REM_USER,
  [string]$Password   = $env:REM_PASS,
  [string]$LoginBody  = $env:REM_LOGIN_BODY,
  [string]$OutDir     = $env:REM_OUT_DIR,
  [int]$TimeoutSec    = 10,
  [int]$DelayMs       = 0,
  [string]$Tsv        = $env:REM_TSV,
  [switch]$StdOut
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2.0

$Base = Split-Path -Parent $PSScriptRoot
if (-not $Tsv)    { $Tsv = Join-Path $Base 'data\rem102-packages.tsv' }
if (-not $OutDir -and -not $StdOut) { $OutDir = Join-Path $Base 'results' }
if (-not $User)   { $User = Read-Host 'User' }
if (-not $Password) {
  $sec = Read-Host 'Password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
if (-not $LoginBody) { $LoginBody = "query=120&username=$User&pwd=$Password" }
if (-not (Test-Path -LiteralPath $Tsv)) { throw "Package list not found: $Tsv" }

Add-Type -AssemblyName System.Net.Http
$Utf8 = New-Object System.Text.UTF8Encoding($false)   # UTF-8 without BOM
$Deny = 'query=(440|1982|402|122|121|1983|410|442|443|445)(&|$)'

$LogLines = New-Object System.Collections.Generic.List[string]
function Log([string]$m) { Write-Host $m; $LogLines.Add($m) }

# JSON string literal (quotes + escapes)
function J([object]$v) {
  if ($null -eq $v) { return 'null' }
  return (ConvertTo-Json -InputObject ([string]$v) -Compress)
}

# body text -> JSON value: raw JSON when it parses, otherwise a JSON string, empty -> null
function BodyJson([string]$text) {
  if ([string]::IsNullOrWhiteSpace($text)) { return 'null' }
  try { $null = ConvertFrom-Json -InputObject $text; return $text.Trim() } catch { return (J $text) }
}

$Jar = New-Object System.Net.CookieContainer
$Handler = New-Object System.Net.Http.HttpClientHandler
$Handler.CookieContainer = $Jar
$Handler.UseCookies = $true
$Handler.UseProxy = $false          # the device is on the local network; ignore system proxy
$Client = New-Object System.Net.Http.HttpClient($Handler)
$Client.Timeout = [TimeSpan]::FromSeconds($TimeoutSec)

# Send-Req <GET|POST> <path-with-optional-query> [body]  ->  @{ Code; ContentType; Body }
function Send-Req([string]$Method, [string]$PathAndQuery, [string]$PostBody) {
  $url = "http://$DeviceHost$PathAndQuery"
  try {
    if ($Method -eq 'GET') {
      $resp = $Client.GetAsync($url).Result
    } else {
      $content = New-Object System.Net.Http.StringContent($PostBody, $Utf8, 'application/x-www-form-urlencoded')
      $resp = $Client.PostAsync($url, $content).Result
    }
    $ct = $null
    if ($resp.Content.Headers.ContentType) { $ct = $resp.Content.Headers.ContentType.ToString() }
    return @{ Code = [int]$resp.StatusCode; ContentType = $ct; Body = $resp.Content.ReadAsStringAsync().Result }
  } catch {
    return @{ Code = 0; ContentType = $null; Body = '' }
  }
}

function RespJson($r) {
  return ('{{"http_status":{0},"content_type":{1},"body":{2}}}' -f $r.Code, (J $r.ContentType), (BodyJson $r.Body))
}

# ---------- login ----------
Log "== login: POST http://$DeviceHost/cgi-bin/mpc105.fcgi (query=120), user: $User"
$loginPath = '/cgi-bin/mpc105.fcgi'
$lr = Send-Req 'POST' $loginPath $LoginBody
$cookies = @($Jar.GetCookies([Uri]"http://$DeviceHost$loginPath") | ForEach-Object { $_ })
$cookieNames = @($cookies | ForEach-Object { $_.Name })
$loginOk = ($cookieNames | Where-Object { $_ -like 'CGIUSER*' } | Measure-Object).Count -gt 0
$level = $cookies | Where-Object { $_.Name -eq 'CGIUSERLEVEL' } | Select-Object -First 1
$levelJson = if ($level) { J $level.Value } else { 'null' }
$namesJson = '[' + (($cookieNames | ForEach-Object { J $_ }) -join ',') + ']'
$loginJson = ('{{"http_status":{0},"content_type":{1},"body":{2},"ok":{3},"cookie_names":{4},"user_level":{5}}}' -f `
  $lr.Code, (J $lr.ContentType), (BodyJson $lr.Body), $loginOk.ToString().ToLower(), $namesJson, $levelJson)
if ($loginOk) { Log ("   OK (HTTP {0}); cookies: {1}" -f $lr.Code, ($cookieNames -join ', ')) }
else { Log ("   WARNING: no CGIUSER* cookies (HTTP {0}) - login may have failed; check -LoginBody. Continuing." -f $lr.Code) }

# ---------- packages, one by one ----------
$rows = @(Import-Csv -LiteralPath $Tsv -Delimiter "`t" -Encoding UTF8)
$total = $rows.Count
Log "== fetching $total packages (list: $Tsv)"
$entries = New-Object System.Collections.Generic.List[object]
$n = 0; $ok = 0; $bad = 0; $skipped = 0
foreach ($row in $rows) {
  $n++
  $request = $row.request
  $q = $request.IndexOf('?')
  $cgi = $request.Substring(0, $q); $query = $request.Substring($q + 1)
  if ($query -match $Deny) {
    Log "[$n/$total] $($row.name)  SKIPPED (deny list)"; $skipped++; continue
  }
  $r = Send-Req 'GET' $request ''
  $bytes = $Utf8.GetByteCount([string]$r.Body)
  $json = RespJson $r
  $note = ''
  if (($r.Code -lt 200) -or ($r.Code -ge 300) -or ($bytes -eq 0)) {
    $p = Send-Req 'POST' $cgi $query
    $json = $json.Substring(0, $json.Length - 1) + ',"post_retry":' + (RespJson $p) + '}'
    $note = "  (GET failed; POST: HTTP $($p.Code))"
  }
  $envelope = ('"label":{0},"cgi":{1},"query":{2},' -f (J $row.label), (J $cgi), (J $query)) + $json.Substring(1)
  $entries.Add([pscustomobject]@{ Tab = $row.tab; Id = $row.id; Json = '{' + $envelope })
  if (($r.Code -ge 200) -and ($r.Code -lt 300)) { $ok++ } else { $bad++ }
  Log ("[{0}/{1}] {2}  HTTP {3}  {4} B{5}" -f $n, $total, $row.name, $r.Code, $bytes, $note)
  if ($DelayMs -gt 0) { Start-Sleep -Milliseconds $DelayMs }
}

# ---------- assemble: { device, login, <tab>: { <id>: package } } ----------
$ts = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
$dev = ('{{"host":{0},"collected_at":{1},"script":"collect.ps1","packages_total":{2},"packages_http_2xx":{3},"packages_failed":{4},"packages_skipped":{5}}}' -f `
  (J $DeviceHost), (J $ts), $total, $ok, $bad, $skipped)
$parts = New-Object System.Collections.Generic.List[string]
$parts.Add('"device":' + $dev); $parts.Add('"login":' + $loginJson)
foreach ($tab in ($entries | ForEach-Object { $_.Tab } | Select-Object -Unique)) {
  $items = @($entries | Where-Object { $_.Tab -eq $tab } | ForEach-Object { (J $_.Id) + ':' + $_.Json })
  $parts.Add((J $tab) + ':{' + ($items -join ',') + '}')
}
$result = '{' + ($parts -join ',') + '}'
Log "== done: $ok of $total packages returned HTTP 2xx, $bad with an error, $skipped skipped"

if ($StdOut) { Write-Output $result }

if ($OutDir) {
  $null = New-Item -ItemType Directory -Force -Path (Join-Path $OutDir 'samples')
  [IO.File]::WriteAllText((Join-Path $OutDir 'collected.json'), $result, $Utf8)
  foreach ($e in $entries) {
    $dir = Join-Path $OutDir ('samples\' + $e.Tab)
    $null = New-Item -ItemType Directory -Force -Path $dir
    # per-package file: the envelope without tab/id (they are the file path)
    [IO.File]::WriteAllText((Join-Path $dir ($e.Id + '.json')), $e.Json, $Utf8)
  }
  [IO.File]::WriteAllText((Join-Path $OutDir 'collect.log'), (($LogLines -join "`r`n") + "`r`n"), $Utf8)
  Write-Host "Saved: $OutDir\collected.json, $OutDir\samples\, $OutDir\collect.log"
  Write-Host 'Next: send collected.json (the documentation is filled in from it).'
}
$Client.Dispose()
