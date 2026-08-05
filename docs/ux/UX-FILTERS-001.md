# UX-FILTERS-001 — filtros aplicados, rascunho e commit atômico

## Status

- Frente: `UX`;
- Sublote: `UX-FILTERS-001`;
- Issue: `#68`;
- Branch: `ux/ux-filters-001-applied-draft`;
- Base: `ux/ux-search-001-latest-wins`;
- Base head: `4a9087f5ebd3027c070f8d4e4e43f6aad753f7f0`;
- Rota piloto: `resultados.html`;
- Backend, ranking, repository e search service alterados: não;
- Home alterada: não;
- Staging/produção acessados: não;
- Merge ou ready for review autorizados: não.

## 1. Objetivo

Separar o estado visível no formulário do estado que realmente controla resultados, URL, paginação e chips.

```text
appliedFilters
→ estado confirmado
→ controla busca, URL, paginação e chips

draftFilters
→ estado em edição
→ controla somente os inputs

Aplicar
→ draft vira applied
→ um único commit
→ uma única renderização

Cancelar / fechar / backdrop / Escape
→ draft é descartado
→ inputs voltam para applied
→ URL e resultados não mudam
```

## 2. Causa raiz

O runtime anterior executava:

```text
filtersForm change
→ loadResults()
→ getFilters() lê o formulário
→ persistFiltersToParams()
→ history.replaceState()
→ nova consulta/renderização
```

Assim, qualquer checkbox, estado, cidade ou CEP já era aplicado antes do botão `Aplicar`. Fechar o painel não cancelava nada, e rascunhos podiam vazar para nova query ou troca de tipo.

## 3. Autoridade

```text
Doke.searchFilterState
version: 20260805-ux-filters-001-v1
contract: search-filter-state-v1
```

API congelada:

```text
normalize(snapshot)
equals(left, right)
changedKeys(left, right)
activeCount(snapshot)
parseUrl(search)
serializeUrl(snapshot, search)
createController(options)
install()
```

## 4. Snapshot canônico

```text
FilterSnapshot
├── searchType
├── categories[]
├── state
├── city
├── neighborhood
├── minRating
├── guaranteed
├── emergency
├── online
└── availableToday
```

Invariantes:

- `searchType`: `services`, `users`, `workers` ou `before-after`;
- categorias deduplicadas e congeladas;
- strings aparadas;
- rating inválido vira `0`;
- booleanos estritos;
- snapshots imutáveis;
- query, cursor e page size não pertencem ao snapshot.

## 5. Controller

Estado:

```text
applied
draft
dirty
revision
activeAppliedCount
activeDraftCount
```

Operações:

```text
begin()
update(patch)
replaceDraft(snapshot)
clearDraft()
cancel()
replaceApplied(snapshot)
commit(snapshot?)
getSnapshot()
```

`update` altera somente o draft. `commit` produz receipt imutável com `changedKeys`. `cancel` restaura o applied.

## 6. Integração com o legado

`search-results.js` continua sendo o owner da renderização e da consulta. A autoridade é entregue dentro de `search-data.js`, que já carrega antes de `search-results.js`.

Listeners em capture phase classificam os eventos antes do auto-apply legado:

```text
document capture
→ edição fica no draft
→ handlers legados não recebem change

Aplicar
→ controller.commit()
→ doke:search-filters-committed
→ um Event('change') marcado
→ handler legado chama loadResults() uma vez
```

Marca interna:

```text
__dokeFiltersCommit
```

Não há monkeypatch de APIs nativas, carregamento dinâmico, `eval` ou `new Function`.

## 7. Semântica das ações

### Categoria, rating ou checkbox

```text
input muda
→ draft muda
→ dirty = true
→ URL e resultados permanecem
```

### Estado e cidade

Estado reconstrói cidades e limpa cidade/bairro apenas no draft. Cidade reconstrói bairros e limpa bairro apenas no draft.

### CEP

CEP válido resolve localização local e atualiza state/city/neighborhood no draft. Não dispara busca. CEP inválido usa `aria-invalid=true`.

### Limpar no painel

`clearDraft()` limpa apenas o rascunho. O usuário ainda precisa selecionar `Aplicar`.

