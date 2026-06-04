# Phase 9 — High-risk CSS authority naming pass

## Scope

This phase did not redesign the site and did not remove high-risk CSS yet. It tightened the active runtime naming contract for high-risk CSS assets before deeper consolidation.

## Cause root

The previous phases removed active files with obvious remediation tokens such as `final`, `parity`, `polish`, `rescue`, `normalization`, `legacy`, and `redesign`. The high-risk audit still exposed two active production files whose names described an implementation phase instead of an architectural responsibility:

- `assets/css/pages/home-tablet-v2.css`
- `assets/css/pages/mensagens/desktop-visual-repair.css`

Both files are high-risk because they are large, active in the runtime cascade, and contain many `!important` declarations. Keeping names such as `v2` or `repair` active makes future agents treat temporary layers as acceptable production architecture.

## Changes

| Previous active file | New responsibility name |
| --- | --- |
| `assets/css/pages/home-tablet-v2.css` | `assets/css/pages/home/tablet-responsive-layout.css` |
| `assets/css/pages/mensagens/desktop-visual-repair.css` | `assets/css/pages/mensagens/desktop-workspace-layout.css` |

## Governance change

The active-legacy audit now treats `repair` as a prohibited active production token. `v2` was not added as a global blocker because some existing community files still use versioned names that require a separate community-specific migration.

## What this phase intentionally did not do

- Did not reduce `!important` counts yet.
- Did not split the huge CSS files.
- Did not change card, rail, shell, or header behavior.
- Did not touch `stable-shell-router.js`.
- Did not remove unrelated stale reports that mention old filenames.

## Result

The governance audit still reports:

- `active legacy/remediation css: 0`
- `active legacy/remediation js: 0`

The high-risk CSS count remains high. The next phase must start reducing responsibility inside the high-risk CSS zones, not just renaming files.

## Next recommended target

Start with the home high-risk CSS cluster:

- `assets/css/pages/home.css`
- `assets/css/pages/home/tablet-responsive-layout.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/components/cards/worker-card.css`

The first safe consolidation should be a read-only selector/property ownership map for home rails/cards before moving or deleting CSS.
