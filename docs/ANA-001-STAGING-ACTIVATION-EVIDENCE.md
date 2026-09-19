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

## Functional canary evidence

The authenticated synthetic canary **passed 15/15** using synthetic Auth sessions and a transient staging-only policy shim. The authentication path used `admin_generateLink + verifyOtp`; therefore the exact password-login runner path is still unproven.

The transient shim was not accepted as canonical runtime policy. Canonical Edge code was restored with repository parity after the canary. The machine-readable evidence remains authoritative for the observed staging state.

ANA-B01 now has canonical technical TTL/rate/dedup values in the staging-readiness contract, but those values are not yet configured through the approved staging secret-management path. Consent, data retention, anonymization, export/deletion and persistent identity stitching remain blocked by `LEGAL-B03`.

ANA-001 therefore remains maturity **2/6** until the canonical runtime variables are configured and the no-shim password-login canary passes.
