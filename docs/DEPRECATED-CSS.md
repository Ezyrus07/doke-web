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
