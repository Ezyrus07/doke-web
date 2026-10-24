# EDGE-ANALYTICS-EXPIRY-001 ? Signed exposure-proof validity gate

**Date:** 2026-10-23. **State:** locally tested only, no remote publication, deployments, migrations, secret/configuration writes or hosted canary authorization. P31_HOLD and STAGING_NOT_CERTIFIED remain.

## Baseline and risk

- Based on isolated source reconciliation commit 48604f8e1357bddec00ed2b7232acca3e67d04f0 (Draft PR #556).
- The restored Supabase shared module _shared/analytics-proof.ts verified a valid HMAC and proof type but returned signed payloads without evaluating \`expiresAt\`. A signed, expired exposure proof was therefore still considered cryptographically valid.
- A repository-wide search found calls to \`verifyAnalyticsEnvelope\` in offline tests only; no current operational consumer of the verifier was found in the checked source. The search Edge Function **issues** proofs, but there is no demonstrated consuming endpoint. Do not claim runtime replay protection or a deployed fix.
- A signed token is not user authentication, rate limiting, an authorization grant or independent proof of real-world exposure.

## Narrow local patch

For \`verifyAnalyticsEnvelope(token, "ana_exposure_v1", secret)\` only:

1. Verify the existing HMAC first, then require a nonempty request ID, service ID, ranking version and ranking as-of; the surface must be "search", and result position must be a nonnegative safe integer.
2. Require a canonical UTC ISO timestamp with milliseconds and Z suffix in the signed \`expiresAt\` field. Reject missing, malformed, ambiguous or noncanonical timestamps.
3. Reject expiration at or before the evaluation instant with \`DOKE_ANALYTICS_TOKEN_EXPIRED\`.
4. Reject claims more than 3600 seconds into the future with \`DOKE_ANALYTICS_TOKEN_INVALID\`. This aligns the maximum future validity with the issuing function's existing 30?3600 second TTL range.
5. Leave unrelated envelope types unchanged; do not alter signing format, issued payload data or the search endpoint response.
6. No runtime network access, no database mutations, no real keys, no provider settings changes.

**Important:** This checks that the expiry is within the next hour, but without a separately signed issue time it cannot prove how long ago a token was created. A valid proof remains replayable until its expiry unless a consumer additionally enforces identity, nonce/idempotency, binding and authorization. The current search issuer supplies all required fields. Even after publication to GitHub, deployed Supabase copies remain unchanged until separately authorized release.

## Local deterministic verification

- \`scripts/test-analytics-exposure-expiry.mjs\` freezes the test clock to a synthetic timestamp, uses a synthetic HMAC secret and makes **28 offline checks**.
- Cases cover validity through the one-hour boundary; expired, exactly expired and overlong tokens; missing, noncanonical or malformed timestamps; missing/incorrect signed context; tampered expiry signature; unchanged behavior for unrelated envelope types; and an issuer-emitted proof rejected at its expiry.
- Existing search reconciliation tests (56 synthetic checks), self-service operations (24 operations), Edge CORS tests (50 checks) and source closure remain mandatory.
- \`.github/workflows/kontrat-edge-source-reconciliation.yml\` now runs the deterministic expiry test alongside the existing offline checks, with read-only GitHub permissions and no provider access. No remote CI for this follow-up has run.

## Promotion and compatibility HOLD

Before introducing any consuming endpoint: specify the exact identity, service, request and ranking binding; authorization and anti-replay policy; expiry semantics; failure status codes; whether legacy tokens need safe rejection; secure signing-key rotation; real Deno/Supabase package validation; and an independent approval for hosted writes.

Current blockers are unchanged: the staging CORS allowlist contents have not been certified against PR #555; staging self-service attachment RPC contracts are absent from the inspected databases; deployed search and self-service bundles require a separately authorized rollout and rollback plan; Vercel API Preview access policy is unresolved.

**Disposition: LOCAL_ONLY / PROOF_EXPIRY_TESTED / NO_RUNTIME_CONSUMER_FOUND / NO_DEPLOY / STAGING_NOT_CERTIFIED / P31_HOLD.**
