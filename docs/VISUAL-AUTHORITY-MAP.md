# Doke Visual Authority Map

## Objective
Keep visual changes fast and predictable by assigning each concern to one owner. Do not create late global override files.

## Shared component owners
- Buttons: `assets/css/components/buttons.css`
- Form controls: `assets/css/components/forms/form-controls.css`
- Tabs: `assets/css/components/tabs/tabs.css`
- Chips and badges: `assets/css/components/status/chips-badges.css`
- Dropdowns: `assets/css/components/dropdowns/dropdown.css`
- Search fields: `assets/css/components/search/search-field.css`
- Modal surfaces and controls: `assets/css/components/overlays/`
- Shared visual tokens: `assets/css/core/tokens.css`

## Page composition owners
- Home discovery controls: `assets/css/pages/home/clean-controls.css`
- Results filter composition: `assets/css/pages/results/clean-surfaces.css`
- Settings surfaces: `assets/css/pages/configuracoes-clean-surfaces.css`
- Orders surfaces: `assets/css/pages/pedidos/clean-surfaces.css`
- Wallet surfaces: `assets/css/pages/carteira/clean-surfaces.css`
- Messages surfaces: `assets/css/pages/mensagens/clean-surfaces.css`
- Community-internal surfaces: `assets/css/pages/comunidade-interna-clean-surfaces.css`
- Public profile composition: `assets/css/pages/profile-foundation.css`
- Professional profile editor: `assets/css/pages/professional-profile-editor.css`
- Professional onboarding composition: `assets/css/pages/tornar-profissional.css`

## Rules
1. Change anatomy in the shared component owner.
2. Change placement or page hierarchy in the page owner.
3. Never add an HTML-loaded `final`, `fix`, `patch`, `override`, or `cleanup` stylesheet.
4. Do not reproduce a shared component's background, border, radius, typography, or interaction states in a page file.
5. Cache versions are updated only at the manifest or HTML entrypoint that changed.

## Retired authority
`assets/css/components/visual/borderless-final-authority.css` was removed in Lote 5. Its residual rules were migrated to their real owners.

## Page manifest orchestration

Home and Results use import-only runtime manifests. Their ordered layers are documented in
`docs/CSS-PAGE-MANIFESTS.md`. These files organize load order but never own visual declarations:

- `assets/css/pages/home-runtime*.css`
- `assets/css/pages/search-results-runtime*.css`

When changing a visual detail, follow the import to the selector owner rather than adding a rule
to a runtime manifest.


### Comunidade interna
- Entry manifest: `assets/css/pages/comunidade-interna-foundation.css`
- Platform/shell: `comunidade-interna-runtime-platform.css`
- Shared chat: `comunidade-interna-runtime-chat.css`
- Settings: `comunidade-interna-runtime-settings.css`
- Page composition: `comunidade-interna-runtime-page.css`

### Mensagens
- Entry manifest: `assets/css/pages/messaging-foundation.css`
- Platform/shell: `messaging-runtime-platform.css`
- Shared chat: `messaging-runtime-chat.css`
- Page behavior: `messaging-runtime-page.css`
- Cross-feature extensions: `messaging-runtime-extensions.css`


### Profile family

- Orchestration: `assets/css/pages/profile-foundation.css`
- Platform dependencies: `assets/css/pages/profile-runtime-platform.css`
- Shared components: `assets/css/pages/profile-runtime-components.css`
- Profile composition: `assets/css/pages/profile-page.css`
- Client editing variant: `assets/css/pages/client-profile.css`
- Professional editing variant: `assets/css/pages/professional-profile-editor.css`


## Pedidos manifest ownership

- Entry: `assets/css/pages/pedidos-foundation.css`
- Platform: `pedidos-runtime-platform.css`
- Order domain: `pedidos-runtime-operations.css`
- Responsive/local presentation: `pedidos-runtime-page.css`
- Shared late extensions: `pedidos-runtime-extensions.css`

Do not add visual declarations to the runtime manifests. Order-card anatomy remains shared;
orders-command-center and the files under `pages/pedidos/` own page-local composition.

## Carteira manifest ownership

- Entry: `assets/css/pages/carteira-foundation.css`
- Platform: `carteira-runtime-platform.css`
- Finance domain: `carteira-runtime-finance.css`
- Responsive/local presentation: `carteira-runtime-page.css`
- Shared late extensions: `carteira-runtime-extensions.css`

Use shared finance/modal owners for reusable financial controls. Keep wallet-only layout and
state presentation in the Carteira page owners.

## Elevação de controles brancos

| Responsabilidade | Autoridade |
| --- | --- |
| Tokens normal, hover, foco e flat | `assets/css/core/tokens.css` |
| Botão ghost standalone e ícone elevado opt-in | `assets/css/components/buttons.css` |
| Inputs standalone e reset de controles embutidos | `assets/css/components/forms/form-controls.css` |
| Busca composta: shell elevado, filho plano | `assets/css/components/search/search-bar.css` e `search-field.css` |
| Tabs, chips, badges e filtros planos | `assets/css/components/tabs/tabs.css`, `status/chips-badges.css` e `search/search-scope.css` |
| Fechar e ações internas planas | `assets/css/components/ui-surface/buttons-close.css` e autoridades de overlay |
| Verificação automática | `scripts/audit-control-elevation-scope.js` |

Regra de ownership: páginas podem mapear aliases locais para os tokens canônicos, mas não podem criar outro vocabulário de sombra para inputs ou botões brancos. Exceções planas devem ser declaradas no owner do componente ou no owner da composição onde o controle está embutido.
