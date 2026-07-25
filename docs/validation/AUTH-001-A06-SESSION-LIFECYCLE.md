# AUTH-001 / AUTH-A06 — Provider-authoritative session lifecycle

**Status:** IN PROGRESS  
**Branch:** `auth/auth-001-baseline-audit`  
**PR:** #9  
**Production changed:** no  
**Supabase configuration changed:** no

## Objective

Make Supabase Auth the explicit authority for session refresh and logout scope while preserving the token-free Doke public session snapshot established by AUTH-A02.

## Cause root

`assets/js/services/auth-service.js` still exposed ambiguous logout semantics and browser-local recovery methods through the frozen `DokeAuth.service` facade. Calling `supabase.auth.signOut()` without a scope could perform global logout while the interface described a generic session exit. The existing refresh bridge used `getSession()` rather than an explicit provider refresh operation.

## Implemented in the first AUTH-A06 runtime slice

- Added `assets/js/services/auth-session-authority.js`.
- Added explicit `local`, `others` and `global` logout operations.
- Changed the default user-facing logout to `local`, meaning the current browser/device only.
- Added explicit provider refresh through `supabase.auth.refreshSession()`.
- Preserved the existing token-free `doke.auth.session.v1` public snapshot.
- Replaced `DokeAuth.service.requestRecovery/resetPassword` with delegates that fail closed unless AUTH-A05 is loaded.
- Removed legacy `doke.auth.recovery.v1` and `doke.auth.session` keys during authority initialization.
- Added capture-phase handling so legacy logout listeners cannot silently call the old ambiguous logout closure.
- Loaded the authority through `page-bootstrap.js` and explicitly on login, registration and password-recovery routes.
- Password recovery completion now requests explicit global logout after changing the password.
- Extended the existing blocking canonical-session runtime test.

## Public API

```js
DokeAuth.sessionAuthority.initialize();
DokeAuth.sessionAuthority.refresh();
DokeAuth.sessionAuthority.signOutCurrentDevice();
DokeAuth.sessionAuthority.signOutOtherSessions();
DokeAuth.sessionAuthority.signOutAllSessions();
DokeAuth.sessionAuthority.getPublicState();
```

## Safety boundaries

- No production environment was accessed or changed.
- No Supabase dashboard setting, database object, migration or Edge Function was changed.
- No user password, contact, profile, role or session was modified during implementation.
- No persistent synthetic account was created.
- No SMS or OAuth provider was enabled.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- The PR remains draft and must not be merged without explicit authorization.

## Current limitations

- The existing auth-service still owns the low-level `onAuthStateChange` bridge. AUTH-A06 currently wraps that bridge with explicit lifecycle semantics rather than duplicating a second provider subscription.
- Individual device enumeration is not implemented because the browser Supabase client does not provide a safe verified device inventory contract.
- Secure e-mail/phone changes remain reserved for AUTH-A07 and depend on controlled transactional e-mail validation.

## Required validation

- `npm run audit:auth-session`
- all static/governance audits
- blocking deterministic E2E
- 105 visual structural guards
- Doke Quality Gates
- Doke Diagnostic E2E
- Doke Staging Edge HTTP Canary

## Acceptance criteria for this slice

- Provider secrets never enter a Doke-owned snapshot.
- Refresh calls the Supabase refresh authority.
- Default logout sends `scope: 'local'`.
- Other-session logout sends `scope: 'others'` and preserves the current session.
- Global logout sends `scope: 'global'` and clears the current public snapshot.
- Browser-local recovery state cannot be recreated through `DokeAuth.service`.
- Real remote logout errors are not represented as successful revocation.
