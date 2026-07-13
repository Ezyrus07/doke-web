# 003 — Constrain button and choice feedback

- **Status**: TODO
- **Commit**: a89e1c7
- **Severity**: HIGH
- **Category**: Performance, accessibility, cohesion
- **Estimated scope**: 3 source files, about 55 CSS lines changed

## Problem

The global button contract transitions a broad shared token and applies hover lift on every pointer type. The core reduced-motion rule only disables smooth scrolling, so canonical buttons have no component-level reduced-motion behavior.

```css
/* assets/css/components/buttons.css:29-60 — current */
:where(.doke-btn, .doke-button) {
  /* anatomy omitted */
  transition: var(--doke-interaction-transition);
}

:where(.doke-btn, .doke-button):where(:hover) {
  transform: var(--doke-interaction-lift-control);
  box-shadow: var(--doke-interaction-shadow-control);
}

:where(.doke-btn, .doke-button):where(:active) {
  transform: var(--doke-interaction-press);
}
```

```css
/* assets/css/core/tokens.css:219-223 — current */
--doke-interaction-duration: var(--transition-fast);
--doke-interaction-easing: ease;
--doke-interaction-transition: transform var(--doke-interaction-duration), box-shadow var(--doke-interaction-duration), background-color var(--doke-interaction-duration), border-color var(--doke-interaction-duration), color var(--doke-interaction-duration), opacity var(--doke-interaction-duration), filter var(--doke-interaction-duration);
```

Because `--doke-interaction-duration` expands to `180ms ease`, easing and duration cannot be selected independently for press feedback. The transition also includes `filter` for buttons even though canonical button states do not require it.

Auth has a separate active `transition: all`, so unrelated future property changes can animate accidentally:

```css
/* assets/css/pages/auth.css:469-491 — current */
.auth-choice-card {
  min-height: 88px;
  padding: 14px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--auth-line);
  background: #fff;
  display: grid;
  gap: 6px;
  cursor: pointer;
  transition: all 0.18s ease;
}
```

`assets/css/pages/configuracoes/buttons.css:17` contains a second `transition: all`, but the file is currently dormant and is not imported by `configuracoes-foundation.css`; do not reactivate or edit it in this plan.

## Target

Add one strong ease-out token at the core authority, give canonical buttons an explicit property list and subtle 160ms press scale, gate hover lift to fine pointers, and remove position motion under reduced motion. Narrow the active Auth choice transition to the three properties that actually change.

```css
/* target — assets/css/core/tokens.css, beside the transition scale */
--doke-motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
```

```css
/* target — assets/css/components/buttons.css */
:where(.doke-btn, .doke-button) {
  /* preserve existing anatomy */
  transition:
    transform 160ms var(--doke-motion-ease-out),
    box-shadow 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    opacity 160ms ease;
}

:where(.doke-icon-btn, .doke-action-button) {
  /* preserve existing anatomy */
  transition:
    transform 160ms var(--doke-motion-ease-out),
    box-shadow 160ms ease,
    background-color 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    opacity 160ms ease;
}

@media (hover: hover) and (pointer: fine) {
  :where(.doke-btn, .doke-button):where(:hover),
  :where(.doke-icon-btn, .doke-action-button):where(:hover) {
    transform: var(--doke-interaction-lift-control);
    box-shadow: var(--doke-interaction-shadow-control);
  }
}

:where(.doke-btn, .doke-button, .doke-icon-btn, .doke-action-button):where(:active) {
  transform: scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  :where(.doke-btn, .doke-button, .doke-icon-btn, .doke-action-button) {
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      opacity 160ms ease;
  }

  :where(.doke-btn, .doke-button, .doke-icon-btn, .doke-action-button):where(:hover, :active) {
    transform: none;
  }
}
```

```css
/* target — assets/css/pages/auth.css */
.auth-choice-card {
  /* preserve existing anatomy */
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}
```

## Repo conventions to follow

- `assets/css/core/tokens.css` is the only correct owner for a reusable easing token.
- `docs/CSS_AUTHORITY_MAP.md` assigns reusable button anatomy and interaction to `assets/css/components/buttons.css`; page CSS may position buttons but must not redefine their behavior.
- `assets/css/components/buttons.css:29-156` is the canonical owner for text and icon buttons. Do not move this behavior to `doke-ui-system.css`.
- `assets/css/components/cards/marketplace-card-contract.css:80-88` is the existing exemplar for gating hover motion with `@media (hover: hover) and (pointer: fine)`.
- The 160ms press duration, `scale(0.97)`, and strong ease-out curve are exact values from the animation audit playbook.

## Steps

1. Add `--doke-motion-ease-out: cubic-bezier(0.23, 1, 0.32, 1);` beside the transition scale in `assets/css/core/tokens.css`. Do not rewrite the existing combined transition tokens in this patch.
2. In `assets/css/components/buttons.css`, replace `var(--doke-interaction-transition)` only on the canonical text/icon button bases with the explicit transition list shown above.
3. Move only transform/box-shadow hover lift for canonical text/icon buttons into the fine-pointer media query. Keep focus-visible color, border, and focus ring behavior outside it.
4. Give canonical text/icon buttons the shared `:active { transform: scale(0.97); }` feedback. Ensure link-style buttons retain their existing `transform: none` exception.
5. Add the component-level reduced-motion branch shown above; preserve color/opacity feedback but remove transform motion.
6. In `assets/css/pages/auth.css`, replace `transition: all 0.18s ease` on `.auth-choice-card` with the explicit 180ms border/background/shadow list.

## Boundaries

- Do NOT edit `assets/css/pages/configuracoes/buttons.css`; it is dormant and not in the active Settings cascade.
- Do NOT alter button dimensions, colors, radii, typography, focus ring, disabled state, or markup.
- Do NOT add `!important`, inline styles, CSS via JavaScript, keyframes, or dependencies.
- Do NOT change `--doke-interaction-transition` globally in this patch; other component families depend on its current shape.
- Do NOT animate `filter`, width, height, padding, margin, top, or left.
- If visual checks show a domain button relies on the old hover transform on touch, STOP and identify the local contract instead of adding a page override.

## Verification

- **Mechanical**:
  - `npm.cmd run audit:button-system-contract`
  - `npm.cmd run audit:form-button-contract`
  - `npm.cmd run audit:agent-governance`
  - `npm.cmd run audit:unused-asset-candidates`
  - `npm.cmd run audit:duplicate-assets`
  - `git diff --check`
- **Viewports/pages**: verify primary, secondary, ghost, danger, icon, and close buttons on `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html`, `ajuda.html`, and `auth/esqueci-senha.html` at 1366x768, 820x1180, and 390x844.
- **Feel check**:
  - Mouse hover may lift by the existing 1px; emulated touch must not retain hover transform after tap.
  - Press feedback must reach `scale(0.97)` in 160ms and release smoothly from the current state.
  - At 10% DevTools playback, confirm no filter or layout property appears in the button transition track.
  - Emulate `prefers-reduced-motion: reduce`; confirm transform tracks disappear while color/border/opacity feedback remains.
  - Toggle both Auth recovery choices and confirm only border, background, and shadow animate; text/layout must remain stable.
- **Done when**: loaded production cascades contain no `transition: all`, canonical button motion is fine-pointer/reduced-motion aware, and the approved rest-state visual remains unchanged. The dormant Settings file remains governed by the separate unused-asset process.
