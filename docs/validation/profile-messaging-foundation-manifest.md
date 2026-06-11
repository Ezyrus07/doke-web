# Stage 55 — Profile/Messaging Foundation Manifest Consolidation

## Objective

Consolidate the direct CSS links in `perfil.html` and `mensagens.html` behind page-level foundation manifests, without changing visual rules, deleting physical CSS files, or reactivating legacy authority layers.

This stage is structural only. Visual recovery remains out of scope.

## Files changed

- `perfil.html`
- `mensagens.html`
- `assets/css/pages/profile-foundation.css`
- `assets/css/pages/messaging-foundation.css`
- `docs/validation/profile-messaging-foundation-manifest.md`
- `docs/validation/profile-messaging-foundation-manifest-report.json`
- `docs/validation/global-cycle-110-css-import-map-report.json`
- `docs/validation/global-cycle-143-essential-asset-imports-report.json`

## Consolidation performed

### `perfil.html`

The previous local CSS links were consolidated into:

```html
<link rel="stylesheet" href="assets/css/pages/profile-foundation.css?v=20260610-structural-profile-foundation">
```

The new manifest preserves the former cascade order:

1. `assets/css/core/index.css`
2. `assets/css/pages/internal-foundation.css`
3. `assets/css/components/before-after-workers-preview.css`
4. `assets/css/pages/orcamento.css`
5. `assets/css/pages/perfil-budget-modal.css`
6. `assets/css/pages/perfil-edit-modal.css`
7. `assets/css/pages/perfil-publications.css`
8. `assets/css/pages/perfil.css`
9. `assets/css/pages/perfil/owner-media-mobile.css`
10. `assets/css/pages/stable-desktop-rail.css`
11. `assets/css/pages/perfil/responsive.css`

Result: `11` local CSS links became `1` local CSS link.

### `mensagens.html`

The previous local CSS links were consolidated into:

```html
<link rel="stylesheet" href="assets/css/pages/messaging-foundation.css?v=20260610-structural-messaging-foundation">
```

The new manifest preserves the former cascade order:

1. `assets/css/core/index.css`
2. `assets/css/pages/internal-foundation.css`
3. `assets/css/components/chat-composer.css`
4. `assets/css/components/media-lightbox.css`
5. `assets/css/components/overlays/financial-modal-system.css`
6. `assets/css/components/internal/chat-workspace-contract.css`
7. `assets/css/patterns/chat-screen-fill.css`
8. `assets/css/pages/mensagens.css`
9. `assets/css/pages/mensagens/message-boot.css`
10. `assets/css/pages/mensagens/tablet-portrait-thread-contract.css`
11. `assets/css/pages/mensagens/tablet-shell-alignment.css`
12. `assets/css/pages/mensagens/focus-mode.css`

Result: `12` local CSS links became `1` local CSS link.

## Validation summary

Active app HTML only was used for the broken-link gate. Historical snapshots under `tools/` and `reports/` are intentionally excluded from the active-page gate because they contain archived relative links that do not resolve from their backup location.

- Broken CSS links in active HTML: `0`
- Broken CSS imports in `assets/css`: `0`
- CSS files with unbalanced braces: `0`
- Reachable CSS files through active app HTML: `263`
- Active `!important` declarations in reachable CSS: `0`
- Dormant files in `assets/css` still containing `!important`: `51`

## Risk notes

No CSS file was deleted and no visual selector was added. The main risk is that `perfil.html` and `mensagens.html` are historically sensitive pages with page-specific responsive contracts. This stage only moves those references behind explicit manifests and preserves their order.

The dormant `!important` files remain candidates for a later conservative orphan/dead-CSS audit. They were not removed in this stage.

## Commands executed

```bash
npm run audit:css-import-map
npm run audit:essential-asset-imports
```

Results:

- `audit:css-import-map`: passed
- `audit:essential-asset-imports`: passed-with-follow-up
