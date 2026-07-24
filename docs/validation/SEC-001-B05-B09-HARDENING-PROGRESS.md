# SEC-001 — B05/B09 hardening progress

## Source hardening complete

This branch applies the shared HTTP security boundary to all seven authenticated browser-facing Edge Functions:

- `self-service-operations`;
- `financial-operations`;
- `professional-verification-operations`;
- `service-moderation-operations`;
- `staging-finance-sandbox`;
- `order-event-operations`;
- `quote-template-ai`.

The applied controls are:

- origin allowlist with explicit local-development handling;
- removal of wildcard CORS from the seven browser-facing functions;
- actual request-body byte limits rather than trusting only `Content-Length`;
- JSON object and content-type validation;
- no-store and defensive API response headers;
- request correlation ID;
- durable actor/action fixed-window rate limiting through a server-only authority;
- fail-closed behavior when the rate-limit authority is unavailable.

`quote-template-ai` retains its stricter existing quotas of three generated runs per five minutes and twenty per day; the shared limiter adds an abuse boundary for attempts without weakening those quotas. `order-event-operations` uses action-sensitive limits, with lower thresholds for state-changing operational actions.

## Database authority

Migration `145_edge_function_abuse_guard.sql` adds a private RLS-enabled counter table and the server-only RPC `consume_edge_function_rate_limit_internal`. Browser roles receive no table access and no function execution privilege. Validation `014_edge_function_abuse_guard_validation.sql` checks privileges and the behavioral threshold inside a rolled-back transaction.

## Remaining in SEC-B09

Source adaptation is complete. SEC-B09 remains open for:

- deterministic CI after regenerating the domain completion document;
- reviewed application of migration 145 to staging;
- deployment of the seven updated Edge Function bundles;
- authenticated HTTP/browser canaries for allowed and disallowed origins, oversized bodies, invalid JSON, unauthenticated requests and rate-limit thresholds;
- post-deployment source/version reconciliation and rollback evidence.

No migration has been applied and no Edge Function has been deployed by this branch yet.

## SEC-B05

The operational procedure for enabling leaked-password protection is documented in `docs/operations/SUPABASE-AUTH-PASSWORD-HARDENING.md`. The setting remains open until it is enabled in the Supabase Auth dashboard and the Security Advisor plus authentication canaries pass.
