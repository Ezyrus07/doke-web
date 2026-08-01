# SCHED-001 B04B — ORD Canonical Wiring Implementation

## Objetivo

Implementar no repositório o contrato congelado em `SCHED-B04A`, ainda sem ativar frontend, staging, produção, Cron, workers ou deploy.

A autoridade permanece:

- `orders.schedule_reservation_id`: referência canônica;
- `orders.scheduled_at`: projeção temporal;
- `orders.status = scheduled`: projeção de estado produzida exclusivamente pela confirmação de uma reserva.

## Read model de pedidos

`orders-service.js` passa a selecionar e expor:

- `scheduleReservationId`;
- `scheduledAt`;
- `scheduleAuthority`;
- `hasCanonicalSchedule`.

Uma agenda só é classificada como canônica quando referência e horário existem juntos. Horário legado sem reserva, ou reserva sem horário, é classificado como `incomplete_projection`.

## Criação de pedido

O backend não encaminha mais horário do consumidor para `p_scheduled_at`.

Quando o cliente informa um horário desejado, o valor é normalizado e armazenado somente como:

```json
{
  "schedulePreference": {
    "requestedAt": "2026-08-03T12:00:00.000Z",
    "authority": "client_intent"
  }
}
```

Campos que tentem forjar `schedule_reservation_id`, `scheduleReservationId`, `scheduleAuthority` ou projeções equivalentes são removidos da metadata.

## Estado `scheduled`

A máquina de estados de ORD não permite mais transições genéricas para `scheduled`, nem para profissional nem para suporte/admin.

A única escrita legítima passa pela transação de SCHED:

1. a reserva deve estar apta à confirmação;
2. o pedido deve estar `accepted` ou já `scheduled` no caso de replay/reagendamento;
3. a reserva é confirmada ou reagendada;
4. `schedule_reservation_id`, `scheduled_at` e `status = scheduled` são projetados na mesma transação;
5. qualquer falha provoca rollback integral.

## Cancelamento da reserva

Ao cancelar a reserva:

- a referência e o horário são limpos;
- o `schedule_reservation_id` deve corresponder exatamente à reserva cancelada;
- um pedido em `scheduled` retorna para `accepted`;
- o pedido não é implicitamente cancelado.

Cancelamento genérico de pedido com reserva canônica vinculada falha fechado e exige a futura composição ORD/SCHED.

## Início do atendimento

Quando o pedido possui reserva canônica, o início do atendimento exige uma autoridade server-side capaz de resolver a reserva.

A guarda valida:

- ID da reserva;
- vínculo com o pedido;
- status `confirmed`;
- igualdade entre `reservation.starts_at` e `orders.scheduled_at`.

Sem essa autoridade, com reserva inexistente, não confirmada ou divergente, o início falha antes da transição de ORD.

## Segurança

Este sublote não executa:

- acesso a staging;
- migration;
- Supabase CLI;
- `psql`;
- deploy;
- conexão do frontend;
- Cron ou workers;
- produção;
- merge.

O workflow permanente usa apenas `contents: read`.

## Estado após B04B

`SCHED-B04` e `ORD-B04` permanecem abertos porque ainda falta validar a composição autenticada em staging e conectar a autoridade server-side ao runtime efetivo.

## Próximo gate

`SCHED-B04C — authenticated ORD/SCHED composition canary readiness`.

Esse gate deverá preparar um canário transacional com rollback, sem promover produção e sem executar mutações persistentes sem autorização separada.
