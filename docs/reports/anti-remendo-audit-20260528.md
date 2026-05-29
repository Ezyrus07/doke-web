# Auditoria anti-remendo — Doke

Escopo: HTML, CSS e JS do repositório, ignorando `node_modules` e `.git`.

## Correção aplicada agora

- `mensagens.html`: cache-busting atualizado para o contrato limpo da página.
- `assets/css/pages/mensagens/header-parity.css`: removidos blocos desktop duplicados/reativos; o arquivo volta a cuidar do header tablet/lista e do estado contextual da conversa.
- `assets/css/pages/mensagens/desktop-visual-repair.css`: removido o bloco final de neutralização/authority que competia com outros contratos.
- `assets/css/pages/mensagens/desktop-layout-contract.css`: novo contrato explícito para desktop de mensagens: sem header tablet no fluxo, sem faixa branca no topo, workspace centralizado por `max-width`.
- `assets/css/pages/mensagens.css`: manifesto atualizado para importar o contrato desktop no lugar correto da cascata.

## Achados gerais que precisam de refatoração programada

### Arquivos com nomes que indicam legado/remendo

- `scripts/audit-app-topbar-legacy-css-review.js`
- `scripts/audit-css-legacy-reform-blockers.js`
- `scripts/audit-css-legacy-remaining.js`
- `scripts/audit-data-ready-final-gate.js`
- `scripts/audit-global-final-readiness.js`
- `scripts/audit-legacy-baseline-plan.js`
- `scripts/audit-legacy-bridge-scope.js`
- `scripts/audit-legacy-css-classification.js`
- `scripts/audit-legacy-css-map.js`
- `scripts/audit-unused-legacy-css-cleanup.js`
- `scripts/cleanup-unused-legacy-css.js`
- `tools/audit-css-stage12.js`
- `tools/responsive-stage13-dashboard.html`
- `tests/e2e/stage28-regression-guards.spec.js`
- `tests/visual/stage28-page-baseline.spec.js`
- `assets/css/components/surface-contract-final.css`
- `assets/css/pages/perfil-mobile-reference-hotfix.css`
- `assets/css/pages/search-results-mobile-rail-final.css`
- `assets/css/pages/comunidade/internal-modal-legacy.css`
- `assets/css/pages/configuracoes/final-responsive-pass.css`
- `assets/css/pages/detalhe-anuncio/detail-legacy.css`
- `assets/css/pages/home/index-final-refinement.css`
- `assets/css/pages/mensagens/desktop-visual-repair.css`
- `assets/css/pages/mensagens/final-standardization.css`
- `assets/css/pages/perfil-budget-modal/final-polish-success.css`
- `assets/css/pages/search-results/final-normalization.css`
- `assets/css/pages/search-results/final-parity.css`
- `assets/css/components/layout/focused-index-final-parity-contract.css`
- `assets/css/components/ui/doke-legacy-bridge.css`
- `archive/css-legacy/components-v15/ui-surface-system.css`
- `archive/css-legacy/components-v16/before-after-workers-preview.css`
- `archive/css-legacy/components-v17/surface-contract-final.css`
- `archive/css-legacy/components-v17/ui.css`
- `archive/css-legacy/core-v14/border-consolidation.css`
- `archive/css-legacy/core-v14/layout-responsive.css`
- `archive/css-legacy/core-v14/layout-shell.css`
- `archive/css-legacy/core-v14/layout-topbar.css`
- `archive/css-legacy/core-v14/patterns.css`
- `archive/css-legacy/core-v14/primitives.css`
- `archive/css-legacy/core-v14/shell-home.css`
- `archive/css-legacy/core-v14/surface-normalize.css`
- `archive/css-legacy/core-v14/surfaces.css`
- `archive/css-legacy/pages-v21/home-overlays.css`
- `archive/css-legacy/pages-v21/perfil-budget-modal.css`

### CSS com alto uso de `!important`

