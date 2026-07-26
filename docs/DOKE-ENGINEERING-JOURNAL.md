# Doke Engineering Journal

## Purpose

This is the cumulative technical journal for Doke. It records what was changed, why it was changed, what was validated, what remains pending, and which items are blocked by cost, access, product decisions, or external dependencies.

This document is intentionally append-only in spirit: old entries should not be rewritten to make the past look cleaner. Corrections must be recorded as new entries that explain what changed.

## Operating rules

- Record the date, scope, branch or PR, decisions, implementation, validation, risks, pending work, and next step.
- Distinguish clearly between code completed, staging changes applied, production changes applied, and work only planned.
- Never mark an item complete only because the code exists; include the evidence that closed it.
- Keep paid-plan requirements in the dedicated backlog below so they are not forgotten near launch.
- Do not mix unrelated product or security changes in the same closure entry.

## Status legend

- `DONE`: implemented and validated with sufficient evidence.
- `IN PROGRESS`: implementation or validation is still underway.
- `BLOCKED`: cannot proceed without cost, access, decision, data, or external dependency.
- `PLANNED`: accepted work that has not started.
- `DEFERRED`: intentionally postponed with a recorded reason.

---

# Paid-plan and external-cost backlog

## PAID-001 — Supabase leaked-password protection

**Status:** `BLOCKED`

**Reason:** Supabase dashboard confirmed that **Prevent use of leaked passwords** is available only on the Pro plan and above. The current project plan rejected the configuration change.

**Required near launch:**

1. Upgrade the Supabase project to a plan that supports leaked-password protection.
2. Enable **Authentication → Providers → Email → Prevent use of leaked passwords**.
3. Re-run Security Advisor and confirm that `auth_leaked_password_protection` is absent.
4. Validate that a known compromised password is rejected.
5. Validate that a strong password still works normally.
6. Record timestamp, evidence, and rollback decision.

**Launch rule:** this may remain blocked during development, but it must be resolved or formally mitigated before a public beta with real users.

## MAIL-001 — Auth transactional e-mail provider and canaries

**Status:** `BLOCKED`

**Reason:** The Supabase built-in development SMTP quota returned `429 over_email_send_rate_limit` during the AUTH-A04 public signup canary. This quota is shared by signup, recovery and other Auth e-mail operations and is intentionally restrictive.

**Required before public beta:**

1. Configure a controlled custom SMTP provider or wait for a verified quota window.
2. Re-run signup confirmation with a disposable project-owned test mailbox.
3. Re-run password-recovery and e-mail-change canaries.
4. Verify redirect URLs, templates, delivery, expiry and replay behavior.
5. Delete synthetic identities and record delivery evidence.

**Boundary:** AUTH-A04 database and username authority is complete. E-mail delivery itself is not claimed as validated.

## Future paid dependencies

Add every feature, infrastructure service, external API, monitoring tool, storage tier, e-mail service, AI quota, app-store cost, or security control that cannot be completed on the current free plans. Each item must state the expected cost, why it is necessary, and the milestone at which payment becomes justified.

---

# Current pending work

## SEC-B05 — Supabase Auth password hardening

**Status:** `BLOCKED`

- Code changes are not required for the specific leaked-password protection toggle.
- Dashboard activation is blocked by the Supabase plan.
- The requirement remains tracked as `PAID-001` and cannot be presented as complete.
- Broader password policy, reauthentication, recovery, and client error handling belong to `AUTH-001`.

## SEC-B09 — Authenticated Edge Function HTTP hardening

**Status:** `DONE`

Closure evidence:

- Shared HTTP security module applied to all seven authenticated browser-facing functions.
- Explicit CORS allowlist and controlled local-development origins active.
- Wildcard browser CORS removed.
- JSON content-type, JSON object and actual request-byte validation active.
- Defensive response headers and request IDs active.
- Durable authenticated actor/action rate limiting applied through migration `145_edge_function_abuse_guard.sql`.
- Migration applied to staging and validated with rollback-based behavioral SQL.
- Seven functions deployed to staging with JWT verification enabled.
- Real GitHub Actions HTTP canary passed 49 of 49 cases.
- Machine-readable evidence stored in `docs/validation/SEC-001-B09-STAGING-HTTP-CANARY.json`.
- The private-table Security Advisor informational notice was reviewed and accepted as expected for a server-only authority with no direct API-role grants.

## AUTH-001 — Real authentication, session and identity

**Status:** `IN PROGRESS`

