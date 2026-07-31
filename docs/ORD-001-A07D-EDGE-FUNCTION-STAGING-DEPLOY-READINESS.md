# ORD-A07D — Edge Function Staging Deploy Readiness

## Status

`edge_function_staging_deploy_readiness_complete_deploy_unauthorized`

The repository bundle for `order-event-worker` is frozen by Git blob SHA. No Edge Function was deployed in this lot.

## Current staging function

Read-only inspection confirmed:

- function: `order-event-worker`;
- deployed version: `9`;
- status: `ACTIVE`;
- `verify_jwt`: `false`;
- deployed bundle SHA-256: `5b4594aaf6f259928e2f27e5f920c616f9baff42a1702b3ba8bc87649c221852`.

`verify_jwt` must remain `false` during this deploy because the private Cron authenticates with `x-doke-worker-token` and does not send an Authorization JWT. Changing it to `true` would break the Cron invocation path.

## Frozen bundle

- `index.ts`: `8a6f5c8f19b3584b99fda36782822cebfb5d2ec7`
- `worker.mjs`: `7431069105336ac0c793ea0787e75ae28ac40177`
- `invocation-gate.mjs`: `acf432f2f2566fa2bfaa0c2d62d83e45530055a6`
- `invocation-freshness.mjs`: `1085f1037be53e2b7f3ceffa130bfd06afe60065`
- `invocation-headers.mjs`: `95c9bc4271ce136b65a280847f7b160b0497b26e`
- `deno.json`: `969d2d4b384780250105a21b1939a95e60210918`

The import map pins `@supabase/supabase-js` to `npm:@supabase/supabase-js@2.110.0`.

## Security ordering

The worker verifies the token before freshness, consumes the nonce before creating a worker run, and only then claims events. The nonce is not persisted in worker-run metadata; issued-at and age are retained for auditability.

A07B and A07C are already applied in Doke staging. The Cron schedule and command are outside this deploy scope.

## Exact authorization

A future deploy requires exactly:

`I_EXPLICITLY_AUTHORIZE_ORD_A07D_ORDER_EVENT_WORKER_EDGE_FUNCTION_DEPLOY_ON_DOKE_STAGING`

This phrase authorizes only deployment of the six frozen `order-event-worker` files to Doke staging with `verify_jwt: false`, followed by read-only post-deploy verification. It does not authorize a remote replay canary, production, Railway, or merge.

## Required post-deploy checks

- function remains active in staging;
- deployed version increments from version 9;
- deployed files match the frozen repository bundle;
- `verify_jwt` remains `false`;
- required built-in runtime secrets are available without disclosure;
- invalid token returns 401;
- missing freshness returns 428;
- Cron schedule and command remain unchanged;
- order-domain counters remain unchanged.
