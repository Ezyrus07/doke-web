# CSS Cleanup v22 — Modal alignment and address modal fix

## Scope

This patch fixes the visible modal alignment issues reported after the structural CSS cleanup.

Primary targets:

- Home address modal (`home-address-modal`)
- Profile/service address modal (`address-modal`)
- Fast quote modal (`profile-budget-modal`)
- Community action/create modal (`community-action-modal`)
- Generic CEP modal (`ui-modal`)

## What changed

Created a new canonical alignment layer:

```txt
assets/css/components/ui-surface/modal-alignment.css
```

It is imported at the end of:

```txt
assets/css/components/ui-surface-system.css
```

This keeps the correction inside the shared surface system instead of patching each page with unrelated local CSS.

## Main fixes

- Dialog surfaces now receive `position: relative`, preventing absolute close buttons from anchoring to the viewport.
- Modal content is protected against horizontal overflow with `overflow-x: hidden` and `min-width: 0`.
- The home address modal now has a controlled width, max-height, internal scroll, safe padding and stable grid columns.
- The address modal used in the budget/profile flow now follows the same layout rules as the home address modal.
- The fast quote modal receives safer header spacing to avoid badge/title collision.
- The community creation modal keeps large content scrollable inside the surface.
- The CEP modal is aligned closer to the standard vertical modal composition.

## Cache updates

HTML files that load `ui-surface-system.css` now use:

```txt
v=20260427-modal-alignment-v22
```

The home manifest now loads:

```txt
home-overlays.css?v=20260427-modal-address-v22
```

## Risk

Low-medium. The patch touches the shared surface layer, but the rules are constrained to modal/dialog surfaces and mostly normalize box sizing, overflow, position anchoring and header spacing.
