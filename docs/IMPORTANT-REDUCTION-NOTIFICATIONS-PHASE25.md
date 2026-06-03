# Phase 25 — Notifications mobile interaction contract removal

## Scope

This phase continues the controlled `!important` reduction in `notificacoes` without touching the home, shell, router, global header, sidebar, cards, profile, or messages.

## Root cause

`assets/css/pages/notificacoes/mobile-interaction-contract.css` was imported by `assets/css/pages/notificacoes.css`, but its selectors target generic modal/media/favorite controls that are not part of the current notifications page DOM. The file acted as a page-local compatibility layer for components owned elsewhere and kept 10 unnecessary `!important` declarations active in the notifications cascade.

## Change

- Removed the import from `assets/css/pages/notificacoes.css`.
- Removed `assets/css/pages/notificacoes/mobile-interaction-contract.css` from the cleaned project.

## Removed `!important` count

10 declarations were removed from the active notifications CSS cascade.

## Guardrail

If notifications later needs modal/media/favorite controls, the contract must be provided by the owning component CSS, not reintroduced as a page-specific compatibility layer.

## Validation

- CSS import reference check.
- `npm run audit:agent-governance`.
- `npm run audit:unused-asset-candidates`.
- `git diff --no-index --check` against the previous phase baseline.

## Visual risk

Low for the current notifications page because the removed selectors do not match local notifications markup. No Playwright visual validation was run in this environment.
