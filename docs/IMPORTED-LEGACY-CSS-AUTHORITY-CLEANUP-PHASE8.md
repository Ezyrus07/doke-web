# Phase 8 — Imported legacy CSS authority cleanup

## Scope

This phase targets CSS files that were no longer linked directly from HTML, but were still active through CSS import chains and still carried remediation/fase names such as `polish`, `parity`, `rescue`, `final` and `normalization`.

The goal was authority naming only: preserve cascade order and CSS contents while replacing production names that implied temporary fixes.

## Cause root

The previous audit phases removed direct legacy/remediation CSS and JS names from production entrypoints, but the improved import resolver exposed 16 additional active CSS modules loaded through `@import`. These modules were still part of the runtime cascade and therefore still represented active architectural debt.

## Changes

Renamed active imported CSS modules by responsibility:

| Old file | New file |
|---|---|
| `assets/css/components/before-after-workers-preview/shared-publication-polish.css` | `assets/css/components/before-after-workers-preview/shared-publication-card.css` |
| `assets/css/components/layout/marketplace-index-parity-contract.css` | `assets/css/components/layout/marketplace-index-layout-contract.css` |
| `assets/css/pages/comunidade/mobile-rescue.css` | `assets/css/pages/comunidade/mobile-overflow-guard.css` |
| `assets/css/pages/home-overlays/workers-feed-polish.css` | `assets/css/pages/home-overlays/workers-feed-card-layout.css` |
| `assets/css/pages/mensagens/community-parity.css` | `assets/css/pages/mensagens/community-layout-contract.css` |
| `assets/css/pages/mensagens/final-standardization.css` | `assets/css/pages/mensagens/page-foundation-contract.css` |
| `assets/css/pages/mensagens/header-parity.css` | `assets/css/pages/mensagens/header-layout-contract.css` |
| `assets/css/pages/notificacoes/pedidos-parity.css` | `assets/css/pages/notificacoes/pedidos-notification-layout.css` |
| `assets/css/pages/notificacoes/selection-parity.css` | `assets/css/pages/notificacoes/selection-layout-contract.css` |
| `assets/css/pages/perfil-budget-modal/final-polish-success.css` | `assets/css/pages/perfil-budget-modal/success-state-layout.css` |
| `assets/css/pages/search-results/final-normalization.css` | `assets/css/pages/search-results/results-layout-foundation.css` |
| `assets/css/pages/search-results/final-parity.css` | `assets/css/pages/search-results/results-page-alignment.css` |
| `assets/css/pages/search-results/index-parity.css` | `assets/css/pages/search-results/index-rail-alignment.css` |
| `assets/css/pages/search-results/mobile-polish.css` | `assets/css/pages/search-results/mobile-layout-contract.css` |
| `assets/css/pages/search-results/preview-parity.css` | `assets/css/pages/search-results/preview-layout-contract.css` |
| `assets/css/pages/search-results/workers-index-parity.css` | `assets/css/pages/search-results/workers-index-layout-contract.css` |

## Result

`npm run audit:agent-governance` now reports:

- active legacy/remediation css: 0
- active legacy/remediation js: 0

The audit still reports high-risk CSS because many files remain large and still contain many `!important` declarations. This phase did not reduce selector debt or visual risk; it removed active remediation naming from imported production modules.

## Not done

- No visual redesign.
- No selector rewrites.
- No `!important` reduction.
- No shell/router changes.
- No deletion of old files from patch zip packaging beyond rename intent; consumers must remove old paths after applying if their unzip workflow preserves stale files.
