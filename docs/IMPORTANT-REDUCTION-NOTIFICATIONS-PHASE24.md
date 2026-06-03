# Notifications Important Reduction Phase 24

## Scope

This phase continues the notification-page-only `!important` reduction after Phase 23.

## Root cause

`assets/css/pages/notificacoes/mobile-header-alignment.css` still contained an older tablet toolbar contract (`Notifications tablet toolbar v70`) and a later override (`Notifications v73`) that were superseded by the final `Notifications v76` rule.

The earlier blocks declared a visible tablet toolbar and then a later block hid the same `.notifications-mobile-header` in the same tablet range. Because the final active behavior is to hide the lower toolbar and let the global/header action contract own tablet actions, the older tablet toolbar block was dead cascade weight.

## Changes

- Removed the obsolete `Notifications tablet toolbar v70` block.
- Removed the duplicate `Notifications v73` hide block.
- Kept the final `Notifications v76` rule as the active authority for tablet lower-toolbar visibility.
- Removed one low-risk `padding-inline` `!important` from the 421px–760px page content rail rule.

## Impact

- No runtime CSS outside notifications was touched.
- No HTML, shell, header, sidebar, router, card, home, profile, or messages file was touched.
- Tablet lower toolbar behavior remains owned by the final `Notifications v76` rule.

## Counts

- `mobile-header-alignment.css`: 76 `!important` declarations before this phase.
- `mobile-header-alignment.css`: 4 `!important` declarations after this phase.
- Net reduction: 72 declarations.

## Remaining important declarations in this file

The remaining declarations are state/display guards and were intentionally kept:

- open filter/select panels on mobile;
- tablet lower toolbar hidden state.
