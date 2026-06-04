@echo off
setlocal
cd /d "%~dp0..\.."

echo [stage65k] removing confirmed unused hover preview assets
if exist "assets\css\pages\home\workers-hover-preview.css" del /F /Q "assets\css\pages\home\workers-hover-preview.css"
if exist "assets\js\pages\home\workers-hover-preview.js" del /F /Q "assets\js\pages\home\workers-hover-preview.js"

echo [stage65k] removals applied
endlocal
