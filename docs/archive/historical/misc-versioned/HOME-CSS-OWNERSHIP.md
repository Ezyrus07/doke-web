# Home CSS ownership map

## Runtime entry point
- `index.html` -> `assets/css/pages/home.css`

## Runtime owners
- `assets/css/pages/home-shell.css`: home shell scaffolding, workspace spacing and page-level shell behavior
- `assets/css/pages/home-search-chrome.css`: hero, top chrome, search field, dropdown and CTA composition
- `assets/css/pages/home-sections.css`: content rails, cards, section titles, section normalization and feed composition
- `assets/css/pages/home-refresh.css`: remaining home refinements, responsive cleanup and normalization
- `assets/css/pages/home-overlays.css`: order feedback overlay, location popover, address modal, split-screen filters and other layered UI
- `assets/css/pages/home/mobile/index.css`: mobile manifest importing the active mobile modules in `assets/css/pages/home/mobile/`

## Archived parallel files
The following files were removed from the active tree because they were not part of the runtime cascade anymore and were causing edits in the wrong place:
- `assets/css/pages/home/chrome.css`
- `assets/css/pages/home/footer.css`
- `assets/css/pages/home/hero.css`
- `assets/css/pages/home/index.css`
- `assets/css/pages/home/layout.css`
- `assets/css/pages/home/overlays.css`
- `assets/css/pages/home/sections.css`

They now live in `archive/legacy-home-css/` for reference only.

## Maintenance rule
When changing the home page:
1. start from `assets/css/pages/home.css`
2. edit one of the runtime owners listed above
3. avoid creating a second owner for the same responsibility

## 2026-04 cleanup
- Moved order feedback, location popover/address modal and split-screen filter surfaces out of `home-refresh.css` into `home-overlays.css`.
- `home-refresh.css` now stays focused on hero, top chrome and search composition.

- Moved the primary hero/search block out of `home-refresh.css` into `home-search-chrome.css` so chrome/search ownership stops competing with later cleanup layers.

- Moved final section normalization into `home-sections.css`.
- Moved desktop search control stabilization into `home-search-chrome.css`.

## 2026-04 import order adjustment
- `home-search-chrome.css` now loads after `home-refresh.css` and `home-overlays.css`, but before `home/mobile/index.css`.
- This gives the desktop search/chrome owner the final word on desktop without overriding the mobile owner, reducing the need for `!important`.

## 2026-04 commit8
- Removed desktop-only force overrides from `home-refresh.css` after the manifest order was stabilized in commit7.

## 2026-04 regression fix
- Restored the desktop search card surface in `home-search-chrome.css`. The search/chrome owner should control the white search block on desktop.

## 2026-04 commit10
- Restored the approved desktop search-card composition in `home-search-chrome.css`: leading filter inside the field, submit arrow on the right, and desktop CTAs below the field.

## 2026-04 commit11
- Fixed the desktop submit arrow alignment in `home-search-chrome.css` by restoring the button as an absolute control centered inside the search field.
