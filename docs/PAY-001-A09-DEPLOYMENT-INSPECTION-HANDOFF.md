# PAY-001 / PAY-A09 — Handoff de implantação e inspeção remota

## Objetivo

O PAY-A09 formaliza a passagem entre os contratos repository-only do PAY-A08 e um futuro executor externo autorizado. Ele não acessa staging, não aplica migrations e não concede autoridade financeira ao repositório.

A causa raiz era a ausência de separação formal entre cinco ações materialmente diferentes:

1. inspecionar o schema em modo read-only;
2. aplicar o conjunto imutável de migrations;
3. verificar o estado após a aplicação;
4. executar uma correção forward-only quando a verificação falhar;
5. remover apenas artefatos temporários do executor.

Sem essa separação, uma autorização de leitura poderia ser interpretada como autorização de escrita, um recibo de aplicação poderia substituir a verificação pós-migration, ou um rollback poderia degradar para exclusão manual do histórico.

## Dependência imutável do PAY-A08

O handoff está vinculado ao manifesto PAY-A08:

```text
bb219a05ea58139508d8bfe7c5f1e3f7d3ce7953953bb199bbd2bcbd9812d032
```

As quatro fontes continuam provider-neutral, ordenadas, unapplied e protegidas por SHA-256. O PAY-A09 não altera seus bytes nem cria uma segunda autoridade de migration.

## Regra comum das autorizações

Cada fase exige um envelope próprio com:

- frase e escopo exatos;
- head Git exato;
- manifest hash;
- resource plan hash;
- evidence hash;
- identidade exata do projeto staging;
- aprovação explícita por papéis distintos;
- nonce one-shot;
- validade máxima de 900 segundos;
- `environment: staging`;
- `production: false`.

`Próximo`, paráfrases, autorizações anteriores ou a frase de outra fase são rejeitados. O mesmo nonce não pode ser reutilizado em outra operação.

Em todas as fases:

```text
externalAuthorizedExecutorRequired: true
remoteExecutionAllowedByThisContract: false
repositoryExecutionPerformed: false
productionAllowed: false
directMoneyMutationAllowed: false
```

## Fase 1 — preflight read-only

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A09_READ_ONLY_PREFLIGHT_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_schema_read_only_preflight_only
```

A autorização permite somente a preparação de um plano de introspecção já hash-pinned. Ela não autoriza leitura de linhas financeiras ou pessoais, DDL, DML, RPC, migration, scheduler ou auto-repair.

Aprovações obrigatórias:

- `database_owner`;
- `security_reviewer`.

## Fase 2 — aplicação das migrations

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A09_RECONCILIATION_MIGRATION_APPLICATION_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_migration_application_only
```

A aplicação exige:

- evidência de preflight `compatible`;
- conjunto exato de quatro migration IDs;
- migration set hash;
- ordem imutável;
- modo `ordered_once_fail_closed`;
- parada na primeira falha;
- post-verification plan hash;
- rollback plan hash;
- cleanup plan hash.

SQL manual e edição manual de `supabase_migrations.schema_migrations` são proibidos.

Aprovações obrigatórias:

- `database_owner`;
- `operations_owner`;
- `security_reviewer`.

O contrato valida o handoff, mas não contém credencial, cliente Supabase, comando de aplicação ou autoridade de rede.

## Fase 3 — verificação pós-migration

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A09_POST_MIGRATION_VERIFICATION_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_post_migration_read_only_verification_only
```

A verificação exige um application receipt hash e status `applied`. Ela volta ao boundary read-only do PAY-A08 e não pode reparar drift automaticamente.

Aprovações obrigatórias:

- `database_owner`;
- `operations_owner`.

## Fase 4 — rollback forward-only

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A09_FORWARD_ONLY_ROLLBACK_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_forward_only_rollback_only
```

Rollback só pode ser preparado quando a verificação resultar em `failed`, `incompatible` ou `partial` e deve usar:

```text
forward_only_reviewed_migration
```

São proibidos:

- down migration destrutiva;
- exclusão manual do histórico;
- exclusão de dados;
- rollback automático;
- improvisação de SQL durante o incidente.

Aprovações obrigatórias:

- `database_owner`;
- `incident_commander`;
- `security_reviewer`.

## Fase 5 — cleanup de artefatos temporários

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A09_TEMPORARY_ARTIFACT_CLEANUP
```

Escopo:

```text
reconciliation_temporary_artifact_cleanup_only
```

Targets permitidos:

- `temporary_authorization_envelope`;
- `temporary_executor_workspace`;
- `temporary_canary_evidence`;
- `temporary_ci_artifact`.

Cleanup não pode apagar linhas do banco, histórico de migrations, secrets, dados de domínio, pagamentos, refunds ou payouts.

## Evidência sanitizada

A evidência allowlisted contém apenas:

- operação e status;
- hashes de head, manifesto, plano, fingerprint e recibo;
- contagens agregadas;
- compatibilidade de schema e histórico;
- flags de rollback e cleanup;
- timestamp.

São proibidos IDs de usuários, pedidos, pagamentos, PSP payloads, valores financeiros, e-mails, telefones, CPF/CNPJ, tokens e secrets.

## Estado de segurança

O PAY-A09 foi concluído somente no repositório:

- network requests: 0;
- staging reads: 0;
- staging mutations: 0;
- migrations aplicadas: 0;
- verificações remotas: 0;
- rollback migrations aplicadas: 0;
- artefatos remotos removidos: 0;
- linhas ou histórico apagados: 0;
- pagamentos, refunds ou payouts: 0;
- produção: intocada;
- merge: não executado.

## Blockers preservados

- `PAY-B01`: PSP, conta, adapter, credenciais, webhook e conformance real ausentes;
- `PAY-B03`: decisões comerciais, fiscais, escrow, refund, disputa, chargeback e payout ainda não aprovadas;
- `PAY-B04`: migrations ainda não aplicadas e store, leases, scheduler, métricas, alertas, on-call e rehearsal remoto ainda ausentes.

## Impacto no site

Nenhuma tela ou comportamento financeiro foi ativado. O ganho é operacional: uma futura implantação não poderá avançar de leitura para escrita, de aplicação para verificação, ou de falha para rollback sem uma autorização nova e específica.

## Próximo sublote

`PAY-A10` — construir adapters inertes para um executor externo e para ingestão de evidência das cinco fases. O trabalho deve continuar repository-only; staging permanece bloqueado até uma autorização exata e fresca da fase correspondente.
