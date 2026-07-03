# Data-ready contracts

This is the single active data-readiness contract for Doke. It consolidates API, backend, fallback and state boundaries.


## Base contract

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
- `data-render-state`
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


## Api Contracts

# Contratos de API — rascunho

## Auth
- POST /auth/login
- POST /auth/logout
- POST /auth/register
- POST /auth/recover

## Services
- GET /services
- GET /services/:id
- POST /services
- PATCH /services/:id

## Orders
- GET /orders
- POST /orders
- GET /orders/:id
- POST /orders/:id/budgets
- PATCH /orders/:id/status

## Messaging
- GET /conversations
- GET /conversations/:id/messages
- POST /conversations/:id/messages

## Payments
- POST /checkout
- GET /wallet
- POST /payouts

Observação: isto é contrato-alvo. A implementação real pode começar com Supabase client e evoluir para API/Edge Functions.



## Data Backend Contracts

# Contratos de dados e backend

## Entidades principais

- User
- UserProfile
- ProfessionalProfile
- Service
- ServiceCategory
- ServiceMedia
- Order
- Budget
- Conversation
- Message
- Review
- Wallet
- Transaction
- Community
- Notification
- Report
- AuditLog

## Regras

1. Toda entidade privada deve ter RLS antes de ir para produção.
2. Toda ação sensível deve gerar `audit_logs`.
3. Nenhuma página HTML/JS deve acessar tabelas diretamente.
4. Toda lista pública precisa de paginação.
5. Toda busca precisa ter limite e rate limiting no backend.
6. Pagamentos, saques e reembolsos nunca devem depender só do cliente.
7. Mensagens e anexos precisam validar participante da conversa.
8. Reviews só devem existir para pedidos concluídos.

## Papéis

- `guest`: leitura pública limitada.
- `client`: cria pedidos, conversa em pedidos, avalia pedidos concluídos.
- `professional`: cria serviços, envia orçamentos, gerencia agenda e saques.
- `moderator`: revisa denúncias, verificações e conteúdo.
- `admin`: opera plataforma, finanças e configurações críticas.



## Data Fallback Strategy

# Data fallback strategy — Doke

Este documento define a estratégia mínima para transição de mocks para backend sem acoplar UI ao formato provisório do HTML atual.

## Ordem de fonte de dados

1. Backend/repository real, quando disponível e autorizado.
2. Repository boundary da página/domínio.
3. Mock data service controlado.
4. Fallback vazio com estado `empty`.
5. Erro normalizado com estado `error`.

## Regra de responsabilidade

- `services` buscam ou normalizam dados.
- `repositories` escondem origem real/mock.
- `controllers` orquestram estado da página.
- `renderers` transformam dados em DOM.
- HTML provisório não deve ser fonte definitiva de verdade.

## Estados obrigatórios de fallback

- Sucesso com itens: `ready`.
- Sucesso sem itens: `empty`.
- Falha de request/parse/permissão: `error`.
- Request em andamento: `loading`.

## Restrições

- Não usar dados sensíveis em estado global.
- Não depender de texto mockado como ID definitivo.
- Não usar `style=""` para fallback visual.
- Não criar controller que escreva direto em muitos seletores sem boundary.



## State Contracts

# State contracts — Doke

Este contrato define a base mínima para estados de UI em páginas que ainda podem mudar visualmente. Ele não consolida layout, não define responsivo e não substitui a reforma desktop futura.

## Objetivo

Preparar páginas, controllers e renderers para dados reais sem acoplar backend ao HTML mockado atual.

## Estados obrigatórios de listas e regiões dinâmicas

Toda região que renderiza dados externos, mocks ou repositórios deve conseguir representar:

- `idle`: estado inicial antes da busca/renderização.
- `loading`: operação em andamento.
- `empty`: resposta válida sem itens.
- `error`: falha de carregamento ou renderização.
- `ready`: dados carregados e renderizados.

