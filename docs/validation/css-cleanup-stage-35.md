# CSS Cleanup Stage 35 — Perfil active cascade cleanup

## Objective
Move `perfil.html` toward the target architecture by removing legacy responsive/shell/tablet contracts from its active cascade and keeping the page CSS responsible only for profile-specific composition.

## Scope
- `perfil.html`
- `assets/css/pages/perfil/responsive.css`
- `assets/css/pages/perfil-publications.css`
- `assets/css/pages/perfil/owner-media-mobile.css`
- `assets/css/components/navigation/mobile-drawer-standard.css`
- `assets/css/pages/perfil.css`

## Structural changes
- Removed direct `perfil.html` dependencies on legacy shell/tablet/marketplace contracts that were acting as broad late-stage overrides.
- Added the clean shared header contract: `assets/css/layout/header.css`.
- Rewrote `perfil/responsive.css` as a page-only responsive composition layer.
- Rewrote `perfil-publications.css` as a local publications layout only.
- Rewrote `owner-media-mobile.css` as local owner-media composition only.
- Rewrote `mobile-drawer-standard.css` as a small drawer component contract without priority overrides.
- Removed remaining priority declarations from `perfil.css`.

## Result
- Active CSS files for `perfil.html`: 31
- Active `!important` in `perfil.html` cascade: 7072 → 0
- Total `!important` in `assets/css`: 16829 → 15548
- CSS files with unbalanced braces: 0

## Risk
High visual risk in `perfil.html`, especially tablet/mobile, because legacy shell/tablet contracts were removed from the page cascade.

Acceptable during this phase:
- less polished spacing;
- simpler header/drawer behavior;
- less dense cards/tabs;
- profile hero becoming more basic.

Not acceptable:
- page blank;
- main profile content missing;
- scroll locked;
- navigation unusable.
