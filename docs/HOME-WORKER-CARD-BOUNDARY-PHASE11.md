# Home Worker Card Boundary - Phase 11

## Objective

Reduce one concrete rail/card authority conflict in the home without changing the approved visual baseline.

This phase does not redesign Workers, does not change the number of cards, and does not touch shell, header, router, body, sidebar or global page width contracts.

## Root cause

`assets/css/pages/home/tablet-safari-layout.css` still owned Worker card dimensions even though its intended responsibility is tablet/Safari rail and layout behavior. The approved Worker dimensions were correct, but they lived in the wrong authority layer.

That meant the Worker card sizing contract was split between:

- `assets/css/pages/home.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/components/cards/worker-card.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`

## What changed

The approved Worker card dimensions were moved into the Worker component authority:

- `assets/css/components/cards/worker-card.css`

The following responsibility was removed from the tablet/Safari page layout layer:

- desktop/tablet Worker card `width`
- desktop/tablet Worker card `min-width`
- desktop/tablet Worker card `max-width`
- desktop/tablet Worker card `height`
- desktop/tablet Worker card `min-height`
- desktop/tablet Worker card `aspect-ratio`
- desktop/tablet Worker card `flex-basis`

`assets/css/pages/home/tablet-safari-layout.css` still owns rail/track layout behavior for tablet/Safari, including overflow, track mode and scroll behavior.

## Preserved visual contract

The moved values are intentionally the same values already approved in the previous phases:

- default >= 561px Worker card width: `clamp(168px, 13.2vw, 205px)`
- default >= 561px Worker card height: `clamp(292px, 22vw, 342px)`
- compact portrait 561px-700px Worker card size: `152px x 236px`

## Files changed

- `assets/css/components/cards/worker-card.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `docs/HOME-WORKER-CARD-BOUNDARY-PHASE11.md`
- `docs/HOME-RAIL-CARD-AUTHORITY-AUDIT.md`
- `docs/validation/home-rail-card-authority-report.json`
- `docs/validation/active-legacy-structures-report.json`
- `docs/validation/page-asset-authority-matrix.json`

## Validation

Executed:

- `npm run audit:agent-governance`
- CSS brace balance check for the changed CSS files
- `git diff --check`

Current audit results after this phase:

- active legacy/remediation CSS: `0`
- active legacy/remediation JS: `0`
- home rail/card declarations: `12631`
- home rail/card collisions: `254`

The declaration count dropped slightly because duplicate Worker sizing declarations were removed from the tablet/Safari layer. Collision count did not drop yet because the remaining collision buckets are broader and still include shared card/rail targets. That is expected for this first boundary move.

## Tests not executed

Playwright visual testing was not executed in this environment. Validate `index.html` on mobile/tablet/desktop after applying.
