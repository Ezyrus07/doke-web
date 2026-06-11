# Community Foundation Manifest Consolidation

## Decision
The initial orphan/dormant CSS audit found one active blocker: `comunidade.html` still loaded 26 local CSS files directly. The orphan audit was deferred because this outlier would inflate active CSS counts and make removal candidates less reliable.

## Files changed
- `comunidade.html`
- `assets/css/pages/comunidade-foundation.css`
- `assets/css/pages/comunidade-ui-foundation.css`
- `assets/css/pages/comunidade-post-shell-foundation.css`

## What changed
- Consolidated the first comunidade CSS group into `assets/css/pages/comunidade-foundation.css`.
- Consolidated the UI CSS loaded after the early mobile-shell class setup into `assets/css/pages/comunidade-ui-foundation.css`.
- Consolidated the late post-shell page CSS into `assets/css/pages/comunidade-post-shell-foundation.css`.
- Preserved the original CSS order inside each script boundary.
- Did not delete physical CSS files.

## Measurable result
- `comunidade.html`: 26 local direct CSS links -> 3 local direct CSS links.
- Active HTML CSS broken links: 0.
- Broken CSS imports: 0.
- CSS files with unbalanced braces: 0.
- `!important` in active reachable CSS: 0.
- Dormant/source `assets/css` files still containing `!important`: 51.

## Risk
Low to moderate. The consolidation is conservative because it preserves script boundaries instead of forcing all comunidade CSS into a single earlier entrypoint. The remaining risk is that first-paint timing can still be sensitive on this page, so visual/runtime validation should happen later.

## Tests executed
- `npm run audit:css-import-map` -> passed.
- `npm run audit:essential-asset-imports` -> passed-with-follow-up.
- Custom structural validation for active HTML CSS links, CSS imports, CSS brace balance, and active `!important`.

## Next recommended target
Run the Active CSS Load Map / Orphan Candidate Audit now that the active HTML entrypoints are more consistently consolidated.
