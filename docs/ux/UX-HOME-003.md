# UX-HOME-003 — synchronized category rail navigation and overflow state

## Status

- tracking: issue `#87`;
- pull request: `#88`;
- branch: `ux/ux-home-003-rail-scroll-sync`;
- base: `ux/ux-home-002-more-services-filters`;
- certified base SHA: `85b5d2dc1d2c337a7e98c2174d13d027b74a5d33`;
- certified functional SHA before this evidence-only commit: `832bdc90b2524a5439d1987a63a87e77ddd82469`;
- source contract: `UX-FOUNDATION-004 / HOME-UX-H04`;
- epic: `UX-FOUNDATION-018 / EPIC-10 — Home e favoritos`;
- implementation: complete;
- staging/production/Supabase: not accessed;
- merge/ready-for-review: not authorized;
- PR must remain open, draft and unmerged.

## Confirmed baseline and root cause

The Home had one active arrow-controlled horizontal surface: Categories.

`index.html` provided:

- `[data-catégory-track]`;
- `[data-catégory-arrow="prev"]`;
- `[data-catégory-arrow="next"]`.

The previous `home.js` authority:

- performed `scrollBy(...)` only after arrow clicks;
- derived distance from a percentage of the track viewport;
- did not derive start/middle/end state from geometry;
- did not disable boundary arrows;
- did not react to manual scroll, resize, content width, font/media width changes or route re-entry;
- still queried `[data-rail-arrow]`, although the current `index.html` had no matching controls.

This was the P1 contract violation documented as `HOME-UX-H04`.

## Product boundary

UX-HOME-003 synchronizes only the Category arrows that already exist in the approved Home baseline.

It does not add arrows to Destaques, Workers, Publicações, Profissionais or other rails merely because a generic legacy selector existed.

No Home redesign or rail reordering is included.

## Implemented architecture

### Pure state authority

`assets/js/pages/home/rail-scroll-state.js` publishes `Doke.homeRailScrollState` and derives exactly four presentation states:

```text
READY_FITS
READY_OVERFLOW_START
READY_OVERFLOW_MIDDLE
READY_OVERFLOW_END
```

Runtime dataset tokens preserve the same one-to-one semantics:

```text
ready-fits
ready-overflow-start
ready-overflow-middle
ready-overflow-end
```

Geometry inputs:

```text
scrollLeft
scrollWidth
clientWidth
epsilon
```

Implemented invariants:

- `scrollWidth <= clientWidth + epsilon` means `READY_FITS`;
- elastic/negative browser scroll is clamped for state derivation;
- subpixel remainder within epsilon counts as a boundary;
- snapshots and state registry are immutable;
- no state depends on item identity or user identity.

### DOM controller

`assets/js/pages/home/rail-scroll-controller.js` publishes `DokeHomeRailScroll` and is composed by `home.js` with the same route `AbortSignal` used by the Home lifecycle.

It synchronizes:

- initial binding;
- native/manual `scroll`;
- viewport `resize`;
- `ResizeObserver` on the track and item geometry;
- `MutationObserver` child-list changes;
- `document.fonts.ready`;
- stable-shell route re-entry.

State refresh is coalesced through `requestAnimationFrame`, and route abort removes listeners, observers and pending frame work.

### Step contract

Arrow navigation advances by complete item geometry, not by a viewport percentage.

Preferred authority:

```text
nextItem.offsetLeft - currentItem.offsetLeft
```

Fallback:

```text
itemWidth + computedGap
```

A final explicit positive fallback is used only when item geometry is unavailable.

### Motion contract

```text
prefers-reduced-motion: reduce -> behavior: auto
otherwise                      -> behavior: smooth
```

Native touch, trackpad and direct scroll remain available.

### Accessibility contract

- existing specific arrow labels are preserved;
- unavailable directions use real `disabled` state plus `aria-disabled`;
- when the complete rail fits, both arrows are non-actionable;
- focus remains on the initiating arrow after navigation;
- native rail navigation remains available without the arrows;
- route cleanup does not move focus programmatically.

## Legacy authority removed

`home.js` no longer owns:

- `bindScrollRail`;
- `catégoryTrack` / `catégoryArrows` local scrolling authority;
- `[data-rail-arrow]` generic binder;
- `railArrows`;
- viewport-percentage step calculation using `amountFactor`.

`index.html` still contains only the existing Category arrows. No generic rail-arrow markup was introduced.

## Deterministic validation

Permanent contracts:

- `scripts/test-ux-home-003-rail-scroll-state.js`;
- `scripts/test-ux-home-003-rail-scroll-controller.js`;
- `scripts/test-ux-home-003-integration-contract.js`;
- `scripts/test-ux-home-003-browser-contract.js`.

The Chromium contract validates real browser geometry and behavior for:

- start / middle / end boundaries;
- `READY_FITS` after resize;
- one complete 116 px item+gap step in the controlled fixture;
- manual scroll synchronization;
- mutation-driven overflow changes;
- focus preservation;
- reduced motion;
- route abort;
- route re-entry without duplicate authority;
- narrow viewport re-derivation.

## Certified evidence — functional SHA `832bdc90b2524a5439d1987a63a87e77ddd82469`

### GitHub Actions

- PR run: `31214207742` — success;
- trusted push run: `31214200977` — success;
- trusted push job: `92983793643` — success;
- syntax: passed;
- Home integration contract: passed;
- pure state contract: passed;
- DOM controller lifecycle contract: passed;
- Chromium browser contract: passed;
- inherited UX-HOME-001 contracts: passed;
- inherited UX-HOME-002 contracts: passed;
- inherited SEARCH contracts: passed;
- patch whitespace: passed.

### Executable LCOV

Node coverage for the production authorities:

```text
rail-scroll-controller.js  lines 100.00% | branches 68.00% | functions 90.91%
rail-scroll-state.js       lines 100.00% | branches 87.10% | functions 100.00%
all covered files          lines 100.00% | branches 75.31% | functions 93.10%
```

Executable lines: `246/246`.

The trusted Sonar scan explicitly imported:

```text
coverage/ux-home-003/lcov.info
```

### SonarQube Cloud

- Quality Gate: passed;
- New issues: `0`;
- Accepted issues: `0`;
- Security Hotspots: `0`;
- Sonar annotations: `0`;
- Coverage on New Code: `93.3%`;
- Duplication on New Code: `0.0%`.

## Repository/runtime impact

Changed production authority is limited to the Home presentation layer:

- `assets/js/pages/home/rail-scroll-state.js`;
- `assets/js/pages/home/rail-scroll-controller.js`;
- `assets/js/pages/home.js` composition cleanup;
- `index.html` script composition.

There are no repository/service/RPC/backend changes, no migration, no Supabase mutation, no staging access and no production access.

## Residual boundaries

- UX-HOME-003 intentionally does not add navigation arrows to rails that do not have them in the approved baseline;
- shared GitHub Actions Node-runtime deprecation warnings are infrastructure warnings, not UX-HOME-003 code findings;
- Sonar may surface unrelated pre-existing parser warnings outside the UX-HOME-003 diff; the certified PR analysis has zero new UX-HOME-003 issues.

## Rollback

The work is presentation-only and contains no migration or persistent-data write.

Rollback is code-only by reverting UX-HOME-003 commits; UX-HOME-002 at `85b5d2dc1d2c337a7e98c2174d13d027b74a5d33` remains the stable base.
