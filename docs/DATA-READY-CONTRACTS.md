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

## Sprint 24 — real backend validation before provider canary

Data-ready status still means the browser defaults to mock/localStorage. The real Supabase gate is now operationalized by:

```bash
npm run audit:supabase-staging-validation-runbook
npm run validate:supabase-staging:dry-run
npm run validate:supabase-staging
```

Do not switch frontend provider flags until SQL tests 001-005, `validate:staging-e2e`, idempotency replay/conflict validation and persisted `admin_audit_events` pass together in local/staging.

## Sprint 25 — limite do auth/identity canary

O auth/identity canary não autoriza `dataProvider=api`. Durante essa etapa, a única API real permitida no frontend é a fronteira de autenticação/identidade em `assets/js/services/auth-service.js`.

Provider esperado:

```txt
authProvider=api
dataProvider=mock
```

Isso preserva mock/localStorage para marketplace, pedidos, mensagens, notificações, carteira, disputas, recibos e admin até canaries separados por domínio.

## Sprint 26 — Data provider lock during Auth/Identity canary

Durante o canary Auth/Identity, `dataProvider` continua forçado para `mock` no runtime. O gate `validate:auth-identity-canary:browser-runtime` garante que a ativação do canary não chama endpoints de pedidos, mensagens, notificações, carteira, disputas, recibos ou admin. O único tráfego permitido no smoke de navegador simulado é `/auth/login`, `/users/me` e `/profiles/me`.

## Sprint 27 — Local network boundary for Auth/Identity canary

O gate `validate:auth-identity-canary:local-runtime` prova a fronteira de dados antes do staging real. Ele usa rede HTTP local para autenticação/identidade, mas mantém todos os dados operacionais fora da API do frontend.

Durante esse gate:

- `authProvider=api` é permitido apenas para autenticação/identidade;
- `dataProvider=mock` continua obrigatório;
- endpoints permitidos: `/auth/login`, `/auth/session`, `/users/me`, `/profiles/me`;
- endpoints de pedidos, conversas, notificações, carteira, saques, disputas, recibos e admin continuam proibidos.

Esse gate não autoriza canary de outro domínio. Ele apenas reduz risco antes do `validate:auth-identity-canary` real.

## Sprint 28 — Promotion gate keeps domain data on mock

O gate `validate:auth-identity-canary:promotion-gate` reforça que a transição de dados continua bloqueada para domínios operacionais. Mesmo com Auth/Identity em canary, `dataProvider=mock` permanece obrigatório até existir relatório real aprovado.

A flag `DOKE_AUTH_IDENTITY_CANARY_REQUIRE_REAL_REPORT=1` transforma o preflight em gate estrito. O relatório aceito deve provar somente `/auth/login`, `/auth/session`, `/users/me` e `/profiles/me`; endpoints de pedidos, conversas, notificações, carteira, saques, disputas, recibos e admin continuam proibidos.

## Sprint 29 — Orders read-only API canary

A preparação de dados reais para pedidos agora possui um canary de leitura controlado. Ele valida apenas:

```txt
GET /orders
GET /orders/:id
```

A dependência obrigatória é o gate de Auth/Identity com status `auth_identity_canary_ready_for_manual_staging_rollout`.

Comandos:

```bash
npm run audit:orders-readonly-canary-contract
npm run validate:orders-readonly-canary:dry-run
npm run validate:orders-readonly-canary:local-runtime
```

Durante este canary, `dataProvider` permanece `mock`; `ordersProvider=api-readonly` é apenas o escopo operacional do teste. Nenhum fluxo de criação, aceite, recusa, proposta, cobrança, status, mensagem, notificação ou carteira pode ser chamado.

## Sprint 30 — Orders read-only promotion keeps writes blocked

O gate `validate:orders-readonly-canary:promotion-gate` protege a transição de dados de pedidos. Mesmo com `ordersProvider=api-readonly`, `dataProvider=mock` continua obrigatório.

Status bloqueado seguro:

```txt
blocked_until_real_orders_readonly_canary_report
```

Status aprovado para o próximo planejamento:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

O gate rejeita relatório real com `DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE`, endpoints de escrita de pedidos ou chamadas para mensagens, notificações, carteira, disputas, recibos e admin.


## Sprint 31 — Orders write canary planning gate

O contrato data-ready permanece conservador: `dataProvider=mock` continua obrigatório. A Sprint 31 introduz `ordersProvider=api-write-canary-planning` somente como marcador de planejamento, não como provider ativo.

O gate retorna `blocked_until_real_orders_readonly_promotion_report` enquanto o relatório real de leitura não existir. Com relatório válido, retorna `orders_write_canary_ready_for_manual_contract_design`.

A escrita futura deve comprovar `idempotency_key_required_for_every_mutation`, replay seguro, conflito por payload divergente e rollback para `dataProvider=mock`.

Comando obrigatório da Sprint 31: `npm run validate:orders-write-canary:planning-gate`.

## Sprint 32 — Orders write local harness

O contrato data-ready de escrita de pedidos continua local-only. O frontend permanece em `dataProvider=mock` e `writeActivation=false`.

Comando:

```bash
npm run validate:orders-write-canary:local-runtime
```

Aceite local: `orders_write_canary_local_runtime_validated`.

Esse aceite exige `DOKE_IDEMPOTENCY_CONFLICT` para drift de payload, replay seguro para mesma chave/payload e domínio limitado a `/orders`.

## Sprint 33 — Orders write staging preflight gate

A Sprint 33 adiciona o gate de preflight para uma futura execução real de escrita de pedidos em local/staging. O escopo continua sem alteração visual e sem ativação de escrita no frontend.