## Contrato de atributos recomendado

Use estes hooks quando uma área for dinâmica:

```html
<section data-list-region data-state="idle" aria-busy="false">
  <div data-list></div>
  <div data-list-loading hidden aria-live="polite"></div>
  <div data-list-empty hidden></div>
  <div data-list-error hidden role="alert"></div>
</section>
```

Para regiões que não são listas, use:

```html
<section data-view-state="idle" aria-busy="false">
  <p data-view-state-message aria-live="polite"></p>
</section>
```

## Regras

- Não usar `style=""` para alternar estados.
- Não usar `!important` novo para esconder/mostrar estados.
- Não acoplar mensagens de erro ao backend definitivo.
- Não tratar HTML/CSS provisório como contrato visual final.
- Manter a semântica acessível: `aria-busy`, `aria-live` e `role="alert"` quando fizer sentido.
- Controllers devem acionar estado; renderers devem renderizar conteúdo; services/repositories devem retornar dados/erro.

## First Paint & Loading Contract

Dynamic lists and future backend-rendered cards must preserve the final component shell during loading. A loading state may replace text with placeholders or add a non-geometric shimmer overlay, but it must not replace a reusable card with a separate `.skeleton-card` layout when the final UI is a `doke-ad-card`, `publication-card`, `service-card`, `video-card`, `worker-card` or professional card.

Required rules:

- Component anatomy stays in `assets/css/components/**`.
- Page and pattern CSS may control rails, gaps, scroll behavior and section spacing only.
- Loading, ready, hydrated and skeleton states must not change card width, height, padding, display, grid/flex structure, aspect ratio or overflow.
- If a list needs to show loading while preserving existing cards, use `data-loading-contract="preserve-layout"` with `renderLoadingState(..., { preserveLayout: true })`.
- If a card needs a skeleton, keep the final card class and add `is-skeleton` or `data-card-state="loading"`; do not render a different card shell.
- Images/media inside cards must reserve their final slot through component media dimensions before the image finishes loading.

Validation:

```bash
npm run test:first-paint-loading-contract
```

## Internal route hydration contract

- `assets/js/core/stable-shell-router.js` owns route preparation, the 150 ms visual threshold, stable sidebar/header nodes, history and route commit.
- `assets/js/core/page-hydration.js` owns destination loading, skeleton, ready, empty, error, retry and the documented hydration watchdog.
- The current page remains mounted while destination HTML, CSS and essential scripts are prepared.
- `pedidos.html`, `mensagens.html` and `notificacoes.html` use their page-specific skeletons only when preparation exceeds 150 ms.
- Static or already-renderable pages commit directly without a generic loading overlay.
- Controllers may complete hydration only from declared DOM, authentication and essential-data signals. Timers cannot stand in for those signals.
- A watchdog must end in `error` and expose retry; it must never force `ready`.
- `page-data-orchestrator.js` provides in-memory stale-while-revalidate behavior: valid cached data is returned immediately and `doke:page-data-revalidated` carries the background refresh.

Runtime validation:

```bash
npx playwright test tests/e2e/stable-shell-transition-contract.spec.js --workers=1
npx playwright test tests/e2e/stable-shell-transition-matrix.spec.js --workers=1
```

## Sprint 11A — Backend readiness contracts

A partir da Sprint 11A, a preparação para backend real passa a ter quatro contratos específicos e vivos:

- `docs/DATA-MODEL.md`: modelo de entidades, status e permissões.
- `docs/FINANCIAL-FLOW-CONTRACT.md`: eventos financeiros, side effects e invariantes.
- `docs/API-ADAPTER-CONTRACT.md`: interface do provider mock/API.
- `docs/BACKEND-INTEGRATION-PLAN.md`: fases de migração para API/Supabase.

### Fronteira técnica adicionada

