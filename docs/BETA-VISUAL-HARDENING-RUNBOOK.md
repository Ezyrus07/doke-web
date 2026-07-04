# Beta Visual Hardening Runbook

## Objetivo

Planejar o hardening visual final do beta fechado sem alterar visual nesta sprint.

## Baseline

O `index.html` continua sendo referência visual para cards, rails, carrosséis e densidade. Páginas internas devem respeitar o contrato global de shell/header/sidebar e não podem recriar anatomia de componentes compartilhados.

## Evidências exigidas

- Playwright visual baseline report;
- responsive contract report;
- screenshots dos fluxos críticos por viewport.

## Viewports mínimos

- 390x844
- 608x926
- 810x1080
- 1024x768
- 1280x800

## Validação

```bash
npm run audit:beta-visual-hardening-gate
npm run validate:beta-visual-hardening:dry-run
npm run validate:beta-visual-hardening
npm run validate:beta-visual-hardening:report
```
