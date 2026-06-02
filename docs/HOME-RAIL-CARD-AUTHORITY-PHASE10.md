# Home rail/card authority phase 10

## Objective

This phase starts the risky part of the cleanup without changing the approved UI: mapping which active CSS files currently control the home rails and cards before moving, deleting, or reducing any declarations.

## Why this phase exists

The previous phases removed active production names that looked like temporary patches. That did not remove the structural debt itself. The next risk is worse: many active files still define the same rail/card properties for the same home targets.

The most important rule for the next phase is: do not add another override. Reduce duplicate authority.

## Added audit

New command:

```bash
npm run audit:home-rail-card-authority
```

It generates:

- `docs/HOME-RAIL-CARD-AUTHORITY-AUDIT.md`
- `docs/validation/home-rail-card-authority-report.json`

`npm run audit:agent-governance` now runs this audit as well.

## Current findings

The home has:

- 18 direct CSS links.
- 156 active CSS files in direct/import chain.
- 12,642 rail/card-related declarations detected.
- 9,192 rail/card-related declarations using `!important`.
- 254 target/property collisions.
- 210 high-severity collisions.

These numbers are intentionally conservative and include broad rail/card selectors. They are not a deletion list. They are a collision map for the next cleanup.

## Ownership decision for the next phase

- Home rails/layout: `assets/css/pages/home.css` plus phone-only rules in `assets/css/pages/home/mobile-index-feed-contract.css`.
- Worker card anatomy: `assets/css/components/cards/worker-card.css`.
- Marketplace/publication card anatomy: `assets/css/components/cards/marketplace-card-contract.css` and existing canonical card components until they are consolidated.
- Shared index bridges: can bridge old markup but must not become final page layout authority.
- Tablet/Safari files: can keep tablet/Safari exceptions, but must not override phone rails after hydration.
- Shell files: can define shell/rail variables but must not own card dimensions.

## What this phase did not do

- Did not change visual CSS.
- Did not remove declarations.
- Did not rename more production assets.
- Did not touch shell, header, router, body, or sidebar.
- Did not reduce `!important` yet.

## Next recommended step

Use `docs/HOME-RAIL-CARD-AUTHORITY-AUDIT.md` to pick one target with high confidence, preferably the Workers rail/card boundary, and reduce duplicate authority in a small patch.

A valid next patch must reduce one of these without visual change:

- `collisionCount`
- `railCardImportantDeclarations`
- number of files defining the same target/property

The next patch must be validated on direct URL and internal navigation to `index.html`.