- `assets/js/services/repository-boundary.js` continua sendo a fronteira ativa e agora expõe mutações futuras sem trocar o provider padrão.
- `assets/js/services/api-repository-provider.js` registra um provider `api` inativo por padrão. Ele não liga rede e não substitui `mock` sem chamada explícita a `Doke.repositoryBoundary.setProvider('api')`.
- `assets/js/contracts/backend-domain-contract.js` concentra roles, status financeiros e eventos para reduzir divergência de nomenclatura antes do backend.

### Regra de transição

Enquanto a API real não existir, pages/controllers devem continuar funcionando com mock/localStorage. Qualquer futura integração deve trocar provider/repository, não HTML, CSS ou renderer.

## Sprint 11B — contrato de origem de dados

A origem de dados do frontend agora é tratada como contrato de runtime:

- `mock`: padrão, usando dados locais/mock/localStorage.
- `api`: futuro backend, permitido apenas com URL e rede habilitadas.

O boundary técnico é `assets/js/services/repository-boundary.js`. A API futura é consumida por `assets/js/services/api-repository-provider.js`; o mock continua em `assets/js/services/mock-repository-provider.js`.

Métodos mínimos expostos por repository criado via boundary:

- `list(query)`
- `getById(id)`
- `create(payload)`
- `update(payload)`
- `remove(payload)`
- `action(actionName, payload)`

Controllers novos devem depender desse contrato, não de `localStorage` direto.

## Auth readiness — Sprint 11C

Autenticação passa a ter contrato explícito para backend futuro.

- `assets/js/contracts/auth-domain-contract.js`: roles, permissões, status e eventos de auth.
- `assets/js/core/session.js`: autoridade runtime de sessão e `getAuthContext()`.
- `assets/js/services/auth-service.js`: serviço mock atual com `getAuthProviderStatus()`.
- `docs/AUTH-INTEGRATION-CONTRACT.md`: DTOs e regras para Sprint 12A.

Nenhuma página deve chamar API de auth diretamente. A migração real deve preservar `mock` como fallback local até o provider real estar validado.


## Auth API readiness — Sprint 12A

- Provider padrão: `mock`.
- Provider real: `api`, controlado por `authProvider`, `apiBaseUrl` e `enableNetworkRequests`.
- Serviço autorizado: `assets/js/services/auth-service.js`.
- API pública: `DokeAuth.signIn`, `DokeAuth.register`, `DokeAuth.logout`, `DokeAuth.refreshSession`, `DokeAuth.getAuthProviderStatus`.
- Escopo migrado: login, cadastro, sessão atual, logout e recuperação de senha.
- Escopo não migrado: pedidos, mensagens, carteira, notificações, admin e financeiro.


## Sprint 12C — Orders provider contract

Pedidos passam a aceitar provider mock/API sem mudar HTML ou CSS.

Contrato obrigatório:

- Páginas chamam `Doke.services.orders`.
- `Doke.services.orders` decide a origem com `Doke.repositoryBoundary.getDataProviderStatus()`.
- Provider `mock` preserva localStorage e side effects locais.
- Provider `api` usa `GET /orders`, `POST /orders`, `GET /orders/:id` e ações `accept`, `decline`, `quote`, `start`, `complete`, `updateStatus`.
- Status de backend devem ser normalizados no repository antes de chegar ao renderer.
- `mensagens`, `carteira` e `notificacoes` permanecem mock até suas sprints próprias.


## Sprint 12D — Messages API provider contract

