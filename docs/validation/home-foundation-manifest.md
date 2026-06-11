# Home Foundation Manifest Validation

## Scope

Created a conservative `assets/css/pages/home-foundation.css` manifest for `index.html`.

## Intent

Reduce direct CSS links in the home HTML without changing the effective cascade order.

## Previous direct HTML order

1. `assets/css/core/index.css`
2. `assets/css/pages/app-shell.css`
3. `assets/css/pages/home.css`

## New direct HTML order

`index.html` now links only `assets/css/pages/home-foundation.css`, which imports:

1. `../core/index.css`
2. `./app-shell.css`
3. `./home.css`

## Files physically removed

None.

## Risk decision

No CSS file was deleted. No visual rule was added. The only cascade risk is browser handling of one manifest import versus three direct HTML links, but the import order intentionally mirrors the former order.

## Validation results

- Active HTML files checked: `21`
- Direct CSS links in active HTML files: `119`
- Broken CSS links in active HTML files: `0`
- CSS files under `assets/css`: `390`
- CSS imports under `assets/css`: `304`
- Broken CSS imports under `assets/css`: `0`
- CSS files with unbalanced braces under `assets/css`: `0`
- CSS files reachable from active HTML: `256`
- Reachable CSS files with `!important`: `0`
- Full `assets/css` files still containing dormant legacy `!important`: `51`

## Important note about `!important`

The active cascade remains clean: no reachable CSS from active HTML contains `!important`.

The full `assets/css` tree still contains dormant legacy files with `!important`. They were not physically deleted in this stage because removal requires a separate orphan/dormant-asset audit that also checks HTML, CSS imports, JS strings, data attributes and possible dynamic loading.

## Commands executed

- Custom structural validation for active HTML CSS links, CSS imports, brace balance and reachable `!important`.
- `npm run audit:css-import-map`
- `npm run audit:essential-asset-imports`

## Machine-readable report

See `docs/validation/home-foundation-manifest-report.json`.

## Next recommended target

Create a marketplace/detail foundation manifest for `resultados.html` and `detalhe-anuncio.html`, preserving order first and reducing direct HTML links second.
