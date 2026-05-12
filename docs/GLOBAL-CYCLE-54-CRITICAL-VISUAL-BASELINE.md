# Ciclo Global 54 — baseline visual automatizável das páginas críticas

## Objetivo

Criar uma barreira visual automatizável para `index.html`, `resultados.html` e `perfil.html` antes de qualquer remoção sensível de CSS legado, `!important`, grids ou sizing de cards.

Este ciclo não altera visual, HTML de página nem CSS de tela. Ele adiciona governança de teste visual para reduzir regressão.

## Páginas protegidas

- `index.html`
- `resultados.html`
- `perfil.html`

## Arquivos criados

- `docs/visual-baseline/critical-pages-baseline.json`
- `tests/visual/critical-pages-baseline.spec.js`
- `scripts/audit-critical-visual-baseline.js`
- `docs/validation/global-cycle-54-critical-visual-baseline-report.json`

## Scripts adicionados

```bash
npm run audit:critical-visual-baseline
npm run visual:critical-baseline
npm run visual:critical-check
```

## Uso recomendado

Antes de remover CSS sensível em `home`, `resultados` ou `perfil`:

1. Iniciar o projeto localmente em `http://127.0.0.1:5500`.
2. Rodar `npm run visual:critical-baseline` quando a baseline atual for aprovada.
3. Fazer a alteração CSS em ciclo pequeno.
4. Rodar `npm run visual:critical-check`.
5. Comparar falhas manualmente antes de aceitar a mudança.

## Escopo protegido

A spec captura screenshots em quatro viewports:

- `mobile-380`
- `mobile-430`
- `desktop-1440`
- `desktop-1920`

## Regras preservadas

- Sem alteração visual intencional.
- Sem CSS novo de tela.
- Sem `!important` novo.
- Sem `style=""` novo.
- Sem arquivo `fix`, `hotfix`, `stage`, `final`, `novo` ou `ajuste`.
