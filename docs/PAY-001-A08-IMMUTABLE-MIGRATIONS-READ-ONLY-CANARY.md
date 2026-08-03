# PAY-001 / PAY-A08 — Migrations imutáveis e canário read-only

## Objetivo

Congelar quatro migrations provider-neutral por SHA-256 e definir um canário de staging estritamente de leitura. Este sublote **não aplica SQL**, não cria tabela remota, não habilita scheduler e não concede autoridade financeira.

## Causa raiz

PAY-A07 definiu store, leases, alert outbox e observabilidade, mas a implementação física ainda não possuía fontes SQL imutáveis nem uma separação verificável entre:

1. inspeção do schema;
2. aplicação de migration;
3. validação pós-migration;
4. rollback por migration forward-only.

Sem essa separação, uma verificação poderia adquirir DDL/DML ou tentar corrigir drift automaticamente.

## Manifesto

Versão: `pay-reconciliation-migration-manifest-v1`

Hash canônico:

```text
bb219a05ea58139508d8bfe7c5f1e3f7d3ce7953953bb199bbd2bcbd9812d032
```

| Ordem | Migration | SHA-256 |
|---:|---|---|
| 1 | `supabase/migrations/20260803190000_pay_a08_reconciliation_cases_audit.sql` | `fb1583f99bfd70ae046e0e807805f64932a39e55a4d098825a3d7d92198e5856` |
| 2 | `supabase/migrations/20260803190100_pay_a08_reconciliation_leases.sql` | `41ba591c39c4634d07ffe4b29748cccc3f2a1ebf95d11d043edb4c932ad0dd7f` |
| 3 | `supabase/migrations/20260803190200_pay_a08_reconciliation_alert_outbox.sql` | `9282cefaaffa9f3daccf736afa07c50d87f127d06d10c67fff470b7e316908eb` |
| 4 | `supabase/migrations/20260803190300_pay_a08_reconciliation_metric_rollups.sql` | `c20e3e61af73a2bde263c3dc3f9f2fdd10a736b827b9b1c6606bdea5af55672a` |

Cada byte é imutável. Renomear, reordenar ou editar qualquer fonte invalida o manifesto. Rollback só poderá ocorrer por migration forward-only revisada; apagar migration history manualmente é proibido.

## Boundary do banco

- schema privado `private`;
- browser, `anon` e `authenticated` sem grants;
- RLS habilitada;
- raw provider payload e dados de cartão proibidos;
- mutação direta de dinheiro proibida;
- resolução automática proibida;
- nenhuma tabela ou função remota foi criada neste sublote.

## Canário read-only

O scanner aceita somente `SELECT` contra relações de introspecção allowlisted:

- `pg_catalog`;
- `information_schema`;
- `supabase_migrations.schema_migrations`.

Ele rejeita DDL, DML, RPC, `CALL`, `DO`, `COPY`, grants, extensions, triggers, Cron, `pg_net`, HTTP, scheduler e leituras de linhas financeiras. Schema ausente ou divergente gera bloqueio; **não existe auto-repair**.

## Evidência

A evidência futura será sanitizada e poderá conter apenas:

- compatibilidade booleana;
- contagens agregadas de objetos, constraints e índices;
- head exato;
- manifest hash;
- timestamp.

UUIDs de usuário, pedido, pagamento, PSP, valores, e-mail, telefone, CPF, CNPJ, payloads e secrets são proibidos.

## Autorização futura

Frase exata:

```text
I_EXPLICITLY_AUTHORIZE_PAY_A08_READ_ONLY_RECONCILIATION_CANARY_ON_DOKE_STAGING
```

Escopo:

```text
reconciliation_schema_read_only_canary_only
```

A autorização deverá ser one-shot, fresca por no máximo 900 segundos e vinculada ao head, manifesto, evidence hash e projeto staging. `Próximo`, autorização anterior ou paráfrase não autorizam staging.

Mesmo com envelope válido, este repositório continua declarando:

```text
remoteExecutionAllowedByThisContract: false
repositoryExecutionPerformed: false
```

## Blockers

- `PAY-B01`: PSP, conta, adapter, credenciais, webhook e conformance real ausentes.
- `PAY-B03`: regras comerciais, fiscais, escrow, refund, disputa, chargeback e payout sem aprovação material.
- `PAY-B04`: migrations ainda não aplicadas; store, scheduler, metrics sink, alert delivery, on-call e rehearsal remoto ausentes.

## Próximo

`PAY-A09` deverá separar formalmente a autorização de inspeção read-only da autorização de aplicação das migrations. Nenhuma delas será inferida de continuação genérica.
