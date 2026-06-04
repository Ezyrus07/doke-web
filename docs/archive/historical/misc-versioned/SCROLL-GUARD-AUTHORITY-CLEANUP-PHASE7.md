# Phase 7 — iPad Safari scroll guard authority cleanup

## Cause

The active page stack still loaded `assets/js/core/ipad-safari-scroll-rescue.js` across many HTML pages. The script was no longer a one-off rescue patch; it is the production guard that stabilizes scroll/paint behavior for iPad Safari portrait. Keeping `rescue` in the active filename violated the Doke agent governance contract and kept a remediation layer in the runtime asset map.

## Change

Renamed the active script by responsibility without changing its runtime behavior:

| Before | After |
|---|---|
| `assets/js/core/ipad-safari-scroll-rescue.js` | `assets/js/core/ipad-safari-scroll-guard.js` |

All direct HTML references now point to `ipad-safari-scroll-guard.js`. The active marker class was also renamed from `doke-ipad-scroll-rescue-active` to `doke-ipad-scroll-guard-active`.

## Additional audit correction

The active legacy audit now reports active remediation JS separately. Its CSS import resolver was also corrected so relative `@import` paths are resolved against the importing CSS file. That exposed legacy CSS still active through imports; this is an audit accuracy correction, not a visual/layout change.

## Validation

- `node --check assets/js/core/ipad-safari-scroll-guard.js`
- `node --check scripts/audit-active-legacy-structures.js`
- `node --check scripts/audit-page-asset-authority-matrix.js`
- `npm run audit:agent-governance`

## Result

- Active remediation JS: `0`
- Active remediation CSS is now measured more accurately through direct links and resolved import chains.
- No shell, router, header, card, or visual contract was redesigned in this phase.
