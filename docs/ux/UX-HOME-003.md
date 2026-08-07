# UX-HOME-003 — synchronized category rail navigation and overflow state

## Status

- tracking: issue `#87`;
- pull request: `#88`;
- branch: `ux/ux-home-003-rail-scroll-sync`;
- base: `ux/ux-home-002-more-services-filters`;
- certified base SHA: `85b5d2dc1d2c337a7e98c2174d13d027b74a5d33`;
- source contract: `UX-FOUNDATION-004 / HOME-UX-H04`;
- epic: `UX-FOUNDATION-018 / EPIC-10 — Home e favoritos`;
- staging/production/Supabase: out of scope;
- merge/ready-for-review: not authorized.

## Confirmed baseline

The current Home has one active arrow-controlled horizontal surface: Categories.

`index.html` provides:

- `[data-catégory-track]`;
- `[data-catégory-arrow="prev"]`;
- `[data-catégory-arrow="next"]`.

The current `home.js` binder:

- performs `scrollBy(...)` only after arrow clicks;
- derives distance from a percentage of the track viewport;
- does not derive start/middle/end state from geometry;
- does not disable boundary arrows;
- does not react to manual scroll, resize, content width, font/media width changes or route re-entry;
- still queries `[data-rail-arrow]`, although the current `index.html` has no matching controls.

This creates the P1 contract violation documented as `HOME-UX-H04`.

## Product boundary

This sublot will synchronize the arrows that already exist. It will not add arrows to other rails merely because a generic legacy selector exists.

The approved visual baseline remains authoritative.

## State contract

The local authority derives exactly four presentation states:

```text
READY_FITS
READY_OVERFLOW_START
READY_OVERFLOW_MIDDLE
READY_OVERFLOW_END
```

Runtime values may use stable lowercase dataset tokens while preserving the one-to-one semantic mapping.

Geometry inputs:

```text
scrollLeft
scrollWidth
clientWidth
epsilon
```

Required invariants:

- `scrollWidth <= clientWidth + epsilon` means `READY_FITS`;
- elastic/negative browser scroll is clamped for state derivation;
- subpixel remainder within epsilon counts as a boundary;
- no state depends on item identity or user identity.

## Step contract

Arrow navigation advances by complete item geometry, not a viewport percentage.

Preferred authority:

```text
nextItem.offsetLeft - currentItem.offsetLeft
```

Fallback:

```text
itemWidth + computedGap
```

A final explicit positive fallback is allowed only when item geometry is unavailable.

## Motion contract

```text
prefers-reduced-motion: reduce -> behavior: auto
otherwise                      -> behavior: smooth
```

Native touch, trackpad and direct scroll remain available.

## Lifecycle contract

The future DOM adapter must synchronize after:

- initial binding;
- `scroll`;
- viewport resize;
- `ResizeObserver` notification on the track;
- relevant content-width changes;
- stable-shell Home route re-entry.

It must use the Home route `AbortSignal` or an equivalent generation fence so re-entry does not duplicate listeners or observers.

## Accessibility contract

- existing specific arrow labels remain intact;
- unavailable directions use real `disabled` state;
- when the complete rail fits, controls must not remain actionable without effect;
- focus must not jump to cards after arrow navigation;
- native rail navigation remains possible without arrow controls;
- hiding/disabling controls must not programmatically move focus.

## Phase plan

1. pure scroll-state authority + deterministic tests;
2. DOM surface/controller with observer lifecycle;
3. Category integration and removal of dead generic binder authority;
4. browser contract across representative breakpoints;
5. inherited regressions, LCOV, Sonar and final evidence.

## Rollback

The work is presentation-only and contains no migration or persistent-data write. Rollback is code-only by reverting the UX-HOME-003 commits; UX-HOME-002 remains the stable base.
