# ANA-001 — Synthetic Staging Canary

This runner is the executable staging proof for ANA-001 after the prepared migrations and Edge Functions have been explicitly activated in staging.

It is not run by CI. CI executes only static audit, conformance and dry-run modes.

## Required fixtures

The operator supplies synthetic client/professional credentials plus known staging-only service and order IDs. Email identities must be visibly synthetic (`@doke.local`, `@doke.test` or a canary-tagged address).

The canary does not provision or delete identities, services or orders. It consumes controlled fixtures created by the staging setup process.

## Cases

The runner verifies:

- authenticated client and professional login;
- signed analytics session;
- search exposure proof issuance;
- accepted impression;
- exact replay identity;
- payload-drift conflict;
- tampered proof rejection;
- signed quote session and structural progress;
- submitted quote linked to the synthetic client's real order;
- professional self-view exclusion;
- A04 order-health projection;
- A05 ORD reconciliation;
- append-only metric snapshot followed by deterministic `NO_CHANGE`.

No payment mutation is performed.

## Safety

Execution requires all of the following:

- `DOKE_ENVIRONMENT=staging`;
- a Supabase URL whose host exactly matches `DOKE_SUPABASE_PROJECT_REF`;
- synthetic fixture identities;
- explicit fixture IDs and a bounded canary window;
- `DOKE_ANA_STAGING_CANARY_CONFIRM=execute-ana-staging-canary`.

The direct canary additionally requires the browser flag to remain `analyticsEnabled:false`. Production-like targets are rejected.

Reports, when requested, are written only under `reports/generated/ana-001-staging-canary.json` and never contain passwords, service keys, access tokens or raw emails.
