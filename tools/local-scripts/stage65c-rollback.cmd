@echo off
setlocal

del /q reports\generated\stage65c-home-entrypoint-inventory.md 2>nul
del /q reports\generated\stage65c-home-entrypoint-inventory.json 2>nul
del /q reports\generated\stage65c-manifest.json 2>nul
del /q tools\local-scripts\stage65c-validate-audits.cmd 2>nul
del /q tools\local-scripts\stage65c-rollback.cmd 2>nul

echo Stage 65C inventory artifacts removed.
