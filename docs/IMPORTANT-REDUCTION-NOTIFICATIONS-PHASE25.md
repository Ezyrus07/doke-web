# Important reduction — notifications phase 25

## Scope

This phase only changes:

- `assets/css/pages/notificacoes/mobile-interaction-contract.css`

## Cause

The notifications mobile interaction contract was a page module, but its selectors were generic and used `!important` to beat reusable action/button contracts. That kept a local compatibility layer stronger than necessary.

## Change

The selectors are now scoped with `body.notifications-page-shell`, so the module keeps page-local authority without forcing every declaration through `!important`.

Removed declarations:

- 10 `!important` flags from mobile action sizing, placement and reset declarations.

## Guardrails

No home, shell, router, sidebar, global header, card, worker or publication CSS was changed.

## Validation

- CSS brace balance checked for the changed file.
- `git diff --check` / no-index patch check executed for the patch set.
