# Ciclo Global 34 — Index data controller

## Objetivo

Preparar `index.html` para consumir dados pela fronteira global (`repositoryBoundary` + `pageDataOrchestrator`) sem alterar o visual atual da home.

## Alterações

- Criado `assets/js/pages/index-data-controller.js`.
- Adicionados hooks não visuais em seções/listas da home:
  - `featured-services`
  - `recommended-services`
  - `workers`
  - `publications`
  - `more-services`
- Adicionada cadeia data-ready mínima no `index.html`:
  - `mock-data-boundary.js`
  - `repository-boundary.js`
  - `mock-repository-provider.js`
  - `page-data-orchestrator.js`
  - `list-state.js`
  - `index-data-controller.js`
- Criada auditoria `scripts/audit-index-data-controller.js`.

## Responsabilidade do controller

O controller apenas prepara e expõe dados para a página. Ele não renderiza cards, não busca backend diretamente e não altera visual.

Ele dispara:

- `doke:index-data-ready`
- `doke:index-data-error`

E marca estado via `data-data-state` no root da home.

## Critérios de aceite

- Nenhuma alteração visual intencional.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final` ou `novo`.
- Controller sem `fetch`, Supabase/Firebase, storage ou `.innerHTML`.
