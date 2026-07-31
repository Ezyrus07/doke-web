# SCHED-001 — A09 Staging Reconciliation

## Resultado

O histórico direcionado das migrations de SCHED-001 foi reconciliado pelo Supabase CLI oficial e o canário remoto passou em uma única transação terminada em `ROLLBACK`.

## Histórico canônico

- `20260731123000`: aplicada.
- `20260731151000`: aplicada.
- `20260731141315`: revertida.
- `20260731141349`: revertida.
- Nenhuma edição manual de `supabase_migrations.schema_migrations`.

## Evidência do canário

Foram validados bloqueio de sobreposição, aceitação de reservas adjacentes, fallback DST, unicidade de idempotência, unicidade de eventos e projeção da reserva no pedido. O fixture usa um serviço publicado com versão aprovada, em conformidade com a autoridade canônica atual de pedidos.

## Rollback e resíduos

Após o `ROLLBACK`, todas as contagens canary permaneceram em zero: regras, reservas, idempotência, eventos, pedidos vinculados a reservas e pedidos marcados como SCHED-A07.

## Transição da matriz

- Matriz: `1.3.49` → `1.3.50`.
- Maturidade SCHED: `2` → `3`.
- `SCHED-B03`: encerrado.
- `SCHED-B02` e `SCHED-B04`: permanecem abertos.
- Autoridade server-side: `partial`.
- Evidência: `staging_canary`.
- Produção: `blocked`.

## Limites preservados

Nenhum runtime foi ativado. ORD-001 não foi conectado. Nenhum Cron, worker, deploy, acesso à produção ou merge foi realizado.
