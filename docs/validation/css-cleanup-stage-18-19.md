# CSS Cleanup Stage 18–19

## Scope

Continued the structural cleanup of the active home cascade. This stage targeted the search/chrome and popover layers that were still acting as late override files.

## Files changed

- `assets/css/pages/home-search-chrome.css`
- `assets/css/pages/home-ux-popovers.css`

## Stage 18 — home-search-chrome.css

The file was reduced from a large mixed layer into a small page composition file. It now owns only the home search hero geometry, search form/dropdown placement and lightweight home topbar/location composition. It must not control cards, rails, shell/sidebar, carousels or global responsive contracts.

## Stage 19 — home-ux-popovers.css

The file was reduced to popover positioning for the search dropdown and the home more-filters panel. It no longer acts as a late normalizer for layout, cards or shell behavior.

## Metrics after stage

- Active CSS files in `index.html` cascade: 119
- Active `!important` in `index.html` cascade: 1746
- Total CSS files in `assets/css`: 371
- Total `!important` in `assets/css`: 18575
- CSS files with unbalanced braces: 0

## Risk

High visual risk around the home search area, autocomplete dropdown, location pill and more-filters popover. This is accepted during structural cleanup. The minimum acceptance criteria remain: page opens, content is visible, scroll works, and no blank screen.
