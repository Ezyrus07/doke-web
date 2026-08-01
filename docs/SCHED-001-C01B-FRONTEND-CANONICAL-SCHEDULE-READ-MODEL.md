# SCHED-001 / C01B — Frontend canonical schedule read model

## Objective

Implement the browser read model for canonical scheduling without activating any remote scheduling command.

The browser may present server-owned scheduling state, but it may not create, confirm, reschedule, cancel or repair a canonical reservation.

## Canonical projection

A confirmed booking requires the complete tuple:

- `orders.schedule_reservation_id` is present;
- `orders.scheduled_at` is present;
- `orders.status = scheduled`;
- the server has already guaranteed that the referenced confirmed reservation belongs to the order.

The frontend derives:

- `scheduleReservationId`;
- `scheduledAt`;
- `scheduleAuthority`;
- `hasCanonicalSchedule`.

Authority values are `none`, `client_intent`, `canonical_confirmed` and `incomplete_projection`.

## Fail-closed behavior

Any partial projection is rendered as `Agenda indisponível: atualize o pedido`.

The browser does not infer a confirmed booking from a date alone, does not trust metadata for canonical reservation fields and does not perform compensating writes.

An invalid canonical timestamp also fails closed in presentation.

## Surface behavior

The orders card distinguishes four cases:

- `Agendado:` for a complete canonical projection;
- `Data desejada:` for client intent submitted by the quote form;
- `Agenda indisponível: atualize o pedido` for an incomplete projection;
- `Disponibilidade do anúncio:` for the professional's advertised availability when no order schedule exists.

The canonical reservation reference, timestamp and authority are exposed only as read-only DOM dataset values for downstream detail presentation.

## Command boundary preserved

No generic `scheduled` transition or browser scheduling endpoint is added.

The quote form continues to submit `desiredDate` only as client intent. It does not submit `scheduleReservationId` or `scheduledAt`.

## Scope and safety

- staging reads: `0`;
- staging mutations: `0`;
- migrations: `0`;
- deployments: `0`;
- remote scheduling commands activated: `0`;
- Cron or workers activated: `0`;
- production access: `0`;
- merge or auto-merge: `0`.

## Next sublot

`SCHED-C01C` adds deterministic browser presentation coverage for canonical, intent and incomplete states and verifies the same read model in order detail and message summaries. Remote scheduling commands remain disabled.
