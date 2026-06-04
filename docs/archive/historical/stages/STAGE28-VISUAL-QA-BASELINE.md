# Stage 28 — Visual QA Baseline + Regression Guards

## Objetivo

Criar uma camada de validação visual antes de novas reformas estruturais. A prioridade é impedir que regressões como input duplicado, desktop search sumido, header mobile sticky, sidebar quebrada ou cards gigantes voltem sem serem detectadas.

## O que foi adicionado

- `docs/visual-baseline/README.md`
- `docs/visual-baseline/visual-qa-manifest.json`
- `tests/visual/stage28-page-baseline.spec.js`
- `tests/e2e/stage28-regression-guards.spec.js`
- `scripts/audit-visual-qa-baseline.js`

## Scripts

- `npm run audit:visual-baseline`
- `npm run visual:baseline`
- `npm run visual:qa`

## Regra nova

Antes de qualquer nova mudança visual global, rode a validação visual. Se uma diferença for intencional, atualize a baseline e documente o motivo.

## Observação

Esta etapa não redesenha páginas. Ela cria medição e travas. A validação visual completa exige servidor local em `http://127.0.0.1:5500` e Playwright instalado.
