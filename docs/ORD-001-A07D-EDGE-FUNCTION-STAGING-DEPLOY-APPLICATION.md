# ORD-A07D — Edge Function Staging Deploy Application

## Status

`edge_function_staging_deploy_applied_and_verified`

The exact authorization was received:

`I_EXPLICITLY_AUTHORIZE_ORD_A07D_ORDER_EVENT_WORKER_EDGE_FUNCTION_DEPLOY_ON_DOKE_STAGING`

Its scope was limited to deploying the six frozen `order-event-worker` files to Doke staging with `verify_jwt: false`, followed by controlled verification. It did not authorize the remote replay canary, Railway, production, or merge.

## Deployment

- Project: `zwkczgewzbsorbrjuzpb`
- Function: `order-event-worker`
- Previous version: `9`
- Deployed version: `10`
- Status: `ACTIVE`
- Previous bundle SHA-256: `5b4594aaf6f259928e2f27e5f920c616f9baff42a1702b3ba8bc87649c221852`
- Deployed bundle SHA-256: `2f480553c636b96a061e66fcb3a6ddaf06d458459c898f215e2472ff2d8a4dc0`
- `verify_jwt` before and after: `false`
- Entrypoint: `index.ts`
- Import map: `deno.json`

## Frozen bundle

- `index.ts`: `8a6f5c8f19b3584b99fda36782822cebfb5d2ec7`
- `worker.mjs`: `7431069105336ac0c793ea0787e75ae28ac40177`
- `invocation-gate.mjs`: `acf432f2f2566fa2bfaa0c2d62d83e45530055a6`
- `invocation-freshness.mjs`: `1085f1037be53e2b7f3ceffa130bfd06afe60065`
- `invocation-headers.mjs`: `95c9bc4271ce136b65a280847f7b160b0497b26e`
- `deno.json`: `969d2d4b384780250105a21b1939a95e60210918`

The dependency remains pinned to `npm:@supabase/supabase-js@2.110.0`.

## Runtime verification

Two non-domain HTTP probes were sent through staging `pg_net`:

1. An invalid worker token returned HTTP `401` with `WORKER_AUTH_REQUIRED`.
2. The valid worker token without issued-at and nonce returned HTTP `428` with `DOKE_ORDER_EVENT_WORKER_FRESHNESS_REQUIRED`.

The valid token was read inside Postgres from Vault and was not returned or disclosed.

The probes created only the normal `pg_net` request/response records. They did not start another worker run, consume another nonce, claim events, or mutate order-domain rows.

## Integrity checks

The Cron job remained:

- active: `true`;
- schedule: `* * * * *`;
- command: `select private.invoke_order_event_worker_if_needed();`.

Before and after deployment:

- orders: `0`;
- budgets: `0`;
- status history: `0`;
- domain events: `0`;
- metric events: `0`;
- delivery attempts: `0`;
- worker runs: `1`;
- nonce-ledger rows: `1`.

A07B ledger and consume RPC remain present.

## Still blocked

- remote concurrent replay canary;
- Railway selection or deployment;
- production changes;
- pull request merge.
