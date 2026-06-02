# Phase 13 — Home publication spacing and ad card boundary

## Scope

This phase uses `dokee-web(174).zip` as the source baseline and keeps the approved home layout intact.

## Root cause

The publication card body had several active padding contracts. After Phase 12 moved media/body sizing into the marketplace card component, the visible top gap between the publication image and title was still too tight because older home/shared card contracts continued to set compact top padding.

The home tablet/Safari layer also still contained hard-coded ad/service card anatomy values. Those values are now represented as variables consumed by the shared marketplace card contract, so page CSS can keep layout-specific sizing without owning card internals directly.

## Changes

- Increased only the top padding of publication card content in the active home/shared/mobile contracts.
- Added ad/service card anatomy variables to `marketplace-card-contract.css`.
- Changed the tablet/Safari home rules to express ad/service media/body/footer/CTA sizing through variables instead of raw values.
- Preserved current card widths, rail behavior, worker count, and approved home visual structure.

## Validation

Executed:

- CSS brace balance check for touched CSS files.
- `npm run audit:agent-governance`.

Current audit result:

- active legacy/remediation CSS: 0
- active legacy/remediation JS: 0
- home rail/card declarations: 12621
- collisions: 254

## Manual validation recommended

Validate `index.html` after applying this patch:

- Mobile: 390x844
- Tablet: 820x1180
- Desktop: 1366x768

Focus areas:

- `Publicações em destaque`: title no longer looks glued to the media.
- `Destaques para você`: card dimensions remain unchanged.
- `Mais anúncios`: card layout remains unchanged.
- `Workers`: visual remains unchanged from the approved state.
