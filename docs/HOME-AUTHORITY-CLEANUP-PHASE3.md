# Home authority cleanup — phase 3

This phase is a low-risk naming/authority cleanup for `index.html` only. It does not redesign the home, change card dimensions, change shell behavior, or remove legacy CSS files from the repository.

## Cause

The home still had active production CSS with remediation-stage naming:

- `assets/css/pages/home/index-final-refinement.css`
- `assets/css/pages/home/tablet-final-authority.css`

Those names make old temporary layers look like permanent architecture. The tablet file was also reported by `npm run audit:active-legacy-structures` as active legacy/remediation CSS.

## Change

The active runtime references were moved to responsibility-based names while preserving the same CSS contents and load position. Existing `mobile-layout.css` stays untouched because it already owns an older mobile-layout contract imported earlier by `home.css`:

| Previous active path | New active path | Responsibility |
| --- | --- | --- |
| `assets/css/pages/home/index-final-refinement.css` | `assets/css/pages/home/mobile-hero-feed.css` | Home mobile hero/feed refinements: hero density, feed spacing, categories, bottom navigation spacing. |
| `assets/css/pages/home/tablet-final-authority.css` | `assets/css/pages/home/tablet-shell-rail.css` | Home tablet shell/rail boundary and sidebar suppression for tablet viewports. |

## Files intentionally left in the repository

The old files may remain on disk temporarily for historical comparison, but they are no longer active in the current home cascade. They can be deleted in a later removal-only cleanup once the team applies this patch and confirms the new active paths are present.

## Validation

Run:

```bash
npm run audit:agent-governance
```

Expected result after this phase:

- active legacy/remediation CSS count decreases from 5 to 4;
- `index.html` no longer links `tablet-final-authority.css`;
- `home.css` no longer imports `index-final-refinement.css`;
- no visual CSS rule was changed in this phase.

## Next cleanup target

The next home pass should not rename more files first. It should classify and consolidate duplicated authority between:

- `assets/css/pages/home.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/components/cards/worker-card.css`
