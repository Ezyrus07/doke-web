# CSS Cleanup Report v14

## Scope
Core legacy entrypoints were classified and converted into safe compatibility bridges or inert archived placeholders.

## Changed
- `assets/css/core/layout-shell.css` now bridges to `assets/css/core/layout/shell.css`.
- `assets/css/core/layout-topbar.css` now bridges to `assets/css/core/layout/topbar.css`.
- `assets/css/core/layout-responsive.css` now bridges to `assets/css/core/layout/responsive-base.css` and `responsive-shell.css`.
- `assets/css/core/patterns.css` now bridges to `assets/css/core/ui/patterns.css`.
- `assets/css/core/primitives.css` now bridges to `assets/css/core/ui/patterns.css` and `global-components.css`.
- `assets/css/core/shell-home.css`, `surfaces.css`, `surface-normalize.css`, and `border-consolidation.css` were made inert because they are not referenced by active HTML/CSS/JS flows and are high-risk global layers.
- Original copies were archived in `archive/css-legacy/core-v14/`.
- `assets/css/components/ui.css` now points at the canonical core UI pattern path.

## Intent
This step reduces accidental duplicate ownership inside `core/` without deleting historical code from the patch.

## Risk
Low to medium. The active `core/index.css` already uses the new canonical manifests. The legacy files are only kept as bridges for accidental direct imports.