Baseline evidence:

- Branch `auth/auth-001-baseline-audit` was created from `MAIN@1412a4c3aac60c5392ebbca466f1ecd1a8aa1428`.
- `docs/validation/AUTH-001-BASELINE-AUDIT.md` records the active authorities, blockers, architecture decisions, execution order and gates of exit.
- `docs/validation/AUTH-001-BASELINE-AUDIT.json` stores the machine-readable baseline.
- No authentication runtime, Supabase project, production environment or user account was changed during the baseline.

Immediate blockers:

- fragmented direct-Supabase/API/legacy authority;
- access and refresh tokens duplicated in the Doke `localStorage` session snapshot;
- no single global reconciliation path for refresh, revocation and logout;
- private route guard defaults to `observe`;
- recovery/reset is not aligned with the real login and registration path;
- API register/recovery/reset handlers are not materialized;
- phone and OAuth controls are exposed without proven providers;
- username availability and transactional registration authority were resolved by AUTH-A04; confirmation-email delivery remains blocked under MAIL-001.

Next sublot: `AUTH-A05 — real password recovery, reset and reauthentication authority`.

## Next architectural domains after SEC-001

These remain high-level roadmap items and must be decomposed before execution:

- `AUTH-001`: real authentication, session, recovery, reauthentication, authorization, and user-facing failure handling.
- `ORDER-001`: complete order lifecycle and state-machine integration.
- `PAYMENT-001`: proposals, acceptance, payment, escrow, wallet, refunds, disputes, and withdrawal correctness.
- `SOCIAL-001`: messaging, notifications, communities, moderation, profiles, reviews, and social consistency.
- `PERFORMANCE-001`: loading, synchronization, retries, caching, navigation transitions, and observability.
- `APP-001`: native/mobile packaging, store readiness, app security, and release operations.

---

# Journal entries

## 2026-07-23 — SEC-001 evidence recovery merged

**Scope:** PR #6, `codex/sec-001-ci-candidate` → `MAIN`

**Outcome:** `DONE`

### What happened

- The deterministic SEC-001 CI candidate was reconciled with the cleaned `MAIN` branch.
- Repository history was cleaned after a large ZIP had accidentally entered local history.
- ZIP files were excluded through `.gitignore`.
- The final PR scope was reduced to three evidence JSON files.
- All five checks passed.
- PR #6 was squash-merged into `MAIN`.

### Final merge commit

`0d79a43754193546d87030e101d0abce0feee36e`

### Decision

GitHub became the authoritative project source for this work. A ZIP was not required for continuation.

### Next step selected

Create a clean branch dedicated to the remaining SEC-B05 and SEC-B09 work.

---

## 2026-07-23 — SEC-B05/B09 hardening branch and CI foundation

**Scope:** branch `sec/sec-001-b05-b09-hardening`, PR #8

**Outcome:** `IN PROGRESS`

### Implementation

- Added `supabase/functions/_shared/http-security.ts`.
- Hardened the seven authenticated browser-facing Edge Functions.
- Added migration `145_edge_function_abuse_guard.sql`.
- Added SQL validation `014_edge_function_abuse_guard_validation.sql`.
- Extended static audits and validation documentation.
- Regenerated `docs/DOMAIN-COMPLETION-MATRIX.md`.

### CI evidence

PR head after the evidence regeneration:

`fff2eecf6dc12d1b23922b2dcc305bed3c6e3351`

Both workflows completed successfully:

- Doke Quality Gates.
- Doke Diagnostic E2E.

### Decision

Do not merge the PR merely because CI is green. Staging migration, function deployment, HTTP canaries, Auth configuration, and final evidence must be completed first.

---

## 2026-07-23 — Migration 145 applied and validated on staging

**Project:** `doke-web-staging`

**Project ref:** `zwkczgewzbsorbrjuzpb`

**Outcome:** `DONE`

### Change applied

Migration `145_edge_function_abuse_guard.sql` was applied to staging.

### Validation performed

The validation SQL confirmed, inside a transaction followed by rollback:

- the private bucket table exists;
- RLS is enabled;
- API roles cannot directly read the table;
- browser roles cannot execute the internal rate-limit authority;
- `service_role` can execute it;
- the authority is `SECURITY DEFINER`;
- the authority uses `search_path = pg_catalog`;
- the first two requests under a limit of two are allowed;
- the third request is denied;
- retry metadata is returned.

### Security Advisor result

