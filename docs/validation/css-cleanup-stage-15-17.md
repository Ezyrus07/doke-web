# CSS Cleanup Stage 15–17

## Scope

This stage continues the structure-first cleanup of the home/mobile cascade.

## Changes

1. `assets/css/pages/home/mobile/search.css`
   - Rewritten as a small mobile search/hero composition file.
   - Removed late mobile overrides and priority flags.

2. `assets/css/pages/home/mobile/drawer.css`
   - Rewritten as a small home drawer layout file.
   - Removed global shell/sidebar-style remediations and priority flags.

3. `assets/css/pages/home-refresh/mobile-index-pass.css`
   - Retired as an active late mobile normalization pass.
   - Removed its import from `home-refresh.css`.

4. `assets/css/pages/home-sections.css`
   - Rewritten as a lean home section composition owner.
   - Removed duplicated card/rail/header/page-width overrides.

## Architectural target

- `layout/`: shell, header, page rail, responsive breakpoints.
- `components/`: card/button/input/modal anatomy.
- `patterns/`: rail/carousel/grid/list composition.
- `pages/`: page-specific arrangement only.

## Risk

High visual risk on the index mobile/tablet views. This stage intentionally favors fewer competing CSS authorities over pixel preservation.
