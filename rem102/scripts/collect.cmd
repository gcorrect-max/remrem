@echo off
rem Launcher: runs collect.ps1 without changing the PowerShell execution policy.
rem Usage: collect.cmd -DeviceHost 192.168.128.1 -User user -Password password
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0collect.ps1" %*
