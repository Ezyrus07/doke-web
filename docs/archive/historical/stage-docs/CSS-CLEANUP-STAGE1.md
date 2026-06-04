# CSS Cleanup — Stage 1

This pass focused on **low-risk organization work** without changing broad visual behavior.

## What changed

### 1) Compact internal mobile header extracted into a shared component stylesheet
- New shared owner: `assets/css/components/internal-mobile-simple-header.css`
- First page using it: `pedidos.html`
- Result: `assets/css/pages/pedidos.css` is no longer responsible for the full compact header component.

### 2) Obvious orphan/rest page styles archived
The following files had no runtime references from active HTML/JS and were moved out of the active pages folder into `archive/legacy-css/`:

- `assets/css/pages/mais.css` -> `archive/legacy-css/mais.css`
- `assets/css/pages/resultados.css` -> `archive/legacy-css/resultados.css`
- `assets/css/pages/internal-list-pages.css` -> `archive/legacy-css/internal-list-pages.css`
- `assets/css/pages/desktop-cleanup.css` -> `archive/legacy-css/desktop-cleanup.css`

## Why this is the right first pass
- It reduces page-level CSS ownership confusion.
- It starts separating **component CSS** from **page CSS**.
- It removes dead/legacy files from the active `assets/css/pages/` surface area.

## Recommended next cleanup pass
- Consolidate internal mobile headers for `mensagens.html` and `notificacoes.html` onto the same shared component.
- Audit duplicate internal-shell / home-shared / home-shell rules and decide final ownership.
- Isolate remaining page-only overrides from reusable components.

## Stage 2
- Applied the shared compact internal mobile header component to:
  - `mensagens.html`
  - `notificacoes.html`
- Added dropdown behavior for those internal mobile headers.
