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
