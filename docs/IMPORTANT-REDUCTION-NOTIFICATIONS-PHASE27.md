# Phase 27 — Notifications desktop surface boundary and selection-state reduction

## Context

After the notifications important-reduction phases, the desktop notification cards still displayed a visible border. The base card contract had already been neutralized, but a later import (`mobile-compact-list.css`) was not scoped to mobile and was overriding the desktop card surface.

## Changes

- Scoped `assets/css/pages/notificacoes/mobile-compact-list.css` to mobile widths (`max-width: 760px`).
- Preserved the existing mobile compact card values under the mobile media query.
- Removed non-functional `!important` declarations from `assets/css/pages/notificacoes/selection-state.css`.
- Kept display/visibility/opacity `!important` in selection panel state rules because those are functional open/closed state guards.

## Files changed

- `assets/css/pages/notificacoes/mobile-compact-list.css`
- `assets/css/pages/notificacoes/selection-state.css`

## Acceptance criteria

- Desktop notification cards are controlled by `base-layout.css`, not by the mobile compact contract.
- Mobile compact list remains controlled by `mobile-compact-list.css`.
- The visible desktop border should not return from the mobile file.
- No changes to home, shell, global header, sidebar, router, messages, or profile.
