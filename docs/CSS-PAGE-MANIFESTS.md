# CSS Page Manifests

## Purpose

Page entry files must make cascade order visible without becoming visual authorities.
They are orchestration surfaces only: `@import` statements and ownership comments.
Actual declarations belong to the page module, shared component, layout contract or pattern
that owns the selector.

## Home

`assets/css/pages/home.css` is the HTML entry and loads `home-runtime.css`.
The runtime is split into four ordered layers:

1. `home-runtime-page.css` — composition exclusive to `index.html`.
2. `home-runtime-components.css` — reusable controls, overlays and patterns.
3. `home-runtime-shell.css` — desktop/mobile shell and responsive infrastructure.
4. `home-runtime-feed.css` — feed cards, rails and footer presentation.

For visual changes, edit the imported owner. Do not add declarations to any runtime manifest.

## Results

`assets/css/pages/search-results.css` is the HTML entry and loads
`search-results-runtime.css`. The runtime is split into:

1. `search-results-runtime-platform.css` — platform/base layout.
2. `search-results-runtime-page.css` — page shell, collections and filters.
3. `search-results-runtime-components.css` — shared controls, overlays and search.
4. `search-results-runtime-display.css` — display density and result card variants.

## Community room

`assets/css/pages/comunidade-interna-foundation.css` is the only page stylesheet
loaded by `comunidade-interna.html`. Its ordered layers are:

1. `comunidade-interna-runtime-platform.css` — core, shell and workspace rail.
2. `comunidade-interna-runtime-chat.css` — shared chat layout and interaction contracts.
3. `comunidade-interna-runtime-settings.css` — settings patterns and reusable components.
4. `comunidade-interna-runtime-page.css` — page composition, boot state and late extensions.

The document preloader declarations live in `comunidade-interna-boot.css`; the manifest
remains import-only.

## Messaging

`assets/css/pages/messaging-foundation.css` is the only page stylesheet loaded by
`mensagens.html`. Its ordered layers are:

1. `messaging-runtime-platform.css` — core and shell stability.
2. `messaging-runtime-chat.css` — shared workspace and transactional chat contracts.
3. `messaging-runtime-page.css` — hydration, responsive behavior and page-owned features.
4. `messaging-runtime-extensions.css` — domain cards, realtime presence and global UI extensions.

## Rules

- Preserve layer order unless a documented ownership migration requires changing it.
- Do not duplicate the same direct import in sibling manifests.
- Do not create late `fix`, `final`, `override`, `patch` or `cleanup` manifests.
- Update the manifest cache version when its import graph changes.
- Update `docs/VISUAL-AUTHORITY-MAP.md` when ownership changes.

## Profile family

`profile-foundation.css` is the only shared entrypoint for the public and owner profile family.
It delegates to:

- `profile-runtime-platform.css` for core, shell and rail contracts;
- `profile-runtime-components.css` for reusable cards, reviews, actions and footer;
- `profile-page.css` for profile-only composition.

Variant entrypoints (`client-profile.css` and `professional-profile-editor.css`) import the shared foundation and own only their editing affordances. Optional modules must not be declared through placeholder imports: an absent module is removed from the manifest until a real production owner exists.


## Pedidos

`assets/css/pages/pedidos-foundation.css` is the only page stylesheet loaded by
`pedidos.html`. It delegates to four ordered layers:

1. `pedidos-runtime-platform.css` — shared internal foundation and base shell stability.
2. `pedidos-runtime-operations.css` — agenda, order cards, details, chat and command center.
3. `pedidos-runtime-page.css` — late rail/header contracts, local overlays, states and clean surfaces.
4. `pedidos-runtime-extensions.css` — shared domain cards, product flows and global feedback UI.

The split preserves the former effective cascade order. Page-specific geometry remains in the
existing `pedidos/` owners; the runtime files are import-only orchestration surfaces.

## Carteira

`assets/css/pages/carteira-foundation.css` is the only page stylesheet loaded by
`carteira.html`. It delegates to:

1. `carteira-runtime-platform.css` — core, internal foundation and base shell stability.
2. `carteira-runtime-finance.css` — finance overlays, controls, domain cards and wallet composition.
3. `carteira-runtime-page.css` — late rail/header order, responsive behavior, states and clean surfaces.
4. `carteira-runtime-extensions.css` — document preloader and shared close-button authority.

Financial component anatomy must remain in shared component owners. Wallet-only composition
belongs to `carteira.css`, `carteira/responsive-contract.css` or `carteira/clean-surfaces.css`.
