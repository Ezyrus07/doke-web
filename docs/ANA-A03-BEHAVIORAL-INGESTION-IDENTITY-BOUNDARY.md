# ANA-A03 — Behavioral Ingestion and Identity Boundary

Defines a server-owned analytics ingestion boundary using the existing Doke Edge security patterns.

Anonymous sessions are ephemeral and server-issued. Authenticated actor identity comes from server authentication. Cross-session, cross-device and anonymous-to-authenticated stitching remain disabled while LEGAL-B03 is open.

Search impression/click events require signed exposure proofs. Transport idempotency, semantic deduplication and rate limiting are independent controls. Browser roles never receive direct canonical event-ledger write authority.

The original repository contract included deterministic synthetic signing helpers. The server runtime has since been explicitly activated and validated in staging; secret values remain outside the repository and browser.

## Staging runtime implementation

The repository implementation is applied and active in staging:

- `supabase/functions/analytics-behavior-v1/index.ts` resolves the authenticated actor server-side, issues ephemeral signed sessions, validates signed search exposures, enforces rate limits, validates service ownership and validates submitted quote/order linkage.
- `supabase/functions/_shared/analytics-proof.ts` owns HMAC envelope signing/verification and exposure proof attachment.
- `search-public-services-v2` records `search.executed` on a best-effort basis and attaches signed result exposure proofs only when the analytics exposure policy is configured.
- `20260918232000_ana_a03_behavioral_event_ledger.sql` prepares a private, service-role-only canonical behavior ledger with transport idempotency and semantic deduplication.

The A03 ledger migration is applied in staging as version `20260919000818`, with server-event idempotency hardening as `20260919003220`. `analytics-behavior-v1` was observed ACTIVE at version 7 during the 2026-09-23 reconciliation. Canonical canary run `35481347306` passed 15/15 and post-hardening run `35628667088` again passed 15/15. Missing analytics proof configuration still does not make public search unavailable.

## Web client shadow wiring

The web integration is materialized but disabled by default through `analyticsEnabled: false`.

- `assets/js/repositories/analytics-repository.js` stores only signed ephemeral session envelopes in `sessionStorage`, never `localStorage`.
- Search impressions require the server-signed exposure proof and are emitted after a card reaches at least 50% intersection; result clicks reuse the same proof.
- Service detail, budget CTA and message CTA emit canonical behavior only when the feature gate is enabled.
- Quote canonical events send structural progress counts only; legacy question labels remain confined to the legacy metric path.
- Legacy metrics coexist temporarily as a migration shadow. The server canonical transport is active in staging, but browser analytics remains disabled by default and therefore does not generate normal-user canonical traffic. Controlled browser activation remains separately blocked by LEGAL-B03 and an explicit activation lot.

## Runtime-state reconciliation — 2026-09-23

The A03 contract is reconciled with the already-certified staging state: `runtimeIntegrated=true`, migration applied, staging validated, and server ingestion authority active in staging. This reconciliation performs no deployment or database write. Persistent anonymous identity, cross-session/cross-device stitching and anonymous-to-authenticated stitching remain disabled; production remains untouched.
