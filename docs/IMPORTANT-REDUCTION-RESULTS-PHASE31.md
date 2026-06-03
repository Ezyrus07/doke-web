# Phase 31 — Results mobile density important reduction

## Scope

This phase continues the controlled `!important` reduction in the active results/search-results CSS, using `dokee-web(184).zip` as the baseline.

Changed file:

- `assets/css/pages/search-results/mobile-density.css`

## Root cause

The results mobile density contract still had low-risk presentation declarations marked with `!important` even though the selectors are already scoped by `body.search-results-body` and by mobile-only media queries.

The remaining high-risk declarations in this file still protect mobile layout ownership and were intentionally kept for later phases.

## Changes

Removed `!important` only from low-risk presentation declarations:

- spacing: `gap`, `padding`, `margin`, `margin-top`
- typography: `font-size`, `line-height`
- shape: `border-radius`
- alignment and snap: `align-items`, `align-content`, `scroll-snap-align`

No visual values were changed.

## Preserved

Kept `!important` on riskier declarations:

- `display`
- grid templates
- width/height/min/max values
- overflow and hidden state
- aspect ratio
- mobile overlay/topbar guards
- line-clamp structural declarations

## Validation

Executed:

- CSS brace-balance check for the changed file
- `npm run audit:agent-governance`
- `git diff --check`

Playwright visual validation was not executed in this phase.
