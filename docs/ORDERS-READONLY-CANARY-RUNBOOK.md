# Orders read-only canary runbook — Sprint 29

## Objetivo

A Sprint 29 prepara o primeiro canary de pedidos sem abrir escrita de domínio. O contrato é deliberadamente restrito: autenticação/identidade deve estar promovida antes, o frontend continua com `dataProvider=mock`, e o canary de pedidos só pode chamar endpoints de leitura.

## Dependência obrigatória

O canary de pedidos só pode ser executado contra local/staging real depois que o gate de Auth/Identity tiver gerado um relatório com status:

```txt
promotionStatus = auth_identity_canary_ready_for_manual_staging_rollout
```

O arquivo esperado é:

```txt
reports/generated/auth-identity-canary-promotion-gate-report.json
```

Sem esse relatório, `npm run validate:orders-readonly-canary` deve falhar. O único bypass aceito é o harness local controlado da Sprint 29, que usa `DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE=local-runtime` contra `127.0.0.1`.

## Escopo permitido

Permitido:

```txt
POST /auth/login
GET /auth/session
GET /users/me
GET /profiles/me
GET /orders
GET /orders/:id
```

Bloqueado:

```txt
POST /orders
PATCH /orders/*
PUT /orders/*
DELETE /orders/*
POST /orders/:id/accept
POST /orders/:id/decline
POST /orders/:id/quote
POST /orders/:id/charge
POST /orders/:id/start
POST /orders/:id/complete
POST /orders/:id/status
/conversations
/notifications
/wallet
/withdrawals
/disputes
/receipts
/admin
```

## Contrato frontend

Durante esta etapa, o frontend não deve trocar o provider global de dados:

```txt
authProvider=api
dataProvider=mock
ordersProvider=api-readonly
enableNetworkRequests=true
```

`ordersProvider=api-readonly` é um contrato operacional do canary, não uma ativação global de `dataProvider=api`.

## Comandos locais seguros

```bash
npm run audit:orders-readonly-canary-contract
npm run validate:orders-readonly-canary:dry-run
npm run validate:orders-readonly-canary:local-runtime
```

O comando local-runtime sobe um servidor HTTP em `127.0.0.1`, executa o mesmo validador de rede e prova que somente auth/identity + leitura de pedidos foram chamados.

Para gerar relatório local:

```bash
npm run validate:orders-readonly-canary:local-runtime:report
```

## Execução real local/staging

Pré-requisitos:

```bash
DOKE_ENVIRONMENT=staging
DOKE_ORDERS_READONLY_CANARY_API_URL=https://staging-api.exemplo
DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK=1
DOKE_ORDERS_READONLY_CANARY_MARKER=staging
```

Também é obrigatório existir o relatório:

```txt
reports/generated/auth-identity-canary-promotion-gate-report.json
```

Execução:

```bash
npm run validate:orders-readonly-canary:report
```

## Critério de aprovação

O canary passa quando:

- Auth/Identity já foi promovido pelo gate anterior.
- Login/session/users/me/profiles/me passam para cliente e profissional.
- `GET /orders` passa para cliente e profissional.
- `GET /orders/:id` passa quando houver item retornado pela listagem.
- Nenhum endpoint de escrita de pedidos é chamado.
- Nenhum endpoint de mensagens, notificações, carteira, disputas, recibos ou admin é chamado.
- `dataProvider` permanece `mock`.

## Rollback

Como a Sprint 29 não ativa provider global nem altera HTML/CSS, o rollback é remover os arquivos de canary e scripts adicionados nesta sprint. Se o canary real falhar, manter `dataProvider=mock` e não iniciar canary de escrita.

## Próximo passo

Depois que Sprint 29 passar em local/staging real, o próximo passo possível é um canary de pedidos com criação controlada e idempotência. Esse passo ainda não deve mexer em mensagens, notificações ou carteira.

## Sprint 30 — Orders read-only promotion gate

A Sprint 30 adiciona o gate que decide se o canary read-only de pedidos pode avançar para planejamento manual de escrita. O gate não libera escrita automaticamente; ele apenas valida que o relatório real de leitura existe, foi gerado pelo script correto e não vazou para endpoints fora do escopo.

Comandos seguros:

```bash
npm run audit:orders-readonly-canary-promotion-gate
npm run validate:orders-readonly-canary:promotion-gate:dry-run
npm run validate:orders-readonly-canary:promotion-gate
```

Sem relatório real, o status esperado é:

```txt
blocked_until_real_orders_readonly_canary_report
```

Esse bloqueio é correto. Para exigir falha quando o relatório real estiver ausente:

```bash
DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT=1 npm run validate:orders-readonly-canary:promotion-gate
```

Quando o canary real de leitura for executado em local/staging, gerar:

```bash
npm run validate:orders-readonly-canary:report
```

O relatório padrão esperado é:

```txt
reports/generated/orders-readonly-canary-report.json
```

Critérios do gate:

- `name` do relatório deve ser `orders-readonly-canary`.
- `dryRun` deve ser `false`.
- O ambiente deve ser `local` ou `staging`.
- `DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK=1` deve constar como consentimento de rede.
- `DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE` não pode existir em relatório real.
- `authProvider=api`.
- `dataProvider=mock`.
- `ordersProvider=api-readonly`.
- Nenhum endpoint de escrita de pedidos pode aparecer.
- Nenhum endpoint de mensagens, notificações, carteira, disputas, recibos ou admin pode aparecer.

Status aprovado:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

Esse status permite somente planejamento manual de um canary de escrita com idempotência, rollback e limites explícitos. Ele não autoriza ativar escrita por padrão no frontend.


## Sprint 31 — Orders write canary planning gate

A Sprint 31 não ativa escrita de pedidos. Ela cria apenas o gate que depende do status real:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

Sem esse relatório real, o status correto é:

```txt
blocked_until_real_orders_readonly_promotion_report
```

Comandos:

```bash
npm run audit:orders-write-canary-planning-gate
npm run validate:orders-write-canary:planning-gate:dry-run
npm run validate:orders-write-canary:planning-gate
```

Status aprovado para desenho manual:

```txt
orders_write_canary_ready_for_manual_contract_design
```

Esse status não libera escrita automática. O próximo desenho deve exigir `idempotency_key_required_for_every_mutation`, rollback para `dataProvider=mock` e isolamento total de mensagens, notificações e carteira.
