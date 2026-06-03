# Phase 26 — Notifications important reduction: selection and compact mobile

## Scope

This phase continues the controlled `!important` reduction on `notificacoes.html` only.
It does not change the home, cards, shell, sidebar, router, messages, profile, or global header.

## Root cause

The notifications selection and compact mobile contracts still carried `!important` declarations from older stabilization passes. Most of them were not functional state locks; they were visual declarations that could be preserved by the existing page scope and cascade order.

## Changes

- Removed non-functional `!important` from `assets/css/pages/notificacoes/selection-state.css`.
- Removed non-functional `!important` from `assets/css/pages/notificacoes/mobile-compact-list.css`.
- Removed non-functional `!important` from the mobile controls portion of `assets/css/pages/notificacoes/mobile-header-alignment.css`.
- Kept the tablet `display: none !important` lock for `.notifications-mobile-header`, because it is still a functional ownership guard against older tablet toolbar contracts.
- Removed the inactive `assets/css/pages/notificacoes/selection-cleanup.css` file. It was not imported by the notifications page manifest and existed as an old cleanup remnant.

## Acceptance criteria

- Notifications selection toggle keeps the approved green active state.
- Notifications controls/select panel still open when not hidden.
- Mobile compact list keeps the same spacing, hidden auxiliary header, hidden inline links, and compact card behavior.
- Tablet continues to use the approved global header ownership instead of the old local notifications toolbar.

## Validation

- CSS brace balance checked for changed CSS files.
- JavaScript audit script syntax checked.
- `npm run audit:agent-governance` executed.
- `git diff --check` executed.

Visual Playwright validation was not executed in this environment.
