# Notifications responsive cleanup — Phase 28

## Objetivo

Corrigir a regressão visual em `notificacoes.html` sem mexer em home, shell global, sidebar ou roteador.

## Causa raiz

1. A borda dos cards voltava porque contratos de cards carregados depois da página ainda conseguiam reintroduzir `border`/`border-color` em `.notification-card`.
2. O arquivo genérico `mobile-list-card-system.css` estava sendo carregado diretamente em `notificacoes.html`, embora a página já tenha um contrato próprio em `assets/css/pages/notificacoes/mobile-compact-list.css`. Isso gerava conflito no mobile/tablet.
3. Em larguras 561–760px, a lista de notificações podia consumir um rail menor que o header mobile global.

## Alterações

- `base-layout.css` passou a declarar tokens locais de borda transparente para os cards de notificações.
- `mobile-compact-list.css` removeu a borda visual no contrato mobile próprio da página e ganhou ajuste específico 561–760px.
- `notificacoes.html` deixou de carregar o `mobile-list-card-system.css`, que é genérico e não deve controlar esta página.
- `shared-page-width-contract.css` recebeu uma exceção documentada e escopada para alinhar header/lista em `notificacoes` entre 561–760px.

## Fora de escopo

- Home, cards da home, mensagens, perfil, sidebar, roteador e header global.
