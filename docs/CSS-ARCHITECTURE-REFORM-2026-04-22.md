# CSS Architecture Reform — 2026-04-22

## What changed
- `core/index.css` was reduced to foundation-only imports.
- `core/primitives.css` became the canonical source for shared primitive UI rules.
- `core/components.css` and `components/ui.css` became compatibility bridges.
- App shell ownership moved to `components/shell/app-shell.css`.
- Parallel shell and border normalization files were deprecated and left inert.
- Reusable internal modules moved into `components/internal/`.
- Reusable profile modules were grouped under `components/profile/index.css`.
- Internal pages now import `internal-shell.css` from their page stylesheet instead of stacking multiple shell helper links in HTML.
- Results and profile pages now import their canonical manifests instead of legacy bridge chains.

## Active layers after this reform
1. `assets/css/core/` — tokens, base, layout, primitives, surface contract
2. `assets/css/components/` — reusable shell, internal, results and profile modules
3. `assets/css/pages/` — page composition and page-specific exceptions
4. Deprecated inert files kept only as compatibility/documentation bridges

## Deprecated parallel files
- `assets/css/core/surface-normalize.css`
- `assets/css/core/border-consolidation.css`
- `assets/css/pages/sidebar-unified.css`
- `assets/css/pages/shell-normalize.css`
- `assets/css/pages/home-shared.css`

## Remaining technical debt
- Some page files still contain visual literals that should migrate to tokens in a second pass.
- `mensagens.css`, `comunidade.css` and `wallet-manage.css` still deserve deeper component extraction.
- Home desktop/mobile still has large page-layer ownership because of historical iteration volume.
