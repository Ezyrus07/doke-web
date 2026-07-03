# API Adapter Contract

Este contrato define como o frontend deve conversar com backend real no futuro sem quebrar o mock atual.

## Camada permitida

```txt
page/controller
→ service
→ repository
→ repositoryBoundary/provider
→ mock provider ou api provider
→ backend
```

## Proibições

- HTML não importa SDK de backend.
- Renderer não chama `fetch`.
- CSS não representa estado de rede.
- Página não chama Supabase diretamente.
- Controller não monta endpoint manualmente.
- A troca mock/API não pode alterar DOM aprovado.

## Provider interface

Todo provider de repository deve implementar, no mínimo:

```js
{
  name: 'mock' | 'api',
  list(resourceName, query),
  getById(resourceName, { id }),
  create(resourceName, payload),
  update(resourceName, payload),
  remove(resourceName, payload),
  action(resourceName, actionName, payload),
  getPageData(pageName, context)
}
```

`list` e `getById` já existem na fronteira atual. `create`, `update`, `remove` e `action` são extensão não quebrante para mutações futuras.

## Recursos oficiais

| Resource | Endpoint base |
|---|---|
| `users` | `/users` |
| `professionals` | `/professionals` |
| `services` | `/services` |
| `orders` | `/orders` |
| `conversations` | `/conversations` |
| `messages` | `/messages` |
| `payments` | `/payments` |
| `walletTransactions` | `/wallet/transactions` |
| `receivables` | `/wallet/receivables` |
| `withdrawals` | `/withdrawals` |
| `disputes` | `/disputes` |
| `notifications` | `/notifications` |
| `receipts` | `/receipts` |
| `auditEvents` | `/admin/audit-events` |

## Ações oficiais

| Resource | Ação | Endpoint-alvo |
|---|---|---|
| `orders` | `accept` | `POST /orders/:id/accept` |
| `orders` | `decline` | `POST /orders/:id/decline` |
| `orders` | `quote` | `POST /orders/:id/quote` |
| `orders` | `charge` | `POST /orders/:id/charge` |
| `orders` | `start` | `POST /orders/:id/start` |
| `orders` | `complete` | `POST /orders/:id/complete` |
| `orders` | `updateStatus` | `POST /orders/:id/status` |
| `disputes` | `respond` | `POST /disputes/:id/respond` |
| `disputes` | `release` | `POST /admin/disputes/:id/release` |
| `disputes` | `refund` | `POST /admin/disputes/:id/refund` |
| `withdrawals` | `approve` | `POST /withdrawals/:id/approve` |
| `withdrawals` | `decline` | `POST /withdrawals/:id/decline` |
| `notifications` | `read` | `POST /notifications/:id/read` |
| `notifications` | `dismiss` | `POST /notifications/:id/dismiss` |
| `notifications` | `readAll` | `POST /notifications/read-all` |

## DTO rules

- Datas entram e saem em ISO 8601.
- Dinheiro deve usar centavos no backend (`amountCents`) e ser convertido para decimal apenas na UI se necessário.
- Status devem ser normalizados no repository.
- Erros devem ter `{ code, message, details }`.
- Respostas de lista devem aceitar `{ items, nextCursor, total }`, mas o repository pode devolver array quando a página atual ainda espera array.

## Provider API inativo

O arquivo `assets/js/services/api-repository-provider.js` registra um provider API sem ativá-lo. A ativação futura deve chamar:

```js
Doke.repositoryBoundary.setProvider('api')
```

Isso só pode acontecer quando:

1. `enableNetworkRequests` estiver ligado.
2. `apiBaseUrl` estiver configurado.
3. autenticação real ou token de teste estiver disponível.
4. fallback de erro estiver validado.

## Estratégia de erro

- `401`: limpar sessão real e pedir login.
- `403`: mostrar bloqueio de permissão.
- `404`: estado vazio ou detalhe indisponível.
- `409`: conflito de estado financeiro; recarregar entidade.
- `422`: erro de validação com mensagem de campo.
- `5xx`: estado `error` com retry.

