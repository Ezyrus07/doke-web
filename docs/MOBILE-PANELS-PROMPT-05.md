# Prompt 05 — Mobile panels compartilhados

## Escopo

Criação de um contrato reutilizável para painéis mobile usados por filtros, seleção, busca expandida, menus e ações contextuais.

## Arquivo novo principal

- `assets/css/components/panels/mobile-panel.css`

## Páginas aplicadas

Primeira aplicação, conforme solicitado:

- `pedidos.html`
  - `orders-filters-row`
  - `orders-select-panel`
  - busca expandida do header mobile de pedidos

Replicação em padrões semelhantes:

- `notificacoes.html`
  - painel de filtros
  - painel de seleção
- `resultados.html`
  - painel lateral/mobile de filtros
- `index.html`
  - dropdown de busca
  - painel de mais filtros
- `configuracoes.html`
  - busca mobile expandida
- `comunidade.html`
  - busca mobile expandida
  - menu customizado de seleção de tipo de comunidade

## Contrato CSS

O contrato usa:

- `.doke-mobile-panel`
- `.doke-mobile-panel--filters`
- `.doke-mobile-panel--selection`
- `.doke-mobile-panel--search`
- `.doke-mobile-panel--menu`
- `data-mobile-panel`
- `data-mobile-panel-type="filters|selection|search|menu|context"`

## Decisões técnicas

- O contrato não remove JS existente nem altera `data-*` usados pelos scripts atuais.
- O CSS não usa `!important`.
- O comportamento mobile usa `position: fixed` apenas para painéis flutuantes como filtros, seleção, menus e contexto.
- Busca expandida continua relativa ao bloco onde já existe para não quebrar o fluxo visual do header.
- O painel respeita `safe-area`, largura do viewport, `max-height`, rolagem interna controlada e quebra de conteúdo em telas pequenas.

## Observação sobre remoção de duplicações

Arquivos locais antigos podem continuar carregados nesta etapa, mas agora os painéis mapeados recebem um contrato compartilhado por classe/data-attribute. A remoção física de regras antigas deve ser feita quando a etapa do Codex tratar limpeza de CSS morto/conflitante por página.
