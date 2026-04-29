# Prompt 04 — Bottom nav mobile + action buttons compartilhados

## Escopo executado

- Padronizado o bottom nav mobile em um contrato compartilhado: `assets/css/components/navigation/bottom-nav.css`.
- Criado componente reutilizável para ações rápidas: `assets/css/components/actions/action-button.css`.
- Mantidos `mobile-bottom-nav.css` e `mobile-bottom-nav-system.css` como pontes de compatibilidade, sem regras concorrentes.
- Aplicado import dos novos contratos nos HTMLs principais e auth.
- Ativo do bottom nav passa a ser governado por `aria-current="page"`; `is-active` deixa de ser necessário para navegação.

## HTMLs afetados

- index.html
- pedidos.html
- resultados.html
- perfil.html
- mensagens.html
- notificacoes.html
- carteira.html
- comunidade.html
- comunidade-interna.html
- configuracoes.html
- detalhe-anuncio.html
- finalizar-pedido.html
- pagamento.html
- avaliacao.html
- adicionar-cartao.html
- auth/login.html
- auth/cadastro.html
- auth/esqueci-senha.html

## Mapeamento de botões de ação encontrados

### Busca

- `.topbar-search__icon`
- `.orders-page-header__search-toggle`
- `.results-searchbar__mobile-filter`
- `.settings-mobile-header__action`
- `.community-chat-header__icon`

### Filtros

- `.filter-toggle`
- `.page-header-context__action[data-orders-filter-toggle]`
- `.orders-page-header__hero-chip[data-orders-filter-toggle]`
- `.results-searchbar__mobile-filter[data-results-filters-open]`
- `.orders-page-header__hero-chip[data-messages-filter-toggle]`
- `.orders-page-header__hero-chip[data-notifications-filters-toggle]`

### Selecionar

- `.orders-page-header__hero-chip[data-orders-select-toggle]`
- `.orders-page-header__hero-chip[data-messages-select-toggle]`
- `.orders-page-header__hero-chip[data-notifications-select-toggle]`

### Agenda

- `.page-header-context__action[data-orders-agenda-toggle]`
- `.orders-page-header__hero-chip[data-orders-agenda-toggle]`

## Decisões técnicas

- Não foi removido JS de painéis/popovers, porque o comportamento funcional depende dos data attributes existentes.
- O novo CSS usa seletores compatíveis com as classes atuais para evitar refatoração destrutiva de HTML.
- Estados visuais são padronizados por `:hover`, `:focus-visible`, `[aria-expanded="true"]`, `[aria-pressed="true"]`, `.is-active`, `:disabled` e `[aria-disabled="true"]`.
- `aria-current="page"` foi aplicado nas páginas com rota equivalente no bottom nav: index, pedidos, mensagens, comunidade/comunidade-interna e perfil.

## Arquivos antigos neutralizados

- `assets/css/components/navigation/mobile-bottom-nav.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`

Ambos agora apenas importam o contrato definitivo `bottom-nav.css`, evitando duplicação de regras.

## Validação estática

- Os novos arquivos não usam `!important`.
- Os HTMLs carregam `bottom-nav.css` e `action-button.css`.
- Bottom nav possui `data-bottom-nav` para contrato compartilhado e futuras medições JS/CSS.
- Componentes de ação preservam data attributes originais, evitando quebrar busca, filtros, selecionar e agenda.

## Pendência consciente

A validação visual automatizada com navegador não foi executada neste ambiente. A validação recomendada localmente é:

- 390px mobile: index, pedidos, resultados, mensagens, notificacoes, comunidade, perfil.
- 1366px desktop: index, pedidos, resultados, mensagens, notificacoes.
