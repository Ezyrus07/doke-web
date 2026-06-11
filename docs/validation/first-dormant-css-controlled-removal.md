# Stage 62 — First Dormant CSS Controlled Removal

## Objective
Remove only the first low-risk dormant CSS batch selected in `docs/validation/dormant-css-candidate-batch-plan-report.json`.

## Removed files
- `assets/css/components/shell/header-rail-alignment-contract.css`
- `assets/css/components/shell/tablet-shell-contract.css`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/navigation/home-mobile-drawer.css`
- `assets/css/components/shell/ipad-safari-scroll-rescue.css`
- `assets/css/components/shell/marketplace-page-contract.css`
- `assets/css/components/shell/tablet-app-parity.css`
- `assets/css/pages/app-shell-polish.css`
- `assets/css/pages/home/mobile-alignment.css`
- `assets/css/pages/perfil/tablet-portrait-contract.css`
- `assets/css/pages/search-results/mobile-card-contract.css`
- `assets/css/pages/home/mobile-composition.css`

## Validation summary

- Removed files: **12**
- CSS files total after removal: **399**
- CSS reachable from active HTML/import graph: **277**
- CSS not reachable after removal: **122**
- Broken CSS links in active HTML: **0**
- Broken CSS imports: **0**
- CSS brace imbalance errors: **0**
- `!important` in reachable CSS: **0**
- Dormant CSS files still containing `!important`: **39**
- Active references to removed files: **0**

## Decision
The first dormant CSS batch was removed physically. No active HTML/CSS/JS/config/script reference remains for the removed files. Historical reports and documentation may still mention them, but those references are archival and were not treated as runtime blockers.

## Notes
No visual recovery was attempted in this stage. No shell/header/sidebar global authority was changed.