- One informational notice exists because the private server-only table has RLS enabled and no policies.
- This is expected because direct access was revoked and the table is only reached through the restricted service-role authority.
- Leaked-password protection remained disabled.

---

## 2026-07-23 — Seven authenticated Edge Functions deployed to staging

**Outcome:** `DONE` for deployment, `IN PROGRESS` for post-deploy HTTP validation

### Active versions after deployment

- `financial-operations`: version 2.
- `professional-verification-operations`: version 2.
- `self-service-operations`: version 4.
- `service-moderation-operations`: version 3.
- `staging-finance-sandbox`: version 2.
- `order-event-operations`: version 9.
- `quote-template-ai`: version 7.

All seven remained `ACTIVE` with `verify_jwt = true`.

### Boundaries preserved

- `order-event-worker` was not included because it is not one of the seven authenticated browser-facing operations functions in this hardening scope.
- Existing per-function dependencies and import maps were preserved.
- The deterministic fallback behavior of `quote-template-ai` was preserved.

### Remaining validation

A consolidated real HTTP canary is still required because the available connector could deploy and inspect functions but could not invoke their public URLs directly.

---

## 2026-07-23 — Supabase Pro dependency identified

**Outcome:** `BLOCKED`

### Attempt

The **Prevent use of leaked passwords** option was selected in the Supabase Email provider settings.

### Result

Supabase rejected the change and displayed that leaked-password protection through HaveIBeenPwned.org is available only on Pro plans and above.

### Decision

- Do not subscribe only to close this isolated item during active development.
- Continue all work that can be completed without a paid plan.
- Preserve this requirement in the paid-plan backlog.
- Revisit the upgrade near the final launch-readiness phase.
- Do not claim `SEC-B05` as complete while the warning remains.

### Next step

Finish the free-plan portion of `SEC-B09`, record final staging evidence, and keep `PAID-001` visible until the launch-readiness review.

---

## 2026-07-24 — SEC-B09 staging closure and paid-plan deferral

**Scope:** PR #8, staging project `zwkczgewzbsorbrjuzpb`

**Outcome:** `DONE` for `SEC-B09`; `BLOCKED` for `SEC-B05`

### Context

Deployment alone did not prove that the public HTTP boundary behaved correctly. A real network canary was required for all seven authenticated browser-facing functions without exposing service credentials or creating privileged test users.

### Implementation

- Added `scripts/validate-staging-edge-http-canary.mjs`.
- Added a dedicated read-only GitHub Actions gate: `Doke Staging Edge HTTP Canary`.
- The canary reads only the public client configuration already used by the frontend.
- It does not use `service_role`, create users, change data or invoke privileged business operations.
- The governed domain-completion matrix was regenerated after the new script and workflow entered the repository scope.

### Validation

The real staging canary executed seven cases against each of seven functions:

- allowed preflight;
- denied preflight;
- missing JWT;
- anon JWT without an authenticated user;
- invalid JSON;
- unsupported content type;
- oversized payload.

Result: **49 passed, 0 failed**.

Rate-limit behavior was validated separately through `014_edge_function_abuse_guard_validation.sql`, which proved threshold enforcement, denial, remaining count, retry metadata and restricted execution privileges inside a rolled-back staging transaction.

The complete machine-readable summary is recorded in `docs/validation/SEC-001-B09-STAGING-HTTP-CANARY.json`.

### Security Advisor decision

The `rls_enabled_no_policy` informational notice on the private bucket table is accepted as expected. The table intentionally exposes no direct browser/API-role access, so adding a browser policy would contradict the server-only design.

The leaked-password warning remains unresolved because activation is restricted to Supabase Pro. It stays in `PAID-001` and does not convert into a false completion claim.

### Risks and boundaries

- No production Supabase project was changed.
- `order-event-worker` remained outside this scope.
- The canary does not prove authenticated business-role success paths; those belong to their domain-specific integration suites.
- Public beta remains blocked until paid leaked-password protection is enabled or a formally accepted mitigation exists.

### Decision

- Close `SEC-B09` as implemented and validated on staging.
- Keep `SEC-B05` blocked by plan.
- Do not subscribe during active development only to remove one warning.
- Finish the PR evidence and checks before beginning `AUTH-001`.

### Next step

Run final CI on PR #8, mark it ready for review when all checks are green, and do not merge without explicit approval.

---

## 2026-07-24 — PR #8 merged and AUTH-001 baseline opened

**Scope:** PR #8 → `MAIN`; branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for the SEC-B09 merge; `IN PROGRESS` for AUTH-001

