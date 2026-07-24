# AUTH-001 / AUTH-A05 — Password recovery, reset and reauthentication

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**Status:** `IMPLEMENTED — FINAL CI PENDING`

## Objective

Replace the browser-local recovery code flow with one Supabase Auth authority for:

- requesting password recovery by email;
- accepting only a credential-bearing recovery link;
- choosing a new password through the recovery session;
- changing a password from Settings after verifying the current password;
- revoking other sessions after an authenticated password change.

## Authority

- Recovery request: `supabase.auth.resetPasswordForEmail`.
- Recovery context: `PASSWORD_RECOVERY` plus a token-free early URL marker.
- Recovery completion: `supabase.auth.updateUser({ password })`.
- Authenticated reauthentication: `supabase.auth.signInWithPassword` using the current account email.
- Authenticated password change: `supabase.auth.updateUser({ password, currentPassword })`.
- Other-session revocation: `supabase.auth.signOut({ scope: 'others' })`.

## Safety controls

- No recovery code is generated or stored by Doke.
- No access token, refresh token, password or recovery token is copied to Doke storage.
- A normal authenticated session with a forged reset query cannot authorize password replacement.
- Recovery URL credentials are removed from browser history after the Supabase session is established.
- Recovery is email-only while no SMS provider is configured.
- Recovery request feedback is generic and does not reveal whether an account exists.
- Recovery completion ends the temporary recovery session and requires a new login.
- The Settings flow reauthenticates with the current password before changing it.
- Other authenticated sessions are revoked after a successful Settings password change.

## Implementation

- `assets/js/core/auth-recovery-state-early.js`
- `assets/js/services/auth-password-authority.js`
- `assets/js/pages/auth-password-pages.js`
- `assets/js/pages/settings-password.js`
- `assets/css/components/auth/password-dialog.css`
- `assets/js/core/page-bootstrap.js`
- `auth/esqueci-senha.html`
- `tests/auth/test-auth-password-recovery-runtime.js`

`auth/esqueci-senha.html` is the single canonical password surface. A normal visit displays the email request form. A legitimate Supabase recovery callback switches the same page to the new-password form. A reset intent without a valid credential-bearing recovery context fails closed and displays a controlled invalid-link state.

The existing `scripts/test-auth-registration-username-runtime.js` invokes the AUTH-A05 test, so the password authority remains part of the mandatory `audit:auth-session` gate without adding a second package or workflow authority.

## External delivery boundary

`MAIL-001` remains open. The implementation can request Supabase recovery email, but actual email delivery cannot be marked as validated while the built-in SMTP quota is exhausted. A custom SMTP provider or a later controlled quota window is required before public beta.

## Validation completed before final CI

- deterministic AUTH-A05 runtime test: passed inside `audit:all`;
- canonical auth/session audit: passed;
- platform ACL and quality-pipeline audits: passed;
- generated domain matrix: regenerated and validated by the official generator;
- temporary diagnostic workflows: removed or restored to their canonical versions.

## Final validation pending

- Doke Quality Gates on the evidence head;
- Diagnostic E2E on the evidence head;
- visual structural guards on the evidence head;
- staging Edge HTTP canary on the evidence head;
- real recovery-email delivery canary under `MAIL-001`.

## Safety boundary

- No production environment was changed.
- No Supabase Auth setting was changed.
- No existing user password was changed during deterministic tests.
- SMS recovery remains unavailable rather than simulated.
- `MAIL-001` remains visible and unresolved.
- `PAID-001` remains blocked by the Supabase plan.
