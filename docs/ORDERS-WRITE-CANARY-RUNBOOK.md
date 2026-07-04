# Orders write canary runbook — Sprint 31

## Objetivo

A Sprint 31 não ativa escrita de pedidos. Ela cria somente o gate de planejamento para um futuro canary de escrita, condicionado ao canary read-only real de pedidos já aprovado.

O contrato desta sprint é deliberadamente conservador:

```txt
authProvider=api
dataProvider=mock
ordersProvider=api-write-canary-planning
enableNetworkRequests=true
writeActivation=false
```

`ordersProvider=api-write-canary-planning` é um marcador operacional de planejamento. Ele não deve ser usado como provider global ativo no frontend.

## Dependência obrigatória

O planejamento de escrita só pode ser considerado depois que o gate de leitura gerar relatório real com status:

```txt
orders_readonly_canary_ready_for_manual_write_canary_planning
```

Arquivo esperado:

```txt
reports/generated/orders-readonly-canary-promotion-gate-report.json
```

Sem esse relatório, o status correto do novo gate é:

```txt
blocked_until_real_orders_readonly_promotion_report
```

Esse bloqueio é intencional e deve ser tratado como proteção de produção.

## Comandos seguros

```bash
npm run audit:orders-write-canary-planning-gate
npm run validate:orders-write-canary:planning-gate:dry-run
npm run validate:orders-write-canary:planning-gate
```

Para gerar relatório do gate:

```bash
npm run validate:orders-write-canary:planning-gate:report
```

Para exigir falha quando o relatório real de leitura não existir:

```bash
DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION=1 npm run validate:orders-write-canary:planning-gate
```

## Status aprovado

Quando existir relatório real válido de Orders read-only promotion, o gate pode retornar:

```txt
orders_write_canary_ready_for_manual_contract_design
```

Esse status autoriza apenas desenho manual do contrato de escrita. Ele não autoriza ativar escrita, mudar `dataProvider`, nem chamar endpoints mutáveis.

## Endpoints planejados para a próxima etapa

Somente estes endpoints podem entrar no desenho do futuro canary de escrita:

```txt
POST /orders
POST /orders/:id/accept
POST /orders/:id/decline
POST /orders/:id/quote
POST /orders/:id/charge
POST /orders/:id/start
POST /orders/:id/complete
POST /orders/:id/status
```

A Sprint 31 não chama nenhum desses endpoints.

## Domínios bloqueados

A escrita de pedidos não pode liberar outros domínios junto:

```txt
/conversations
/notifications
/wallet
/withdrawals
/disputes
/receipts
/admin
```

Mensagens, notificações, carteira, disputas, recibos e admin precisam de gates próprios.

## Salvaguardas obrigatórias

O futuro canary de escrita só pode ser desenhado se contemplar:

```txt
idempotency_key_required_for_every_mutation
same_key_same_payload_replay_only
same_key_different_payload_conflict
role_scoped_order_write_permissions
domain_isolation_orders_only
rollback_to_dataProvider_mock
write_canary_report_required_before_activation
manual_activation_only
```

Essas regras devem valer para criação de pedido e para todas as ações mutáveis.

## Rollback

O rollback do planejamento é simples: manter `dataProvider=mock`, não criar provider global de escrita e remover apenas os scripts/docs da Sprint 31 se necessário.

O rollback do futuro canary de escrita deve ser mais rígido:

- kill switch para mock;
- limpeza de flags locais;
- relatório de falha;
- nenhuma promoção automática para mensagens/notificações/carteira;
- prova de idempotência replay/conflito antes de qualquer tráfego real.

## Próximo passo

Depois que este gate aprovar com relatório real de read-only promotion, a próxima sprint pode desenhar um harness local de escrita controlada. Ainda assim, essa próxima sprint deve continuar sem ativar escrita no frontend por padrão.

## Sprint 32 — Orders write local harness

A Sprint 32 adiciona um harness local para escrita de pedidos, mas continua sem ativar escrita no frontend e sem liberar staging real.

Contrato operacional:

```txt
writeActivation=false
dataProvider=mock
ordersProvider=api-write-canary-local-runtime
```

Comandos:

```bash
npm run audit:orders-write-canary-local-runtime
npm run validate:orders-write-canary:local-runtime
npm run validate:orders-write-canary:local-runtime:report
```

Status aprovado do harness local:

```txt
orders_write_canary_local_runtime_validated
```

O harness local valida:

- `POST /orders` com `x-idempotency-key` obrigatório;
- replay seguro para mesma chave e mesmo payload;
- `DOKE_IDEMPOTENCY_CONFLICT` para mesma chave com payload diferente;
- bloqueio por role, incluindo cliente proibido de aceitar pedido;
- ações mutáveis de pedido restritas ao domínio `/orders`;
- bloqueio de domínios fora de pedidos, incluindo mensagens, notificações, carteira, disputas, recibos e admin.

A aprovação desse harness não autoriza staging real. Ela apenas prova que o desenho local de escrita está tecnicamente pronto para um futuro gate de staging, que ainda deve depender dos relatórios reais anteriores.

Rollback: manter `writeActivation=false`, `dataProvider=mock` e remover apenas os arquivos da Sprint 32 se necessário.

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
