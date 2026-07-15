# Contrato de hierarquia visual Doke

## Regra central

Borda é semântica, não decorativa. Cada componente pertence a uma única camada visual e recebe no máximo uma elevação normal.

## Categorias

- **Superfície estrutural:** sem borda; usa `--doke-surface-shadow`; hover apenas se clicável.
- **Controle standalone:** sem borda; usa `--doke-white-control-shadow`; foco usa o halo canônico.
- **Controle plano:** sem borda e sem sombra; hover por fundo com `--doke-flat-hover-bg`.
- **Seleção:** pode usar `--doke-selection-border`; selecionado usa fundo e ring semântico.
- **Overlay:** sem borda; usa `--doke-overlay-shadow`.

## Regra de composição

Uma única elevação por camada. Em controles compostos, somente o shell externo recebe sombra; ícones, inputs internos, badges, tabs e botões de fechar permanecem planos.

## Hover

- Superfície clicável: elevação leve.
- Superfície estática: sem hover.
- Botão primário: cor e deslocamento máximo de 1px.
- Controle plano: apenas mudança de fundo/cor.
- Ícone interno: apenas fundo ou cor.

## Home ownership

The Home implementation of this contract lives in:

`assets/css/pages/home/visual-hierarchy.css`

It maps Home-specific surfaces to the canonical tokens without redefining card geometry. The search shell owns one control elevation; category icon tiles are standalone controls; rail arrows, chips, badges and actions inside cards remain flat; clickable content cards use the surface elevation and static section wrappers do not hover.

## Page adoption: Configurações and Comunidade

- Configurações uses one desktop workspace elevation; its internal sections and navigation remain flat.
- Settings search/form controls are standalone controls; navigation items and chips are flat controls.
- Avatar/cover upload targets retain a semantic selection border because they are drop/select affordances.
- Comunidade static side panels do not animate on hover; only clickable community/content cards elevate.
- Community tabs, chips, badges, filters, close and card actions remain flat.
- Wizard steps, choice cards and upload targets use selection borders solely to communicate interaction/state.

## Aplicação: Notificações e Novidades

- Notificações: cards da lista são superfícies interativas; painel de preferências, estados vazios e action panels são superfícies estáticas; filtros, ações inline e botões de contexto permanecem planos; seleção usa borda semântica e ring de seleção.
- Novidades: feature, cards e itens importantes são superfícies interativas; sidebar é superfície estática; filtros, chips, pins e ações internas permanecem planos; modal usa exclusivamente a elevação de overlay e seu conteúdo interno não cria uma segunda sombra.


## Aplicação: Pedidos e Carteira

- Pedidos: módulos operacionais estáticos não reagem ao hover; apenas cards de pedido clicáveis elevam. Filtros, chips, navegação e ações internas permanecem planos. Eventos da agenda usam borda apenas como estado selecionável.
- Carteira: painéis financeiros principais são superfícies estáticas; transações e linhas clicáveis elevam; KPIs e métricas internas permanecem planos. Tabs, filtros, badges e ações internas usam fundo/cor, enquanto menus e modais usam exclusivamente a elevação de overlay.

## Profile and marketplace detail owners

- Profile family: `assets/css/pages/profile/visual-hierarchy.css`
- Ad detail: `assets/css/pages/detalhe-anuncio/visual-hierarchy.css`
- Static hero, review and information panels do not react to hover.
- Marketplace cards elevate only when the whole card is clickable.
- Tabs, badges, media actions and controls over images stay flat.
