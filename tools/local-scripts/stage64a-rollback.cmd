@echo off
setlocal
cd /d "%~dp0\..\.."
echo [Stage 64A] Inventory-only rollback. No CSS/HTML/JS source file was changed.
if exist reports\generated\stage64a-important-inventory.md del reports\generated\stage64a-important-inventory.md
if exist reports\generated\stage64a-important-inventory.json del reports\generated\stage64a-important-inventory.json
if exist reports\generated\stage64a-manifest.json del reports\generated\stage64a-manifest.json
if exist tools\local-scripts\stage64a-validate-audits.cmd del tools\local-scripts\stage64a-validate-audits.cmd
echo [Stage 64A] Generated inventory files removed.
endlocal
