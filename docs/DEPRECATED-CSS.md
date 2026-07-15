# CSS depreciado — Doke

Este documento registra folhas CSS que não devem voltar a ser usadas como autoridade visual ativa. A existência do arquivo no repositório não significa permissão de uso em HTML ou manifestos ativos.

## Regra de uso

- Não importar CSS depreciado em HTML, manifestos de página ou manifestos compartilhados.
- Antes de remover fisicamente um arquivo, validar se não há referência por HTML, CSS, JS, scripts, testes ou documentação operacional.
- Quando uma regra ainda for necessária, migrar para a autoridade correta: `core`, `layout`, `components`, `patterns` ou `pages`.

## Chrome mobile substituído

As folhas abaixo foram substituídas pelo contrato oficial de shell mobile:

- `assets/css/components/navigation/bottom-nav.css`
- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`
- `assets/css/components/navigation/mobile-internal-header.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/navigation/app-mobile-topbar.css`
- `assets/css/components/navigation/app-mobile-search.css`
- `assets/css/components/navigation/mobile-search-header-shared.css`
- `assets/css/components/navigation/mobile-chrome-lock.css`
- `assets/css/components/shell/mobile-page-rhythm-contract.css`

Autoridade atual:

- CSS: `assets/css/components/shell/mobile-app-shell.css`
- JS: `assets/js/components/mobile-app-shell.js`
- Entrada compartilhada: `assets/css/pages/app-shell.css`

## Critério de migração

Uma página está correta quando carrega o shell oficial, o sistema de UI compartilhado e não puxa chrome mobile depreciado por link direto ou `@import` transitivo.

## Phase 02 — radius tokenization

Literal `border-radius` values found in active CSS were migrated to token references in Phase 02. Transitional exact aliases live in `assets/css/core/tokens.css` only to preserve the approved visual baseline while older component/page CSS is consolidated.

New CSS should not introduce `--radius-exact-*` unless it is preserving an existing approved legacy geometry during a documented migration. Prefer semantic aliases such as `--radius-card`, `--radius-control`, `--radius-pill`, `--radius-modal` and `--radius-surface`.

## Phase 20 — quarentena de dívida CSS dormente

Esta seção registra CSS com dívida de `!important` que permanece no pacote, mas não aparece no grafo de CSS carregado pelos HTMLs raiz na auditoria `audit:css-active-debt-map`. Esses arquivos ficam em quarentena lógica: não devem voltar a ser importados e não devem ser removidos fisicamente sem validação visual, busca de referências e rollback documentado.

Arquivos em quarentena lógica:

- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/pages/home-tablet-v2.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/shell/app-header.css`
- `assets/css/components/layout/responsive-priority-contract.css`
- `assets/css/patterns/marketplace-responsive-stack.css`
- `assets/css/components/cards/marketplace-responsive-card-stack.css`
- `assets/css/components/shell/tablet-internal-rail-contract.css`
- `assets/css/components/navigation/mobile-search-header-shared.css`
- `assets/css/pages/home/tablet-safari-layout.css`
- `assets/css/pages/home/chrome.css`
- `assets/css/components/shell/app-header-canonical-contract.css`
- `assets/css/pages/home/sections.css`
- `assets/css/components/navigation/mobile-chrome-lock.css`
- `assets/css/components/navigation/mobile-page-rhythm-contract.css`
- `assets/css/components/layout/responsive-page-contract.css`
- `assets/css/components/navigation/app-mobile-topbar.css`
- `assets/css/components/shell/tablet-shell-contract.css`
- `assets/css/components/layout/responsive-priority-cards.css`
- `assets/css/pages/home/tablet-shell-rail.css`
- `assets/css/components/navigation/app-mobile-search.css`
- `assets/css/components/layout/index-compact-card-contract.css`
- `assets/css/components/shell/marketplace-page-contract.css`
- `assets/css/components/cards/shared-index-card-contract.css`
- `assets/css/components/shell/header-rail-alignment-contract.css`
- `assets/css/pages/shell-normalize.css`
- `assets/css/components/layout/professional-responsive-layout.css`
- `assets/css/components/shell/ipad-safari-scroll.css`

## Lote Doke Clean — autoridade transitória de controles aposentada

O arquivo `assets/css/components/visual/borderless-control-authority.css` deixou de ser importado por `assets/css/core/components.css`.

A responsabilidade por bordas, elevação, hover e foco dos controles compartilhados foi devolvida às autoridades canônicas:

- `assets/css/core/tokens.css`
- `assets/css/components/buttons.css`
- `assets/css/components/forms/form-controls.css`
- `assets/css/components/tabs/tabs.css`
- `assets/css/components/status/chips-badges.css`
- `assets/css/components/dropdowns/dropdown.css`
- `assets/css/components/search/search-field.css`
- `assets/css/components/internal/filter-select-standard.css`

O arquivo aposentado permanece fisicamente no pacote apenas para rollback e rastreabilidade. Não deve voltar a ser importado nem receber novas regras. Exceções de página devem ser resolvidas na autoridade correta do componente ou da composição, sem recriar uma camada global tardia.
