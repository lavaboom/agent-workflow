@echo off
setlocal
set "AW=%AGENT_WORKFLOW_HOME%"
if "%AW%"=="" set "AW=C:\code\agent-workflow"
if not exist "%AW%\bin\agent-workflow.mjs" (
  echo agent-workflow was not found at "%AW%". Clone it there or set AGENT_WORKFLOW_HOME.
  call :hold
  exit /b 2
)

rem The project is the folder this script lives in (a project's own copy). The template's copy, run by
rem path, takes the current folder, which must be a project root: a Start-menu, search or Win+R launch
rem starts in C:\Windows\System32, and adopting that is refused.
set "PROJECT=%~dp0"
set "PROJECT=%PROJECT:~0,-1%"
if /i "%PROJECT%"=="%AW%\template" set "PROJECT=%CD%"
if not exist "%PROJECT%\.git\" if not exist "%PROJECT%\docs\harness\manifest.json" (
  echo "%PROJECT%" is not a project root: no .git folder and no docs/harness/manifest.json.
  echo Open a terminal in the project folder and run this script there, or double-click the project's own fresh-init.cmd.
  call :hold
  exit /b 2
)

node "%AW%\bin\agent-workflow.mjs" init --project "%PROJECT%" %*
set "RC=%ERRORLEVEL%"
call :hold
exit /b %RC%

:hold
rem Double-clicked in Explorer the window would close with the result on it: keep it open until a key is pressed.
set "PARENT_FILE=%TEMP%\fresh-init-%RANDOM%.txt"
powershell -NoProfile -Command "$me = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $PID); $cmd = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $me.ParentProcessId); (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cmd.ParentProcessId)).Name" > "%PARENT_FILE%" 2>nul
set "PARENT="
if exist "%PARENT_FILE%" (
  set /p PARENT=<"%PARENT_FILE%"
  del "%PARENT_FILE%"
)
if /i "%PARENT%"=="explorer.exe" (
  echo.
  pause
)
exit /b 0