| Arquivo | Qtde |
|---|---:|
| `assets/css/pages/perfil-reference-hero.css` | 4173 |
| `assets/css/pages/mensagens/desktop-redesign.css` | 3869 |
| `assets/css/pages/detalhe-anuncio.css` | 3484 |
| `assets/css/pages/home.css` | 3061 |
| `assets/css/components/shell/doke-shell-contract.css` | 2631 |
| `assets/css/pages/perfil/mobile-public-profile.css` | 1944 |
| `assets/css/pages/detalhe-anuncio-rail-parity.css` | 1911 |
| `assets/css/pages/carteira.css` | 1897 |
| `assets/css/components/shell/desktop-page-rail-authority.css` | 1714 |
| `assets/css/pages/mensagens/desktop-visual-repair.css` | 1620 |
| `assets/css/components/internal/chat-workspace-contract.css` | 1458 |
| `assets/css/pages/home-tablet-v2.css` | 1431 |
| `assets/css/pages/mensagens/product-layout-contract.css` | 1213 |
| `assets/css/pages/perfil-header-rail-parity.css` | 1167 |
| `assets/css/pages/home/mobile/sections.css` | 1151 |
| `assets/css/pages/home-tablet.css` | 1137 |
| `assets/assets/css/components/shell/doke-shell-contract.css` | 1097 |
| `assets/css/pages/search-results.css` | 1030 |
| `assets/css/pages/perfil-header-width-match.css` | 1006 |
| `assets/css/pages/comunidade/mobile-layout-contract.css` | 978 |
| `assets/css/pages/home/index-final-refinement.css` | 962 |
| `assets/css/pages/pedidos/orders-command-center.css` | 845 |
| `assets/css/components/overlays/financial-modal-system.css` | 776 |
| `assets/css/pages/home/chrome.css` | 771 |
| `assets/css/components/navigation/app-mobile-header-contract.css` | 700 |
| `assets/css/components/before-after-workers-preview.css` | 672 |
| `assets/css/components/shell/app-header.css` | 612 |
| `assets/css/pages/perfil-responsive-contract.css` | 552 |
| `assets/css/components/layout/responsive-priority-contract.css` | 523 |
| `assets/css/pages/home/mobile/search.css` | 490 |
| `archive/css-legacy/core-v14/layout-responsive.css` | 486 |
| `assets/css/core/layout/responsive-shell.css` | 479 |
| `assets/css/components/domain/doke-domain-cards.css` | 453 |
| `assets/css/pages/home-search-chrome.css` | 435 |
| `assets/css/components/layout/focused-index-parity-contract.css` | 421 |
| `assets/css/pages/home/mobile-index-feed-contract.css` | 392 |
| `assets/css/components/cards/marketplace-card-contract.css` | 381 |
| `assets/css/pages/home-sections.css` | 377 |
| `assets/css/components/shell/mobile-app-shell.css` | 375 |
| `assets/css/components/navigation/mobile-search-header-shared.css` | 348 |

### Comentários/sinais de fallback, fix, repair ou authority

