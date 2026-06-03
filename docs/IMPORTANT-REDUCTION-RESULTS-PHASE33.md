# Phase 33 — Results compact services presentation authority

## Scope

This phase continues the controlled `!important` reduction in `assets/css/pages/search-results/compact-services.css`.

## Root cause

The compact service card contract still used `!important` on visual presentation declarations even though the selectors are already scoped by the results page and services mode:

```css
.search-results-body .results-layout[data-results-mode="services"]
```

Those declarations do not need force once they live in the page-specific compact services contract.

## Changes

Removed `!important` from low-risk presentation properties only:

- `border`
- `border-radius`
- `background`
- `box-shadow`
- `text-decoration`
- `background-size`
- `background-position`
- `transform: none`

## Preserved

The phase intentionally preserved `!important` on structural declarations that still require visual validation before removal:

- `display`
- `grid-template-*`
- `overflow`
- `position` / `inset`
- dimensions
- card media aspect ratio
- hidden states
- responsive grid columns

## Acceptance criteria

- `resultados.html` keeps the same visual appearance in services mode.
- Compact service cards keep the same border, radius, image treatment, tag badges, favorite button, and CTA shadow.
- No change to home, shell, router, profile, messages, or orders.
