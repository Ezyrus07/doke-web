# ANA-A03 — Behavioral Ingestion and Identity Boundary

Defines a server-owned analytics ingestion boundary using the existing Doke Edge security patterns.

Anonymous sessions are ephemeral and server-issued. Authenticated actor identity comes from server authentication. Cross-session, cross-device and anonymous-to-authenticated stitching remain disabled while LEGAL-B03 is open.

Search impression/click events require signed exposure proofs. Transport idempotency, semantic deduplication and rate limiting are independent controls. Browser roles never receive direct canonical event-ledger write authority.

This repository-only lot includes deterministic synthetic signing helpers for conformance testing only; it does not configure a real signing secret or runtime endpoint.

## Repository runtime implementation

The repository now contains the server implementation boundary without activating it remotely:

- `supabase/functions/analytics-behavior-v1/index.ts` resolves the authenticated actor server-side, issues ephemeral signed sessions, validates signed search exposures, enforces rate limits, validates service ownership and validates submitted quote/order linkage.
- `supabase/functions/_shared/analytics-proof.ts` owns HMAC envelope signing/verification and exposure proof attachment.
- `search-public-services-v2` records `search.executed` on a best-effort basis and attaches signed result exposure proofs only when the analytics exposure policy is configured.
- `20260918232000_ana_a03_behavioral_event_ledger.sql` prepares a private, service-role-only canonical behavior ledger with transport idempotency and semantic deduplication.

The runtime remains inactive until the migration, environment policy and Edge deployment are explicitly authorized in staging. Missing analytics proof configuration does not make public search unavailable.

## Web client shadow wiring

The web integration is materialized but disabled by default through `analyticsEnabled: false`.

- `assets/js/repositories/analytics-repository.js` stores only signed ephemeral session envelopes in `sessionStorage`, never `localStorage`.
- Search impressions require the server-signed exposure proof and are emitted after a card reaches at least 50% intersection; result clicks reuse the same proof.
- Service detail, budget CTA and message CTA emit canonical behavior only when the feature gate is enabled.
- Quote canonical events send structural progress counts only; legacy question labels remain confined to the legacy metric path.
- Legacy metrics coexist temporarily as a migration shadow. The canonical transport remains a no-op until staging activation is explicitly authorized.
