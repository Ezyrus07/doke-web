# ORD-001-A07E — Remote Concurrent Replay Canary Readiness

## Estado

Readiness concluído. O canário remoto permanece não autorizado e não foi executado.

## Objetivo

Provar no staging que 32 requisições concorrentes com o mesmo timestamp e o mesmo nonce produzem exatamente:

- 1 resposta aceita com HTTP `200` e `runId`;
- 31 respostas rejeitadas com HTTP `409` e `DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED`;
- 0 respostas inesperadas;
- 1 worker run vazio;
- 1 nova linha temporária no nonce ledger;
- 0 pedidos, orçamentos, eventos ou tentativas de entrega criados.

## Pré-requisitos congelados

- projeto: `zwkczgewzbsorbrjuzpb`;
- função: `order-event-worker`;
- versão: `10`;
- status: `ACTIVE`;
- `verify_jwt`: `false`;
- bundle SHA-256: `2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0`;
- A07B, A07C e A07D aplicados;
- Cron ativo em `* * * * *` com `select private.invoke_order_event_worker_if_needed();`;
- domínio sem pedidos, orçamentos, histórico ou eventos pendentes.

## Cenário remoto futuro

As 32 chamadas usarão:

- método `POST`;
- um único `x-doke-worker-issued-at` recente;
- um único `x-doke-worker-nonce` criptograficamente aleatório;
- `x-doke-worker-source: test`;
- o token interno lido do Vault sem exposição;
- corpo `{ "limit": 1 }`.

O executor futuro deverá capturar todas as respostas antes de qualquer cleanup e abortar imediatamente se a versão, o hash, o Cron ou os contadores divergirem do preflight.

## Cleanup obrigatório

A chamada aceita criará um worker run vazio e consumirá um nonce. O cleanup será restrito aos identificadores do próprio canário:

1. obter o `runId` da única resposta HTTP `200`;
2. apagar o worker run somente se:
   - `id` for exatamente o `runId` aceito;
   - `source = 'test'`;
   - `status = 'completed'`;
   - todos os contadores forem zero;
3. apagar somente o nonce cujo hash SHA-256 corresponda ao nonce gerado pelo canário e cujo `source = 'test'`;
4. preservar a linha `source='test'` que já existia antes deste lote;
5. confirmar que os contadores retornaram ao baseline.

O `service_role` não possui `DELETE` em `private.order_event_worker_runs`. Por isso, a remoção do run exigirá SQL privilegiado e condicionado; o executor permanente de readiness não contém essa capacidade.

## Rollback e abort conditions

Não haverá rollback de Edge Function, mudança de Cron ou migration neste canário. O processo deverá abortar antes das chamadas se ocorrer qualquer drift. Se uma resposta inesperada ocorrer, a evidência será preservada e somente as linhas comprovadamente pertencentes ao canário poderão ser removidas.

## Autorização independente

A execução futura exige exatamente:

`I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING`

A frase autorizará somente:

- as 32 chamadas concorrentes descritas;
- a coleta das respostas;
- o cleanup das linhas específicas do canário;
- os pós-checks read-only.

Ela não autorizará deploy, migration, mudança de Cron, Railway, produção ou merge.

## Estado de execução

- chamadas remotas executadas: `0`;
- mutações no staging: `0`;
- cleanup executado: `0`;
- produção alterada: não.