### Context

PR #8 completed the free-plan portion of SEC-001 and was squash-merged only after Quality Gates, Diagnostic E2E and the staging Edge HTTP canary passed. The next mandatory domain in the completion matrix is authentication, session and identity.

### Merge evidence

- PR #8 final head: `e4961c262754fc5befcdd8b04b105506edd7aaec`.
- Squash merge commit in `MAIN`: `1412a4c3aac60c5392ebbca466f1ecd1a8aa1428`.
- `SEC-B09`: closed as validated on staging.
- `SEC-B05`: remains `BLOCKED` under `PAID-001`.

### Baseline findings

- The active frontend service is `assets/js/services/auth-service.js` with `assets/js/core/session.js` as the application snapshot authority.
- A dormant legacy auth implementation remains at `assets/js/core/auth-service.js`.
- Supabase direct auth and the controlled `/auth/*` provider coexist.
- The Doke session snapshot duplicates access and refresh tokens in `localStorage`.
- The route guard observes private routes by default instead of enforcing them.
- Real login/cadastro and recovery/reset do not currently share one complete authority.
- API register, recovery and reset routes are declared but not materialized by real handlers.
- Phone, OAuth and username availability are not yet backed by proven real providers/transactional authority.

### Decision

Do not refactor auth immediately. First freeze the active authority, prove the loading graph and capture the current behavior in deterministic tests. This prevents removing a dormant file or changing session storage without knowing every consumer.

### Evidence created

- `docs/validation/AUTH-001-BASELINE-AUDIT.md`.
- `docs/validation/AUTH-001-BASELINE-AUDIT.json`.

### Risks and boundaries

- No login, cadastro, recovery, route guard or session behavior changed in this baseline.
- No Supabase Auth setting or database object changed.
- No production environment changed.
- `PAID-001` remains visible and unresolved.

### Next step

Execute `AUTH-A01`: add an executable authority/loading audit and regression tests for the current authentication behavior before beginning the canonical session refactor.

---

## 2026-07-24 — AUTH-A02 canonical Supabase session

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `IN PROGRESS` pending final CI

### Context

The Supabase SDK already persisted and refreshed its cryptographic session, while the Doke Session Store duplicated access and refresh tokens in `doke.auth.session.v1`. This created a second secret store and allowed the visual identity snapshot to drift from the provider session.

### Implementation

- Removed provider secrets from the normalized Doke session DTO.
- Added automatic sanitization for token-bearing legacy snapshots.
- Recognized `supabase` as a first-class session provider.
- Added one Supabase bridge using `getSession()` and `onAuthStateChange()`.
- Added `DokeAuth.getAccessToken()` so consumers resolve tokens from the provider authority.
- Kept API-canary access tokens volatile in memory only.
- Updated orders canary and professional-access synchronization to stop reading/copying snapshot tokens.
- Added a deterministic runtime gate for bootstrap, refresh, migration and sign-out.

### Validation boundary

- No Supabase project, Auth setting, database object or production environment was changed.
- No user credentials were created or mutated.
- Route enforcement, registration authority, recovery and optional providers remain outside this sublot.

### Next step

Execute `AUTH-A03`: controlled route enforcement and explicit 401, 403, suspended, expired and revoked states.

---

## 2026-07-24 — AUTH-A04 registration and username authority closed

**Scope:** PR #9, staging project `zwkczgewzbsorbrjuzpb`

**Outcome:** `DONE` for AUTH-A04; `BLOCKED` for MAIL-001

### Context

Username availability was still a browser-local guess while Supabase Auth and the existing account materializer could independently assign a different handle during a collision. Registration needed one transactional authority before recovery and other identity flows could be trusted.

### Implementation

- Added migration `146_auth_registration_username_authority.sql`.
- Added canonical normalization, reserved-name rules and public availability RPC.
- Strengthened `private.materialize_auth_account(uuid)`, preserving the existing `on_auth_user_created_doke` trigger as the only Auth materialization entry point.
- Added `assets/js/services/auth-registration-authority.js` between the canonical auth service and the signup controller.
- Added deterministic runtime and rollback-based SQL validation.
- Kept browser snapshots free of reservations, credentials and provider secrets.

### Correction recorded

The first migration candidate attempted to add a second trigger directly to the Supabase-owned `auth.users` table. The migration executor rejected it with `must be owner of relation users`, and the transaction left no partial objects. The corrected design reused the existing canonical materializer instead of bypassing ownership or adding a competing trigger.

