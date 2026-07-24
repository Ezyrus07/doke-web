# SEC-001 — B05/B09 hardening progress

## Final staging state

The shared HTTP security boundary is implemented and deployed across all seven authenticated browser-facing Edge Functions:

- `self-service-operations` — version 4;
- `financial-operations` — version 2;
- `professional-verification-operations` — version 2;
- `service-moderation-operations` — version 3;
- `staging-finance-sandbox` — version 2;
- `order-event-operations` — version 9;
- `quote-template-ai` — version 7.

All seven are `ACTIVE` with JWT verification enabled.

## Controls applied

- explicit origin allowlist with controlled loopback support;
- wildcard browser CORS removed;
- real request-body byte limits;
- JSON content-type and object validation;
- defensive no-store and API security headers;
- request correlation IDs;
- durable actor/action fixed-window rate limiting;
- fail-closed behavior when rate-limit authority is unavailable;
- action-sensitive operational limits;
- stricter existing AI generation quotas preserved.

## Database authority

Migration `145_edge_function_abuse_guard.sql` was applied to `doke-web-staging` (`zwkczgewzbsorbrjuzpb`). Validation `014_edge_function_abuse_guard_validation.sql` passed inside a transaction followed by rollback.

The validation confirmed:

- the private rate-limit table exists with RLS enabled;
- browser/API roles cannot read the table directly;
- browser roles cannot execute the internal authority;
- `service_role` can execute the authority;
- the function is `SECURITY DEFINER` with `search_path = pg_catalog`;
- the first two requests at a limit of two are allowed;
- the third request is denied with zero remaining and retry metadata.

## Real HTTP canary

GitHub Actions executed seven boundary cases against each of the seven deployed functions:

- allowed preflight;
- denied preflight;
- missing JWT;
- anon JWT without an authenticated user;
- invalid JSON;
- unsupported content type;
- oversized payload.

Result: **49 of 49 cases passed**. The machine-readable evidence is stored in `docs/validation/SEC-001-B09-STAGING-HTTP-CANARY.json`.

## Security Advisor reconciliation

The informational `rls_enabled_no_policy` notice for `private.edge_function_rate_limit_buckets` is expected. The table is private, server-only, has no direct API-role grants and is reached only through the restricted service-role authority; adding a browser policy would weaken the intended boundary.

The warning `auth_leaked_password_protection` remains because Supabase rejected activation on the current plan and requires Pro or above.

## Closure status

- `SEC-B09`: **DONE** — source, migration, deployment, SQL behavior and real HTTP boundaries are validated on staging.
- `SEC-B05`: **BLOCKED** — leaked-password protection requires a paid Supabase plan. It remains tracked as `PAID-001` and must be resolved or formally mitigated before public beta.

## Preserved boundaries

- `order-event-worker` was not changed because it is outside the seven authenticated browser-facing functions in this scope.
- No production project was changed.
- No service-role credential was exposed to the browser or committed to the repository.
- No broader Auth policy, MFA, recovery or password-complexity change was mixed into this security closure.

## Next action

Run the final PR checks against the evidence-complete branch. After all required checks pass, mark PR #8 ready for review. Do not merge until the reviewed PR state is explicitly approved.
