# Mobile standardization pass — 2026-04-26

## Consolidated contracts

- Mobile search on `index.html` now submits/navigates to `resultados.html?q=...` without opening the desktop suggestion dropdown.
- Shared card sizing is centralized in `assets/css/core/mobile-ui-standard.css` and reinforced in `assets/css/components/cards/service-card.css`.
- Result-page legacy enlarged card rules are neutralized at the end of `assets/css/pages/search-results.css` only because that page previously loaded later and used several stronger selectors.
- Floating icon buttons now share the same mobile hit area: `44px x 44px`, circular radius, proportional icon size and consistent top/right placement.
- Internal mobile pages use one bottom spacing contract based on bottom nav height plus safe area, avoiding phantom scroll space.

## Compatibility note

Some page-level compatibility layers remain because several page CSS files are loaded after core/components and contain older high-specificity modal/card rules. These layers reference the shared variables from `core/mobile-ui-standard.css` rather than introducing new visual values.
