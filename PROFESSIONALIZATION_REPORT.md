# Doke — Structural Professionalization Report

## Root cause

The project was visually close to a professional MVP, but key migrated pages still violated the frontend entrypoint contract:

- `index.html` and `resultados.html` were using intermediate foundation manifests instead of canonical CSS entries.
- Internal pages inherited deprecated mobile chrome CSS through `assets/css/pages/internal-foundation.css`.
- Architecture governance failed because required documentation gates were missing.

## Changes applied

- `index.html`: switched direct CSS loading to canonical `core/index.css`, `pages/app-shell.css`, and `pages/home.css`.
- `resultados.html`: switched direct CSS loading to canonical `core/index.css`, `pages/app-shell.css`, and `pages/search-results.css`.
- `assets/css/pages/internal-foundation.css`: removed deprecated `bottom-nav.css` and `header-mobile.css` imports; mobile shell now resolves through the official app shell contract.
- `docs/DEPRECATED-CSS.md`: added deprecated CSS registry and mobile chrome replacement rule.
- `docs/ARCHITECTURE-DECISIONS.md`: added initial ADRs for CSS entrypoints, mobile shell, and page/component boundaries.
- `docs/DATA-MODEL-DRAFT.md`: added domain model draft for future backend/rendering alignment.
- `docs/ui-kit.html`: added a minimal UI kit entry for future visual governance.

## Validation

Passed:

```bash
npm run audit:frontend:strict
npm run audit:architecture
npm run audit:agent-governance
```

Results:

- Frontend critical violations: 14 → 0.
- Architecture audit: passed.
- Agent governance audit: passed.

Not fully validated:

```bash
npm run test:visual
```

The visual suite was attempted, but the command did not complete inside the available execution window. No visual baseline claim is made from this run.

## Remaining risks

- `audit:frontend:strict` still reports 220 warnings, mostly literal radii, legacy class hints, and existing `!important` usage.
- The remaining warnings should not be mass-deleted. They need family-by-family migration: buttons, cards, mobile shell, search, rails, then overlays.
- Because visual regression did not complete, desktop/tablet/mobile visual comparison still needs local browser validation.

## Recommended next step

Run a focused CSS debt reduction pass on one family at a time, starting with active `!important` inside high-risk shared components, not page-by-page visual overrides.
