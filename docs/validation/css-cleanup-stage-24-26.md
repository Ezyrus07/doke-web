# CSS Cleanup Stage 24-26

## Scope

Simplified three active CSS authorities that were still using `!important` to override shared UI:

- `assets/css/components/search/search-filter-contract.css`
- `assets/css/components/sections/section-header-canonical-contract.css`
- `assets/css/pages/home-overlays/workers-feed-card-layout.css`

## Architectural decision

These files are no longer allowed to act as final override layers.

- Search owns search controls, dropdown hosts and the filter sheet.
- Section header owns title/action anatomy only.
- Workers overlay owns overlay composition only.

They must not control cards, rails, shell, global page width or unrelated responsive layout.

## Risk

Visual risk is medium/high in:

- search results filter/search controls;
- home search dropdowns;
- section headers across pages;
- worker preview overlay and comments rail.

This stage intentionally favors a simpler cascade over preserving old pixel-level polish.
