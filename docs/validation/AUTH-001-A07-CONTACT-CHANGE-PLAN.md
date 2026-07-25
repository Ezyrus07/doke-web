# AUTH-001 / AUTH-A07 — Secure verified contact change plan

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**PR:** #9  
**Status:** `PLANNED / BLOCKED BY MAIL-001`

## Objective

Establish one secure provider authority for changing the authenticated account e-mail without creating account lockout, browser-local identity drift or unverified profile data.

Phone-number change is not part of the executable scope while no SMS provider is configured.

## Why implementation is blocked

A secure e-mail change cannot be marked complete from deterministic mocks alone. The exit gate requires a real controlled mailbox and verified transactional delivery for:

- confirmation delivery;
- redirect correctness;
- link expiry;
- replay rejection;
- behavior when the current and new addresses require confirmation;
- session behavior after the change;
- cleanup of the synthetic test identity.

The current Supabase development SMTP returned `429 over_email_send_rate_limit`. This remains tracked as `MAIL-001`.

## Proposed authority

- Reauthentication: current password verified by Supabase Auth before starting the mutation.
- E-mail mutation request: provider-owned authenticated user update.
- Verification: provider-issued confirmation link; Doke does not generate or store verification codes.
- Canonical account contact: provider-confirmed Auth identity.
- Profile projection: synchronized only after the provider reports the verified address.
- Session handling: reconciled through `AUTH-A06`; no token or verification credential enters Doke-owned storage.

## Required behavior

1. The user must be authenticated and reauthenticated before requesting an e-mail change.
2. The new address must be normalized and validated locally only for syntax; uniqueness and acceptance remain provider authority.
3. The current e-mail must not be overwritten in Doke profile/session projections before provider confirmation.
4. The interface must display a controlled pending-verification state without exposing secrets or provider tokens.
5. Repeated submissions must be rate-limited by the provider and represented with generic user-safe errors.
6. A failed, expired or replayed confirmation must fail closed and preserve the previous verified address.
7. After confirmation, AUTH-A06 must refresh and reconcile the canonical session.
8. Other sessions must be handled according to the final security decision recorded before implementation; this must not be inferred silently.
9. Phone change controls remain unavailable rather than simulated.

## Proposed file scope

Expected files, subject to a fresh pre-implementation audit:

- `assets/js/services/auth-contact-authority.js` — new provider boundary;
- `assets/js/pages/settings-contact.js` — Settings orchestration only;
- `assets/js/pages/settings-password.js` — reuse or extract canonical reauthentication without duplicating password logic;
- `assets/js/services/auth-session-authority.js` — session reconciliation only, not contact mutation;
- `assets/js/core/page-bootstrap.js` — canonical loading order;
- `configuracoes.html` — semantic controls and pending state;
- `tests/auth/test-auth-contact-change-runtime.js` — deterministic provider contract;
- `scripts/audit-auth-session-contracts.js` — loading and authority ownership;
- `docs/validation/AUTH-001-A07-CONTACT-CHANGE.md` and JSON evidence after implementation.

## Architectural constraints

- Pages must not call Supabase directly.
- Contact mutation must not be added to `profile-service.js` or local users repository.
- No e-mail is persisted as verified merely because a request was accepted.
- No local verification code, local pending-contact authority or debug bypass.
- No inline styles, page-specific auth framework or duplicate modal anatomy.
- No phone/SMS UI until provider configuration and canaries exist.
- No production mutation during development validation.

## Mandatory deterministic tests

- unauthenticated request fails closed;
- missing reauthentication fails closed;
- invalid e-mail syntax is rejected before provider invocation;
- provider rejection does not mutate public session/profile state;
- accepted request creates only a pending UI state;
- provider-confirmed change reconciles through AUTH-A06 refresh;
- expired/replayed callback fails closed;
- no access token, refresh token or verification token enters Doke storage;
- legacy/local user repository is never called;
- phone change remains unavailable.

## Mandatory real canary after MAIL-001 resolution

Use a disposable project-owned account and mailbox in staging:

1. create or identify the controlled synthetic account;
2. authenticate and reauthenticate;
3. request change to a second controlled mailbox;
4. verify delivery to every address required by the configured provider policy;
5. inspect redirect host and path;
6. complete the confirmation once;
7. prove replay rejection;
8. refresh the session and verify the confirmed address;
9. verify the previous address no longer authenticates when applicable;
10. delete or restore the synthetic identity and record evidence.

## Exit criteria

AUTH-A07 may be marked `DONE` only when:

- deterministic tests and static audits pass;
- Doke Quality Gates, blocking E2E and 105 visual guards pass;
- a real staging e-mail-change canary passes;
- no persistent synthetic account remains;
- the final session-revocation decision is documented;
- the Engineering Journal and machine-readable evidence are updated.

## Safety boundary

- This document performs planning only.
- No runtime code, Supabase setting, user contact or production environment was changed.
- `MAIL-001` remains the explicit blocker.
- PR #9 remains draft and must not be merged without explicit authorization.
