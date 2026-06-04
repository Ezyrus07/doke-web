# CSS Cleanup Report — v18

## Scope

This pass focused on static dependency validation after the component/core cleanup.
No visual CSS contract was changed in this step.

## What changed

- Reworked `tools/audit-css-contract.js` to resolve CSS dependencies through:
  - direct HTML `<link>` references;
  - recursive CSS `@import` references;
  - active/reachable CSS graph detection.
- Regenerated `docs/validation/css-contract-static-report.json`.
- Regenerated `docs/validation/surface-contract-report.md`.
- Confirmed deprecated component/core shims are not directly loaded by HTML.
- Confirmed `pedidos.css` is only directly loaded by `pedidos.html`.
- Confirmed the modular surface system and publication modal modules are present.

## Current validation results

- Deprecated direct HTML references: none.
- `pedidos.css` outside `pedidos.html`: none.
- `ui-surface-system.css` remains reachable.
- `ui-surface/` modules are present.
- `before-after-workers-preview/` modules are present.
- Deprecated shim files are not reachable through the active CSS graph.

## Important note

The audit found inactive CSS candidates, but they were not deleted automatically.
Static reachability is useful, but not enough to prove deletion safety because some
classes and assets may be referenced dynamically by JavaScript, conditional HTML,
or future templates.

## Next recommended target

The next high-value cleanup should target active files that still contain many
component-like selectors inside page CSS:

1. `assets/css/pages/configuracoes.css`
2. `assets/css/pages/mensagens.css`
3. `assets/css/pages/notificacoes.css`
4. `assets/css/pages/home-overlays.css`
5. `assets/css/pages/perfil-budget-modal.css`

The safest next move is `configuracoes.css`, because it appears to still carry
page-local UI patterns that should probably use the shared internal/page/component
contracts.
