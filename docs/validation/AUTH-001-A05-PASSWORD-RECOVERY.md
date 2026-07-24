# AUTH-001 / AUTH-A05 — Password recovery, reset and reauthentication

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**Status:** `IN PROGRESS`

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
- A normal authenticated session with a forged `type=recovery` marker cannot authorize reset.
- Recovery URL credentials are removed from browser history after the Supabase session is established.
- Recovery is email-only while no SMS provider is configured.
- Recovery request feedback is generic and does not reveal whether an account exists.
- Recovery completion ends the temporary recovery session and requires a new login.

## Implementation

- `assets/js/core/auth-recovery-state-early.js`
- `assets/js/services/auth-password-authority.js`
- `assets/js/pages/auth-password-pages.js`
- `assets/js/pages/settings-password.js`
- `assets/css/components/auth/password-dialog.css`
- `auth/esqueci-senha.html`
- `auth/redefinir-senha.html`
- `scripts/test-auth-password-recovery-runtime.js`

The canonical `assets/js/services/auth-service.js` delegates recovery and reset to the AUTH-A05 authority; its former local recovery record and generated code are removed from the active implementation.

## External delivery boundary

`MAIL-001` remains open. The code can request Supabase recovery email, but actual e-mail delivery cannot be marked as validated while the built-in SMTP quota is exhausted. A custom SMTP provider or a later controlled quota window is required before public beta.

## Validation pending

- deterministic AUTH-A05 runtime test;
- canonical auth/session audit;
- Quality Gates;
- Diagnostic E2E;
- visual structural guards;
- staging Edge HTTP canary;
- real recovery-email delivery canary under `MAIL-001`.

## Safety boundary

- No production environment is changed.
- No Auth setting is changed.
- No existing user password is changed during deterministic tests.
- SMS recovery remains unavailable rather than simulated.
- `PAID-001` remains blocked by the Supabase plan.
