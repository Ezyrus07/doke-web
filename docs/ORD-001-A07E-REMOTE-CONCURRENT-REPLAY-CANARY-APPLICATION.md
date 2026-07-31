# ORD-001 A07E — Remote Concurrent Replay Canary Application

## Authorization

The exact staging-only phrase was received:

`I_EXPLICITLY_AUTHORIZE_ORD_A07E_REMOTE_CONCURRENT_REPLAY_CANARY_ON_DOKE_STAGING`

The authorization did not include deploys, migrations, Cron changes, Railway, production or merge.

## Remote scenario

The canary sent 32 `POST` requests through staging `pg_net` to `order-event-worker` version 10. Every request used the same 13-digit issued-at value, the same 32-character URL-safe nonce, `source=test` and `{ "limit": 1 }`.

## Result

The runtime result matched the required atomicity contract exactly:

- 32 responses received;
- 1 HTTP 200 acceptance;
- 31 HTTP 409 replay rejections;
- every rejection returned `DOKE_ORDER_EVENT_WORKER_REPLAY_REJECTED`;
- zero timeouts;
- zero transport errors;
- zero unexpected responses.

The accepted request returned run ID `c461950e-44a4-425b-bafc-cb2e99811cdb`. It completed with zero claimed, completed, failed and dead-letter events.

## Cleanup and nonce expiry behavior

The accepted empty test run was deleted only after verifying its exact ID, `source=test`, `status=completed`, zero counters and absence of delivery attempts.

The nonce cleanup plan required deleting the canary nonce while preserving the preexisting test nonce. During the accepted invocation, the canonical consume RPC automatically removed the old expired test nonce before inserting the canary nonce. The ledger therefore remained at one row instead of temporarily increasing to two.

Deleting the canary nonce would have reduced the ledger below the one-row baseline. The safe resolution was to retain the canary nonce row, whose `expires_at` is `2026-07-31T02:10:16.114+00:00`, while deleting the worker run. This preserves the expected ledger and test-row counts without recreating or fabricating data.

## Post-cleanup integrity

- orders: 0;
- budgets: 0;
- order history: 0;
- domain events: 0;
- metric events: 0;
- delivery attempts: 0;
- worker runs: 1;
- test worker runs: 0;
- nonce ledger rows: 1;
- test nonce rows: 1.

Cron remains active with schedule `* * * * *` and command `select private.invoke_order_event_worker_if_needed();`.

## Conclusion

The staging Edge Function proved real concurrent single-use nonce enforcement: exactly one request crossed the freshness gate and all 31 duplicates were rejected before creating additional worker runs or claiming events.

Production, Railway and PR merge remain blocked.
