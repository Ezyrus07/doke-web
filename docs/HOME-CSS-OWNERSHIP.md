# Home CSS ownership map

## Entry points
- `assets/css/pages/index.css`: page entry used by `index.html`
- `assets/css/pages/home/index.css`: home landing manifest

## Ownership
- `assets/css/pages/home/layout.css`: background plane, page canvas and non-component layout polish
- `assets/css/pages/home/chrome.css`: topbar, mobile header details, home side meta and shell chrome
- `assets/css/pages/home/hero.css`: search hero, hero actions and hero-specific dropdown shell
- `assets/css/pages/home/sections.css`: content rails, cards, tabs and home sections
- `assets/css/pages/home/footer.css`: footer bleed, grid and footer typography/actions
- `assets/css/pages/home/overlays.css`: location popover and address modal

## Compatibility bridges
Legacy filenames were preserved as bridges so existing imports on internal pages do not break:
- `home.css`
- `home-refresh.css`
- `home-sections.css`
- `home-overlays.css`

## Why this is safer
The layout keeps the same selectors and cascade order, but the codebase no longer depends on a single home stylesheet to carry hero, shell chrome, overlays and footer at once.
