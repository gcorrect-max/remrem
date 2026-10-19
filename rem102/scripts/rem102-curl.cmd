@echo off
rem Launcher: runs rem102-curl.ps1 without changing the PowerShell execution policy.
rem Usage: rem102-curl.cmd "Super Admin" password [host]
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0rem102-curl.ps1" %*
