# EDGE-SOURCE-RECONCILE-001 ? Search analytics and self-service attachment source reconciliation

**Date:** 2026-10-23. **State:** local candidate only; no GitHub publication, Supabase deployment, migrations, secrets writes, provider configuration changes or hosted endpoint calls. PR #555 remains Draft and unchanged. P31_HOLD / STAGING_NOT_CERTIFIED remain.

## Scope and provenance

- Base of local worktree: EDGE-CORS-002 plan commit 54eecb1465079b8381392d385ca18de1468b08d7, whose parent is PR #555 HEAD 982444ffecc74620c64d8e3074d0728ee5ed489f.
- Read-only Supabase inventory: project doke-web-staging (zwkczgewzbsorbrjuzpb), ACTIVE_HEALTHY at inspection.
- Reference function versions: staging/search-public-services-v2 v10 (verify_jwt=false), staging/self-service-operations v12 (verify_jwt=true), e2e/self-service-operations v2 (verify_jwt=true).
- Reconciliation is intentionally asymmetric: search has hosted-only behavior to preserve in Git; self-service has repo-only attachment functionality absent in staging, which should NOT be removed to mimic an older deployment.

## Search source: hosted-only analytics recovered with secure repository auth retained

Staging/search-public-services-v2 v10 includes a search.executed analytics event, record_analytics_behavior_event_v1 RPC call, signed analyticsExposureProof tokens and a shared _shared/analytics-proof.ts module absent from the prior repo snapshot.

This local candidate:
1. Restores the hosted _shared/analytics-proof.ts module exactly, including stable SHA-256 canonical hashes, HMAC-signed URL-safe envelopes and per-service exposure proofs.
2. Adds recordSearchExecuted and attachAnalyticsExposureProofs to the existing repo search flow after search success and observation logging.
3. Adds actorId to the Context because hosted analytics events bind the identity class and verified actor when present.
4. **Keeps the repo's two-step JWT validation boundary** (authClient.auth.getUser(userJwt), then actorId-gated Authorization for requestClient). The hosted code creates requestClient with a bearer token before getUser; that change is intentionally NOT copied because it would relax the existing repository's authenticated-context contract.
5. Preserves existing search error/status/rate limiting paths; analytics write failures continue as warnings rather than failing a successful search response.
6. Does not change verify_jwt or deploy configuration.

Read-only catalog query in doke-web-staging found public.record_analytics_behavior_event_v1(p_event jsonb) and public.record_service_search_observation_v2(p_observation jsonb). The two variable names DOKE_ANALYTICS_EXPOSURE_SECRET and DOKE_ANALYTICS_EXPOSURE_TTL_SECONDS exist in the staging secrets metadata, but their **values were not inspected**, so effective TTL, signing and actual runtime behavior are NOT certified.

## Self-service: repo-only functionality preserved, deployed source drift remains

The repo's self-service-operations/index.ts and operations.mjs already include three MSG-A05 transaction-attachment operations:
- prepare_transaction_attachment_uploads (rate limit 20 per 600s; authorize, create signed upload URL with upsert:false);
- confirm_transaction_attachment_uploads (rate limit 30 per 600s);
- remove_transaction_attachment (rate limit 30 per 600s; authorization RPC, storage remove, recorded result).

The staging v12 entrypoint lacks the three new actions and has an older operations.mjs (1,923 bytes versus 2,046 in repo). The e2e v2 entrypoint and operations.mjs matched the repo at the earlier read-only comparison, but this does not establish that their database RPC contracts exist.

A **read-only pg_catalog metadata query** confirmed the following required functions were **not found** in any schema in either doke-web-staging or doke-prof-b05-g4-e2e:
- prepare_transaction_attachment_uploads_internal
- confirm_transaction_attachment_uploads_internal
- authorize_transaction_attachment_removal_internal
- mark_transaction_attachment_removed_internal

Therefore **do not deploy repo self-service-operations to staging or E2E** on the assumption that the attachment flows are ready. These missing routines are separate from this source reconciliation. Never create or apply migrations without explicit authorization and separate compatibility certification.

This source-only patch intentionally does **not** modify self-service-operations/index.ts or operations.mjs. Its existing newer actions and access controls are preserved and guarded with offline regression tests.

## Local verification scope

- scripts/test-search-analytics-source-reconciliation.mjs exercises the actual restored TypeScript proof helper using Node 24 and synthetic credentials. It verifies signature validation, rejection of altered tokens, deterministic hash, metadata binding, optional signing behavior and response immutability. Source contracts also check the authenticated search caller and existing attachment flows.
- Existing scripts/test-self-service-operations-edge-runtime.mjs covers 24 actions and their normalization/error mappings.
- scripts/test-supabase-edge-cors-boundary.mjs covers 50 offline CORS origin assertions and eight consumers.
- scripts/audit-edge-function-source-closure.js validates relative imports and shared module closure.
- New .github/workflows/kontrat-edge-source-reconciliation.yml runs those tests with read-only GitHub Actions permissions, without secrets or database access.
- **No actual hosted search POST/analytics write, Deno bundle packaging, or Supabase-backed transaction-attachment test occurred.** No canary was authorized.

## Follow-up GO/NO-GO criteria

1. Review the restored hosted-only analytics code (including access control and signing metadata), the actorId-gated JWT behavior and failure boundaries.
2. Verify actual Deno/Supabase build and packaging in an isolated environment before deploying.
3. Independently resolve missing attachment RPCs, with migration authority and RLS/security review; do not conflate with CORS or search releases.
4. Confirm per-project CORS allowlist compatibility without exposing secret values; PR #555's fail-closed CORS change remains a separate blocker.
5. Snapshot the complete current hosted bundles, preserve verify_jwt and import metadata, define operator-owned rollback source, and request explicit authorization per function.
6. Consider search and self-service as **separate** deploy units. A passing source test cannot prove staging is safe.

**Final decision: SOURCE_RECONCILIATION_LOCAL / DEPLOY_NO_GO / NO_HOSTED_WRITES / PR_555_DRAFT / P31_HOLD.**
