# EDGE-CORS-001 ? Supabase Edge Functions browser-origin boundary

**Date:** 2026-10-23. **State:** isolated local candidate, not pushed, merged, deployed or applied to any Supabase project. No hosted writes authorized.

## Verified issue (prior deployed code and local source)

- The previous shared module accepted non-TLS external origins named in DOKE_ALLOWED_ORIGINS.
- Unconfigured loopback origins were accepted by default unless DOKE_ALLOW_LOCAL_ORIGINS was explicitly "false".
- Three active deployed function bundles inspected read-only in doke-web-staging and doke-prof-b05-g4-e2e shared that prior module. This does not establish actual remote DOKE_ALLOWED_ORIGINS values.
- The Vercel project kontrat-staging-api-runtime had no platform SSO, password or trusted-IP restriction at inspection; doke-web and doke-web-jkpw had SSO enabled. No setting was changed and SSO must not be toggled blindly on the API because direct clients could break.

## Proposed source-only change

- Retain the fixed HTTPS default https://ezyrus07.github.io.
- Allow exact HTTPS origins configured in DOKE_ALLOWED_ORIGINS; require canonical HTTP(S) origin strings without paths, userinfo, query, fragment, duplicate or ambiguous entries.
- Reject an entire configured browser allowlist if any entry is invalid, including non-loopback HTTP, wildcards, duplicate origins, trailing empty entries, and local origins configured without explicit opt-in. An invalid list rejects *all browser Origin headers* including the fixed default until configuration is corrected.
- Permit localhost, 127.0.0.1 and [::1] only when DOKE_ALLOW_LOCAL_ORIGINS is exactly "true" (development-only opt-in). The flag must remain unset or "false" on hosted projects. Non-loopback HTTP remains prohibited even with the opt-in.
- Prevent caller-supplied extra response headers from overriding the canonical shared CORS decision or enabling Access-Control-Allow-Credentials.
- Preserve existing behavior for requests without an Origin header. Such requests require independent application authorization and API-key/JWT controls; CORS never authenticates clients.

## Local verification

- scripts/test-supabase-edge-cors-boundary.mjs imports the *actual* TypeScript module with Node 24 and a synthetic Deno.env implementation.
- 50 offline checks: secure default, explicit HTTPS, exact ports, forbidden external HTTP, malformed or duplicated lists, fail-closed defaults, IPv4/IPv6 loopback opt-in, rejected preflight status, caller extra-header override attempts, non-browser compatibility.
- Static consumer contract checked for eight functions: financial-operations; order-event-operations; professional-verification-operations; quote-template-ai; search-public-services-v2; self-service-operations; service-moderation-operations; staging-finance-sandbox.
- .github/workflows/kontrat-edge-cors-origin-security.yml runs the same focused test with read-only permissions and no secrets, database access, migrations or deploy. This CI has not yet run remotely.

## Compatibility and deployment HOLD

**Breaking configuration change:** If any hosted DOKE_ALLOWED_ORIGINS value contains HTTP external, duplicated origins, a wildcard, trailing comma or an explicit loopback without opt-in, the browser allowlist will fail closed after deployment. Inventory and reconcile production/staging environment values with the operator before deploying. Do not log or share secret contents.

Supabase Edge Functions ship their own bundled copy of _shared/http-security.ts. A Git change alone does not update deployed functions. All eight affected functions need independent release approval, correct verify_jwt settings, staging behavior checks and rollback evidence before any hosted publication. Do not use a test passing locally as evidence of deployed security.

CORS does not enforce authentication, RLS, network isolation, token verification, private endpoint access or build attestation. Also assess Vercel API Preview access protection independently without breaking authenticated browser/API clients.

**NO PUSH / NO MERGE / NO SUPABASE DEPLOY / NO MIGRATIONS / NO PROVIDER CHANGES / P31 HOLD.**
