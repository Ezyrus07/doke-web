# Phase 30 — duplicate asset consolidation

## Objective

Consolidate remaining byte-identical CSS/JS aliases without changing the visual runtime. This phase removes duplicate files only after their active imports were redirected to canonical locations.

## Decisions

- Avatar styles are canonical at `assets/css/components/identity/avatar.css` because the core component manifest already imports that path.
- Shared mobile action sizing is canonical at `assets/css/components/interactions/mobile-action-contract.css` because the selectors are generic interaction controls, not page-local contracts.
- Profile component aggregation is canonical at `assets/css/components/profile/index.css`.
- Home mobile aggregation is canonical at `assets/css/pages/home/index.css`.
- Supabase example configuration is canonical at `assets/js/core/supabase-config.example.js`, matching the runtime `assets/js/core/supabase-config.js` path.

## Runtime boundaries

This phase does not change card anatomy, shell, router, sidebar, home layout, or notification layout. It only removes duplicated aliases and updates imports to equivalent canonical files.

## Validation

- `npm run audit:duplicate-assets`
- `npm run audit:unused-asset-candidates`
- `npm run audit:agent-governance`
- `git diff --no-index --check`
