@echo off
rem The Windows form of mc17-gate, for the hosts that run a hook's Windows command with no POSIX shell. Runs one gate
rem script under a Python 3: the first argument names the gate, the file <gate>.py beside this script is the gate, and
rem the remaining arguments, eight at most, are passed through to it as the host wrote them. Finds the interpreter as
rem mc17-gate does, by running each candidate with a version probe, %MC17_PYTHON% first, then `py -3`, `python3` and
rem `python`; the first that runs as Python 3 runs the gate, which owns stdin, stdout and stderr, and this script exits
rem with the gate's code.
rem Exits 2 with a message on stderr when no gate is named, when more than eight arguments follow it, when the gate file
rem is missing, or when no candidate runs; the lint-chat gate exits 1 in those cases, and so does the gate `dialect`
rem where its last argument is lint-chat, because a Stop hook that blocks keeps the turn from ending. Only builtins of
rem cmd are used, so the message still prints on a PATH that carries nothing, and no label is jumped to, so the script
rem reads the same with either line ending.
rem Delayed expansion stays off and no argument is put back together from pieces: each argument reaches the gate as
rem the host quoted it, expanded once, so a folder whose name holds &, ^, !, %, ( or ) works as any other.
rem Every candidate, the probe among them, runs isolated, -I -S, as mc-run runs a gate (the second review, N2): no
rem user site, no .pth file, no PYTHON variable and not the script's folder reaches the gate's path; -B writes no bytecode beside it; -X utf8 reads and
rem writes UTF-8. The gates import the standard library alone.
setlocal EnableExtensions DisableDelayedExpansion
set "here=%~dp0"
set "gate=%~1"
set "last=%~1"
if not "%~2"=="" set "last=%~2"
if not "%~3"=="" set "last=%~3"
if not "%~4"=="" set "last=%~4"
if not "%~5"=="" set "last=%~5"
if not "%~6"=="" set "last=%~6"
if not "%~7"=="" set "last=%~7"
if not "%~8"=="" set "last=%~8"
if not "%~9"=="" set "last=%~9"
set "refused=2"
if "%gate%"=="lint-chat" set "refused=1"
if "%gate%"=="dialect" if "%last%"=="lint-chat" set "refused=1"
if "%gate%"=="" (
  >&2 echo mc17-gate: no gate named
  exit /b 2
)
set "count=0"
for %%a in (%*) do set /a count+=1 >nul
if %count% GTR 9 (
  >&2 echo mc17-gate: %gate%: more than eight arguments follow the gate, and this launcher passes eight
  exit /b %refused%
)
if not exist "%here%%gate%.py" (
  >&2 echo mc17-gate: no such gate: %gate%
  exit /b %refused%
)
set "probe=import sys; sys.exit(sys.version_info[0] != 3)"
set "tried="
set "chosen="
if defined MC17_PYTHON set "tried=MC17_PYTHON=%MC17_PYTHON%"
if defined MC17_PYTHON ( "%MC17_PYTHON%" -I -S -c "%probe%" >nul 2>&1 && set "chosen=named" )
if "%chosen%"=="named" "%MC17_PYTHON%" -I -S -B -X utf8 "%here%%gate%.py" %2 %3 %4 %5 %6 %7 %8 %9
if "%chosen%"=="named" exit /b %errorlevel%
if defined tried (set "tried=%tried%, py -3") else (set "tried=py -3")
py -3 -I -S -c "%probe%" >nul 2>&1 && set "chosen=py"
if "%chosen%"=="py" py -3 -I -S -B -X utf8 "%here%%gate%.py" %2 %3 %4 %5 %6 %7 %8 %9
if "%chosen%"=="py" exit /b %errorlevel%
set "tried=%tried%, python3"
python3 -I -S -c "%probe%" >nul 2>&1 && set "chosen=python3"
if "%chosen%"=="python3" python3 -I -S -B -X utf8 "%here%%gate%.py" %2 %3 %4 %5 %6 %7 %8 %9
if "%chosen%"=="python3" exit /b %errorlevel%
set "tried=%tried%, python"
python -I -S -c "%probe%" >nul 2>&1 && set "chosen=python"
if "%chosen%"=="python" python -I -S -B -X utf8 "%here%%gate%.py" %2 %3 %4 %5 %6 %7 %8 %9
if "%chosen%"=="python" exit /b %errorlevel%
>&2 echo mc17-gate: %gate%: no python 3 runs on this host; tried %tried%
exit /b %refused%
