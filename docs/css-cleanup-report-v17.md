# CSS Cleanup Report v17

## Focus

Final component-layer legacy audit.

## Changes

- Archived the old broad `assets/css/components/ui.css` bundle in
  `archive/css-legacy/components-v17/ui.css`.
- Replaced `assets/css/components/ui.css` with an inert compatibility shim.
- Archived `assets/css/components/surface-contract-final.css` in
  `archive/css-legacy/components-v17/surface-contract-final.css`.
- Kept `surface-contract-final.css` inert and documented that the canonical
  contract is `ui-surface-system.css`.
- Added a component-level README describing canonical component entry points
  and deprecated shims.

## Reasoning

`ui.css` was a high-risk legacy bundle because it mixed hero, buttons, cards,
forms and broad page patterns. Keeping that file active alongside the newer
component contracts could silently reintroduce inconsistent buttons, cards,
inputs and surfaces.

This patch does not remove the historical CSS. It archives it and leaves a safe
shim in place so old references do not hard-break the site.

## Risk

Low to medium. Current HTML/CSS references should already rely on the newer
canonical contracts. If an old page manually imports `components/ui.css`, it
will no longer receive the legacy bundle, which is intentional but should be
validated visually.
