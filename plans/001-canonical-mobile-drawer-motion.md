# 001 — Make the canonical mobile drawer motion reliable

- **Status**: TODO
- **Commit**: a89e1c7
- **Severity**: HIGH
- **Category**: Interruptibility, accessibility, performance
- **Estimated scope**: 1 source file, about 35 CSS lines

## Problem

The canonical drawer root becomes `display: none` as soon as `.is-open` is absent. That prevents the panel and backdrop transitions from rendering on close. On open, JavaScript removes `hidden` and adds `.is-open` in the same task, so there is no rendered closed frame from which the transition can start.

```css
/* assets/css/components/navigation/mobile-drawer-standard.css:17 — current */
.home-mobile-drawer,
[data-mobile-home-drawer],
[data-mobile-drawer],
.mobile-drawer,
.app-mobile-drawer {
  position: fixed;
  inset: 0;
  z-index: var(--doke-z-drawer, 1600);
  display: none;
  pointer-events: none;
}

/* assets/css/components/navigation/mobile-drawer-standard.css:29 — current */
.home-mobile-drawer.is-open,
[data-mobile-home-drawer].is-open,
[data-mobile-drawer].is-open,
.mobile-drawer.is-open,
body.mobile-home-drawer-open [data-mobile-drawer-authority="canonical"],
body.doke-mobile-drawer-open [data-mobile-drawer-authority="canonical"] {
  display: block;
  pointer-events: auto;
}
```

The CSS declares motion, but the file has no `prefers-reduced-motion` branch:

```css
/* assets/css/components/navigation/mobile-drawer-standard.css:55,84 — current */
transition: opacity 220ms ease;
transition: transform 260ms cubic-bezier(.2,.8,.2,1), opacity 220ms ease;
```

The controller already keeps the element in the DOM for 260ms on close. The mismatch is in CSS visibility, not in the state controller:

```js
/* assets/js/ui/mobile-drawer-standard.js:377-403 — current behavior */
function setOpen(open) {
  // ...
  if (open) {
    drawer.hidden = false;
    drawer.removeAttribute('hidden');
    drawer.classList.add('is-open');
    // ...
  } else {
    drawer.classList.remove('is-open');
    // ...
    closeTimer = window.setTimeout(function () {
      if (!drawer.classList.contains('is-open')) {
        drawer.hidden = true;
        drawer.setAttribute('hidden', '');
      }
    }, 260);
  }
}
```

## Target

Keep the non-hidden root rendered and non-interactive while closed, use the exact drawer curve from the motion playbook, use `@starting-style` for the first open frame, and remove positional motion under reduced motion while preserving a short opacity cue.

```css
/* target — assets/css/components/navigation/mobile-drawer-standard.css */
.home-mobile-drawer,
[data-mobile-home-drawer],
[data-mobile-drawer],
.mobile-drawer,
.app-mobile-drawer {
  position: fixed;
  inset: 0;
  z-index: var(--doke-z-drawer, 1600);
  display: block;
  pointer-events: none;
}

.home-mobile-drawer[hidden],
[data-mobile-home-drawer][hidden],
[data-mobile-drawer][hidden],
.mobile-drawer[hidden],
.app-mobile-drawer[hidden] {
  display: none;
}

.home-mobile-drawer__panel,
.mobile-drawer__panel,
[data-mobile-drawer-panel] {
  /* preserve the existing geometry and visual declarations */
  transform: translate3d(-112%, 0, 0);
  opacity: 0.96;
  transition:
    transform 260ms cubic-bezier(0.32, 0.72, 0, 1),
    opacity 220ms cubic-bezier(0.23, 1, 0.32, 1);
}

@starting-style {
  .home-mobile-drawer.is-open .home-mobile-drawer__backdrop,
  [data-mobile-drawer-authority="canonical"].is-open .home-mobile-drawer__backdrop,
  .mobile-drawer.is-open .mobile-drawer__backdrop {
    opacity: 0;
  }

  .home-mobile-drawer.is-open .home-mobile-drawer__panel,
  [data-mobile-drawer-authority="canonical"].is-open .home-mobile-drawer__panel,
  .mobile-drawer.is-open .mobile-drawer__panel {
    transform: translate3d(-112%, 0, 0);
    opacity: 0.96;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-mobile-drawer__panel,
  .mobile-drawer__panel,
  [data-mobile-drawer-panel] {
    transform: none;
    opacity: 0;
    transition: opacity 160ms ease;
  }

  .home-mobile-drawer.is-open .home-mobile-drawer__panel,
  [data-mobile-drawer-authority="canonical"].is-open .home-mobile-drawer__panel,
  .mobile-drawer.is-open .mobile-drawer__panel {
    transform: none;
    opacity: 1;
  }

  .home-mobile-drawer__backdrop,
  .mobile-drawer__backdrop,
  [data-mobile-drawer-backdrop],
  [data-mobile-home-menu-close].home-mobile-drawer__backdrop {
    transition: opacity 160ms ease;
  }
}
```

