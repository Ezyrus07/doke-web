# CSS Cleanup Stage 14 — Home shell ownership reduction

## Goal
Reduce `assets/css/pages/home-shell.css` to page-specific home shell composition only.

## Changes
- Removed home-page ownership of sidebar/header/mobile drawer geometry.
- Removed mobile/tablet rescue selectors from the page layer.
- Kept only home theme tokens, workspace spacing and page-content background.

## Architecture decision
- `layout/` owns shell/header/rail/sidebar/breakpoints.
- `pages/home-shell.css` owns only home-specific surface/theme/workspace composition.
- Page CSS must not override sidebar/nav/header behavior with priority flags.

## Risk
High visual risk for the home sidebar/mobile drawer/header because legacy page-layer overrides were retired.
This is intentional for the structural cleanup phase.

## Validation
Static validation only:
- CSS braces balanced.
- `home-shell.css` now has zero `!important` occurrences.
