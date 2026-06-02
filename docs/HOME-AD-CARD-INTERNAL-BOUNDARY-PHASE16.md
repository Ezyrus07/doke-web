# Home ad card internal boundary — Phase 16

## Goal
Continue the home ad-card boundary without redesigning approved visuals.

## Root cause
`assets/css/pages/home/tablet-safari-layout.css` still applied internal ad-card anatomy directly to media/body/footer/CTA elements. The page should provide context values; `marketplace-card-contract.css` should apply reusable card anatomy.

## Changes
- Added component-level variables for ad-card body, footer and CTA runtime anatomy.
- Updated the component authority guard in `marketplace-card-contract.css` to consume those variables.
- Converted selected tablet/Safari home overrides from direct descendant styling into contextual variables on the ad-card root.

## Preserved visual contract
Existing dimensions are preserved through variables, including:
- tablet/iPad media/body/footer sizing
- compact 561–700px card height/body height
- CTA display/visibility/height contracts

## Architecture
- `tablet-safari-layout.css`: page/viewport context only.
- `marketplace-card-contract.css`: ad-card internal anatomy authority.