### Reset externo do estado vazio

É uma ação explicitamente aplicada:

```text
clearDraft()
→ commit()
→ uma busca
```

### Fechar, backdrop ou Escape

```text
cancel()
→ formulário restaurado
→ dependent/custom selects restaurados
→ nenhuma busca
```

### Nova query, sugestão ou troca de tipo

Rascunhos pendentes são descartados antes da ação externa, evitando aplicação implícita.

### Atualização externa de serviço

Durante `doke:service-created` ou `doke:service-updated`, o formulário é temporariamente pintado com applied para o refresh e o draft visual é restaurado em microtask.

## 8. URL

Aliases aceitos:

```text
category / categories / catégory / catégorie
state / staté
```

Saída canônica:

```text
type
category
state
city
neighborhood
minRating
guaranteed
emergency
online
availableToday
```

O módulo não remove `q`, `cursor` ou `pageSize`, pois pertencem à autoridade UX-SEARCH-001. Na integração atual, a URL só muda quando o renderer legado recebe o commit marcado.

## 9. Desktop e mobile

A mesma autoridade controla ambos.

Desktop:

- painel pode permanecer aberto;
- editar continua sendo draft;
- `Aplicar` confirma;
- colapsar descarta alterações não aplicadas.

Mobile:

- abrir inicia edição;
- backdrop, fechar e Escape cancelam;
- aplicar confirma e fecha;
- Escape devolve foco ao botão de filtros.

## 10. Acessibilidade

O formulário recebe:

```text
data-filter-authority
data-filter-contract
data-filter-state
data-filter-dirty
```

`Aplicar` fica desabilitado quando draft = applied. `Limpar` fica desabilitado quando o draft não tem filtros ativos.

Status criado de forma idempotente:

```text
[data-results-filter-status]
role=status
aria-live=polite
```

## 11. Eventos sanitizados

`doke:search-filters-state`:

```text
dirty
activeAppliedCount
activeDraftCount
revision
```

`doke:search-filters-committed`:

```text
changed
changedKeys
activeCount
revision
source
```

Não são emitidos query, categoria textual, localização, CEP, URL, cursor, IDs ou PII.

## 12. Lifecycle

A instalação usa `AbortController` e possui cleanup em `pagehide`, `doke:route-leaving` e `cleanup()`. Nova execução limpa a instalação anterior antes de criar outra.

## 13. Arquivos

```text
assets/js/pages/search-data.js
scripts/test-ux-filters-001-filter-state.js
.github/workflows/ux-filters-001-applied-draft.yml
docs/ux/UX-FILTERS-001.md
```

Não alterados:

```text
resultados.html
assets/js/pages/search-results.js
assets/js/pages/search/server-results-surface.js
assets/js/repositories/search-repository.js
assets/js/services/search-service.js
index.html
```

## 14. Testes

A suíte cobre API congelada, normalização, deduplicação, applied imutável durante update, dirty, cancel, clearDraft, commit, changedKeys, active count, aliases/canonicalização de URL, capture phase, bridge de commit único, reset draft versus aplicado, CEP sem busca automática, ausência de execução dinâmica e ordem estática de scripts.

O workflow preserva UX-SEARCH-001, SEARCH-UX02, CARDS, PERF, RESP, A11Y, NAV, PRIV, CONT, CORE-002, CORE-001, navigation lifecycle, auth/session, catálogo, loading baseline e `git diff --check`.

## 15. Limitações

- chips ativos ainda não possuem remoção individual;
- não há novos filtros de domínio;
- draft não é persistido entre rotas;
- coverage reconhecida pelo Sonar permanece tratada na issue #67.

## 16. Rollback

```text
restaurar assets/js/pages/search-data.js ao head do PR #66
remover teste
remover workflow
remover documento
```

Nenhum banco, schema, storage, endpoint, migration, staging ou produção precisa ser revertido.

## 17. Próximo sublote

Após validação:

```text
UX-FILTERS-002 ou próximo item da Wave 1
→ chips removíveis com commit explícito
→ agrupamento/contagem
→ reprodução sem duplicar autoridade
```
