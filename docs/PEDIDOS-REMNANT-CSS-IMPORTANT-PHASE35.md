# Phase 35 — Pedidos remnant CSS and agenda spacing authority

## Scope

Baseline: `dokee-web(188).zip`.

This phase starts the `pedidos.html` cleanup after the results pass. It avoids the high-risk mobile layout and command center contracts, and only changes a small spacing file plus inactive remnants.

## Changes

- Removed inactive pedidos remnants from the full project package:
  - `assets/css/pages/pedidos/mobile-longterm-normalization.css`
  - `assets/css/pages/pedidos/selection-cleanup.css`
- Re-scoped `assets/css/pages/pedidos/agenda-spacing.css` under `body.orders-page-shell`.
- Removed all `!important` declarations from `agenda-spacing.css` by increasing page ownership instead of force.

## Important reduction

- `agenda-spacing.css`: `8 -> 0`.
- Removed inactive remnants that contained `217` additional `!important` declarations outside the active import graph.

## Guardrails

No changes were made to:

- home/index baseline;
- shell/sidebar/router/header global contracts;
- `assets/css/pages/pedidos/mobile-layout-contract.css`;
- `assets/css/pages/pedidos/orders-command-center.css`;
- JS logic.

## Validation

- CSS brace balance checked for modified active CSS.
- Active import check confirmed removed files were not referenced by `pedidos.html` or active pedidos CSS manifests.
- `npm run audit:agent-governance` executed.
- `git diff --check` executed; repository has pre-existing CRLF warnings only.

## Remaining work

- Validate `pedidos.html` desktop/mobile agenda spacing visually.
- Start a controlled important-reduction pass on `orders-command-center.css` by presentation properties only.
- Keep `mobile-layout-contract.css` for a later phase because it owns mobile structure.
