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

## Future paid dependencies

Add every feature, infrastructure service, external API, monitoring tool, storage tier, e-mail service, AI quota, app-store cost, or security control that cannot be completed on the current free plans. Each item must state the expected cost, why it is necessary, and the milestone at which payment becomes justified.

---

# Current pending work

## SEC-B05 — Supabase Auth password hardening

**Status:** `BLOCKED`

- Code changes are not required for the specific leaked-password protection toggle.
- Dashboard activation is blocked by the Supabase plan.
- Broader password policy, reauthentication, recovery, and client error handling belong to `AUTH-001`.

## SEC-B09 — Authenticated Edge Function HTTP hardening

**Status:** `IN PROGRESS`

Completed:

- Shared HTTP security module created.
- Explicit CORS allowlist behavior added.
- Local development origins supported under controlled configuration.
- Wildcard browser CORS removed from the seven authenticated browser-facing functions.
- JSON content-type and object validation added.
- Request-body size limits added.
- Defensive response headers and request IDs added.
- Durable authenticated actor rate limiting added through migration `145_edge_function_abuse_guard.sql`.
- Migration applied to staging and validated with rollback-based behavioral SQL.
- Seven browser-facing Edge Functions deployed to staging with JWT verification enabled.

Still required before closure:

1. Run consolidated HTTP canaries for allowed origin, denied origin, preflight, missing JWT, invalid JSON, unsupported content type, oversized payload, and rate-limit response.
2. Record deployed function versions and canary evidence in repository validation documents.
3. Update the PR description and progress artifacts to the real staging state.
4. Re-run CI after evidence updates.
5. Review the remaining Security Advisor informational notice for the private server-only rate-limit table and document why no browser policy is expected.
6. Mark the PR ready only after the staging evidence is complete.

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
