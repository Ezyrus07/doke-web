# Animation improvement plans

Audit base commit: `a89e1c7`.

These plans are specifications only. No source implementation has been performed.

| Plan | Title | Severity | Status | Dependency |
| --- | --- | --- | --- | --- |
| [001](001-canonical-mobile-drawer-motion.md) | Make the canonical mobile drawer motion reliable | HIGH | TODO | None |
| [002](002-shared-action-panel-motion.md) | Move contextual panel motion to the shared authority | HIGH | TODO | None |
| [003](003-button-choice-feedback.md) | Constrain button and choice feedback | HIGH | TODO | None |

## Recommended execution order

1. Execute plan 001 first because the drawer is a global touch-navigation surface and its existing lifecycle currently prevents the declared motion from rendering reliably.
2. Execute plan 002 next because it removes page-owned keyframes from a shared contextual component without depending on plan 001.
3. Execute plan 003 last because canonical button feedback has the broadest visual reach and therefore requires the widest screenshot matrix.

All three plans are technically independent. Execute and validate one plan per patch; do not combine them into a single source change.
