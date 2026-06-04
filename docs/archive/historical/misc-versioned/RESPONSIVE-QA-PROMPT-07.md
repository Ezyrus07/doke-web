# Prompt 07 — Revisão responsiva completa

## Objetivo
Revisar os HTMLs principais em mobile, tablet e desktop, corrigindo problemas estruturais de responsividade sem redesenhar componentes.

## Arquivo novo
- `assets/css/core/responsive-audit.css`

Este arquivo é uma camada de hardening responsivo carregada após os contratos de shell, header, bottom nav, action buttons, panels e cards.

## Arquivos ajustados
- `assets/css/components/navigation/bottom-nav.css`
- `assets/css/components/panels/mobile-panel.css`
- `assets/css/components/cards/card-system.css`
- `assets/css/components/actions/action-button.css`
- Todos os HTMLs principais receberam `responsive-audit.css`
- Todos os HTMLs principais agora carregam `card-system.css` de forma consistente

## Correções globais
- Prevenção de overflow horizontal em `html`, `body`, containers e grids.
- Padronização de gutters/safe-area em mobile.
- Padding inferior global para não deixar conteúdo escondido atrás do bottom nav.
- Botões de ação passam a quebrar/flexionar corretamente em telas pequenas.
- Grids passam a usar `minmax(0, 1fr)` ou `auto-fit` para evitar vazamento.
- Cards e subelementos internos recebem `min-width: 0`.
- Modais, painéis, popovers, drawers e dialogs passam a respeitar `100vw` e `100dvh`.
- Bottom nav centralizado, com largura máxima, labels truncados e safe-area.
- Painéis mobile usam largura automática entre gutters e max-height com scroll interno.
- Nenhum `!important` foi adicionado.

## Correções por página
### index.html
- Busca/dropdown e filtros protegidos contra overflow.
- Cards de serviço/recomendação protegidos em grids responsivos.
- Bottom nav com largura e safe-area consistentes.

### resultados.html
- Grid/lista de resultados protegido contra vazamento lateral.
- Painel de filtros mobile respeita viewport.
- Botão de filtro mobile mantém tamanho consistente.

### pedidos.html
- Botões de busca, filtros, selecionar e agenda passam a quebrar de forma controlada.
- Painéis de filtro/seleção respeitam largura de viewport e bottom nav.
- Cards de pedido protegidos contra texto cortado e ações espremidas.

### mensagens.html
- Layout de mensagens passa a colapsar para uma coluna no tablet/mobile.
- Cards de mensagem protegidos contra preview/status vazando.
- Ações do thread preservam tamanho mínimo.

### notificacoes.html
- Filtros e seleção mobile usam o mesmo contrato de painel.
- Lista/cards de notificação protegidos contra overflow e títulos longos.
- Header e ações com wrap responsivo.

### perfil.html
- Layout de perfil e cards de perfil protegidos contra colunas espremidas.
- Conteúdo textual longo passa a quebrar corretamente.
- Cards internos usam o contrato global.

### carteira.html
- Grids/painéis da carteira protegidos contra overflow.
- Ações e botões de cards financeiros quebram em grid quando necessário.
- Modal da carteira respeita altura/largura do viewport.

### comunidade.html
- Busca mobile e menu de seleção respeitam o contrato de painel.
- Cards/listas da comunidade protegidos contra vazamento.
- Layout colapsa para uma coluna em tablet/mobile.

### comunidade-interna.html
- Header/chat e áreas internas recebem proteção de largura.
- Composer/listas ficam dentro do viewport.
- Cards/mídias respeitam `max-width: 100%`.

### configuracoes.html
- Busca mobile protegida contra overflow.
- Ações do header com wrap consistente.
- Cards/linhas de configuração mantêm min-width controlado.

### detalhe-anuncio.html
- Cards/mídias/modais protegidos contra largura maior que viewport.
- Conteúdo textual longo quebra corretamente.

### finalizar-pedido.html
- Cards/resumos do fluxo protegidos contra overflow.
- Ações do fluxo quebram de forma controlada em mobile.

### pagamento.html
- Overlay/dialog de pagamento limitado ao viewport.
- Ações de sucesso não ficam espremidas em mobile.

### avaliacao.html
- Painel de avaliação e botões de estrelas protegidos contra vazamento.
- Conteúdo central respeita gutters mobile.

### adicionar-cartao.html
- Formulário/cartão de gerenciamento protegido contra overflow.
- Ações do formulário quebram corretamente em mobile.

### auth/login.html, auth/cadastro.html, auth/esqueci-senha.html
- Contrato de cards e camada de QA responsiva carregados com caminho relativo correto.
- Proteção global de viewport e inputs sem mexer no fluxo visual de autenticação.

## Validação estática
- 18 HTMLs carregam `responsive-audit.css`.
- 18 HTMLs carregam `card-system.css`.
- Novos ajustes não adicionam `!important`.
- Contagem de chaves CSS balanceada nos arquivos alterados.

## Observação
A validação visual automatizada completa via navegador não foi executada neste ambiente. A camada foi aplicada com validação estática e precisa ser conferida localmente em 320, 360, 390, 414, 768, 1024 e 1366px.