### Validation

- Corrected migration dry-run: passed with rollback.
- Quality Gates #293: success.
- Diagnostic E2E #88: success.
- Staging Edge HTTP Canary #67: success.
- Migration `auth_registration_username_authority`: applied to staging.
- SQL validation 015: passed with rollback.
- Available, taken, reserved and signup-race behavior: proven transactionally.
- RPC grants and private materializer isolation: confirmed.
- Existing profiles after validation: 3.
- Synthetic AUTH-A04 users remaining: 0.

### Public signup canary

The public `anon` canary reached the Supabase `/auth/v1/signup` endpoint. An `example.test` address was rejected with `400 email_address_invalid`; an `example.com` address passed validation but the built-in SMTP returned `429 over_email_send_rate_limit` before account creation. No test account was persisted, and post-signup HTTP assertions were not reached.

This is recorded as `MAIL-001`. It does not invalidate the username transaction authority, but confirmation-email delivery remains explicitly unvalidated until SMTP capacity is available.

### Risks and boundaries

- Production was not changed.
- Existing users and usernames were preserved.
- Recovery/reset, OAuth, phone authentication and post-registration username changes remain outside AUTH-A04.
- `PAID-001` remains unresolved.

### Next step

Execute `AUTH-A05`: replace the local recovery/reset flow with Supabase recovery, secure update-password handling and reauthentication states, while keeping MAIL-001 visible for real delivery canaries.

---

## 2026-07-24 — AUTH-A05 password recovery and reauthentication authority closed

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for AUTH-A05; `BLOCKED` for MAIL-001 and PAID-001

### Context

The previous password-recovery experience generated and accepted browser-local codes, which were not an authentication authority and could diverge from the real Supabase login identity. Password changes in Settings also needed explicit current-password verification and provider-controlled session revocation.

### Decision

Use Supabase Auth as the only credential authority. Keep Doke responsible only for controlled UI state, public identity snapshots and fail-closed navigation; never persist passwords, recovery credentials, access tokens or refresh tokens in Doke-owned storage.

### Implementation

- Replaced local recovery-code generation with `supabase.auth.resetPasswordForEmail`.
- Accepted password reset only through a legitimate `PASSWORD_RECOVERY` context.
- Used `supabase.auth.updateUser({ password })` to complete recovery.
- Required `signInWithPassword` reauthentication before a Settings password change.
- Revoked other sessions through `signOut({ scope: 'others' })` after an authenticated password change.
- Consolidated request and completion in `auth/esqueci-senha.html`.
- Added token-free early recovery-state handling, canonical authority service, page controllers, dialog styling and deterministic runtime coverage.
- Added `docs/validation/AUTH-001-A05-PASSWORD-RECOVERY.md` and `docs/validation/AUTH-001-A05-PASSWORD-RECOVERY.json`.

### Validation

Runtime and visual-validation head: `1ccd40328596368703bbf2e507fcaef3c3bb908c`.

- Doke Quality Gates #351: success.
- Blocking deterministic E2E: success.
- 105 visual structural guards: success.
- Doke Diagnostic E2E #146: success.
- Doke Staging Edge HTTP Canary #125: success.
- Static audits, governance, matrix generation, form/button/modal contracts and `git diff --check`: success.

### Closure-workflow correction

A temporary workflow named `Close AUTH-A05 evidence and journal` replaced `.github/workflows/staging-edge-http-canary.yml` only to publish closure documentation. Its local restoration succeeded, but its publication step failed. The branch was inspected rather than assumed: the canonical `Doke Staging Edge HTTP Canary` workflow was confirmed restored on the current GitHub head before this entry was added. No additional temporary workflow was created.

### Risks and boundaries

- No production environment was changed.
- No Supabase Auth setting, database object or user password was changed during this closure.
- No persistent synthetic account was created.
- SMS and OAuth remain unavailable rather than simulated.
- Actual signup and recovery e-mail delivery remains unvalidated because the development SMTP returned `429 over_email_send_rate_limit`; this remains `MAIL-001`.
- Leaked-password protection remains blocked by the Supabase Pro requirement under `PAID-001` / `SEC-B05`.
- PR #9 remains a draft and must not be merged without explicit authorization.

### Pending work

- Revalidate the documentation-only closure head through the three canonical workflows.
- Plan the next AUTH-001 sublot for provider-authoritative session/device lifecycle, logout scopes, refresh/revocation reconciliation, secure contact changes and removal of remaining browser identity fallbacks.

