# ORD-A08 — Staging CORS HTTPS boundary (local-only)

**Original patch:** 2026-10-22, published as Draft PR #554 with CI-passing Vercel Previews; not merged or promoted. **Follow-up release-gate patch:** local-only, not published or deployed, no hosted-write authority.

## Verified configuration issue

The Node staging runtime previously accepted exact-origin CORS configuration for arbitrary HTTP external origins through DOKE_ALLOWED_ORIGINS. Exact-origin matching is necessary but does not provide TLS security. A synthetic offline reproduction accepted http://unsecured.example.invalid in a staging policy.

## Scoped fix

- In backend/runtime/staging/node-http-server.js, parseAllowedOrigins now receives the environment marker.
- When DOKE_ENVIRONMENT=staging, an explicitly configured HTTP origin outside localhost/127.0.0.1/[::1] throws DOKE_CORS_CONFIG_INVALID (status=503 on the Error). It is raised during handler/server construction before an HTTP response exists; the hosting provider determines the response for an uncaught startup error.
- HTTPS external origins continue to be accepted subject to exact-origin matching. Local environment compatibility, explicitly configured loopback development origins and existing wildcard/path rejection remain intact.
- scripts/test-ord-001-a08-staging-cors-https.js provides 22 offline assertions (12 original CORS checks and 10 release-gate checks), covering HTTPS allowlist, external HTTP rejection, loopback, invalid origins, missing/incorrect environment markers, missing release identity, disabled staging activation and a permitted valid staging preflight.
- The Node HTTP handler now rejects requests (including OPTIONS and /health) with HTTP 503 DOKE_STAGING_RELEASE_NOT_READY when the release descriptor has readyForTraffic=false. It does not reflect a CORS origin or enable credentialed CORS in that state. Local CORS configuration remains available for development policy tests, but cannot bypass runtime readiness.
- Runtime readiness additionally requires normalized non-empty SUPABASE_URL (or DOKE_SUPABASE_URL) and SUPABASE_ANON_KEY (or DOKE_SUPABASE_ANON_KEY), matching the existing staging runtime configuration contract. Without these, /health returns HTTP 503 rather than falsely claiming readyForTraffic=true. Synthetic test credentials are never used for network requests. Readiness metadata still does not attest database connectivity, RLS, edge protection, or deployed SHA.
- The offline suite now covers missing/preview/local environment markers, incomplete release identity, disabled activation, and permitted HTTPS staging preflight. It performs no external network requests.
- The combined-journey CI already runs the CORS test for PR #554; the additional release-readiness gate is local only until separately published and verified by CI.

## Limitations and follow-up

**CORS is not authentication, authorization, network isolation, or proof of HTTPS termination at the edge.** Independently verify the actual staging hostname, TLS termination, SSO/access control, authenticated route authorization, and real operator-owned deployment SHA. This patch enforces only configured browser origin policy in the Node runtime.

The Supabase Edge Functions have a separate implementation at supabase/functions/_shared/http-security.ts and are OUT OF SCOPE. They require an independent inspection, tests and authorization; no Edge Functions were edited or deployed.

The historic ORD-A08 canary and staging security remain uncertified for the current release. P31 has 51 historical UNKNOWN_HOLD blocker states, with P31-021 adoption pending and P31-022 unauthorized. The fingerprint check is metadata consistency, not immutable build attestation; rollbackReady does not prove a working rollback.

**No remote requests, Supabase writes, migrations, provider selection, merge, deployment, production access or real payments are authorized by this local change.**
