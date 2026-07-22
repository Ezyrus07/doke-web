# Self-Service Edge Authority

## Status

Active in the staging Supabase project on 22 July 2026.

## Problem

Fourteen legitimate self-service workflows still executed through public `SECURITY DEFINER` RPCs. Each function already validated `auth.uid()`, canonical roles and domain ownership, but the browser still had direct execution authority over privileged database code. Supabase therefore continued to report fourteen `authenticated_security_definer_function_executable` warnings.

## Architecture

The browser now calls one JWT-protected Edge Function:

- `self-service-operations`
- `verify_jwt=true`
- action allowlist with exactly fourteen operations
- user identity derived only from `auth.getUser()`
- request bodies cannot provide or override the actor id

The Edge Function invokes `public.execute_self_service_operation_internal` using the service role. The dispatcher:

1. accepts the actor id only from the Edge Function;
2. confirms that the actor exists in `auth.users`;
3. reconstructs the transaction-local JWT claims used by `auth.uid()`;
4. dispatches only allowlisted operations;
5. executes the existing domain RPC implementations without duplicating their business rules;
6. uses `search_path=pg_catalog`;
7. is executable only by `service_role`.

## Operations

- account onboarding read and completion;
- account profile update;
- transaction notification creation and recipient state update;
- professional profile setup;
- professional verification draft and rejected-verification reopen;
- service moderation history and self-submission;
- bank account persistence;
- withdrawal request;
- dispute opening and professional response.

## Direct RPC lockdown

The original fourteen RPC implementations remain available for controlled server rollback tooling, but:

- `anon`: no execute;
- `authenticated`: no execute;
- `service_role`: execute;
- browser repositories: no direct `.rpc()` call to these operations.

This preserves atomicity and existing business validation while removing the public privileged entry points.

## Browser integration

`assets/js/core/supabase-config.js` exposes `DokeSupabase.invokeSelfService(action, params)`. Onboarding, profile, professional verification, notifications, service moderation submission and finance repositories use this shared gateway.

## Validation

Remote dispatcher canaries proved:

- actor identity is reconstructed correctly;
- financial validation executes under the professional actor;
- moderation validation executes under the professional actor;
- unknown actions are rejected;
- dispatcher execution is limited to `service_role`.

Local validation proved:

- all fourteen actions exist in the Edge allowlist and SQL dispatcher;
- no affected browser repository calls a privileged RPC directly;
- Edge error and status normalization;
- identity, KYC, notifications, finance, service moderation, Storage and real-auth contracts remain green.

## Remaining platform control

Supabase Auth leaked-password protection remains disabled. The connected database/Edge tools do not expose an authorized Auth configuration mutation, so it must be enabled in the Supabase dashboard or through an authorized Management API credential.

## Rollback

Do not delete applied migrations. Use a compensating migration and deploy a matching browser bundle. A rollback must never restore direct browser execution before the replacement route is active and tested.
