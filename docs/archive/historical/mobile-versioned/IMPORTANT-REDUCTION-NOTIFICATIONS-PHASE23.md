# Phase 23 — Notifications important reduction

## Goal
Reduce `!important` usage in a contained page zone after the global low-risk pilot, without touching runtime layout, shell, router, cards or the approved home baseline.

## Scope
Only notification page header typography and counter sizing were adjusted:

- `assets/css/pages/notificacoes/base-layout.css`
- `assets/css/pages/notificacoes/internal-page-header.css`

## Root cause
The notification header modules still carried `!important` on page-local typography/control sizing even though the selectors are page-specific and the cascade order already scopes them to the notifications page. Those declarations were not part of shell/header global authority and did not need priority escalation.

## Changes
Removed `!important` from page-local declarations for:

- heading font size/line-height/letter-spacing/font-weight;
- notification count min-width/width/height/font-size/font-weight/line-height.

Kept the `[hidden]` display lock in `base-layout.css` because it controls hidden state behavior and should not be relaxed in this phase.

## Acceptance criteria
- `notificacoes.html` keeps the same desktop/tablet/mobile header appearance.
- Hidden controls remain hidden.
- No shell, sidebar, global header, card or home behavior changes.
- No new CSS file and no new `!important`.
