# Stage 19 — Product Flow Contracts

Esta etapa adiciona contratos de fluxo de produto. O objetivo é separar três níveis:

1. **UI genérica**: botão, input, modal, card base.
2. **Domínio visual**: service card, order card, message card, wallet card.
3. **Fluxo de produto**: busca, pedidos, mensagens, carteira, comunidades, agenda, perfil e configurações.

## Arquivo criado

- `assets/css/components/flows/doke-product-flows.css`

## Contratos novos

- `.doke-flow`
- `.doke-flow__header`
- `.doke-flow__body`
- `.doke-flow__footer`
- `.doke-flow__aside`
- `.doke-flow__toolbar`
- `.doke-flow__panel`
- `.doke-flow--two-columns`
- `.doke-flow--split`
- `.doke-search-flow`
- `.doke-order-flow`
- `.doke-message-flow`
- `.doke-wallet-flow`
- `.doke-community-flow`
- `.doke-profile-flow`
- `.doke-scheduling-flow`
- `.doke-settings-flow`

## Regra de governança

Páginas podem compor fluxos com `.doke-*-flow`, mas não devem redesenhar internamente componentes globais como botão, input, modal, card base, drawer, popover ou bottom nav.

## Por que isso facilita futuras alterações

Quando a lógica real começar, cada módulo de produto já terá um envelope semântico. Exemplo:

- busca usa `.doke-search-flow`
- pedidos usa `.doke-order-flow`
- chat usa `.doke-message-flow`
- carteira usa `.doke-wallet-flow`
- comunidades usa `.doke-community-flow`

Assim, ajustes de fluxo não precisam ser feitos por HTML isolado.
