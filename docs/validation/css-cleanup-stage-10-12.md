# CSS Cleanup Stage 10–12

## Goal
Reduce tablet/mobile cascade competition and retire broad responsive patch layers.

## Stage 10 — Responsive shell authority
- Added `assets/css/layout/responsive.css` as the new minimal responsive layout owner.
- Updated `assets/css/core/layout/index.css` to import the new layout file.
- Retired `assets/css/core/layout/responsive-shell.css`, which mixed shell, header, sidebar, icons, page padding and visibility rules with hundreds of priority flags.

## Stage 11 — Home mobile patch layers
- Removed the home-level import of `assets/css/pages/home/mobile-index-feed-contract.css`.
- Removed the mobile manifest import of `assets/css/pages/home/mobile/sections.css`.
- Retired both files instead of moving their old overrides elsewhere.

## Stage 12 — Global mobile card distribution patch
- Retired `assets/css/components/cards/mobile-card-distribution-contract.css`.
- The old file treated mobile card distribution as card anatomy. This belongs to patterns/rails or page composition.

## Risk
High visual risk on tablet/mobile. This stage intentionally favors structural predictability over visual preservation.

## Acceptance floor
- pages open;
- content is visible;
- scroll is not blocked;
- no white screen;
- no new patch CSS files are introduced.
