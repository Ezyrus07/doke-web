# AUTH-001 / AUTH-A04 — Real registration and username authority

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**Status:** `IMPLEMENTED_PENDING_CI_AND_STAGING`

## Objective

Choose one real registration path and make username assignment a database-authoritative operation rather than a browser-local availability guess.

## Chosen authority

- Account creation remains Supabase Auth `signUp`.
- The existing `auth.users` trigger remains the sole account/profile materializer.
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

### Frontend registration authority

`assets/js/services/auth-registration-authority.js`:

- extends the canonical `window.DokeAuth` registration surface;
- uses the real Supabase RPC for availability;
- applies the same normalization and reserved-name rules before network access;
- fails closed when the authority is unavailable;
- rechecks availability after a signup failure to translate a race into a deterministic user-facing conflict;
- adds no localStorage, sessionStorage, access-token or refresh-token persistence.

The module is loaded only by `auth/cadastro.html`, between the canonical auth service and the auth page controller.

## Validation assets

- `scripts/audit-auth-registration-authority.js`
- `scripts/test-auth-registration-username-runtime.js`
- `supabase/tests/015_auth_registration_username_authority_validation.sql`
- dedicated Quality Gates step for AUTH-A04

The migration was executed once inside a staging transaction ending in `ROLLBACK`. Syntax, functions, triggers and compatibility with the existing schema passed. The first candidate correctly exposed one legacy reserved internal username; the migration was adjusted to grandfather existing internal identities while rejecting new reserved claims.

## Current staging state

Before persistent application:

- 3 existing profiles;
- 0 missing usernames;
- 0 case-insensitive username collisions;
- current authority still has only `UNIQUE(username)` until migration 146 is applied.

## Safety boundary

- Migration 146 has **not** been applied persistently.
- No Supabase user, profile, Auth setting or production environment has been changed.
- Recovery/reset, OAuth providers, phone authentication and username changes after registration remain outside AUTH-A04.
- `PAID-001` remains blocked by Supabase plan.

## Exit criteria

AUTH-A04 can be marked `DONE` only after:

1. Quality Gates, Diagnostic E2E and relevant governed audits are green;
2. migration 146 is applied to staging;
3. SQL validation 015 passes in a rolled-back transaction;
4. RPC grants and private trigger-function isolation are confirmed;
5. a real staging signup canary proves available, taken, reserved and confirmation paths without leaving test identities behind.
