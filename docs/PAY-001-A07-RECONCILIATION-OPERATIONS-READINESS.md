# PAY-001 A07 — Persistência de reconciliação, scheduler, observabilidade e runbook

## Estado

`repository_only_reconciliation_operations_contract_ready_remote_infrastructure_blocked`

PAY-A07 formaliza a camada operacional que faltava ao contrato de reconciliação financeira. Ele não cria tabelas, não habilita cron, não grava métricas remotamente, não entrega alertas e não concede autoridade monetária.

Em termos operacionais, PAY-A07 não seleciona PSP, não conecta provider, não executa staging e não autoriza produção.

## Causa raiz

PAY-A04 já definiu comparação de snapshots, classificação de divergências, fila de operadores e replay controlado. Entretanto, a fila recebe um `store` abstrato e o repositório ainda não tinha uma especificação única para:

- persistência server-only e otimista;
- claims concorrentes com lease e compare-and-swap;
- scheduler idempotente, sem sobreposição e com backoff;
- outbox transacional de alertas;
- métricas com cardinalidade controlada;
- retenção e evidência sanitizada;
- resposta a incidentes P0–P3;
- autorização one-shot para uma futura prova operacional em staging.

Sem esse contrato, uma implementação poderia criar duplicidade de processamento, expor identificadores financeiros em métricas, enviar alertas antes do commit da fila ou tratar uma divergência como autorização para movimentar dinheiro.

## Contrato do store

O adapter futuro deve declarar `pay-reconciliation-store-v1` e implementar:

- `getByCaseKey`;
- `getById`;
- `insert`;
- `update`;
- `claimDueCases`;
- `renewLease`;
- `completeLease`;
- `appendAuditEvent`;
- `enqueueAlertOutbox`;
- `recordMetricRollup`.

O store será exclusivamente server-side, sem acesso do navegador. Atualizações exigirão revisão esperada e compare-and-swap no banco. Auditoria será append-only e a escrita do alerta deverá ocorrer atomicamente com a alteração da ocorrência financeira.

Raw provider payload, raw card data, e-mail, telefone, CPF, CNPJ, secrets e tokens não podem entrar nas tabelas operacionais ou no payload de observabilidade.

## Lease e scheduler

O scheduler permanece desabilitado. O contrato fixa:

- UTC;
- relógio do banco como autoridade;
- política de sobreposição `deny`;
- lote máximo de 25 casos no baseline;
- lease de 120 segundos;
- heartbeat de 30 segundos;
- até 8 tentativas;
- backoff monotônico com jitter;
- takeover somente após expiração;
- processamento idempotente;
- nenhuma suposição de entrega exactly-once.

O envelope de tick e o lease são determinísticos, mas não executáveis. O repositório apenas descreve o que um executor externo autorizado deverá fazer.

## Métricas

Somente métricas allowlisted podem ser emitidas. Labels permitidos:

- `environment`;
- `severity`;
- `status`;
- `outcome`;
- `operation`.

São proibidos como labels: user ID, actor ID, order ID, payment ID, case ID, intent key, provider intent/event ID, e-mail, telefone, CPF, CNPJ, idempotency key e comparison fingerprint.

Essa regra evita cardinalidade explosiva, vazamento operacional e custos imprevisíveis de telemetria.

## Alert outbox

PAY-A07 especifica apenas uma outbox pendente de entrega. Não existe integração real de e-mail, Slack, SMS, pager ou outro canal.

Cada registro possui dedupe key determinística, prioridade P0–P3, case ID, reason code, fingerprint e contexto sanitizado. O envio direto durante a transação é proibido.

## Runbook

O runbook exige:

1. detecção;
2. contenção;
3. preservação de evidência;
4. verificação no provider;
5. reconciliação;
6. comunicação aprovada ao cliente;
7. recuperação;
8. pós-incidente.

P0 e P1 podem recomendar congelamento da automação financeira, mas o contrato não pode executar esse congelamento. Resolução automática e mutação automática de dinheiro permanecem proibidas.

## Autorização futura de staging

A frase exata será:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A07_RECONCILIATION_OPERATIONS_CANARY_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_operations_canary_only
```

A palavra “Próximo”, uma continuação genérica ou qualquer autorização anterior não autoriza esse canário.

O envelope exige:

- head exato;
- evidence hash SHA-256;
- projeto staging exato;
- IDs imutáveis de migrations;
- scheduler job ID;
- metrics sink ID;
- alert integration ID;
- versão do runbook;
- sandbox ou orçamento máximo zero;
- produção explicitamente negada;
- nonce fresco e one-shot.

Mesmo após validação, o resultado declara `remoteActionsAllowedByThisContract: false` e `repositoryExecutionPerformed: false`. Um executor externo específico e uma autorização ainda válida serão obrigatórios.

## Blockers preservados

- `PAY-B01`: PSP, conta, adapter, credenciais, webhook e conformance real ausentes;
- `PAY-B03`: decisões comerciais, fiscais, escrow, refund, disputa, chargeback e payout ainda pendentes;
- `PAY-B04`: infraestrutura remota, scheduler, sinks, alert delivery, on-call e rehearsal ainda ausentes.

PAY-A07 reduz a ambiguidade do PAY-B04, mas não o fecha.

## Efeitos executados

- leituras de staging: 0;
- mutações de staging: 0;
- migrations aplicadas: 0;
- tabelas criadas: 0;
- jobs criados: 0;
- ticks executados: 0;
- alertas entregues: 0;
- métricas remotas gravadas: 0;
- secrets configurados: 0;
- pagamentos, refunds ou payouts: 0;
- produção: intocada;
- merge: não realizado.

## Próximo

`PAY-A08` deve desenhar as migrations provider-neutral e o plano de canário read-only para store, leases, outbox e observabilidade. Nenhuma migration ou operação remota poderá ser aplicada sem autorização explícita separada.
