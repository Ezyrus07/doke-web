# PAY-001 / PAY-A11 — Executor Protocol Manifests and Deterministic Conformance

## Objetivo

O PAY-A11 congela um protocolo **provider-neutral** para os adapters inertes do PAY-A10 e cria um corpus determinístico de **dry-run** para as cinco fases PAY-A09.

Este sublote permanece exclusivamente no repositório. Ele não conecta executor, não configura endpoint, não lê secrets, não acessa banco, não aplica migration e não executa staging ou produção.

## Causa raiz

O PAY-A10 validava dispatch, receipt e evidência, mas ainda não existia um manifesto de protocolo imutável por fase nem um corpus comum capaz de provar que implementações futuras rejeitam a mesma escalada de autoridade.

Sem esse contrato, dois executores poderiam interpretar de forma diferente:

- quais capacidades são permitidas;
- quais campos devem ser vinculados;
- quais status pertencem a cada fase;
- como aplicar stop-on-first-failure;
- o que significa rollback forward-only;
- quais alvos o cleanup pode remover.

## Contratos canônicos

```text
pay-a11-executor-protocol-conformance-v1
pay-reconciliation-executor-protocol-manifest-v1
pay-reconciliation-executor-dry-run-v1
pay-reconciliation-executor-conformance-corpus-v1
pay-reconciliation-executor-conformance-result-v1
```

## Cinco manifests

1. `read_only_preflight` — inspeção de catálogo sem mutação e sem leitura de linhas financeiras ou pessoais.
2. `migration_application` — validação de ordem, execução única e **stop-on-first-failure**, sem SQL manual.
3. `post_migration_verification` — inspeção read-only, sem auto-repair.
4. `rollback` — somente migration corretiva revisada e **forward-only**, sem down migration destrutiva.
5. `cleanup` — somente temporary authorization envelope, executor workspace, canary evidence e CI artifact; database rows, migration history e secrets permanecem proibidos.

Cada manifesto é determinístico, possui fingerprint SHA-256 e declara:

```text
providerNeutral: true
dryRunOnly: true
transportConfigured: false
credentialsConfigured: false
endpointConfigured: false
networkAllowed: false
databaseConnectionAllowed: false
subprocessAllowed: false
environmentReadAllowed: false
rawSqlAllowed: false
productionAllowed: false
directMoneyMutationAllowed: false
providerOperationAllowed: false
automaticNextPhaseAllowed: false
```

## Corpus determinístico

O corpus contém **35 casos**:

- 5 casos positivos, um para cada fase;
- 30 casos negativos cobrindo transporte, credenciais, endpoint, rede, conexão de banco, subprocesso, environment, raw SQL, produção, movimentação financeira, operação de provider, avanço automático de fase, drift de capability, políticas por fase, fingerprint, receipt, evidência e replay.

Todos os casos usam clock fixo e head sintético fixo. Não existe dependência de hora corrente, rede, banco ou ambiente do runner.

## Reuso de PAY-A10

O PAY-A11 não cria uma segunda implementação de receipt/evidence. O corpus chama diretamente:

- `validateExecutorReceipt`;
- `ingestExecutionEvidence`;
- proteção contra receipt replay;
- proteção contra evidence replay;
- binding de head, manifest, resource plan, dispatch, executor e plan fingerprint.

## Segurança operacional

- staging reads: `0`;
- staging mutations: `0`;
- migrations aplicadas: `0`;
- network requests: `0`;
- database connections: `0`;
- subprocesses: `0`;
- environment reads: `0`;
- dispatches remotos: `0`;
- receipts remotos: `0`;
- evidências remotas: `0`;
- pagamentos, refunds ou payouts: `0`;
- produção: intocada;
- merge e auto-merge: `0`.

O comando genérico `Próximo` não autoriza nenhuma fase PAY-A09 e nenhum manifesto do PAY-A11 contém autoridade remota.

## Blockers preservados

- `PAY-B01` — PSP, conta, adapter específico, credenciais, webhook e conformance real ausentes.
- `PAY-B03` — decisões comerciais, fiscais, escrow, refund, disputa, chargeback e payout não aprovadas materialmente.
- `PAY-B04` — store remoto, migrations aplicadas, scheduler, métricas, alertas, on-call e rehearsal de staging ausentes.

## Próximo sublote

`PAY-A12` — definir trust roots do executor, verificação offline de assinatura destacada, rotação e revogação de chaves para receipts, ainda repository-only.
