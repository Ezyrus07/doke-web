# ANA-001 — Staging Activation Evidence

The staging runtime has been activated without touching production.

Applied database migrations:
- ANA-A03 behavioral event ledger
- ANA-A04 metric projection runtime
- ANA-A05 reconciliation runtime
- A03 server-event idempotency hardening follow-up
- A05 event-key and immutable-dimension reconciliation hardening follow-up

Edge runtime:
- `search-public-services-v2` is active at version 5.
- `analytics-behavior-v1` is active at version 3.
- All deployed function files matched the repository branch after deployment.

Security post-check:
- `anon` and `authenticated` have no SELECT or INSERT grants on the four ANA private tables.
- `service_role` retains read-only table access; writes stay behind controlled RPCs.
- Supabase still reports RLS-disabled private tables as a defense-in-depth advisory. No blanket RLS migration was applied because that requires explicit policy design.

The authenticated synthetic canary has **not** passed yet. The official Auth canary users are absent and must be provisioned through the existing Supabase Admin API runbook; direct SQL insertion into Auth is prohibited. The canary runner also requires the exact execution confirmation `execute-ana-staging-canary`.

ANA-001 therefore remains maturity 2/6.