- `ajuda.html` linhas 35, 97
- `anunciar-servico.html` linhas 35, 56, 127
- `avaliacao-profissional.html` linhas 35
- `avaliacao.html` linhas 40
- `carteira.html` linhas 58
- `comunidade-interna.html` linhas 52, 90, 91, 93, 132, 133, 135, 163
- `comunidade.html` linhas 60, 375, 445
- `configuracoes.html` linhas 56, 111, 112, 118
- `detalhe-anuncio.html` linhas 46, 159, 160, 168
- `index.html` linhas 196, 236, 322, 370, 417, 431, 455, 475
- `mensagens.html` linhas 67, 193, 194, 196, 231, 232, 234
- `notificacoes.html` linhas 59
- `novidades.html` linhas 35, 113, 325, 337, 346, 355
- `pagamento-profissional.html` linhas 35
- `pedidos.html` linhas 69
- `perfil.html` linhas 72, 207, 229, 269, 1139
- `resultados.html` linhas 29, 61, 468
- `tornar-profissional.html` linhas 35, 55
- `auth/cadastro.html` linhas 25
- `auth/esqueci-senha.html` linhas 25
- `auth/login.html` linhas 25
- `docs/ui-kit.html` linhas 15
- `scripts/audit-action-favorite-ownership.js` linhas 31
- `scripts/audit-active-contracts-index.js` linhas 80
- `scripts/audit-app-topbar-route-stability.js` linhas 54
- `scripts/audit-auth-session-contracts.js` linhas 46, 47
- `scripts/audit-card-anatomy-boundary.js` linhas 48, 95, 99, 101, 128, 130, 148, 205
- `scripts/audit-cleanup-candidates.js` linhas 29, 39, 45, 90, 280, 281, 283
- `scripts/audit-communication-data-readiness.js` linhas 66, 89, 101, 137, 138, 143
- `scripts/audit-critical-page-snapshot-checklist.js` linhas 69, 74, 95
- `scripts/audit-critical-page-visual-baseline.js` linhas 12
- `scripts/audit-css-design-system-entry-gate.js` linhas 29
- `scripts/audit-css-legacy-reform-blockers.js` linhas 5, 34, 45
- `scripts/audit-css-legacy-remaining.js` linhas 32
- `scripts/audit-css-responsive-conflicts.js` linhas 49, 50, 51, 77, 81
- `scripts/audit-data-fallback-contract.js` linhas 8, 9, 10, 35, 49
- `scripts/audit-data-ready-final-gate.js` linhas 14, 18, 20, 37
- `scripts/audit-desktop-phase-entry-gate.js` linhas 17, 18, 19, 20, 22, 34, 35, 38
- `scripts/audit-detail-anuncio-data-boundary.js` linhas 29, 39, 40, 43
- `scripts/audit-docs-active-review.js` linhas 40, 43
- `scripts/audit-docs-archive-obvious.js` linhas 40, 41
- `scripts/audit-docs-classification.js` linhas 52, 53, 107, 159
- `scripts/audit-docs-registry.js` linhas 32
- `scripts/audit-focused-index-parity.js` linhas 211, 225, 230, 234, 236, 238
- `scripts/audit-frontend-contracts.js` linhas 41, 170
- `scripts/audit-global-contract-integrity.js` linhas 11, 16
- `scripts/audit-global-cycle-closure-readiness.js` linhas 9
- `scripts/audit-global-cycle-completion-gate.js` linhas 11
- `scripts/audit-global-final-readiness.js` linhas 46
- `scripts/audit-global-script-order.js` linhas 6
- `scripts/audit-global-state-completion-gate.js` linhas 33
- `scripts/audit-home-css-overrides.js` linhas 119, 129
- `scripts/audit-important-controlled-removal-gate.js` linhas 27
- `scripts/audit-important-low-risk-groups.js` linhas 17, 36, 50, 54
- `scripts/audit-important-reduction.js` linhas 11, 12, 13, 15, 24, 25, 26, 27
- `scripts/audit-index-cleanup-map.js` linhas 28, 70, 78, 85, 100, 101
- `scripts/audit-legacy-baseline-plan.js` linhas 12, 115, 190
- `scripts/audit-legacy-css-classification.js` linhas 6, 7, 55, 56, 66, 72
- `scripts/audit-legacy-css-map.js` linhas 16, 17, 198
- `scripts/audit-low-risk-css-cleanup.js` linhas 10, 59, 70
- `scripts/audit-marketplace-index-parity.js` linhas 73, 81, 82, 89, 93, 97, 102, 105
- `scripts/audit-mobile-base-stability.js` linhas 34
- `scripts/audit-native-navigation-lock.js` linhas 32, 34, 39, 44, 49
- `scripts/audit-operational-script-loading.js` linhas 21, 22, 24, 28, 33, 36, 40, 41
- `scripts/audit-package-script-registry.js` linhas 88, 89, 91
- `scripts/audit-page-css-inventory.js` linhas 11, 147
- `scripts/audit-page-data-orchestration.js` linhas 143
- `scripts/audit-partial-navigation-readiness.js` linhas 9, 10, 11, 12, 23, 25, 28
- `scripts/audit-perfil-data-readiness.js` linhas 49, 54, 60
- `scripts/audit-product-js-removal-decision-lock.js` linhas 6, 26, 29, 37, 38, 45, 46, 47
- `scripts/audit-product-page-readiness.js` linhas 103, 105, 137, 139, 154, 156
- `scripts/audit-product-pages-suite.js` linhas 25
- `scripts/audit-product-readiness-gate.js` linhas 18
- `scripts/audit-product-script-inventory.js` linhas 79, 93
- `scripts/audit-product-script-loading.js` linhas 56, 57, 61, 77, 82
- `scripts/audit-product-script-version-hygiene.js` linhas 13
- `scripts/audit-responsive-baseline.js` linhas 22, 52, 75
- `scripts/audit-responsive-inventory.js` linhas 34, 119
- `scripts/audit-responsive-rails-containers.js` linhas 57
- `scripts/audit-section-header-contract.js` linhas 35
- ... mais 329 arquivos com sinais similares

### HTML com estilos inline

- `docs/ui-kit.html` linhas 47, 80, 81, 82

## Recomendação de governança

1. Transformar arquivos `*-repair`, `*-hotfix`, `*-final` e `*-legacy` em contratos nomeados por responsabilidade antes de novas alterações visuais.
2. Bloquear novos arquivos com nomes de remendo por lint/check simples no CI.
3. Reduzir `!important` por componente, começando pelos módulos com maior contagem.
4. Para páginas críticas, separar contratos por breakpoint: desktop, tablet-lista, tablet-detalhe/mobile-thread.
