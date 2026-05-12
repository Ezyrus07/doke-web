# Components CSS

This folder contains reusable visual contracts. Page files should not recreate
buttons, cards, form controls, modals, drawers, popovers, media previews or
shared internal shells.

## Canonical entry points

- `ui-surface-system.css` — global overlay/surface/control contract.
- `cards/service-card.css` — shared service card contract.
- `before-after-workers-preview.css` — Workers and Antes x Depois publication modals.
- `internal/index.css` — shared internal-page components.
- `profile/index.css` — reusable profile-specific blocks.
- `media-lightbox.css` — shared media/lightbox behavior.
- `chat-composer.css` — shared chat composer.

## Deprecated shims

- `ui.css`
Do not add new CSS to deprecated shims. Move reusable code into a focused
component module and keep page CSS limited to page layout.