### Next step

Define `AUTH-A06` scope, affected files, Supabase impact, tests, canaries and risks before changing runtime code.

---

## 2026-07-24 — AUTH-A06 provider-authoritative session lifecycle closed

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for AUTH-A06; `PLANNED / BLOCKED` for AUTH-A07 under MAIL-001

### Context

Logout, refresh and identity fallbacks still had ambiguous ownership after the canonical Supabase session was introduced. A generic logout could revoke a broader session scope than the interface communicated, refresh did not force the provider operation, and dormant browser-local recovery and identity paths remained physically reachable inside the canonical service boundary.

### Decision

Use one explicit Supabase session lifecycle authority. Default logout must affect only the current device, broader revocation must be a deliberate operation, provider failures must fail visibly, and browser-local recovery or identity mutation must not remain as a fallback.

### Implementation

- Added `assets/js/services/auth-session-authority.js` as the lifecycle authority.
- Added explicit `local`, `others` and `global` logout operations.
- Made current-device/local logout the default user action.
- Added explicit `supabase.auth.refreshSession()` reconciliation.
- Added distinct Settings actions for the current session, other sessions and all sessions.
- Required confirmation for global logout.
- Removed local recovery-code generation, `debugCode` and local password mutation from `auth-service.js`.
- Removed local username-availability fallback and storage-based compatibility guards.
- Blocked identity/profile mutation through the Auth facade without a dedicated remote authority.
- Removed the legacy auth controller from the canonical recovery page.
- Added deterministic AUTH-A06 runtime coverage and permanent named CI audit steps.
- Added `docs/validation/AUTH-001-A06-SESSION-LIFECYCLE.md` and JSON evidence.

### Validation

Runtime and visual-validation head: `9715531da1caf052e2c15b2f7462cc0ce86e1156`.

- Doke Quality Gates #401: success.
- Blocking deterministic E2E: success.
- 105 visual structural guards: success.
- Doke Diagnostic E2E #196: success.
- Doke Staging Edge HTTP Canary #175: success.
- Static architecture audits, auth/session runtime, deterministic matrix, governance, asset audits and `git diff --check`: success.

### Risks and boundaries

- No production environment, Supabase migration or Auth configuration was changed.
- No existing user credential, contact, profile or role was changed.
- No persistent synthetic account was created.
- A per-device session inventory was not fabricated because no verified client contract exists for it.
- `MAIL-001` remains open for real signup, recovery and e-mail-change delivery canaries.
- `PAID-001 / SEC-B05` remains blocked by plan.
- PR #9 remains draft and must not be merged without explicit authorization.

### AUTH-A07 planning result

`docs/validation/AUTH-001-A07-CONTACT-CHANGE-PLAN.md` defines the secure contact-change authority, file ownership, deterministic tests, real staging canary and exit criteria. Runtime implementation is intentionally blocked until controlled transactional e-mail delivery can be validated.

### Next step

Continue AUTH-001 with the next sublot that is not dependent on MAIL-001, or resolve MAIL-001 before implementing AUTH-A07. Do not create a simulated e-mail or phone verification path.

---


## 2026-07-25 — AUTH-A08 legacy authority and unavailable providers retired

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for AUTH-A08; `BLOCKED` for optional providers without real configuration

### Context

The active pages no longer loaded the old browser authentication service, but the file still contained a complete second authority that could be restored by a stale import. Login also advertised phone access, while login and signup exposed Google, Facebook and Apple controls without configured provider flows.

### Decision

Keep the historical path as a non-executable tombstone, expose e-mail as the only canonical login identifier, remove unavailable OAuth controls and make this contract part of the mandatory auth/session runtime gate.

### Implementation

- Replaced `assets/js/core/auth-service.js` with the `AUTH-A08_RETIRED_AUTHORITY` tombstone.
- Removed all executable credential, registration, recovery, storage and API-publication behavior from that path.
- Preserved only historical legacy identifiers for migration and audit traceability.
- Made `auth/login.html` e-mail-only and removed phone-login language and hooks.
- Removed Google, Facebook and Apple controls from login and signup.
- Strengthened `scripts/test-real-auth-only-contract.js`.
- Added the real-auth-only contract to `scripts/test-auth-canonical-session-runtime.js`.
- Added a restricted deterministic matrix synchronization workflow.
- Added Markdown and JSON closure evidence under `docs/validation/`.

### Validation

