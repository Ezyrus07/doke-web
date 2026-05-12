# Shell / Topbar Contract

This contract protects the Doke internal shell during global cycles and before the desktop visual phase.

## Purpose

Internal pages must not depend on partial route swaps to “fix” layout after first paint. Each page must load with a complete, stable shell contract on its own document.

## Required shell hooks

Every main internal HTML must expose:

- `.app-shell[data-shell-region="app"]`
- `main.page__content[data-shell-main]`
- `body[data-shell-topbar-state]`

When a page has a global topbar/header, the header must expose:

- `header.topbar.internal-page-topbar[data-shell-topbar]`

When a page intentionally does not have a global topbar because the layout is provisional or uses a local page header, the body must use:

- `data-shell-topbar-state="absent-provisional"`

## Navigation rule

Partial shell navigation is not allowed by default while header/topbar contracts are still mixed across pages.

The default flag must remain:

```js
instantShellNavigation: false
```

Re-enabling route swap requires a dedicated runtime validation cycle and cannot be done as a visual fix.

## Guardrails

- Do not fix a local header by editing `body`, global shell wrappers, or sidebar.
- Do not introduce inline styles.
- Do not add `!important`.
- Do not normalize topbar visual appearance during this contract cycle.
- Missing/provisional topbars must be marked, not visually invented.
