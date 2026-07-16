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

## Flow pages migrated in Lote 20

The following transactional flows now use page-owned hierarchy authorities:

- `orcamento/visual-hierarchy.css`
- `pagamento-profissional/visual-hierarchy.css`
- `avaliacao-profissional/visual-hierarchy.css`
- `verificacao-profissional/visual-hierarchy.css`

Engineering rules applied:

- form cards and summaries are static surfaces;
- inputs/selects/textareas are standalone controls;
- payment methods, evaluation tags and flow choices are selectable controls;
- uploads retain a functional dashed selection border;
- nested summaries, badges and grouped footer actions remain flat;
- success dialogs use overlay elevation only.

## Flow and administration owners

The following page-specific authorities classify onboarding and administration UI without redefining shared component anatomy:

- `assets/css/pages/anunciar-servico/visual-hierarchy.css`
- `assets/css/pages/tornar-profissional/visual-hierarchy.css`
- `assets/css/pages/admin/visual-hierarchy.css`
- `assets/css/pages/admin-verificacao/visual-hierarchy.css`

Upload targets keep dashed functional boundaries. Choice rows use selection borders and rings. Static metrics and summaries remain flat inside their parent surface. Only complete clickable queue/evidence rows may elevate on hover.


## Lote 22 — Ajuda e laboratório do design system

- `assets/css/pages/ajuda/visual-hierarchy.css` classifica tópicos clicáveis, painéis estáticos, busca composta, tabs e modal.
- `assets/css/pages/doke-ui-standard/visual-hierarchy.css` aplica a hierarquia ao shell de documentação sem alterar exemplos marcados como `before` ou `bad`.
- A documentação visual deve demonstrar o contrato oficial sem transformar componentes internos em superfícies elevadas.

## Coverage audit

Run `npm run audit:visual-hierarchy-coverage` to verify that every production, authentication, lab, and UI-kit HTML reaches an explicit visual hierarchy authority through its CSS import graph.

The audit writes:

- `reports/visual-hierarchy-coverage.md`
- `reports/visual-hierarchy-coverage.json`

A page is considered covered only when its active stylesheet graph reaches a CSS owner whose filename contains `visual-hierarchy.css`.

## Lote 24 — Results and Auth ownership closure

- `assets/css/pages/results/visual-hierarchy.css` owns Resultados surface/control classification.
- `assets/css/pages/auth/visual-hierarchy.css` owns Login, Cadastro and password recovery hierarchy.
- Legacy `results/clean-surfaces.css` was retired.

## Lote 25 — Lab and UI Kit coverage closure

- `assets/css/pages/modal-lab/visual-hierarchy.css` owns the presentation hierarchy of `labs/modal-lab.html` without redefining production modal anatomy.
- `assets/css/pages/ui-kit/visual-hierarchy.css` owns the documentation shell of `docs/ui-kit.html` while canonical components remain controlled by their shared owners.
- Lab frames and documentation sections are static surfaces; they do not elevate on hover.
- Modal surfaces use overlay elevation, fields use standalone-control elevation, and close/metadata/internal actions remain flat.
- The visual hierarchy coverage gate now reports 30/30 HTMLs covered (100%).

## Residual audit

Run `npm run audit:visual-hierarchy-residuals` after hierarchy changes. The audit inventories active CSS and reports:

- permanent 1px rings that visually behave as borders;
- literal shadows inside page hierarchy authorities;
- borders without an obvious selection, upload, status, table or divider role;
- vertical hover motion on likely static surfaces.

The report is intentionally diagnostic. Medium findings require selector-level or visual confirmation before editing; they must not be mass-rewritten.

## Directional elevation tokens

Directional shadows must use semantic tokens rather than page-local literals. This preserves the existing appearance while keeping drawers, sticky footers, sidepanels and nested surfaces adjustable from `assets/css/core/tokens.css`.

- `--doke-shadow-nested-soft`
- `--doke-shadow-divider-top`
- `--doke-shadow-footer-lift`
- `--doke-shadow-drawer-inline-start`
- `--doke-shadow-sidepanel-inline-start`
- `--doke-shadow-overlay-deep`
- `--doke-shadow-overlay-strong`
- `--doke-shadow-popover-strong`

Do not reuse these tokens by visual similarity alone. Choose them according to the layer and direction of separation.
