# AUTH-001 / AUTH-A06 — Provider-authoritative session and device lifecycle

**Date:** 2026-07-24  
**Branch:** `auth/auth-001-baseline-audit`  
**PR:** #9  
**Status:** `DONE`

## Objective

Replace ambiguous browser session behavior with one provider-authoritative lifecycle for:

- explicit provider refresh;
- logout from the current device;
- revocation of other sessions while preserving the current session;
- global logout;
- reconciliation of expired or revoked sessions;
- removal of browser-local identity and recovery fallbacks.

## Root cause

`assets/js/services/auth-service.js` still exposed ambiguous logout semantics and dormant browser-local identity paths through the frozen `DokeAuth.service` facade. A generic `supabase.auth.signOut()` call could perform broader revocation than the interface communicated, while refresh relied on session reading rather than an explicit provider refresh operation.

## Authority

- Session provider: Supabase Auth.
- Explicit refresh: `supabase.auth.refreshSession()`.
- Current-device logout: `supabase.auth.signOut({ scope: 'local' })`.
- Other-session revocation: `supabase.auth.signOut({ scope: 'others' })`.
- Global logout: `supabase.auth.signOut({ scope: 'global' })`.
- Public identity snapshot: `Doke.session`, without provider credentials.
- Canonical frontend authority: `assets/js/services/auth-session-authority.js`.

## Session semantics

- The default user logout scope is `local`; it ends the current browser session only.
- The `others` scope preserves the current session and reconciles it after revocation.
- The `global` scope ends the current session and requests provider-wide revocation.
- Global logout requires explicit confirmation in Settings.
- Provider logout failures are surfaced as failures rather than converted into false success.
- Expired and revoked refresh responses clear the public snapshot and fail closed.

## Fallback elimination

The following browser-local paths were removed from active authority:

- local recovery-code generation and storage;
- `debugCode` recovery behavior;
- local password mutation through the users repository;
- local username-availability fallback;
- route-guard identity decisions based on browser storage;
- direct identity/profile mutation through the auth facade without a remote authority;
- loading the legacy `assets/js/pages/auth.js` controller on the canonical recovery page.

Legacy keys `doke.auth.session` and `doke.auth.recovery.v1` are removed during authority initialization. `doke.auth.session.v1` remains a public rendering snapshot and does not contain access or refresh tokens.

## User-facing controls

Settings now distinguishes three actions:

- **Sair deste dispositivo**;
- **Encerrar outras sessões**;
- **Encerrar todas as sessões**.

No device inventory was fabricated. The current client contract exposes scope-based revocation, not a verified per-device session list.

## Public API

```js
DokeAuth.sessionAuthority.initialize();
DokeAuth.sessionAuthority.refresh();
DokeAuth.sessionAuthority.signOutCurrentDevice();
DokeAuth.sessionAuthority.signOutOtherSessions();
DokeAuth.sessionAuthority.signOutAllSessions();
DokeAuth.sessionAuthority.getPublicState();
```

## Implementation

- `assets/js/services/auth-session-authority.js`
- `assets/js/services/auth-service.js`
- `assets/js/services/auth-registration-authority.js`
- `assets/js/services/auth-password-authority.js`
- `assets/js/pages/settings-password.js`
- `assets/js/core/auth.js`
- `assets/js/core/page-bootstrap.js`
- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`
- `detalhe-anuncio.html`
- `tests/auth/test-auth-session-lifecycle-runtime.js`
- `scripts/audit-auth-session-contracts.js`
- `scripts/test-auth-canonical-session-runtime.js`
- `scripts/audit-quality-pipeline.js`
- `.github/workflows/quality.yml`

## Deterministic runtime coverage

The AUTH-A06 runtime test verifies:

- explicit invocation of provider `refreshSession`;
- absence of provider credentials from public snapshots;
- removal of legacy recovery and session keys;
- fail-closed recovery when the password authority is unavailable;
- fail-closed identity and profile mutations without a remote authority;
- `others`, `local` and `global` logout scopes;
- preservation of the current session under `others`;
- clearing of the current snapshot under `local` and `global`;
- Settings labels and global confirmation contract;
- removal of local username and recovery fallbacks.

## Final validation

Validated runtime and visual head: `9715531da1caf052e2c15b2f7462cc0ce86e1156`.

- Doke Quality Gates #401: `success`;
- blocking deterministic E2E: `success`;
- 105 visual structural guards: `success`;
- Doke Diagnostic E2E #196: `success`;
- Doke Staging Edge HTTP Canary #175: `success`;
- static architecture audits: `success`;
- auth/session runtime tests: `success`;
- deterministic domain matrix: `success`;
- agent governance and asset audits: `success`;
- `git diff --check`: `success`.

## External dependencies

- `MAIL-001` remains open for signup confirmation, recovery delivery and verified e-mail-change canaries.
- `PAID-001 / SEC-B05` remains blocked by the Supabase plan for leaked-password protection.
- A verified device inventory is outside this sublot; no unsupported session list is displayed.

## Safety boundary

- No production environment was changed.
- No Supabase migration or Auth configuration was changed.
- No existing user password, e-mail, phone, username, profile or role was changed.
- No persistent synthetic account was created.
- No SMS or OAuth provider was enabled.
- PR #9 remains draft and must not be merged without explicit authorization.
