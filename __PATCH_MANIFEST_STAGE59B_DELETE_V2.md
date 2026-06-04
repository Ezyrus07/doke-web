# Doke Stage 59B — Delete Low-Risk V2

## Objetivo

Corrigir o script CMD de remoção dos 8 candidatos unused de baixo risco usando caminhos Windows com `\`, porque o script anterior usava `/` e o `del` do CMD pode interpretar barras de forma incorreta.

## Arquivos adicionados

- `RODAR_STAGE59B_DELETE_LOW_RISK_V2.cmd`

## Arquivos que o script remove, se existirem

- `assets/css/pages/desktop-cleanup.css`
- `assets/css/pages/notificacoes/selection-cleanup.css`
- `assets/css/pages/results/results-density-polish.css`
- `assets/css/pages/results/results-grid-polish.css`
- `assets/css/pages/selection/selection-cleanup.css`
- `assets/js/core/supabase-config.example.js`
- `assets/js/pages/results/results-layout-polish.js`
- `assets/js/pages/selection/selection-cleanup.js`

## Pós-validação

Rode:

```bat
npm.cmd run audit:unused-asset-candidates
npm.cmd run audit:frontend
npm.cmd run audit:duplicate-assets
npm.cmd run audit:important-reduction-plan
```
