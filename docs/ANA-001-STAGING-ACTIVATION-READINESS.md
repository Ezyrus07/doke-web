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

## Canonical technical runtime policy

ANA-B01 now fixes the technical security/integrity values used by the staging runtime:

- analytics session TTL: **1800 seconds (30 minutes)**;
- quote-session TTL: **3600 seconds (60 minutes)**;
- signed search exposure TTL: **300 seconds (5 minutes)**;
- ingestion rate limit: **120 requests per 60 seconds per server-resolved rate-limit actor**;
- semantic deduplication window: **60 seconds**.

These values govern envelope validity, abuse resistance and duplicate suppression. They are **not** a personal-data retention policy and do not authorize longer-term identity correlation. Persistent anonymous identity, cross-session/cross-device stitching and anonymous-to-authenticated stitching remain disabled. Consent, retention, anonymization, export and deletion remain under `LEGAL-B03`.

`DOKE_ANALYTICS_SESSION_SECRET` and `DOKE_ANALYTICS_EXPOSURE_SECRET` must be independent high-entropy secrets (minimum policy: 256 bits), must never be committed or exposed to the browser, and must not be reused between staging and production. Secret rotation requires a controlled canary before the new key becomes authoritative.

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