## Critério de aceite

- Provider API não muda provider ativo por padrão.
- Provider mock continua sendo o padrão.
- Não há `fetch` em páginas ou renderers.
- Nenhum visual muda.
- `node --check` passa nos arquivos alterados.

## Sprint 11B — provider mock/API por flag

O Doke passa a ter um contrato explícito para escolher origem dos dados sem trocar o comportamento visual ou o fluxo atual.

### Provider padrão

O provider padrão é sempre `mock`.

```js
Doke.repositoryBoundary.getActiveProviderName(); // "mock"
```

A aplicação não deve ativar backend real automaticamente em produção estática. O mock/localStorage continua sendo a origem segura enquanto a API real não estiver configurada.

### Ativação controlada de API

A API só pode ser ativada quando as duas condições forem verdadeiras:

1. `Doke.runtimeConfig.apiBaseUrl` possui uma URL configurada.
2. `Doke.runtimeConfig.flags.enableNetworkRequests === true`.

Formas aceitas para desenvolvimento controlado:

```html
<script>
  window.DOKE_RUNTIME_CONFIG = {
    dataProvider: 'api',
    apiBaseUrl: 'https://api.example.test',
    flags: { enableNetworkRequests: true }
  };
</script>
```

ou, localmente:

```js
Doke.repositoryBoundary.configureProvider({
  provider: 'api',
  apiBaseUrl: 'https://api.example.test',
  enableNetworkRequests: true
});
```

Se alguém tentar ativar `api` sem URL ou sem rede habilitada, o boundary bloqueia a troca, mantém `mock` e registra warning controlado.

### Fronteira obrigatória

Pages/controllers não devem chamar backend diretamente. O caminho permitido é:

```txt
page/controller → service → repositoryBoundary → provider mock/api
```

Fetches internos de shell, rotas estáticas, dados mockados ou serviços públicos específicos não representam integração backend do domínio. Chamadas ao backend do Doke devem passar pelo provider.

### Status de migração

| Domínio | Provider contract | Migração real |
|---|---:|---:|
| Auth/current user | planejado | não migrado |
| Pedidos | mapeado | modo controlado por provider desde Sprint 12C |
| Mensagens | mapeado | não migrado |
| Carteira | mapeado | não migrado |
| Notificações | mapeado | modo controlado por provider desde Sprint 12E |
| Admin/auditoria | mapeado | não migrado |

A Sprint 11B não troca nenhum fluxo para API real; ela cria o interruptor seguro para a Sprint 12.

## Auth provider boundary

Autenticação não deve ser tratada como repository genérico. O repository provider controla dados de domínio; auth precisa de contrato próprio por envolver sessão, token, refresh, expiração e permissões.

A Sprint 11C define:

- `Doke.runtimeConfig.authProvider`: `mock` ou `api`.
- `DokeAuth.getAuthProviderStatus()`: status do provider de auth.
- `Doke.session.getAuthContext()`: contexto normalizado de sessão/role/permissões.

O provider ativo de auth continua `mock` por padrão. A Sprint 12A implementa `api` em modo controlado, preservando `docs/AUTH-INTEGRATION-CONTRACT.md` e sem migrar domínios financeiros.


## Auth API provider — Sprint 12A

Auth não passa pelo `repositoryBoundary`, porque envolve sessão, token, refresh, expiração e permissões. A fronteira autorizada é `assets/js/services/auth-service.js`.

### Endpoints

| Ação | Método | Endpoint |
|---|---:|---|
| Login | POST | `/auth/login` |
| Cadastro | POST | `/auth/register` |
| Sessão atual | GET | `/auth/session` |
| Logout | POST | `/auth/logout` |
| Recuperação | POST | `/auth/recovery` |
| Redefinição | POST | `/auth/reset-password` |

### Regras

