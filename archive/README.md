# Legacy home CSS — archived in 2026-04

These files were removed from the active `assets/css/pages/home/` tree because they were no longer part of the runtime cascade for `index.html`.

## Why they were archived
The home page had two parallel CSS universes:
- active top-level manifests: `assets/css/pages/home.css`, `home-refresh.css`, `home-sections.css`, `home-overlays.css`, `home-shell.css`
- inactive module variants under `assets/css/pages/home/*.css`

That structure increased the risk of editing the wrong file without changing the rendered page.

## Current runtime ownership
`index.html` -> `assets/css/pages/home.css`

`home.css` imports the runtime owners:
- `home-shell.css`
- `home-sections.css`
- `home-refresh.css`
- `home-overlays.css`
- `home/mobile/index.css`

## Archived files
- `home-chrome.2026-04.css`
- `home-footer.2026-04.css`
- `home-hero.2026-04.css`
- `home-index.2026-04.css`
- `home-layout.2026-04.css`
- `home-overlays.2026-04.css`
- `home-sections.2026-04.css`

These files can be referenced for migration history, but they must not receive new edits.
