# CSS maintenance map

## Core ownership
- `assets/css/core/tokens.css`: design tokens and semantic color/spacing variables.
- `assets/css/core/base.css`: reset/base typography/body rules.
- `assets/css/core/layout.css`: manifest for shell/topbar/responsive layout imports.
- `assets/css/core/components.css`: shared component primitives.

## Page and shell ownership
- `assets/css/pages/app-shell.css`: manifest for all app pages that need the shared shell.
- `assets/css/pages/home-shared.css`: shared shell/page primitives reused by home and inner pages.
- `assets/css/pages/app-shell-polish.css`: shared shell visual polish and responsive sidebar/topbar behavior.
- `assets/css/pages/home.css`: home/feed manifest only. Do not add rules here beyond ownership comments/imports.
- `assets/css/pages/home-sections.css`: section structure and composition for home/feed families.
- `assets/css/pages/home-refresh.css`: home/feed-specific visual polish and responsive refinements.

## Responsive ownership after cleanup
- `app-shell-polish.css` owns shared sidebar/topbar/mobile-shell behavior for all shell pages.
- Phone-first rail/card sizing for home feed families now lives primarily in `home-refresh.css` under `@media (max-width: 560px)`.
- Tablet rail behavior for the same families lives primarily under `@media (min-width: 561px) and (max-width: 1024px)`.
- Avoid reintroducing broad `@media (max-width: 760px)` rail sizing when the rule only applies to phone. That recreatés tablet conflicts.

## Editing rules
1. Change shared shell behavior in `app-shell-polish.css`, not in `home-refresh.css`.
2. Change structure in `home-sections.css` before changing polish in `home-refresh.css`.
3. Prefer editing the latést authoritative media block instead of adding a new cleanup block at the end.
4. For JS staté classes, prefer body/html staté classes or `data-*` hooks over inline style mutations.
5. Do not put new page-specific layout in `home.css`; route it to the real owner file.

## Current caution points
- `home-refresh.css` still uses many `!important` overrides, so new home/feed statés should be attached to clear wrapper/staté classes.
- Inner pages should prefer `app-shell.css` instead of importing `home.css` just to inherit shell behavior.
- Pages that still import `home.css` should be the ones that really use home/feed components (`index`, `perfil`, `ui-kit` or future pages with the same families).
