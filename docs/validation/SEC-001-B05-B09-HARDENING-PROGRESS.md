# SEC-001 — B05/B09 hardening progress

## Current sublot

This branch introduces the shared HTTP security foundation and applies it to five authenticated browser-facing Edge Functions:

- `self-service-operations`;
- `financial-operations`;
- `professional-verification-operations`;
- `service-moderation-operations`;
- `staging-finance-sandbox`.

The applied controls are:

- origin allowlist with explicit local-development handling;
- removal of wildcard CORS from the hardened functions;
- actual request-body byte limits rather than trusting only `Content-Length`;
- JSON object and content-type validation;
- no-store and defensive API response headers;
- request correlation ID;
- durable actor/action fixed-window rate limiting through a server-only authority;
- fail-closed behavior when the rate-limit authority is unavailable.

## Database authority

Migration `145_edge_function_abuse_guard.sql` adds a private RLS-enabled counter table and the server-only RPC `consume_edge_function_rate_limit_internal`. Browser roles receive no table access and no function execution privilege. Validation `014_edge_function_abuse_guard_validation.sql` checks privileges and the behavioral threshold inside a rolled-back transaction.

## Remaining in SEC-B09

The following functions still require adaptation before SEC-B09 can close:

- `order-event-operations`;
- `quote-template-ai`.

No migration has been applied and no Edge Function has been deployed by this sublot.

## SEC-B05

The operational procedure for enabling leaked-password protection is documented in `docs/operations/SUPABASE-AUTH-PASSWORD-HARDENING.md`. The setting remains open until it is enabled in the Supabase Auth dashboard and the Security Advisor plus authentication canaries pass.
