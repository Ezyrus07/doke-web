# ANA-001 — Staging Activation Readiness

This gate prepares ANA-001 for a future controlled staging canary without performing any remote operation.

## Safety model

The planner supports only `--dry-run` and `--check-env`. `--execute` is intentionally rejected. Generic continuation such as “prossiga” is not staging authorization.

A staging environment must provide:

- `DOKE_ENVIRONMENT=staging`;
- an explicit staging-like `DOKE_ANA_TARGET_MARKER`;
- `DOKE_ANA_STAGING_AUTHORIZATION=authorize-ana-staging-canary`;
- all A03 runtime policy variables.

The planner reports only whether each runtime variable is present. It never prints or reads secret values into evidence.

## Pinned repository artifacts

The readiness contract pins the exact Git blob SHA for the three ANA migrations and the two Edge Function source files. Drift blocks staging readiness until the contract is intentionally refreshed and reviewed.

## Intended activation order

1. Verify repository fingerprints and explicit staging authorization.
2. Apply A03, A04 and A05 migrations in order.
3. Configure staging-only analytics runtime policy.
4. Deploy the updated Search Edge Function and `analytics-behavior-v1`.
5. Keep the web client disabled and run direct synthetic Edge/database canaries.
6. Reconcile ORD projections and verify metric revision/no-op behavior.
7. Only then enable the analytics client in controlled staging.
8. Run browser synthetic canaries and collect evidence for a possible 2/6 → 3/6 maturity decision.

## Rollback

Rollback is feature-disable-first. The client returns to `analyticsEnabled:false`, analytics exposure policy can be withdrawn, and search must remain available. The planner does not authorize destructive schema rollback or modification of canonical ORD/CAT/PAY facts.

## Explicit non-effects

Dry-run and check-env perform no network requests, database connections, migrations, deployments, secret writes, staging mutations or production mutations.
