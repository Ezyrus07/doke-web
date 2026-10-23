# ORD-A08 — Staging CORS HTTPS boundary (local-only)

**Date:** 2026-10-22. **State:** locally tested candidate, not deployed, not merged, not approved for hosted writes.

## Verified configuration issue

The Node staging runtime previously accepted exact-origin CORS configuration for arbitrary HTTP external origins through DOKE_ALLOWED_ORIGINS. Exact-origin matching is necessary but does not provide TLS security. A synthetic offline reproduction accepted http://unsecured.example.invalid in a staging policy.

## Scoped fix

- In backend/runtime/staging/node-http-server.js, parseAllowedOrigins now receives the environment marker.
- When DOKE_ENVIRONMENT=staging, an explicitly configured HTTP origin outside localhost/127.0.0.1/[::1] causes DOKE_CORS_CONFIG_INVALID (HTTP 503 on runtime configuration failure).
- HTTPS external origins continue to be accepted subject to exact-origin matching. Local environment compatibility, explicitly configured loopback development origins and existing wildcard/path rejection remain intact.
- scripts/test-ord-001-a08-staging-cors-https.js provides 12 offline assertions including HTTPS allowlist, external HTTP rejection, localhost/IPv4/IPv6 loopback, wildcard, path, local compatibility, and server fail-closed on invalid staging origin.
- A dedicated gate is added to the combined-journey CI workflow, targeting the prior fingerprint PR as its base if published.

## Limitations and follow-up

**CORS is not authentication, authorization, network isolation, or proof of HTTPS termination at the edge.** Independently verify the actual staging hostname, TLS termination, SSO/access control, authenticated route authorization, and real operator-owned deployment SHA. This patch enforces only configured browser origin policy in the Node runtime.

The Supabase Edge Functions have a separate implementation at supabase/functions/_shared/http-security.ts and are OUT OF SCOPE. They require an independent inspection, tests and authorization; no Edge Functions were edited or deployed.

The historic ORD-A08 canary and staging security remain uncertified for the current release. P31 has 51 historical UNKNOWN_HOLD blocker states, with P31-021 adoption pending and P31-022 unauthorized. The fingerprint check is metadata consistency, not immutable build attestation; rollbackReady does not prove a working rollback.

**No remote requests, Supabase writes, migrations, provider selection, merge, deployment, production access or real payments are authorized by this local change.**