Keep the existing `@media (min-width: 1200px)` rule that forces the drawer off on desktop.

## Repo conventions to follow

- `docs/CSS_AUTHORITY_MAP.md` assigns the mobile/tablet drawer exclusively to `assets/css/components/navigation/mobile-drawer-standard.css`.
- `assets/css/components/help/help-drawer.css:1-50` is the local exemplar for a root that stays rendered, uses `pointer-events` plus opacity for state, and transitions a panel with transform/opacity.
- `assets/css/components/help/help-drawer.css:292-300` is the accessibility exemplar, but this plan intentionally preserves a 160ms fade instead of removing all feedback.
- The drawer duration stays at 260ms so it remains aligned with the existing hide timer in `assets/js/ui/mobile-drawer-standard.js:398-403`.

## Steps

1. In `assets/css/components/navigation/mobile-drawer-standard.css`, change the non-hidden drawer root from `display: none` to `display: block`; add the explicit `[hidden] { display: none; }` selector group shown above, retain `pointer-events: none` while closed, and retain the desktop `display: none` rule at 1200px and above.
2. Replace only the drawer panel timing functions with `cubic-bezier(0.32, 0.72, 0, 1)` for transform and `cubic-bezier(0.23, 1, 0.32, 1)` for opacity. Keep the current 260ms/220ms durations.
3. Add the `@starting-style` block shown above so removing `hidden` and adding `.is-open` in one task still produces an entry transition.
4. Add the reduced-motion branch shown above. Drop translation entirely and retain only the 160ms opacity cue.
5. Do not edit the controller unless browser verification proves `@starting-style` unsupported in a required browser. If that happens, stop and report; do not improvise a JavaScript animation or inline style.

## Boundaries

- Do NOT edit `assets/js/ui/mobile-drawer-standard.js` in the planned path.
- Do NOT edit page CSS, `index.html`, shell/header/sidebar files, or legacy `assets/js/pages/home/drawer.js`.
- Do NOT add `!important`, inline styles, CSS via JavaScript, dependencies, or keyframes.
- Do NOT change drawer size, backdrop color, radius, shadow, navigation anatomy, focus behavior, or breakpoint.
- If source differs from commit `a89e1c7`, STOP and re-audit the lifecycle before editing.

## Verification

- **Mechanical**:
  - `npm.cmd run audit:mobile-drawer-visual-authority`
  - `npm.cmd run audit:agent-governance`
  - `npm.cmd run audit:unused-asset-candidates`
  - `npm.cmd run audit:duplicate-assets`
  - `git diff --check`
- **Viewports/pages**: open and close the drawer on `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html`, and `ajuda.html` at 390x844, 820x1180, and 1366x768. At desktop, confirm the drawer remains unavailable.
- **Feel check**:
  - At normal speed, the panel must enter from its left edge and close back toward that edge without a first-frame snap.
  - Toggle the trigger repeatedly; reversal must retarget from the current transform rather than restart a keyframe.
  - In DevTools Animations, set playback to 10% and confirm the backdrop and panel begin together and no frame exposes an interactive invisible drawer.
  - Emulate `prefers-reduced-motion: reduce`; confirm translation is absent and only the 160ms fade remains.
  - Confirm focus returns to the trigger and Escape/backdrop close behavior is unchanged.
- **Done when**: entry and exit both render, reduced motion removes translation, all authority/audit checks pass, and the approved drawer geometry is pixel-equivalent at rest.
