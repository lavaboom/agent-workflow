@echo off
setlocal
set "AW=%AGENT_WORKFLOW_HOME%"
if "%AW%"=="" set "AW=C:\code\agent-workflow"
if not exist "%AW%\bin\agent-workflow.mjs" (
  echo agent-workflow was not found at "%AW%". Clone it there or set AGENT_WORKFLOW_HOME.
  exit /b 2
)
node "%AW%\bin\agent-workflow.mjs" init --project "%CD%" %*
