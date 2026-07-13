# 002 — Move contextual panel motion to the shared authority

- **Status**: TODO
- **Commit**: a89e1c7
- **Severity**: HIGH
- **Category**: Interruptibility, accessibility, cohesion
- **Estimated scope**: 2 source files, about 45 CSS lines changed

## Problem

The reusable filter/selection surface is `.doke-mobile-action-panel`, whose anatomy is owned by `assets/css/components/internal/action-panel-standard.css`. Pedidos nevertheless owns two nearly identical entry keyframes in page CSS:

```css
/* assets/css/pages/pedidos/orders-command-center.css:2672-2724 — current */
body.orders-page-shell .orders-page [data-orders-select-panel] {
  position: relative;
  transform-origin: top left;
  animation: ordersSelectPanelEnter 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes ordersSelectPanelEnter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

```css
/* assets/css/pages/pedidos/orders-command-center.css:2742-2773 — current */
body.orders-page-shell .orders-page [data-orders-filters-popover] {
  position: relative;
  width: min(100%, 508px);
  max-width: 508px;
  transform-origin: top left;
  animation: ordersFilterPanelEnter 180ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

@keyframes ordersFilterPanelEnter {
  from {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

These panels are toggled frequently and can be reversed immediately. Keyframes restart instead of retargeting, and the only reduced-motion block in this page file applies to the document preloader, not these panels. Notifications consumes the same shared component but does not receive the same motion, creating a component-level inconsistency.

## Target

The shared component owner defines one 180ms transition using the strong ease-out curve. Page CSS retains only placement and density. `@starting-style` supplies the entry state without JavaScript animation. Reduced motion removes translation/scale and keeps a short opacity cue.

```css
/* target — append beside the existing shared visible-panel rule in
   assets/css/components/internal/action-panel-standard.css */
body:is(.orders-page-shell, .notifications-page-shell)
  :is(#orders-action-controls, #notifications-action-controls)
  .doke-mobile-action-panel:not([hidden]) {
  display: block;
  position: relative;
  width: min(100%, var(--doke-action-panel-width, 480px));
  max-width: var(--doke-action-panel-width, 480px);
  min-width: 0;
  opacity: 1;
  transform: translateY(0) scale(1);
  transform-origin: top left;
  transition:
    transform 180ms cubic-bezier(0.23, 1, 0.32, 1),
    opacity 180ms cubic-bezier(0.23, 1, 0.32, 1);
}

@starting-style {
  body:is(.orders-page-shell, .notifications-page-shell)
    :is(#orders-action-controls, #notifications-action-controls)
    .doke-mobile-action-panel:not([hidden]) {
    opacity: 0;
    transform: translateY(-8px) scale(0.985);
  }
}

@media (prefers-reduced-motion: reduce) {
  body:is(.orders-page-shell, .notifications-page-shell)
    :is(#orders-action-controls, #notifications-action-controls)
    .doke-mobile-action-panel:not([hidden]) {
    transform: none;
    transition: opacity 160ms ease;
  }

  @starting-style {
    body:is(.orders-page-shell, .notifications-page-shell)
      :is(#orders-action-controls, #notifications-action-controls)
      .doke-mobile-action-panel:not([hidden]) {
      opacity: 0;
      transform: none;
    }
  }
}
```

The target intentionally animates only entry. Closing is a direct response to Escape, outside click, or a second toggle and should remain immediate.

## Repo conventions to follow

- `assets/css/components/internal/action-panel-standard.css:1-24` explicitly owns action-panel anatomy while pages own placement.
- `assets/css/components/internal/action-panel-standard.css:307-327` already centralizes the visible contextual panel contract across Pedidos and Notificações; extend this rule instead of adding a second component file.
- `assets/css/pages/pedidos/orders-command-center.css` may retain the 508px page-specific placement/density and arrow positioning, but not shared motion behavior.
- The easing `cubic-bezier(0.23, 1, 0.32, 1)` and 160ms reduced-motion fade are exact values from the animation audit playbook.

## Steps

1. In `assets/css/components/internal/action-panel-standard.css`, extend the existing `.doke-mobile-action-panel:not([hidden])` rule with the final opacity, transform, origin, and 180ms transition shown above.
2. Add the `@starting-style` entry state beside that shared rule.
3. Add the reduced-motion branch shown above; it must remove position and scale while retaining opacity feedback.
4. In `assets/css/pages/pedidos/orders-command-center.css`, remove the `animation` and `transform-origin` declarations from both `[data-orders-select-panel]` and `[data-orders-filters-popover]`.
5. Delete only `@keyframes ordersSelectPanelEnter` and `@keyframes ordersFilterPanelEnter`. Keep width, position, arrow, header, footer, and responsive composition rules intact.

## Boundaries

- Do NOT edit `assets/js/pages/pedidos/orders-action-panels.js`, `pedidos.html`, or notification controllers.
- Do NOT create a new component file or duplicate the transition in page CSS.
- Do NOT add exit delays, keyframes, `!important`, inline styles, CSS via JavaScript, or dependencies.
- Do NOT animate width, height, grid, margin, padding, top, or left.
- If the shared component selector no longer serves both Pedidos and Notificações, STOP and re-run authority discovery.

## Verification

- **Mechanical**:
  - `npm.cmd run audit:overlay-modal-contract`
  - `npm.cmd run audit:agent-governance`
  - `npm.cmd run audit:unused-asset-candidates`
  - `npm.cmd run audit:duplicate-assets`
  - `git diff --check`
- **Viewports/pages**: test `pedidos.html` and `notificacoes.html` at 1366x768, 820x1180, and 390x844. Confirm direct load and `DokeNavigate(...)` end in the same state.
- **Feel check**:
  - Open Filtros, switch immediately to Selecionar, and repeat quickly. The entering panel must not replay from a stale keyframe or flash both surfaces.
  - Press Escape during entry; closing must be immediate and leave neither panel focusable.
  - At 10% DevTools playback, confirm the panel scales from top-left and the pointer arrow remains visually attached.
  - Emulate `prefers-reduced-motion: reduce`; confirm there is no translation or scale, only a 160ms fade.
  - Confirm no layout shift in the page header/control rail before or after the panel appears.
- **Done when**: both pages consume one shared transition, Pedidos contains no panel-entry keyframes, reduced motion is honored, and all three viewport contracts remain visually stable.