Runtime and visual-validation head: `cae8fa312116ef2a2fa38507068e24067842a8d5`.

- Doke Quality Gates #414: success.
- Blocking deterministic E2E: success.
- 105 visual structural guards: success.
- Doke Staging Edge HTTP Canary #188: success.
- Static audits, auth/session runtime, real-auth-only contract, matrix, governance, asset audits and `git diff --check`: success.
- Diagnostic E2E #209 was non-blocking and still executing when mandatory closure gates completed; no success claim was made for it.

### Risks and boundaries

- No production environment, authentication provider configuration or database object was changed.
- No existing account, credential, contact, profile or role was changed.
- No SMS or OAuth provider was enabled.
- Inactive social-auth CSS and a dormant phone-mask helper remain candidates for a dedicated dead-code/controller cleanup audit; they do not expose active controls.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

### Next step

Plan `AUTH-A09` around `AUTH-B02`: remove browser-controlled provider selection and promote remote authentication as the only production authority through controlled route-by-route canaries.

---

## 2026-07-25 — AUTH-A09 browser-controlled auth provider selection retired

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for AUTH-A09; `BLOCKED` for MAIL-001 and PAID-001

### Context

Login and registration already used Supabase, but runtime configuration and the auth facade still accepted provider selection from query strings, localStorage and window configuration. Those browser-controlled values could redirect bootstrap, refresh and token resolution to the historical `/auth/*` adapter.

### Decision

Supabase Auth is the only active browser authentication authority. Historical `/auth/*` verification remains CLI-only and cannot mutate browser provider state.

### Implementation

- Fixed `authProvider`, `requestedAuthProvider` and `defaultAuthProvider` to `supabase` in runtime configuration.
- Retired `doke.authProvider`, `dokeAuthProvider`, `dokeAuthIdentityCanary` and the browser canary storage key.
- Removed public browser APIs for configuring or rolling back the auth provider canary.
- Routed browser refresh, token resolution, logout and bootstrap through Supabase.
- Kept the historical API smoke isolated in the CLI-only diagnostic harness.
- Added deterministic malicious-override coverage and connected it to the mandatory canonical auth runtime chain.
- Updated auth contracts, runbook, E2E setup and deterministic domain evidence.

### Validation

Canonical validation head: `8ff0fedb57a4ec945b4ab4906193f2d195a31271`.

- Doke Quality Gates #442: success.
- Static architecture and partition audits: success.
- Canonical auth/session runtime and AUTH-A09 provider-authority runtime: success.
- Blocking deterministic E2E lane: success.
- 105 visual structural guards: success.
- Doke Staging Edge HTTP Canary #216: success.
- Deterministic matrix, governance, asset audits and `git diff --check`: success.
- Doke Diagnostic E2E #237 remained in progress at mandatory closure and is non-blocking; no success claim was made.

### Risks and boundaries

- No production environment or Supabase configuration was changed.
- No account, credential, contact, profile or role was changed.
- No SMTP, SMS or OAuth provider was enabled.
- Historical API helper functions remain private and unreachable pending a dedicated deletion audit.
- Operational data-provider flags remain outside this auth-only sublot.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

### Next step

Plan AUTH-A10 to remove unreachable browser `/auth/*` adapter code and remaining dead auth helpers while preserving the standalone CLI diagnostic and canonical Supabase behavior.

---

