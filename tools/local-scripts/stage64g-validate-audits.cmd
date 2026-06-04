@echo off
setlocal
cd /d "%~dp0\..\.."

call npm.cmd run audit:frontend
if errorlevel 1 exit /b %errorlevel%

call npm.cmd run audit:important-reduction-plan
if errorlevel 1 exit /b %errorlevel%

call npm.cmd run audit:duplicate-assets
if errorlevel 1 exit /b %errorlevel%

call npm.cmd run audit:unused-asset-candidates
if errorlevel 1 exit /b %errorlevel%

call npm.cmd run audit:docs-report-hygiene
if errorlevel 1 exit /b %errorlevel%

git diff --check
if errorlevel 1 exit /b %errorlevel%

endlocal