- `messages` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Conversations use `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
- Pages must call `Doke.services.messages`; renderers must not call `fetch()` or backend endpoints directly.
- System events, charge cards, payment events and dispute events remain messages with typed payloads so the chat history can be migrated without changing UI renderers.

## Sprint 12E — Notifications provider contract

- `notifications` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Notifications use `GET /notifications`, `GET /notifications/:id`, `POST /notifications`, `PATCH /notifications/:id`, `POST /notifications/:id/read`, `POST /notifications/:id/dismiss` and `POST /notifications/read-all`.
- Pages must call `Doke.services.notifications`; renderers must not call `fetch()` or backend endpoints directly.
- Notification DTOs keep `eventKey`, `targetUrl`, `actionLabel`, `read` and `dismissed` so the same UI can render order, message, financial and support events.

## Sprint 12F — Wallet data boundary

`Doke.services.wallet` now exposes provider status and routes wallet reads/writes through the controlled repository boundary when `api` is active. The default remains `mock/localStorage`.

Covered wallet capabilities:

- wallet summary;
- statement transactions;
- monthly dashboard/history;
- receivables schedule;
- bank account save/read;
- receivable registration;
- dispute open/respond/resolve;
- withdraw request/approve/decline;
- audit event listing.

Financial side effects stay domain-owned. Local mock keeps current side effects; API mode expects backend-generated notifications, receipts and audit events.

## Sprint 13 — Security-ready data contracts

Dynamic data regions now rely on a frontend permission boundary before executing mock/API operations. Services must attach `actorId` and `actorRole` to API-bound mutations when available and must not allow `currentUser:false` broad reads unless the current actor is support/admin.

## Sprint 14 — MVP controlled readiness

A preparação para dados reais agora exige o gate de fluxo controlado:

```bash
npm run audit:mvp-controlled-readiness
```

O contrato ativo está em `assets/js/contracts/mvp-controlled-flow-contract.js` e define:

- ordem canônica do fluxo: sessão, perfil, pedido, conversa, cobrança, pagamento, carteira, contestação, decisão admin, recibo, saque e auditoria;
- matriz mínima de roles `guest`, `client`, `professional`, `support` e `admin`;
- cenários críticos de sucesso, contestação, saque e negação;
- gates de provider, segurança, fluxo e release.

A regra de arquitetura permanece: renderer não busca dados, página não chama backend direto, CSS não muda por causa de backend e toda ação sensível passa por service/repository/provider.

## Sprint 15 — Supabase backend readiness

A camada de dados agora possui artefatos de banco e backend para testar a transição do MVP controlado em Supabase local/staging sem trocar o provider padrão do frontend.

Contratos adicionados:

- `supabase/migrations/004_mvp_backend_security_foundation.sql` define RLS, idempotência, recibos, recebíveis, saques, disputas e auditoria admin.
- `supabase/seed/002_mvp_controlled_seed.sql` cria um dataset local ponta a ponta para cliente, profissional, suporte e admin.
- `backend/shared/contracts/api-actions.json` documenta actions server-side, roles autorizadas, escopo de recurso, idempotência e auditoria.
- `docs/SUPABASE-BACKEND-READINESS.md` concentra as regras para validar Supabase antes de habilitar API real.

Invariantes:

- frontend nunca é autoridade final de permissão;
- ações financeiras sensíveis exigem idempotência server-side;
- decisões de suporte/admin geram `admin_audit_events`;
- recibos autoritativos são gerados no backend;
- provider padrão permanece `mock` até staging provar RLS e flows.

Comando de gate:

```bash
npm run audit:supabase-backend-readiness
```

## Sprint 16 — API endpoint readiness

A camada de dados agora possui um registro server-side framework-neutral para endpoints reais, sem ativar API no frontend.

Contratos adicionados:

- `backend/shared/http/route-registry.js` define nomes, métodos, paths, módulos, roles, escopos, idempotência e auditoria de cada endpoint.
- `backend/shared/http/create-action-handler.js` padroniza autorização, `x-idempotency-key` e audit hooks para handlers futuros.
- `backend/modules/*/route-handlers.js` expõe handlers registrados por domínio, ainda não implementados.
- `supabase/tests/*.sql` documenta a validação local/staging de RLS, idempotência e negações.
- `docs/API-ENDPOINT-READINESS.md` e `docs/SUPABASE-LOCAL-STAGING-VALIDATION.md` são os contratos vivos dessa etapa.

Comando de gate:

```bash
npm run audit:api-endpoint-readiness
```

Invariantes adicionais:

- endpoint registrado não significa endpoint habilitado;
- ações sensíveis sem `x-idempotency-key` devem falhar no servidor;
- suporte/admin não pode ser simulado por estado visual ou payload do browser;
- RLS e server action continuam sendo autoridade final.

## Sprint 17 — Staging auth/identity runtime boundary

The first executable backend runtime is limited to auth/identity. It reads `users`, `user_profiles`, `client_profiles` and `professional_profiles`, normalizes the DTO expected by the frontend auth service, and preserves the mock provider as the frontend default.

No page, renderer or browser controller may depend on Supabase table shape directly. Browser code continues to consume `DokeAuth` and the service/provider boundaries.

## Sprint 18 — Orders staging runtime

- `backend/modules/orders/orders-service.js`: leitura, criação e transições server-side de pedidos em staging.
- `backend/modules/orders/route-handlers.js`: bindings executáveis para todas as rotas de pedidos registradas em `route-registry`.
- `npm run audit:staging-orders-runtime`: gate estático para impedir regressão do runtime de pedidos.
- O runtime de pedidos não altera o provider padrão do frontend; `mock` continua sendo o padrão até validação local/staging completa.

## Sprint 19 — Staging messaging runtime gate

Conversas e mensagens agora têm runtime staging inicial por trás do mesmo contrato mock/API. O frontend continua em mock por padrão, mas o backend staging já cobre `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages` e `POST /conversations/:id/read`.

Gate obrigatório:

```bash
npm run audit:staging-messaging-runtime
```

## Sprint 20 — Staging notifications runtime gate

Notificações agora têm runtime staging inicial por trás do mesmo contrato mock/API. O frontend continua em mock por padrão, mas o backend staging já cobre `GET /notifications`, `GET /notifications/:id`, `POST /notifications`, `PATCH /notifications/:id`, `POST /notifications/:id/read`, `POST /notifications/:id/dismiss` e `POST /notifications/read-all`.

Gate obrigatório:

```bash
npm run audit:staging-notifications-runtime
```

A regra de dados continua: páginas chamam `Doke.services.notifications`; renderers não chamam `fetch()` nem tabelas Supabase diretamente.

## Sprint 21 wallet runtime validation

- Runtime: `backend/modules/wallet/wallet-service.js` and `backend/modules/wallet/route-handlers.js`.
- Admin finance routes: `backend/modules/admin/route-handlers.js`.
- Gate: `npm run audit:staging-wallet-runtime`.
- Scope: wallet, transactions, dashboard, receivables, bank accounts, withdrawals, disputes, receipts and admin audit events.

## Sprint 22 — Staging E2E validation contract

The backend/provider transition now has an executable staging validation gate:

- `backend/shared/testing/staging-e2e-scenarios.js` owns the canonical smoke scenario list.
- `scripts/validate-staging-e2e.js` runs the real local/staging HTTP smoke.
- `npm run audit:staging-e2e-validation` verifies the gate is present and documented.
- `supabase/tests/004_runtime_e2e_postconditions.sql` verifies post-run database signals.

No frontend page, controller or renderer may be switched to API mode until `audit:staging-e2e-validation`, `validate:staging-e2e` and the SQL postconditions have passed against a staging project.

## Sprint 23 — runtime idempotency contract

Data readiness now requires persistent idempotency at the runtime boundary. The canonical store is `api_idempotency_keys`; runtime handlers must never rely only on the browser or localStorage to deduplicate financial/support actions. The validation command is `npm run audit:runtime-idempotency-audit`.

## Sprint 24 — execution proof before provider canary

Data readiness now requires `audit:supabase-local-staging-execution` in addition to the domain/provider audits. This gate proves the same contracts against real SQL tests, runtime HTTP smoke, persistent idempotency and audit postconditions before any frontend provider is switched to API.
