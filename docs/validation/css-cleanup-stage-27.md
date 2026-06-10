# CSS Cleanup Stage 27 — Core Topbar Simplification

## Scope

This stage simplified:

- `assets/css/core/layout/topbar.css`

## Root problem

`topbar.css` lived under `core/layout`, but it was not acting like a shared topbar contract. It contained page-specific `body.home-index-shell .home-index-topbar` blocks, duplicated desktop rules, and 67 `!important` declarations. That made the topbar another late authority competing with `layout/header.css`, page CSS, mobile contracts, and shell files.

## Change

`topbar.css` was rewritten as shared topbar anatomy only:

- base topbar container;
- left/center/right groups;
- search field and dropdown anatomy;
- profile dropdown anatomy;
- notification action marker;
- minimal mobile/tablet visibility rules for topbar controls.

It no longer owns:

- page rail width;
- home-only desktop grid corrections;
- cards;
- shell/sidebar;
- carousel behavior;
- page-specific header overrides.

## Measurements

From Stage 24–26 to Stage 27:

- `topbar.css`: 905 lines -> 591 lines
- `topbar.css` `!important`: 67 -> 0
- total `!important` in `assets/css`: 17,555 -> 17,488
- active `!important` in the index/home cascade: 726 -> 659
- unbalanced CSS files: 0

## Risk

High visual risk for topbar/header details on `index.html` and pages that consume `core/layout/topbar.css`.

Likely changes:

- desktop home header may be less polished;
- mobile/tablet topbar may become simpler;
- search dropdown and profile dropdown may lose previous fine-tuning.

Accepted during the cleanup phase because the goal is to remove competing authorities before visual refinement.

## Next target

The next high-value active targets are card/component-level files still using `!important`:

- `assets/css/components/cards/worker-card.css`
- `assets/css/components/ui-surface/buttons-close.css`
- `assets/css/components/cards/recommendation-card.css`
- `assets/css/patterns/responsive-layout-guards.css`
- `assets/css/components/search/search-autocomplete.css`
- `assets/css/components/search/search-bar.css`
