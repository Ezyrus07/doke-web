# AUTH-001 / AUTH-A08 — Legacy authority retirement and provider-surface truthfulness

**Date:** 2026-07-25  
**Branch:** `auth/auth-001-baseline-audit`  
**PR:** #9  
**Status:** `DONE`

## Objective

Retire the remaining browser-local authentication implementation and ensure that public authentication pages expose only providers and identifiers that are actually operational.

## Root cause

`assets/js/core/auth-service.js` was no longer loaded by active HTML, but still contained a complete second authentication implementation. That left a dormant authority capable of being reintroduced by a stale import. At the same time, login advertised phone access and login/signup displayed Google, Facebook and Apple controls even though no corresponding provider flow was configured.

The problem was therefore not merely visual. The repository still contained contradictory authentication contracts:

- one canonical remote authority;
- one dormant browser-local authority;
- user-facing controls for unavailable providers.

## Decision

- Preserve the old path as a **non-executable tombstone**, rather than silently leaving the implementation or deleting historical migration markers.
- Make e-mail the only login identifier presented by the canonical UI.
- Remove OAuth controls until a real provider, callback contract, state/nonce validation and staging canary exist.
- Block regressions through the existing mandatory auth/session runtime chain.

## Implementation

### Retired authority tombstone

`assets/js/core/auth-service.js` now contains documentation only. It:

- declares `AUTH-A08_RETIRED_AUTHORITY`;
- records the legacy identifiers needed by migration/audit history;
- contains no executable IIFE;
- performs no browser-storage access;
- creates no provider client;
- publishes no authentication API;
- contains no login, registration, recovery or password mutation flow.

### Canonical surfaces

`auth/login.html` now:

- uses `<input type="email">` as the canonical identifier;
- labels the field as **E-mail**;
- removes phone-login language, placeholder and mask hook;
- removes Google, Facebook and Apple controls.

`auth/cadastro.html` now removes Google, Facebook and Apple controls. Registration continues through the existing Supabase registration authority.

### Mandatory gate

`scripts/test-real-auth-only-contract.js` now verifies:

- the retired path is a non-executable tombstone;
- no forbidden authority token is present;
- login is e-mail-only;
- phone-login markers are absent;
- unconfigured OAuth controls are absent from login and signup;
- the canonical pages still load the required Supabase client/configuration.

`scripts/test-auth-canonical-session-runtime.js` executes this contract inside the blocking auth/session chain.

### Deterministic governance

`.github/workflows/deterministic-domain-matrix-sync.yml` adds a reusable, explicitly requested synchronization path for the generated domain matrix. The job:

- defaults to read-only permissions;
- receives write permission only inside its synchronization job;
- regenerates and validates the matrix;
- rejects any diff outside `docs/DOMAIN-COMPLETION-MATRIX.md`;
- publishes only that generated document.

## Validation

Validated runtime and visual head: `cae8fa312116ef2a2fa38507068e24067842a8d5`.

- Doke Quality Gates #414: `success`;
- static architecture and partition audits: `success`;
- canonical auth/session runtime: `success`;
- real-auth-only contract: `success`;
- blocking deterministic E2E: `success`;
- 105 visual structural guards: `success`;
- deterministic domain matrix: `success`;
- agent governance and asset audits: `success`;
- Doke Staging Edge HTTP Canary #188: `success`;
- `git diff --check`: `success`.

Doke Diagnostic E2E #209 remained non-blocking and was still executing when the mandatory closure gates completed. Documentation commits may cancel and replace that run through concurrency; no success claim is made for it in this evidence.

## Residual cleanup

- `.auth-social*` selectors may remain as inactive CSS until a dedicated dead-selector audit proves that no other surface consumes them.
- `applyPhoneMask` remains a dormant helper in the shared page controller, but no canonical auth page exposes `[data-phone-mask]`. It is not an active login capability and should be removed only in a controller-cleanup sublot with regression coverage.
- OAuth may be reconsidered only after provider configuration, callback hardening, CSRF/state/nonce handling and a real staging canary.

## Safety boundary

- No production environment was changed.
- No Supabase project configuration, migration or provider was changed.
- No existing user password, e-mail, phone, username, profile or role was changed.
- No persistent synthetic account was created.
- No SMS or OAuth provider was enabled.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.
