# Pedidos active important reduction — Phase 38

Base: `dokee-web(191).zip`.

This phase continues the controlled reduction of `!important` in the pedidos page without changing the approved visual contract intentionally.

## Scope

Changed active files:

- `assets/css/pages/pedidos/orders-command-center.css`
- `assets/css/pages/pedidos.css`

Removed in the full ZIP / maintenance script when present:

- `assets/css/pages/pedidos/mobile-longterm-normalization.css`
- `assets/css/pages/pedidos/selection-cleanup.css`

## Rule

The phase removes `!important` only from spacing/alignment/presentation declarations that are already scoped to the pedidos page. It preserves structural declarations such as `display`, `width`, `height`, `overflow`, `position`, `visibility`, hidden-state guards and mobile shell constraints.

## Acceptance checklist

- `pedidos.html` keeps the same visual structure on desktop/tablet/mobile.
- Agenda spacing remains stable.
- Command toolbar and action buttons keep alignment.
- Mobile bottom spacing and mobile shell behavior do not regress.
- Hidden panels remain hidden before hydration.
