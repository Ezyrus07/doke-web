# Home Publication Card Boundary - Phase 12

## Objective

Reduce one concrete home rail/card authority conflict without changing the approved visual baseline.

This phase targets only the Publication card anatomy inside the home tablet/Safari layout path. It does not redesign the publication rail, does not change card counts, and does not touch shell, header, router, sidebar or global page width contracts.

## Root cause

`assets/css/pages/home/tablet-safari-layout.css` still controlled Publication card internals:

- publication media height
- publication content minimum height
- publication content overflow

Those are card anatomy responsibilities. The tablet/Safari page file should own the rail layout, card width, visible quantity and scroll behavior, but it should not directly set inner card media/content dimensions.

## What changed

The Publication card component contract now exposes and owns these anatomy variables:

- `--doke-publication-content-min-height`
- `--doke-publication-content-max-height`
- `--doke-publication-content-overflow`

The tablet/Safari home layout now sets Publication card values through variables on `section.home-publications` instead of reaching into `.publication-card__media` and `.publication-card__content` directly.

`assets/css/pages/home/tablet-safari-layout.css` still owns the rail/card placement contract, including:

- horizontal rail mode
- publication card flex-basis/width in that rail
- scroll-snap behavior
- tablet-specific grid/flex mode

## Preserved visual contract

The moved values are intentionally the same values already active before this phase:

- tablet portrait default publication media height: `150px`
- tablet portrait default publication content min-height: `124px`
- compact portrait publication media height: `144px`
- compact portrait publication content min-height: `126px`

The publication rail remains controlled by the home/tablet file. Only inner publication card anatomy moved to the component authority.

## Files changed

- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `docs/HOME-PUBLICATION-CARD-BOUNDARY-PHASE12.md`
- `docs/HOME-RAIL-CARD-AUTHORITY-AUDIT.md`
- `docs/validation/home-rail-card-authority-report.json`
- `docs/validation/active-legacy-structures-report.json`
- `docs/validation/page-asset-authority-matrix.json`

## Validation

Executed:

- CSS brace balance check for changed CSS files
- `npm run audit:agent-governance`
- `git diff --check`

Current audit results after this phase:

- active legacy/remediation CSS: `0`
- active legacy/remediation JS: `0`
- home rail/card declarations: `12614`
- home rail/card collisions: `254`

The declaration count dropped because direct Publication card media/content anatomy declarations were removed from the tablet/Safari page layer. Collision count did not drop yet because the remaining collision buckets are still broader and include many shared card/rail declarations.

## Tests not executed

Playwright visual testing was not executed in this environment. Validate `index.html` on tablet/mobile/desktop after applying.
