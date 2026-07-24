# AUTH-001 / AUTH-A04 — Real registration and username authority

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**Status:** `DONE`

## Objective

Choose one real registration path and make username assignment a database-authoritative operation rather than a browser-local availability guess.

## Chosen authority

- Account creation remains Supabase Auth `signUp`.
- The existing `on_auth_user_created_doke` trigger remains the sole `auth.users` account/profile materialization entry point.
- `private.materialize_auth_account(uuid)` is the canonical registration materializer.
- `public.user_profiles.username` is the canonical username store.
- Browser state does not reserve, persist or own usernames.

## Implementation

### Database migration `146_auth_registration_username_authority.sql`

- Adds canonical username normalization, including lowercase, accent removal, leading `@` removal and allowed-character filtering.
- Preserves existing internal reserved identities while blocking new claims for reserved names.
- Normalizes all future `user_profiles.username` writes through a private trigger.
- Requires a non-null canonical username and validates its format.
- Exposes `public.check_username_availability(text)` to `anon`, `authenticated` and `service_role` with a narrow result contract.
- Strengthens the existing `private.materialize_auth_account(uuid)` authority so the current `on_auth_user_created_doke` trigger fails the signup transaction when the requested username is invalid or loses a race.
- Keeps one `auth.users` trigger authority and prevents the canonical materializer from silently assigning a suffixed username different from the one requested by the user.
- Retains deterministic fallback usernames only for provider-created identities that do not explicitly request a handle.

### Frontend registration authority

`assets/js/services/auth-registration-authority.js`:

- extends the canonical `window.DokeAuth` registration surface;
- uses the real Supabase RPC for availability;
- applies the same normalization and reserved-name rules before network access;
- fails closed when the authority is unavailable;
- rechecks availability after a signup failure to translate a race into a deterministic user-facing conflict;
- adds no localStorage, sessionStorage, access-token or refresh-token persistence.

The module is loaded only by `auth/cadastro.html`, between the canonical auth service and the auth page controller.

## Validation

### CI and deterministic runtime

The final corrected runtime head passed:

- Doke Quality Gates #293;
- Doke Diagnostic E2E #88;
- Doke Staging Edge HTTP Canary #67;
- canonical `audit:auth-session`, including `scripts/test-auth-registration-username-runtime.js`;
- blocking deterministic E2E;
- 105 visual structural guards;
- governed matrix and clean-patch checks.

### Migration and SQL behavior

The initial migration candidate attempted to add a second trigger to the Supabase-owned `auth.users` table. The migration executor correctly rejected that operation with `must be owner of relation users`; the failed transaction left no partial functions, triggers or migration record.

The corrected migration reuses `private.materialize_auth_account(uuid)`, the authority already called by `on_auth_user_created_doke`. It was:

1. validated in a transaction ending with `ROLLBACK`;
2. applied persistently to staging as `auth_registration_username_authority`;
3. validated by `015_auth_registration_username_authority_validation.sql`, again ending with `ROLLBACK`.

The SQL validation proved:

- normalization and reserved-name rules;
- public availability results for available and taken usernames;
- account, `user_profiles` and `client_profiles` materialization;
- atomic rollback when a requested username loses a race;
- atomic rollback for reserved usernames;
- no partial auth/profile rows after rejection;
- public RPC execution for `anon` and `authenticated`;
- no browser-role execution of the private materializer;
- retained `service_role` execution;
- continued use of the single canonical Auth trigger.

### Persistent staging state

After validation:

- migration 146 is recorded;
- the canonical normalization and availability functions exist;
- the canonical Auth trigger exists;
- no duplicate Auth trigger exists;
- 3 pre-existing profiles remain;
- 0 synthetic AUTH-A04 users remain;
- no username is missing;
- no case-insensitive username collision exists.

## Public HTTP canary and SMTP boundary

The public canary used only the frontend `anon` key and reached the real Supabase `/auth/v1/signup` endpoint.

Two safe synthetic-address attempts were executed:

- `example.test` was rejected with `400 email_address_invalid` before account creation;
- `example.com` passed address validation and reached the confirmation-email stage, where Supabase returned `429 over_email_send_rate_limit` because the built-in development SMTP quota was exhausted.

Neither attempt persisted an Auth user or profile. The post-signup HTTP assertions could not execute because the provider stopped the request at confirmation delivery. Username normalization, availability behavior, grants, materialization and rollback semantics were nevertheless proven against the real staging schema by SQL validation 015.

Confirmation-email delivery remains explicitly unvalidated until the SMTP quota resets or a custom SMTP provider is configured. This external delivery dependency is tracked separately as `MAIL-001` and is not presented as successful in this evidence.

## Safety boundary

- Production was not changed.
- No existing user, username, profile or role was modified.
- Synthetic SQL identities were rolled back.
- Public-canary signups left no Auth or profile records.
- Recovery/reset, OAuth providers, phone authentication and username changes after registration remain outside AUTH-A04.
- `PAID-001` remains blocked by the Supabase plan.

## Closure decision

`AUTH-A04` is closed as `DONE` because the registration authority, username normalization, availability API, transaction race behavior, grants and frontend integration were implemented and validated on staging.

Confirmation-email delivery remains a separate external infrastructure dependency under `MAIL-001`; it cannot be silently treated as validated while the default SMTP quota is exhausted.
