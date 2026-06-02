# Data-ready Contracts — Doke

## Objetivo

Preparar o Doke para trocar conteúdo estático/mockado por dados reais sem refazer HTML, CSS ou componentes.

## Regra principal

Cards, listas, galerias, avaliações, pedidos, carteira, notificações e configurações devem expor hooks previsíveis quando forem preparados para dados dinâmicos.

## Hooks recomendados

- `data-list-region`
- `data-list`
- `data-list-loading`
- `data-list-empty`
- `data-list-error`
- `data-service-card`
- `data-worker-card`
- `data-publication-card`
- `data-review-card`
- `data-card-kind`
- `data-rating-value`
- `data-rating-count`

## Separação de responsabilidade

- `assets/js/services/repository-boundary.js`: fronteira de dados.
- `assets/js/services/page-data-orchestrator.js`: plano de dados por página.
- `assets/js/renderers/*`: montagem de componentes.
- `assets/js/pages/*` e `assets/js/controllers/*`: orquestração da página.

## Proibições

- Renderer não busca dados.
- Componente visual não acessa backend diretamente.
- Página não deve depender de conteúdo mockado rígido.
- CSS não deve depender da posição exata de um card ou texto específico.

## Estratégia

Enquanto o backend não estiver finalizado, dados podem vir de mocks ou providers internos. Quando Supabase/Firebase/API entrarem, a troca deve ocorrer no provider/repository, não no markup dos componentes.

## Logic architecture checkpoint

The project already has an initial logic-ready structure. Do not create a second parallel architecture such as `assets/js/app/**` or page-specific backend clients.

### Current runtime layers

- `assets/js/core/`: runtime foundations such as routing, session, auth, DOM helpers, page bootstrap, runtime config and app-level state.
- `assets/js/services/`: data access boundary, repositories/providers, Supabase contracts, domain services and fallback/mock strategy.
- `assets/js/renderers/`: pure renderers that receive data and return/update UI without fetching from backend directly.
- `assets/js/controllers/`: page controller registry and page controllers responsible for orchestration.
- `assets/js/pages/`: page-specific interactions and thin page-level glue.
- `assets/js/state/`: shared state contracts and state containers.

### Rule for adding real logic

New logic should move through this path:

```txt
backend/API/Supabase/Firebase
  -> service or repository boundary
  -> page-data-orchestrator/domain service
  -> page controller
  -> renderer/component
  -> DOM
```

### Prohibited logic shortcuts

- Page scripts must not query Supabase/Firebase tables directly when a service/repository boundary exists.
- Renderers must not fetch data.
- CSS must not depend on mock content length or on the exact number of mock cards.
- A controller must not duplicate data-shaping logic already owned by a service.
- A page must not create its own private mock contract if `assets/js/services/mock-data-boundary.js` or `mock-data-service.js` can own it.
- Do not create a new global data client if `assets/js/core/api-client.js`, `assets/js/core/auth-service.js`, `assets/js/services/repository-boundary.js`, or `assets/js/services/supabase-contract.js` already covers the boundary.

### First recommended logic implementation area

The safest next real-logic area is home/index data hydration, because it already has visible data surfaces:

- featured services;
- workers;
- publications;
- more services;
- categories/search metadata.

Do not start by integrating every page. Start with one read-only list surface, preserve the static fallback, and prove loading/empty/error states before expanding.

### Minimum acceptance for a data-ready page

- Static fallback still works without backend credentials.
- Loading state exists and does not cause layout shift.
- Empty state exists and preserves page spacing.
- Error state is non-blocking and does not blank the shell.
- Rendered cards use existing component classes and `data-*` hooks.
- Navigation through `DokeNavigate(...)` initializes the same controller state as direct URL load.