- `mock` continua padrão.
- `api` só executa rede com `apiBaseUrl` + `enableNetworkRequests`.
- Resposta de login/cadastro deve retornar `user` ou `session.user`.
- Tokens ficam no Session Store; renderers não leem token.
- Se API de logout falhar, sessão local ainda é limpa.

## Sprint 12B — resources de usuários e perfis

A camada API passa a mapear os resources de identidade/perfil sem ativar backend por padrão.

| Resource | Endpoint base | Uso |
|---|---|---|
| `currentUser` | `/users/me` | leitura/edição do usuário autenticado |
| `profiles` | `/profiles` | perfis públicos/owner por provider |
| `currentProfile` | `/profiles/me` | perfil atual vinculado à sessão |
| `professionals` | `/professionals` | leitura pública de perfil profissional |

Auth continua fora do `repositoryBoundary`, mas dados de perfil podem ser lidos por services através do provider quando a migração de perfis avançar. Páginas não devem montar endpoints manualmente.


## Sprint 12C — pedidos reais em modo controlado

O domínio de pedidos passa a ter fronteira real controlada por `repositoryBoundary`, sem alterar visual e sem migrar mensagens/carteira.

### Regras

- `mock/localStorage` continua sendo o padrão.
- `api` só é usado quando `Doke.repositoryBoundary.getActiveProviderName() === 'api'` e `apiReady === true`.
- Pages continuam chamando `Doke.services.orders`; nenhuma página monta endpoint manualmente.
- `Doke.services.orders` usa o repository local em mock e usa o provider API apenas em modo API ativo.
- Side effects locais de conversa/notificação continuam no fluxo mock. Em API, o backend passa a ser dono desses efeitos e o frontend apenas dispara eventos de sincronização.

### Endpoints de pedidos

| Operação | Provider call | Endpoint |
|---|---|---|
| Listar | `list('orders')` | `GET /orders` |
| Detalhar | `getById('orders', id)` | `GET /orders/:id` |
| Criar | `create('orders', payload)` | `POST /orders` |
| Aceitar | `action('orders', 'accept', payload)` | `POST /orders/:id/accept` |
| Recusar | `action('orders', 'decline', payload)` | `POST /orders/:id/decline` |
| Enviar proposta | `action('orders', 'quote', payload)` | `POST /orders/:id/quote` |
| Iniciar | `action('orders', 'start', payload)` | `POST /orders/:id/start` |
| Concluir | `action('orders', 'complete', payload)` | `POST /orders/:id/complete` |
| Atualizar status | `action('orders', 'updateStatus', payload)` | `POST /orders/:id/status` |

### Normalização

A API pode retornar status backend (`requested`, `charged`, `paid`, `released`, `refunded`). O frontend normaliza esses status no repository de pedidos para os tokens que os cards atuais entendem (`pending`, `quoted`, `in_progress`, `completed`, `disputed`). Renderers não devem fazer essa conversão.


## Sprint 12D — Messages API provider contract

- `messages` remains mock/localStorage by default and only uses API when `repositoryBoundary` reports active provider `api` with `apiBaseUrl` and `enableNetworkRequests`.
- Conversations use `GET /conversations`, `GET /conversations/:id`, `POST /orders/:id/conversation`, `POST /conversations/:id/order`, `POST /conversations/:id/messages`, and `POST /conversations/:id/read`.
- Pages must call `Doke.services.messages`; renderers must not call `fetch()` or backend endpoints directly.
- System events, charge cards, payment events and dispute events remain messages with typed payloads so the chat history can be migrated without changing UI renderers.

## Sprint 12E — Notifications API provider contract

O domínio de notificações passa a aceitar provider mock/API sem alterar HTML ou CSS.

### Regras

- `mock/localStorage` continua sendo o padrão.
- `api` só é usado quando `Doke.repositoryBoundary.getActiveProviderName() === 'api'` e `apiReady === true`.
- Páginas continuam chamando `Doke.services.notifications`; nenhuma página deve montar endpoint manualmente.
- `Doke.services.notifications` usa o repository local em mock e usa o provider API apenas em modo API ativo.
- Em API, o backend passa a ser dono dos efeitos colaterais de notificações criadas por pedidos, mensagens e finanças.