## 2026-07-25 — AUTH-A10 unreachable browser auth adapter physically removed

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`

**Outcome:** `DONE` for AUTH-A10; `BLOCKED` for MAIL-001 and PAID-001

### Context

AUTH-A09 fixed Supabase as the only browser authentication authority, but `assets/js/services/auth-service.js` still retained unreachable `/auth/*` endpoints, request helpers, a volatile API token, provider-status facades and a no-op `refreshApiSession` compatibility path. Dormant authority-shaped code increased regression risk even though it could no longer be selected.

### Decision

Delete the historical browser adapter physically. Preserve only the standalone CLI diagnostic and public compatibility methods with proven active consumers.

### Implementation

- Removed browser constants and helpers for `/auth/login`, `/auth/register`, `/auth/session` and `/auth/logout`.
- Removed the volatile API token and API request/session normalization helpers.
- Removed `refreshApiSession`, `refreshCurrentIdentity`, `getAuthProviderStatus` and `getAuthIdentityCanaryStatus` from the public facade.
- Migrated owner-profile identity confirmation to canonical `refreshSession({ silent: true })`.
- Preserved `getActiveAuthProvider()` as a constant Supabase compatibility surface because it has an active verification-service consumer.
- Preserved the CLI-only Auth/Identity diagnostic outside browser runtime.
- Added deterministic source/runtime coverage and strengthened the AUTH-A09 regression test to require the retired facades to be absent.
- Corrected active contracts and runbooks that still described the browser canary as active.

### Validation

Canonical validation head: `b72d3fa414cf91563c13ef73e9f9d241c0b4ce77`.

- Doke Quality Gates #464: success.
- Static architecture and partition audits: success.
- Canonical auth/session runtime and AUTH-A10 dead-adapter runtime: success.
- Blocking deterministic E2E lane: success.
- 105 visual structural guards: success.
- Doke Staging Edge HTTP Canary #238: success.
- Deterministic matrix, governance, asset, E2E-lane and `git diff --check` audits: success.
- Doke Diagnostic E2E #259 remained in progress at mandatory closure and is non-blocking; no success claim was made.

### Risks and boundaries

- No production environment or Supabase configuration was changed.
- No account, credential, session, contact, profile or role was changed.
- No SMTP, SMS or OAuth provider was enabled.
- Generic domain repository providers remain outside this auth-only sublot.
- Local/mock-shaped profile mutation helpers remain a separate authority concern and were not silently rewritten in A10.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

### Next step

Plan AUTH-A11 to separate profile/public-identity mutation from authentication authority, eliminating local mock session rewrites without conflating the work with blocked verified contact changes in AUTH-A07.

---

## 2026-07-26 — AUTH-A11 provider-reconciled identity authority closed

**Scope:** PR #9, branch `auth/auth-001-baseline-audit`, staging `zwkczgewzbsorbrjuzpb`

**Outcome:** `DONE` for AUTH-A11; `BLOCKED` for AUTH-A07 under MAIL-001 and for PAID-001 / SEC-B05

### Context and decision

Profile, settings and onboarding mutations still crossed the authentication boundary and could duplicate provider metadata or rewrite the public session snapshot. Supabase Auth remains the credential/session authority; public identity mutations now use narrow server-side self-service operations and canonical server responses.

### Implementation

- Removed `DokeAuth.updateCurrentUser` and `DokeAuth.updateCurrentProfile`.
- Added `update_account_profile_reconciled`, `update_account_settings`, `complete_account_onboarding_reconciled` and canonical identity reads.
- Removed browser `supabase.auth.updateUser(...)` metadata duplication and manual Supabase session writes from profile/onboarding flows.
- Added permanent profile, settings and onboarding reconciliation runtimes.
- Applied migration 147 to staging as version `20260726141755`.
- Deployed `self-service-operations` v5 with `verify_jwt = true`.

### Validation

- Head `e5341f5f9063ddf36c1c350971c6568e4625f62b` passed Quality Gates #544, blocking E2E, 105 visual guards, Edge HTTP Canary #318 and Diagnostic E2E #339.
- SQL validation 016 passed with transaction rollback and zero residual synthetic rows.
- Authenticated public-Edge canary run `30206309047`, final job `89805250392`, passed profile, settings, onboarding and final identity reconciliation.
- Protected e-mail, role and account status remained unchanged; rejected settings keys were not persisted.
- The disposable identity was deleted; remaining rows in `auth.users`, `auth.identities`, `public.users` and `public.user_profiles` were all zero.
- No new AUTH-A11-specific Security Advisor issue was introduced.

### Risks and boundaries

- Production and real users were not changed.
- No persistent synthetic identity remains.
- No SMTP, SMS, OAuth or paid configuration was enabled.
- `MAIL-001` and `PAID-001 / SEC-B05` remain open.
- PR #9 remains draft and must not be merged without explicit authorization.

### Next step

Audit and reconcile remaining identity/profile contracts and dormant local repository surfaces before choosing the next unblocked AUTH-001 implementation sublot. AUTH-A07 stays blocked while MAIL-001 is unresolved.

---

# Entry template

## YYYY-MM-DD — Title

**Scope:** branch, PR, domain, page, service, or release

**Outcome:** `DONE | IN PROGRESS | BLOCKED | PLANNED | DEFERRED`

### Context

Why this work was necessary.

### Decision

What was chosen and why.

### Implementation

What was actually changed.

### Validation

Tests, checks, screenshots, queries, or runtime evidence.

### Risks and boundaries

What was intentionally not changed and what can still fail.

### Pending work

Concrete unfinished items.

### Next step

The single next logical action.
