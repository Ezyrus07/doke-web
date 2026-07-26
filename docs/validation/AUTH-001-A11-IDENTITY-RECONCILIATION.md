# AUTH-001 / AUTH-A11 — Profile, settings and onboarding reconciliation authority

## Status

`DONE` — browser/runtime authority, staging database authority, Edge Function deployment, rollback validation and authenticated public-Edge canary are complete. Production was not changed.

## Scope implemented

AUTH-A11 separates public-profile, settings and onboarding mutations from authentication/session authority.

### Profile

- Supabase profile mutation uses `update_account_profile_reconciled`.
- The server performs the mutation and returns `get_account_identity_state()` in the same operation.
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

The runtime chain proves:

- profile, settings and onboarding use their narrow self-service operations;
- successful mutations consume canonical server responses;
- no Supabase session writer is called;
- provider failures preserve the existing public session and cache;
- subject mismatch fails closed;
- protected identity fields are not reintroduced by the browser;
- `resolveState()` reads canonical identity state without rewriting the session.

Implementation validation head before staging closure:

`e5341f5f9063ddf36c1c350971c6568e4625f62b`

Validation on that head:

- Doke Quality Gates #544: success;
- blocking deterministic E2E: success;
- 105 visual structural guards: success;
- Doke Staging Edge HTTP Canary #318: success;
- Doke Diagnostic E2E #339: success;
- deterministic matrix, governance and `git diff --check`: success.

## Staging database closure

Project:

- name: `doke-web-staging`;
- project ref: `zwkczgewzbsorbrjuzpb`.

Migration:

- repository file: `supabase/migrations/147_identity_profile_reconciliation_authority.sql`;
- applied migration name: `identity_profile_reconciliation_authority`;
- applied migration version: `20260726141755`;
- production application: none.

SQL validation:

- file: `supabase/tests/016_identity_profile_reconciliation_authority_validation.sql`;
- executed inside a transaction followed by `rollback`;
- reconciled profile mutation passed;
- reconciled onboarding completion passed;
- canonical identity reads passed;
- protected settings, e-mail, role and account status checks passed;
- invalid settings section failed closed;
- synthetic rows after rollback: zero.

Independent permission verification confirmed:

- `anon` cannot execute `get_account_identity_state()`;
- `authenticated` cannot execute `get_account_identity_state()` directly;
- `anon` cannot execute `update_account_settings(jsonb)`;
- `authenticated` cannot execute `update_account_settings(jsonb)` directly;
- `service_role` retains the expected dispatcher-only execution path.

## Edge Function deployment

`self-service-operations` was deployed to staging as version 5:

- status: `ACTIVE`;
- `verify_jwt`: `true`;
- deployed source digest: `6f7056c907ba6366b6a5dcd4d2e1f33a203d0c3edcbb7562ec05ef628c24bfd8`;
- shared HTTP security module and import map preserved;
- AUTH-A11 actions present in the active allowlist.

## Authenticated public-Edge canary

A disposable staging identity was authenticated through the public password-grant endpoint and used to invoke the deployed Edge Function with a real bearer JWT.

GitHub Actions evidence:

- workflow: `AUTH-A11 Authenticated Edge Canary`;
- run ID: `30206309047`;
- final job ID: `89805250392`;
- final conclusion: `success`.

The canary exercised:

1. `get_account_identity_state`;
2. `update_account_profile_reconciled`;
3. `update_account_settings`;
4. `complete_account_onboarding_reconciled`;
5. final canonical identity read.

It proved:

- authenticated subject and returned profile subject matched;
- profile fields reconciled through the server authority;
- protected settings fields were filtered and not persisted;
- e-mail, role and account status remained unchanged;
- onboarding returned `completed` with canonical profile state;
- the final identity snapshot remained internally consistent;
- no password or bearer token was stored in repository evidence.

The temporary workflow was deleted after the run.

## Synthetic identity cleanup

After the authenticated canary, the disposable identity was deleted. Independent counts confirmed:

- `auth.users`: 0 matching rows;
- `auth.identities`: 0 matching rows;
- `public.users`: 0 matching rows;
- `public.user_profiles`: 0 matching rows.

No persistent AUTH-A11 synthetic account or profile remains.

## Advisor review

No new advisor issue attributable to migration 147 was detected.

Existing notices remain separately governed:

- leaked-password protection remains disabled under `PAID-001 / SEC-B05`;
- public username availability remains an intentional registration authority;
- the private rate-limit bucket table remains server-only with RLS and no browser policy;
- unused-index notices are informational in the low-traffic staging environment and were not used as a basis for deletion.

## Safety boundary

- Production was not changed.
- No real account, credential, contact, profile, role or settings record was modified.
- No persistent synthetic account was created.
- No SMTP, SMS or OAuth provider was enabled.
- No paid configuration was changed.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- AUTH-A07 remains planning-only and blocked by transactional e-mail delivery.
- PR #9 remains draft and must not be merged without explicit authorization.
