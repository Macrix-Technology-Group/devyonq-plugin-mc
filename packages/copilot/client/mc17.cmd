@echo off
rem The Windows launcher of the mc17 client, for PowerShell and cmd (ARCH D19). It hands the command line, as cmd passed
rem it, to lib\launch.ps1 in Windows PowerShell under the system root, which reads the path of node from the credential
rem store through PasswordVault and starts the client in an environment built from nothing. Its exit code is the
rem client's. No label is jumped to, so the script reads the same with either line ending. The command PowerShell runs
rem sets PSModulePath to PowerShell's own modules before anything else and calls no command to run the script, so a
rem module planted in a folder of the caller's PSModulePath stands in for nothing (the second review, N1).
setlocal EnableExtensions DisableDelayedExpansion
set "mc_script=%~dp0lib\launch.ps1"
set "mc_argc="
set "mc_args=%*"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command "$env:PSModulePath = $PSHOME + '\Modules'; & ([ScriptBlock]::Create([IO.File]::ReadAllText($env:mc_script)))"
exit /b %errorlevel%
