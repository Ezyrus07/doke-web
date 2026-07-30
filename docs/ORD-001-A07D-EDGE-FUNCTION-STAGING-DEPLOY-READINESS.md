# ORD-A07D — Edge Function Staging Deploy Readiness

## Status

`edge_function_staging_deploy_readiness_complete_deploy_unauthorized`

The repository bundle for `order-event-worker` is frozen by Git blob SHA. No Edge Function was deployed in this lot.

## Frozen bundle

- `index.ts`: `8a6f5c8f19b3584b99fda36782822cebfb5d2ec7`
- `worker.mjs`: `7431069105336ac0c793ea0787e75ae28ac40177`
- `invocation-gate.mjs`: `acf432f2f2566fa2bfaa0c2d62d83e45530055a6`
- `invocation-freshness.mjs`: `1085f1037be53e2b7f3ceffa130bfd06afe60065`
- `invocation-headers.mjs`: `95c9bc4271ce136b65a280847f7b160b0497b26e`

## Security ordering

The worker verifies the token before freshness, consumes the nonce before creating a worker run, and only then claims events. The nonce is not persisted in worker-run metadata; issued-at and age are retained for auditability.

A07B and A07C are already applied in Doke staging. The Cron schedule and command are outside this deploy scope.

## Exact authorization

A future deploy requires exactly:

`I_EXPLICITLY_AUTHORIZE_ORD_A07D_ORDER_EVENT_WORKER_EDGE_FUNCTION_DEPLOY_ON_DOKE_STAGING`

This phrase authorizes only deployment of the frozen `order-event-worker` bundle to Doke staging and read-only post-deploy verification. It does not authorize a remote replay canary, production, Railway, or merge.

## Required post-deploy checks

- function exists in staging;
- deployed bundle matches the frozen repository bundle;
- JWT configuration is preserved;
- required runtime secrets are available without disclosure;
- invalid token returns 401;
- missing freshness returns 428;
- Cron schedule and command remain unchanged;
- order-domain counters remain unchanged.
