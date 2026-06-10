# CSS Cleanup Stage 03 — Home runtime manifest-only

Date: 2026-06-10

## Goal

Reduce CSS competition in the home page by retiring the inline override layer inside `assets/css/pages/home-runtime.css`.

The target architecture is:

- `core`: foundation tokens/reset/typography/base only.
- `layout`: shell/header/rail/sidebar/breakpoints.
- `components`: reusable pieces such as cards/buttons/inputs/modals/tabs.
- `patterns`: carousel/rail/grid/list/section-header composition.
- `pages`: page-specific composition only.
- `utilities`: small generic helpers.

## Change

`assets/css/pages/home-runtime.css` is now a manifest only. Its `@import` dependency list was kept, but the accumulated inline desktop/tablet/mobile/card/rail override blocks were removed.

Reason: this file had become a late cascade authority over responsibilities that belong to layout, components, patterns and page-specific modules. It contained repeated "final" contracts, hydration locks and mobile/tablet repair blocks that made the loaded home state differ from the initial layout.

## Files changed

- `assets/css/pages/home-runtime.css`
- `assets/css/pages/home.css`
- `docs/validation/css-cleanup-stage-03.md`
- `docs/validation/css-cleanup-stage-03-active-css-map.json`

## Measurable result

Compared with Stage 02:

- `home-runtime.css`: 4,856 lines -> 102 lines.
- `home-runtime.css`: 921 `!important` declarations -> 0.
- Project CSS priority declarations: 23,056 -> 22,135.
- Active `index.html` cascade priority declarations: 11,176 -> 10,255.
- CSS file count remains 375; this stage reduced active CSS weight and override competition, not file count.

## Risk

High visual risk on the home page, especially tablet/mobile. This is intentional for the current cleanup phase. The removed rules included visual patches for rails, cards, arrows, desktop alignment and mobile density.

Acceptable temporary regressions:

- card spacing/size changes;
- rail alignment changes;
- mobile/tablet density becoming less polished;
- desktop home alignment losing late optical corrections.

Not acceptable regressions:

- blank page;
- missing core content;
- impossible vertical scroll;
- navigation becoming unusable.

## Next cleanup target

After validating that the home still loads, the next stage should reduce import duplication and move remaining home-specific responsibilities out of `home.css` into the proper owners:

- layout authority: shell/header/rail/sidebar/breakpoints;
- component authority: cards/buttons/tabs/avatars;
- pattern authority: horizontal rails/carousels/grids;
- page authority: home section order and spacing only.
