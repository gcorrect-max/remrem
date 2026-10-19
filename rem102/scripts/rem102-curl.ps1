<#
.SYNOPSIS
  REM-102: login -> read the device data -> logout, with plain curl.exe calls (Windows 10 and later).

.EXAMPLE
  .\rem102-curl.cmd "Super Admin" 'my-password'
  .\rem102-curl.cmd -User "Super Admin" -Password 'my-password' -DeviceHost 192.168.128.1

.NOTES
  User = User | Admin | Super Admin (or the level 1 | 2 | 3). Without -Password the script asks for it.
  Calls: POST /cgi-bin/mpc105.cgi (query=120, login=<level>, pwd) -> cookie CGISESSID;
         GET /cgi-bin/mpc105.cgi?query=302 (device data) and ?query=301 (versions);
         GET /cgi-bin/mpc105j.cgi?query=122 (logout; taken from the page's scripts, not yet run against the device).
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
$jar = [IO.Path]::GetTempFileName()
$pwdFile = [IO.Path]::GetTempFileName()
try {
  # the password goes to curl through a temporary file (url-encoded by curl), not through the command line
  [IO.File]::WriteAllText($pwdFile, $Password, (New-Object System.Text.UTF8Encoding($false)))

  Write-Host "== 1. login (level $level)"
  curl.exe -sS -w "`n" -c $jar -X POST "$base/cgi-bin/mpc105.cgi" --data "query=120" --data "login=$level" --data-urlencode "pwd@$pwdFile"
  if (-not (Select-String -Path $jar -Pattern 'CGISESSID' -Quiet)) {
    throw 'Login failed (no CGISESSID cookie). Check the password: every failed login is recorded in the device event log.'
  }

  Write-Host '== 2. device data (model, serial no., article no., ...)'
  $device = (curl.exe -sS -b $jar "$base/cgi-bin/mpc105.cgi?query=302") -join "`n"
  Write-Host $device
  try {
    Write-Host '-- summary'
    (ConvertFrom-Json -InputObject $device) | Where-Object { $_.tag -in 'devname', 'sn', 'pn', 'hostname' } |
      ForEach-Object { Write-Host ("{0}: {1}" -f $_.label, $_.value) }
  } catch { }

  Write-Host '== 3. software versions'
  curl.exe -sS -w "`n" -b $jar "$base/cgi-bin/mpc105.cgi?query=301"

  Write-Host '== 4. logout'
  curl.exe -sS -w "`n" -b $jar "$base/cgi-bin/mpc105j.cgi?query=122"
}
finally {
  Remove-Item -Force -ErrorAction SilentlyContinue $jar, $pwdFile
}
