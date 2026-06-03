# Phase 37 — Pedidos mobile layout important reduction

## Scope

This phase continues the controlled removal of `!important` declarations in the pedidos page.

Changed runtime file:

- `assets/css/pages/pedidos/mobile-layout-contract.css`

Cleanup helper:

- `scripts/maintenance/apply-phase37-pedidos-mobile-layout-cleanup.js`

## Root cause

`mobile-layout-contract.css` still used `!important` for many presentation declarations even though the selectors were already scoped to the pedidos mobile page context. This made the file harder to maintain and kept increasing cascade pressure without solving a current conflict.

## What changed

Removed `!important` from presentation-only declarations such as:

- background
- border and border-radius
- box-shadow
- color
- font size / weight / line height
- spacing tokens such as padding, margin and gap
- local alignment on already scoped controls
- icon stroke/fill presentation

Structural declarations were intentionally preserved when they could affect layout ownership, including:

- display
- grid/flex template contracts
- width/height/min/max dimensions
- overflow constraints
- position/z-index
- hidden states

## Cleanup

The full ZIP removes stale pedidos CSS remnants that were already identified in previous phases:

- `assets/css/pages/pedidos/mobile-longterm-normalization.css`
- `assets/css/pages/pedidos/selection-cleanup.css`

When applying only the patch ZIP, run:

```bash
npm run maintenance:phase37-cleanup
```

## Validation

- CSS brace balance for the changed runtime file.
- Maintenance script syntax check.
- `npm run audit:agent-governance`.
- `git diff --check`.

Visual validation with Playwright was not executed in this environment.