### Endpoints de notificações

| Operação | Provider call | Endpoint |
|---|---|---|
| Listar | `list('notifications')` | `GET /notifications` |
| Detalhar | `getById('notifications', id)` | `GET /notifications/:id` |
| Criar | `create('notifications', payload)` | `POST /notifications` |
| Atualizar | `update('notifications', payload)` | `PATCH /notifications/:id` |
| Marcar lida | `action('notifications', 'read', payload)` | `POST /notifications/:id/read` |
| Dispensar | `action('notifications', 'dismiss', payload)` | `POST /notifications/:id/dismiss` |
| Marcar todas lidas | `action('notifications', 'readAll', payload)` | `POST /notifications/read-all` |

### Contrato de UX

- `targetUrl` e `actionLabel` continuam no DTO para preservar CTA consistente entre pedido, conversa, carteira e comprovante.
- `eventKey` continua obrigatório para deduplicação.
- `read` e `dismissed` permanecem estados de notificação, não estados visuais soltos.

## Sprint 12F — Wallet/finance provider contract

Sprint 12F prepares wallet and financial data for the same controlled `mock`/`api` provider boundary used by auth, orders, messages and notifications. `mock` remains the default provider.

### Wallet resources

| Resource | API endpoint |
| --- | --- |
| `walletSummary` | `GET /wallet` |
| `walletTransactions` | `GET /wallet/transactions` |
| `walletMonthlyDashboard` | `GET /wallet/dashboard` |
| `walletMonthlyHistory` | `GET /wallet/monthly-history` |
| `walletReceivablesSchedule` | `GET /wallet/receivables/schedule` |
| `walletBankAccount` | `GET /wallet/bank-account` |
| `receivables` | `GET/POST /wallet/receivables` |
| `withdrawals` | `GET/POST /withdrawals` |
| `disputes` | `GET/POST /disputes` |
| `auditEvents` | `GET /admin/audit-events` |

### Wallet actions

| Resource | Action | API endpoint |
| --- | --- | --- |
| `walletSummary` | `saveBankAccount` | `POST /wallet/bank-account` |
| `disputes` | `respond` | `POST /disputes/:id/respond` |
| `disputes` | `release` | `POST /admin/disputes/:id/release` |
| `disputes` | `refund` | `POST /admin/disputes/:id/refund` |
| `withdrawals` | `approve` | `POST /withdrawals/:id/approve` |
| `withdrawals` | `decline` | `POST /withdrawals/:id/decline` |

Wallet side effects remain owned by the wallet domain service. When the API provider is active, the backend is expected to own financial side effects such as notifications, receipts, audit events and balance recalculation.

## Sprint 13 — Security and permission boundary

The provider boundary is not only a transport switch. Every domain service must validate actor scope before executing local/mock mutations or forwarding API mutations.

### Required frontend checks before backend migration

- Orders: `Doke.permissions.canAccessOrder` and `Doke.permissions.assertOrderTransition` guard read and status transitions.
- Conversations: `Doke.permissions.canAccessConversation` guards reading, sending and mark-as-read operations.
- Notifications: `Doke.permissions.canAccessNotification` guards read, dismiss and mark-as-read operations.
- Wallet: `Doke.permissions.canAccessWalletOwner` guards owner wallet operations.
- Admin finance: `Doke.permissions.assertAdminAction` guards dispute resolution, withdrawal resolution and audit-event visibility.

### Security audit trail

Denied frontend actions and allowed critical admin actions are written to `doke.security.audit.v1` and dispatched as `doke:security-audit-event`. This is a mock/frontend audit trail only; backend production must still enforce RBAC/RLS and write server-side audit logs.

### Non-negotiable backend rule

Frontend permission checks are UX and development safety. The real backend must independently validate every role, resource ownership and financial action before persisting state.
