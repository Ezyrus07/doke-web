# Important Reduction — Notifications Phase 24

## Scope

This phase continues the controlled `!important` reduction inside `assets/css/pages/notificacoes/mobile-header-alignment.css` only.

## Root cause

The file still contained an older tablet-toolbar lineage (`v70` and `v73`) that had already been superseded by the final `v76` contract: on tablet, the local notifications mobile toolbar is hidden and header actions are owned by the global header contract.

Because the later `v76` block won in the cascade, the older tablet-toolbar declarations were dead/overridden and kept dozens of unnecessary `!important` declarations active in the source.

## Change

- Removed the obsolete `v70` descendant styling block for the hidden tablet toolbar.
- Removed the duplicate `v73` tablet override block.
- Kept one consolidated tablet contract in the same file:
  - `.notifications-mobile-header` remains hidden on tablet.
  - `.notifications-list` keeps `margin-top: 0` without `!important`.

## Visual contract

No intended visual change.

The final computed behavior should remain:

- tablet notifications toolbar is not duplicated below the global header;
- notifications list starts without extra top margin;
- mobile under `560px` keeps the existing mobile header behavior;
- home, shell, sidebar, cards and router remain untouched.

## Validation

- `node --check scripts/audit-active-legacy-structures.js`
- `npm run audit:agent-governance`
- `git diff --no-index --check` against the previous phase tree
