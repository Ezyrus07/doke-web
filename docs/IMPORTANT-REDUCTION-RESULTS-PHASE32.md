# Important reduction — resultados phase 32

## Scope

This phase continues the controlled `!important` reduction in the active results mobile contract:

- `assets/css/pages/search-results/mobile-layout-contract.css`

## Root cause

The mobile results contract still used `!important` on presentation-only declarations even when selectors were already strongly scoped by `body.search-results-body` and `@media (max-width: 560px)`. That made the stylesheet harder to maintain and increased cascade collision risk without adding meaningful protection.

## Changes

Removed `!important` from low-risk presentation properties only:

- background
- border / border-color / border-radius
- box-shadow
- color
- font-size / font-weight / line-height / letter-spacing
- white-space
- svg paint/stroke tokens
- small local spacing declarations in nested elements

The phase intentionally preserved `!important` on structural declarations such as display, grid templates, full-bleed width, overflow, hidden states, filter modal ownership and card dimensions.

## Result

`mobile-layout-contract.css` went from 151 to 76 `!important` declarations.

## Validation

- CSS brace balance checked.
- `npm run audit:agent-governance` executed.
- `git diff --check` executed.

Visual Playwright validation was not executed in this environment.

## Acceptance criteria

- `resultados.html` mobile keeps the same visual layout.
- Searchbar, tabs, filter button, summary card and service result cards do not shift.
- No regression in desktop/tablet results layout.
