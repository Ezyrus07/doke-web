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
| `orders` | `charge` | `POST /orders/:id/charge` |
| `orders` | `complete` | `POST /orders/:id/complete` |
| `disputes` | `respond` | `POST /disputes/:id/respond` |
| `disputes` | `release` | `POST /admin/disputes/:id/release` |
| `disputes` | `refund` | `POST /admin/disputes/:id/refund` |
| `withdrawals` | `approve` | `POST /withdrawals/:id/approve` |
| `withdrawals` | `decline` | `POST /withdrawals/:id/decline` |
| `notifications` | `read` | `POST /notifications/:id/read` |

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
