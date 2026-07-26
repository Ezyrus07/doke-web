# AUTH-001 / AUTH-A11 — Profile, settings and onboarding reconciliation authority

## Status

`IN PROGRESS` — browser/runtime implementation is complete and deterministic tests pass. Migration `147_identity_profile_reconciliation_authority.sql` remains versioned only and has not been applied to staging or production.

## Scope implemented

AUTH-A11 separates public-profile, settings and onboarding mutations from authentication/session authority.

### Profile

- Supabase profile mutation uses `update_account_profile_reconciled`.
- The server performs the mutation and returns `get_account_identity_state()`.
- The browser validates the returned subject before caching the canonical profile.
- Provider errors are not swallowed and the public session snapshot is not manually rewritten.

### Settings

- Settings use the narrow `update_account_settings` operation.
- Only the approved settings sections are persisted.
- E-mail, phone, role, account status and credentials remain outside this authority.
- The server-filtered response is canonical; rejected fields are not restored by the browser.

### Onboarding

- Supabase onboarding uses `complete_account_onboarding_reconciled`.
- The dispatcher executes `complete_account_onboarding(...)` and returns `get_account_identity_state()` in the same server-side operation.
- The browser no longer calls `supabase.auth.updateUser()` to duplicate city, state or onboarding status.
- The browser no longer writes the Supabase session snapshot after completion or state resolution.
- Success requires the returned user/profile subject to match the authenticated session and the returned onboarding status to be `completed`.
- The non-Supabase development fallback uses the local users repository directly and does not restore mutation powers to `DokeAuth`.

## Retired browser mutation surfaces

The following authentication-shaped identity mutations are absent:

- `DokeAuth.updateCurrentUser`;
- `DokeAuth.service.updateCurrentUser`;
- `DokeAuth.updateCurrentProfile`;
- `DokeAuth.service.updateCurrentProfile`;
- onboarding `auth.updateCurrentUser(...)`;
- onboarding `supabase.auth.updateUser(...)` metadata duplication.

## Deterministic validation

Permanent runtime coverage:

- `tests/auth/test-auth-profile-reconciliation-runtime.js`;
- `tests/auth/test-auth-settings-reconciliation-runtime.js`;
- `tests/auth/test-auth-onboarding-reconciliation-runtime.js`.

The onboarding runtime proves:

- the browser invokes `complete_account_onboarding_reconciled`;
- payload normalization is deterministic;
- successful completion consumes the canonical server response;
- no Supabase session writer is called;
- provider failure preserves the existing session and emits no success event;
- subject mismatch fails closed;
- `resolveState()` reads `get_account_identity_state` and does not rewrite the session.

SQL rollback validation `supabase/tests/016_identity_profile_reconciliation_authority_validation.sql` now covers:

- reconciled profile mutation;
- reconciled onboarding completion;
- onboarding subject, status and profile correctness;
- canonical identity reads;
- protected settings and identity fields;
- invalid settings rejection;
- full transaction rollback.

## Implementation validation

Implementation head before generated-matrix synchronization:

`b100d26f6e0f67801a711725426195b4b22a846d`

Doke Quality Gates #539 reached and passed:

- frontend, UI, domain-card, layout and flow audits;
- architecture, backend-data and Edge source-closure audits;
- auth/session audit and canonical auth runtime;
- JavaScript, domain-service, responsive and platform ACL audits;
- AUTH-A11 profile, settings and onboarding runtimes.

The run stopped only at the deterministic domain matrix because the newly added files had not yet been regenerated. No functional or authority test failed.

## Safety boundary

- Migration 147 was not applied to staging.
- No Edge Function was deployed.
- No production environment was changed.
- No real account, credential, contact, profile, role or settings record was modified.
- No persistent synthetic account was created.
- No SMTP, SMS or OAuth provider was enabled.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

## Remaining exit criteria

AUTH-A11 must not be marked `DONE` until:

1. migration 147 is reviewed and applied to staging;
2. SQL validation 016 passes in a transaction followed by rollback;
3. the updated `self-service-operations` Edge Function is deployed to staging;
4. authenticated staging canaries prove profile, settings and onboarding reconciliation with disposable test identities;
5. synthetic identities and data are removed;
6. final evidence, Engineering Journal and PR description are updated;
7. canonical Quality Gates, blocking E2E, visual guards and staging canary pass on the closure head.
