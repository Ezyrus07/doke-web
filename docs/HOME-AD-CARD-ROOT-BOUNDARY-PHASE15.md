# Home ad-card root boundary — Phase 15

## Goal
Continue the home card authority cleanup without changing the approved visual.

## Root cause
`tablet-safari-layout.css` was still directly controlling root anatomy of home ad cards, including display mode, row template, height, min-height, max-height and overflow. Those values are contextual for the home/tablet rail, but the card component should expose the contract that consumes them.

## Changes
- `marketplace-card-contract.css` now exposes root ad-card anatomy tokens:
  - `--doke-ad-card-display`
  - `--doke-ad-card-flex-direction`
  - `--doke-ad-card-grid-template-rows`
  - `--doke-ad-card-height`
  - `--doke-ad-card-min-height`
  - `--doke-ad-card-max-height`
  - `--doke-ad-card-overflow`
- `tablet-safari-layout.css` now sets those tokens for the home featured/more-services context instead of hardcoding the component root anatomy directly.

## Visual intent
No visual redesign. Values are preserved:
- compact tablet cards keep `318px` min-height where previously used;
- two-column tablet cards keep `grid` with `140px minmax(206px, auto)` rows and `350px` min-height.

## Architectural effect
The page/tablet stylesheet now provides context values, while `marketplace-card-contract.css` remains the authority that applies card root anatomy.
