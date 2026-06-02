# Home ad CTA boundary — Phase 14

## Goal
Fix the mobile ad-card CTA width regression (`Ver anúncio` too narrow) and continue the ad-card boundary work without redesign.

## Root cause
Home mobile overrides compressed CTA sizing directly in `home.css` (`34px` height, `10px` horizontal padding) after the previous ad-card boundary step. The component contract did not yet own CTA sizing via variables, so the page override became too aggressive.

## Changes
- `marketplace-card-contract.css` now exposes CTA sizing tokens for ad/service cards:
  - `--doke-ad-cta-min-width`
  - `--doke-ad-cta-min-height`
  - `--doke-ad-cta-padding-inline`
  - `--doke-ad-cta-font-size`
- `home.css` sets a safer mobile CTA contract for featured-services and more-services cards:
  - min width `112px`
  - min height `36px`
  - horizontal padding `14px`
  - font size `0.74rem`

## Architectural effect
This keeps page-level context in the home stylesheet while moving CTA anatomy authority into the card component contract.
