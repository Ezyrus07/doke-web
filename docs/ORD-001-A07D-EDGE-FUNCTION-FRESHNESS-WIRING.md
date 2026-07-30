# ORD-A07D — Edge Function Freshness Wiring

## Objective

Wire the repository version of `order-event-worker` so that a valid internal token alone is no longer sufficient to start a worker run. The request must also carry a fresh timestamp and a single-use nonce, and the nonce must be consumed atomically before any worker run or event claim begins.

## Mandatory order

1. Verify `x-doke-worker-token`.
2. Read `x-doke-worker-issued-at`, `x-doke-worker-nonce` and `x-doke-worker-source`.
3. Validate timestamp, nonce format and freshness window.
4. Call `consume_order_event_worker_invocation_nonce` through the service-role client.
5. Start `begin_order_event_worker_run` only after successful consumption.
6. Claim order events only after the worker run exists.

## Fail-closed responses

- Missing, invalid, expired or future freshness envelope: HTTP 428 with `DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED`.
- Nonce ledger unavailable or RPC failure: HTTP 428 with `DOKE_ORDER_EVENT_WORKER_NONCE_LEDGER_UNAVAILABLE`.
- Previously consumed nonce: HTTP 409 with `DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED`.

The nonce is never copied into worker-run metadata or logs. Only the issued-at value and calculated age may be recorded for operational diagnosis.

## Local implementation

The composition is isolated in `invocation-gate.mjs`, while `index.ts` supplies the Supabase RPC adapter. This keeps freshness validation deterministic and testable without a network connection.

## Activation boundary

Repository wiring is complete, but staging activation remains pending. No Edge Function was deployed, no Cron function was changed, and neither ORD-A07B nor ORD-A07C was applied to staging.

Safe activation order remains:

1. Apply and verify ORD-A07B nonce ledger under its explicit authorization.
2. Apply ORD-A07C Cron header generation under a separate authorization.
3. Deploy the repository-wired Edge Function through the controlled staging release.
4. Run the concurrent replay canary.

Production remains blocked.
