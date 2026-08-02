# SCHED-001 C01C — Deterministic frontend schedule presentation

## Objective

Use one pure, read-only presenter for the canonical schedule tuple across the order card, the order detail drawer and message order summaries.

## Authority

The presenter derives one of four states from the order DTO:

- `canonical_confirmed`: `scheduleReservationId`, `scheduledAt` and `status = scheduled` are all present;
- `incomplete_projection`: any canonical fragment exists without the complete tuple;
- `client_intent`: the client supplied a desired date or shift without canonical confirmation;
- `none`: only advertised professional availability, or no schedule information, exists.

A `scheduleAuthority` metadata claim cannot manufacture `canonical_confirmed`.

## Presentation

- `canonical_confirmed` → **Horário confirmado** and read-only badge **Agendado**;
- `client_intent` → **Horário solicitado**;
- `incomplete_projection` → **Sincronização da agenda pendente** and no confirmed time;
- `none` → **Disponibilidade do profissional**.

The existing C01B compatibility labels remain available on the order card:

- `Agendado:`;
- `Data desejada:`;
- `Agenda indisponível: atualize o pedido`;
- `Disponibilidade do anúncio:`.

## Consumers

- `assets/js/pages/pedidos-local-orders.js`;
- `assets/js/pages/pedidos/orders-data.js`;
- `assets/js/pages/pedidos/orders-details.js`;
- `assets/js/pages/mensagens.js`;
- `pedidos.html`;
- `mensagens.html`.

## Safety boundary

This sublot performs repository-only frontend presentation work.

- remote scheduling commands activated: `0`;
- optimistic canonical writes added: `0`;
- Supabase access: `0`;
- migrations: `0`;
- deploys: `0`;
- Cron or workers: `0`;
- production changes: `0`;
- merge or auto-merge: `0`.

## Next action

`SCHED-C01D` must remain independently authorized and read-only: an authenticated browser canary may verify presentation, but cannot confirm, reschedule or cancel a reservation.