Contrato operacional:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=api-write-canary-staging-preflight
performsNetworkRequest=false
performsMutation=false
```

Comandos:

```bash
npm run audit:orders-write-canary-staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:dry-run
npm run validate:orders-write-canary:staging-preflight-gate:check-env
npm run validate:orders-write-canary:staging-preflight-gate
npm run validate:orders-write-canary:staging-preflight-gate:report
```

Status seguro sem pré-requisitos reais:

```txt
blocked_until_orders_write_staging_preflight_prerequisites
```

Status de alvo inseguro:

```txt
blocked_unsafe_orders_write_staging_target
```

Status aprovado apenas para execução manual futura:

```txt
orders_write_canary_ready_for_manual_staging_execution
```

Variáveis exigidas para aprovação do preflight real:

```bash
DOKE_ENVIRONMENT=staging
DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL=https://staging-api.example
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1
DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1
```

Relatórios reais exigidos:

```txt
auth_identity_canary_ready_for_manual_staging_rollout
orders_readonly_canary_ready_for_manual_write_canary_planning
orders_write_canary_ready_for_manual_contract_design
orders_write_canary_local_runtime_validated
```

A aprovação do preflight não executa mutação. Ela apenas confirma que a próxima sprint pode preparar um executor real de staging com confirmação manual, idempotência obrigatória, relatório e rollback para mock.

## Orders write data-ready progression — Sprint 34-36

The staged contracts remain conservative:

```txt
ordersProvider=api-write-canary-staging-execution
dataProvider=mock
writeActivation=false
```

```txt
ordersProvider=api-write-canary-frontend-activation-planning
dataProvider=mock
orderWriteActivationDefault=false
manualActivationOnly=true
```

Every future orders write mutation must include an idempotency key and must be rollback-safe.

## Orders write frontend activation — Sprint 37-39

Contrato de dados para a ativação manual:

```txt
dataProvider=mock
ordersProvider=api-write-canary-frontend-activation
ordersWriteCanary=true
orderWriteActivation=true
```

Rollback obrigatório:

```txt
ordersProvider=mock
orderWriteActivation=false
ordersWriteCanary=false
```

Toda mutação precisa de `x-idempotency-key`; sem chave, a chamada falha antes de `fetch`.

## Sprint 40–48 — Domain canary data readiness

Messaging, Notifications and Wallet now have local backend canary validation covering read endpoints, mutation endpoints, idempotency, replay, conflict and role-scoped negative cases.

The contract remains:

```txt
dataProvider=mock by default
real API only via explicit staging/local flags
mutations require idempotency key
production target blocked
rollback to mock required before expansion
```

## Sprint 49–60 data-readiness additions

Backend-real readiness now includes multi-domain smoke coverage and future domain expansion planning:

- Auth/Identity remains the first dependency.
- Orders write remains idempotency-gated.
- Messaging and Notifications must use idempotency for mutations.
- Wallet/withdrawals/receipts require role scoped writes.
- Anunciar/Publicar/Comunidade are blocked until backend real complete readiness and observability reports pass.

## Sprint 61–75 — domain expansion data contracts
Novos contratos preparados para dados reais:

- Service listing: `id`, `ownerId`, `title`, `category`, `priceCents`, `status`.
- Publication: `id`, `authorId`, `title`, `body`, `status`.
- Community post: `id`, `authorId`, `title`, `body`, `comments`, `reactions`.

Mutações exigem idempotência, replay seguro e conflito explícito para drift de payload.

## Sprint 76–90 — Product beta data contracts

New guarded data contracts:

- Media uploads and attachments require completion before attachment.
- Moderation reports and blocks are idempotent and role-scoped.
- Search reads are safe; index rebuild is admin-only and idempotent.
- Pricing exposes plans; subscriptions and boosts are idempotent and owner/role-scoped.

## Sprint 91–105 — Beta launch operational contracts

Prepared beta launch contracts for payments/checkout/escrow, KYC/professional verification, support/admin operations and security/abuse prevention. All mutations require idempotency and staging execution remains blocked behind explicit flags and safe URL checks.

## Sprint 106–120 frontend beta canary data contract

The beta launch frontend canary must force `dataProvider=mock` while allowing selected launch domains to call a local/staging API by explicit manual activation only. Mutations require `idempotencyKey`, unsafe production-like targets are blocked, and rollback must restore local storage state.

## Domain invalidation contract

Cross-page cache and route invalidation is owned by `Doke.experience.invalidation` in `assets/js/core/experience-runtime.js`.

### Canonical domains

- `orders`
- `messages`
- `notifications`
- `wallet`
- `marketplace`
- `profiles`
- `detailAd`
- `admin`
- `payment`

Page modules and form adapters should invalidate domain names instead of repeating cache prefixes and route lists:

```js
Doke.experience.invalidation.invalidateDomains(
  ['orders', 'messages', 'notifications'],
  { reason: 'order-status-changed' }
);
```

Known operational events are mapped centrally. Examples:

- `doke:order-status-changed` invalidates Orders, Messages and Notifications.
- `doke:payment-confirmed` invalidates Orders, Messages, Notifications, Wallet and Payment.
- `doke:profile-updated` invalidates Profiles and Marketplace.
- `doke:service-created` invalidates Marketplace, Profiles and the service detail surface.
- `doke:review-created` invalidates Profiles, Marketplace, Orders, Notifications and the service detail surface.

### Rules

- Domain maps own cache prefixes, route documents and page-data keys.
- Page modules may keep a fallback only for pages where `experience-runtime.js` is not loaded yet.
- New operational events must be added to the central event map before page-specific listener lists are created.
- Invalidation marks cached data stale; it does not delete persisted repository data.
- Community invalidation remains isolated until the Community workstream is integrated.
