<#
.SYNOPSIS
  REM-102: login -> read the device data -> end of session, with plain curl.exe calls (Windows 10 and later).

.EXAMPLE
  .\rem102-curl.cmd "Super Admin" 'my-password'
  .\rem102-curl.cmd -User "Super Admin" -Password 'my-password' -DeviceHost 192.168.128.1

.NOTES
  User = User | Admin | Super Admin (or the level 1 | 2 | 3). Without -Password the script asks for it.
  Calls: POST /cgi-bin/mpc105.cgi (query=120, login=<level>, pwd) -> cookie CGISESSID;
         GET /cgi-bin/mpc105.cgi?query=302 (device data) and ?query=301 (versions);
         no logout call: the page's logout CGI (mpc105j.cgi?query=122) returns 404 on this device, the session cookie is just dropped.
  ASCII only on purpose (Windows PowerShell 5.1 reads BOM-less files as ANSI).
#>
param(
  [Parameter(Position = 0)][string]$User,
  [Parameter(Position = 1)][string]$Password,
  [Parameter(Position = 2)][string]$DeviceHost = $(if ($env:REM_HOST) { $env:REM_HOST } else { '192.168.128.1' })
)
$ErrorActionPreference = 'Stop'
if (-not $User) { $User = Read-Host 'User (User / Admin / Super Admin or 1/2/3)' }
switch -regex ($User.Trim().ToLower()) {
  '^(1|user)$'         { $level = 1 }
  '^(2|admin)$'        { $level = 2 }
  '^(3|super ?admin)$' { $level = 3 }
  default { throw "Unknown user '$User': use User, Admin, Super Admin or 1, 2, 3" }
}
if (-not $Password) {
  $sec = Read-Host 'Password' -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
  try { $Password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
$base = "http://$DeviceHost"
$hdr = [IO.Path]::GetTempFileName()
$out = [IO.Path]::GetTempFileName()
$pwdFile = [IO.Path]::GetTempFileName()
try {
  # the password goes to curl through a temporary file (url-encoded by curl), not through the command line
  [IO.File]::WriteAllText($pwdFile, $Password, (New-Object System.Text.UTF8Encoding($false)))

  Write-Host "== 1. login (level $level)"
  curl.exe -sS -D $hdr -o $out -X POST "$base/cgi-bin/mpc105.cgi" --data "query=120" --data "login=$level" --data-urlencode "pwd@$pwdFile"
  $reply = [IO.File]::ReadAllText($out)
  Write-Host $reply
  $value = $null
  try { $value = [string](ConvertFrom-Json -InputObject $reply).value } catch { }
  # the session id comes from the Set-Cookie header (no cookie jar involved)
  $sid = $null
  foreach ($line in [IO.File]::ReadAllLines($hdr)) { if ($line -match '^(?i)Set-Cookie:\s*CGISESSID=([^;\s]*)') { $sid = $Matches[1] } }
  if (-not $sid) {
    if ($value -eq 'fail') {
      throw "Login rejected by the device (value=fail): wrong password for level $level. Every failed login is recorded in the device event log, so do not retry blindly."
    }
    Write-Host 'Response headers:'; Get-Content $hdr | Write-Host
    throw "No CGISESSID cookie in the reply (value='$value')."
  }
  $cookie = "Cookie: CGISESSID=$sid"

  Write-Host '== 2. device data (model, serial no., article no., ...)'
  $device = (curl.exe -sS -H $cookie "$base/cgi-bin/mpc105.cgi?query=302") -join "`n"
  Write-Host $device
  try {
    Write-Host '-- summary'
    (ConvertFrom-Json -InputObject $device) | Where-Object { $_.tag -in 'devname', 'sn', 'pn', 'hostname' } |
      ForEach-Object { Write-Host ("{0}: {1}" -f $_.label, $_.value) }
  } catch { }

  Write-Host '== 3. software versions'
  curl.exe -sS -w "`n" -H $cookie "$base/cgi-bin/mpc105.cgi?query=301"

  Write-Host '== 4. end of session (the device has no working logout CGI; the session cookie is simply dropped)'
}
finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $hdr, $out, $pwdFile
}
