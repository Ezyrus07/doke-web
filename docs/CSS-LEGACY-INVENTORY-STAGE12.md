# Etapa 12 — CSS legacy inventory e plano de limpeza segura

## Objetivo

Esta etapa cria um inventário técnico do CSS do projeto sem alterar visual, HTML ou comportamento. Depois do problema causado pelo Stage 10 no desktop, a regra é clara: limpeza de legado só pode acontecer com rastreabilidade, escopo e rollback simples.

## Arquivos adicionados

- `tools/audit-css-stage12.js`
- `docs/validation/css-stage12-inventory.md`
- `docs/validation/css-stage12-inventory.json`

## Resultado da auditoria

- 19 HTMLs analisados.
- 250 arquivos CSS encontrados.
- 197 arquivos CSS alcançáveis por HTML ou `@import`.
- 53 candidatos inativos, ainda não removidos.
- 26 arquivos ativos com nomes de legado, como `final`, `fix`, `pass`, `rescue`, `polish`, `legacy` ou versão solta.
- 44 arquivos ativos classificados como alto risco para auditoria manual.

## Decisão técnica

Nenhum CSS foi removido nesta etapa. Isso é intencional. Arquivo inativo não significa automaticamente arquivo morto; ele pode estar reservado para protótipo, teste, página não listada ou import dinâmico. A limpeza física deve acontecer em lotes pequenos depois da validação visual.

## Contratos oficiais preservados

Os contratos criados nas etapas anteriores continuam como base oficial:

- `assets/css/core/responsive-foundation.css`
- `assets/css/components/internal/topbar-standard.css`
- `assets/css/components/cards/card-grid-contract.css`
- `assets/css/patterns/home-results-card-stage4.css`
- `assets/css/pages/perfil/mobile-stage5.css`
- `assets/css/patterns/internal-pages-stage6.css`
- `assets/css/pages/comunidade/mobile-stage7.css`
- `assets/css/patterns/remaining-pages-stage8.css`
- `assets/css/components/overlays/overlay-contract-stage9.css`
- `assets/css/components/forms-actions/form-action-contract-stage10.css`
- `assets/css/core/responsive-runtime-stage11.css`

## Regra para as próximas mudanças

1. Não criar novos arquivos com nomes `final`, `fix`, `pass`, `rescue`, `polish`, `cleanup`, `v2`, `v3` etc.
2. Não aplicar contrato global em desktop sem escopo explícito.
3. Qualquer regra mobile nova deve ficar protegida por breakpoint mobile.
4. CSS de página não pode redefinir componentes globais como botão, input, modal, card, topbar ou bottom nav.
5. Primeiro validar; depois arquivar; só depois remover.

## Próximo passo

A Etapa 13 deve ser validação visual em breakpoints e páginas críticas. Só depois disso faz sentido mover/remover CSS legado.
