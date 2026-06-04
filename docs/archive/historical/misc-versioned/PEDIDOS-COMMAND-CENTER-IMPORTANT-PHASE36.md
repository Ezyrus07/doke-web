# Phase 36 — Pedidos command center important reduction

## Scope

Base ZIP: `dokee-web(189).zip`.

This phase continues the pedidos cleanup after the agenda/remnant pass. It targets only the pedidos command-center stylesheet and leftover inactive pedidos CSS remnants.

## Root cause

`assets/css/pages/pedidos/orders-command-center.css` still contained a large amount of page-local `!important` declarations, including many visual declarations where the page-level selector and load order already provide enough authority.

The page also still contained two old pedidos CSS files that were not imported by `pedidos.html`:

- `assets/css/pages/pedidos/mobile-longterm-normalization.css`
- `assets/css/pages/pedidos/selection-cleanup.css`

Those files are retained as removal targets in the maintenance command because patch ZIPs do not delete files automatically.

## Changes

### `assets/css/pages/pedidos/orders-command-center.css`

Removed `!important` from visual/presentation declarations only, including:

- color and background;
- border, border color, border radius, border width and border style;
- box shadow and outline;
- font size, font weight, line height and letter spacing;
- icon stroke/fill styling;
- white-space and text-overflow;
- native appearance reset.

### Removed from the complete ZIP

- `assets/css/pages/pedidos/mobile-longterm-normalization.css`
- `assets/css/pages/pedidos/selection-cleanup.css`

### Maintenance command

```bash
npm run maintenance:phase36-cleanup
```

Run this only when applying the small patch ZIP. The complete ZIP already has the removals applied.

## Important count

`orders-command-center.css`:

- before: 845
- after: 659
- removed: 186

## Preserved intentionally

The following categories still keep `!important` for later, safer passes:

- `display`, visibility and hidden states;
- width, min/max width, height and min/max height;
- grid and flex structural declarations;
- overflow and scroll contracts;
- sticky/header/tablet positioning;
- mobile/tablet full-bleed constraints.

## Validation

- CSS brace balance was checked.
- `node --check scripts/maintenance/apply-phase36-pedidos-command-cleanup.js` passed.
- `npm run audit:agent-governance` passed.
- `git diff --check` was run; existing CRLF warnings may remain from repository history.

No Playwright visual validation was executed in this environment.
