# Radius Exceptions Register

## Purpose

This register closes the residual border-radius audit after the shared radius families were migrated to design-system tokens. Entries below are intentional local geometry and must not be converted to a global token without a visual review proving reuse across independent components.

## Local owner families

### Administration

Owner: `assets/css/pages/admin.css`

The following values are page-local because they describe compact administrative anatomy rather than reusable global components:

- `--admin-radius-list-item: 12px`
- `--admin-radius-details: 10px`
- `--admin-radius-empty-state: 12px`
- `--admin-radius-table-wrap: 12px`
- `--admin-radius-locked-icon: 13px`
- `--admin-radius-review-field: 11px`
- `--admin-radius-review-notice: 11px`
- `--admin-radius-evidence: 12px`
- `--admin-radius-evidence-media: 9px`

Owner: `assets/css/pages/admin-verificacao.css`

- `--admin-review-card-radius: 24px`
- `--admin-review-card-radius-compact: var(--doke-radius-panel-compact)`
- `--admin-review-evidence-radius: 18px`

These variables preserve approved geometry while creating one local authority for each family.

### Profile

Owner: `assets/css/pages/profile-page.css`

- `--profile-hero-radius: clamp(22px, 3vw, 32px)`
- `--profile-reputation-item-radius: 15px`
- `--profile-reviews-panel-radius: 28px`
- `--profile-surface-card-radius: 24px`

The profile hero is responsive geometry. The review panel is an editorial surface. The reputation item and profile card family are local composition contracts.

## Shared skeleton optical geometry

Owner: `assets/css/components/states/page-hydration-skeleton.css`

- `--doke-skeleton-line-radius-sm: 7px`
- `--doke-skeleton-line-radius: 8px`
- `--doke-skeleton-card-radius: 18px`

These values are optical skeleton geometry, not control or surface radii.

## Protected search geometry

Do not alter without an explicit search-specific task:

- `assets/css/pages/results/visual-hierarchy.css`: directional results filter drawer radius.
- `assets/css/pages/results/visual-hierarchy.css`: results search container radius.
- `assets/css/pages/search-results.css`: responsive results search geometry and audio control.
- Index search geometry and Results search geometry are treated as an approved paired baseline.

## Directional geometry

The results filter drawer uses a directional radius (`0 20px 20px 0`). It communicates edge attachment and must remain local.

## Governance rule

A local value may move to `core`, `components`, or `patterns` only when:

1. the same semantic component exists in at least two independent owners;
2. the values are visually equivalent within the approved tolerance;
3. the migration does not change special, responsive, directional, avatar, pill, or skeleton geometry;
4. the shared owner is documented before page declarations are removed.
