@echo off
setlocal
if exist "assets\css\pages\orders-hero.css" del /F /Q "assets\css\pages\orders-hero.css"
if exist "assets\css\patterns\ad-process-steps.css" del /F /Q "assets\css\patterns\ad-process-steps.css"
echo Stage 65M removals applied.
endlocal
