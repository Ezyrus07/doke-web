# Doke — Page Route Map

Este mapa define a função de cada página HTML atual e o contrato estrutural esperado antes de avançar para lógica real.

## Regras de rota

- Página não deve recriar header, search ou bottom nav mobile.
- Toda página principal deve carregar `mobile-app-shell.js`, `mobile-app-shell.css`, `doke-ui-system.css`, `doke-domain-cards.css`, `doke-layout-system.css` e `doke-product-flows.css`.
- Classes visuais novas devem usar contratos `.doke-*`.
- Fluxos de produto devem ser declarados com `.doke-*-flow`.
- Lógica específica deve ficar em `assets/js/pages/` ou futuramente em `src/features/`.

## Rotas principais

| Página | Arquivo | Função | Fluxo | Status |
|---|---|---|---|---|
| Home | `index.html` | Entrada, busca inicial, descoberta de serviços e mídias | `doke-search-flow` | Migrada para App Shell; pronta para mock data |
| Resultados | `resultados.html` | Lista de profissionais/serviços filtrados | `doke-search-flow` | Migrada para App Shell; pronta para mock data |
| Pedidos | `pedidos.html` | Acompanhar pedidos, orçamentos e status | `doke-order-flow` | Estrutura visual migrada; lógica futura |
| Mensagens | `mensagens.html` | Conversas e threads entre cliente/prestador | `doke-message-flow` | Estrutura visual migrada; lógica futura |
| Comunidade | `comunidade.html` | Descoberta/listagem de comunidades | `doke-community-flow` | Estrutura visual migrada; lógica futura |
| Comunidade interna | `comunidade-interna.html` | Feed e membros de uma comunidade | `doke-community-flow` | Estrutura visual migrada; lógica futura |
| Perfil | `perfil.html` | Perfil do usuário/profissional | `doke-profile-flow` | Estrutura visual migrada; lógica futura |
| Carteira | `carteira.html` | Saldo, pagamentos, saques e transações | `doke-wallet-flow` | Estrutura visual migrada; lógica futura |
| Notificações | `notificacoes.html` | Central de alertas e eventos | `doke-settings-flow` | Estrutura visual migrada; lógica futura |
| Configurações | `configuracoes.html` | Preferências, segurança e conta | `doke-settings-flow` | Estrutura visual migrada; lógica futura |

## Próximas rotas públicas recomendadas

| Rota futura | Objetivo |
|---|---|
| `/categoria/:slug` | SEO por categoria de serviço |
| `/cidade/:cidade/:categoria` | SEO local por cidade/categoria |
| `/profissional/:slug` | Perfil público indexável |
| `/servico/:id/:slug` | Detalhe público de serviço/anúncio |
| `/ajuda` | Central de ajuda |
| `/seguranca` | Página de confiança e segurança |
| `/termos` | Termos de uso |
| `/privacidade` | Política de privacidade |

## Critério para considerar página pronta para lógica

1. Usa App Shell global.
2. Usa UI System global.
3. Usa Domain Cards quando tiver cards de domínio.
4. Usa Layout System para seções, listas e grids.
5. Usa Product Flow correspondente.
6. Não carrega CSS depreciado.
7. Tem estado de loading/empty/error planejado.
8. Tem mock data correspondente quando aplicável.
