# CSS Cleanup Stage 23 — App Shell simplification

## Scope

Target file:

- `assets/css/components/shell/app-shell.css`

This stage focused on reducing shell-level overrides and moving the project closer to the target architecture:

- `layout/*` owns shell geometry, page rail, header width and responsive behavior.
- `components/shell/*` owns only reusable app-shell surface/navigation visuals.
- Page CSS must not own shell/sidebar/header geometry.

## Root issue

`app-shell.css` was still acting as a late global authority. It mixed:

- app-shell theme tokens;
- page content geometry;
- sidebar geometry;
- bottom navigation geometry;
- internal mobile header remaps;
- desktop frame hardening;
- iPad portrait scroll rescue;
- many `!important` declarations.

This made the shell hard to reason about and kept tablet/mobile behavior dependent on broad override blocks.

## Changes

Rewrote `assets/css/components/shell/app-shell.css` as a lightweight component stylesheet.

Kept:

- app-shell visual tokens;
- shell/page surface colors;
- workspace baseline spacing;
- sidebar visual styling;
- nav-link visual styling;
- bottom-nav visual styling;
- compact internal mobile header basics.

Removed from this file:

- desktop grid/frame hardening;
- iPad portrait scroll rescue;
- broad layout ownership already handled by `assets/css/layout/responsive.css` and `assets/css/layout/page-rail.css`;
- `!important`-based mobile/sidebar overrides;
- duplicated canonical responsive shell contract appended at the end of the file.

## Metrics

Compared with Stage 20–22:

- `app-shell.css`: 1140 lines -> 380 lines
- `app-shell.css` `!important`: 205 -> 0
- total `!important` in `assets/css`: 18046 -> 17841
- active `!important` in index/home cascade: 1217 -> 1012
- CSS files with unbalanced braces: 0

## Risk

High visual risk on internal pages because `app-shell.css` is shared broadly.

Possible visible changes:

- sidebar spacing and drawer polish;
- bottom-nav polish;
- internal mobile compact headers;
- iPad/tablet scroll behavior;
- desktop internal page frame spacing.

Accepted for this phase because the project goal is now structural predictability over visual preservation.

## Validation performed

Static validation only:

- CSS brace balance checked.
- Project-wide `!important` count checked.
- Recursive active index/home CSS map checked.

Visual validation was not executed in this environment.
