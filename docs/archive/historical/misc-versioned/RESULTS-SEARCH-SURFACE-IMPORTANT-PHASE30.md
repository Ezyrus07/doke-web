# Results search surface + compact service important reduction — Phase 30

## Scope

This phase uses `dokee-web(183).zip` as the baseline and is limited to the resultados/search-results area.

## Cause

After the previous low-risk important reduction, two visible result surfaces still had page-local drift:

- the resultados desktop search form could still inherit older rectangular search parity declarations instead of the shared `doke-search-pill` radius used by the index search;
- the results summary surface still consumed the generic card border, which looked too dark in the current desktop composition.

The compact service card file also contained many low-risk `!important` declarations on typography and color properties.

## Changes

- `assets/css/pages/search-results.css`
  - Keeps the resultados search bridge aligned with the shared `doke-search-pill` radius.
  - Adds a local `--results-summary-border` token to soften the results summary border without changing global cards.
- `assets/css/pages/search-results/compact-services.css`
  - Removes low-risk `!important` declarations from typography, color, margin and text formatting properties only.

## Non-goals

- No shell/sidebar/header/router changes.
- No home/card baseline changes.
- No layout-grid important removal in resultados.
- No backend or auth logic changes.

## Validation

- CSS brace balance checked for altered CSS files.
- `npm run audit:agent-governance` passed.

Playwright visual validation was not executed in this environment.
