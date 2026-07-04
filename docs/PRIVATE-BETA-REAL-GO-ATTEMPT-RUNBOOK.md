# Private Beta Real GO Attempt Runbook

## Purpose

Sprint 166-180 turns the previous NO-GO blockers into an executable operator attempt. The goal is not to force a launch. The goal is to run the full evidence chain as far as the current machine and environment allow, then emit an honest GO/NO-GO result.

## Commands

```bash
npm run audit:private-beta-real-go-attempt
npm run execute:private-beta-real-go-attempt:dry-run
npm run execute:private-beta-real-go-attempt:check-env
npm run execute:private-beta-real-go-attempt
npm run execute:private-beta-real-go-attempt:report
```

## Evidence chain

The attempt executes or evaluates:

1. Visual manifest coverage.
2. Playwright visual/responsive evidence.
3. Browser quality evidence.
4. Staging seed binder.
5. Private beta real rehearsal.
6. Private beta go-live gate.

## Real browser execution

To actually launch browser evidence, use the underlying execution flags:

```bash
DOKE_VISUAL_RESPONSIVE_EVIDENCE_EXECUTE=1 \
DOKE_BROWSER_QUALITY_EXECUTE=1 \
DOKE_LIGHTHOUSE_EXECUTE=1 \
DOKE_MANUAL_A11Y_REVIEW_COMPLETE=1 \
npm run execute:private-beta-real-go-attempt:report
```

Only set the manual accessibility flag after keyboard, focus, reduced-motion and screen-reader checks have been reviewed.

## Staging and seeds

A real staging attempt still requires safe staging values:

```bash
DOKE_ENVIRONMENT=staging \
DOKE_STAGING_API_URL=https://staging-api.example \
DOKE_SUPABASE_DB_URL=postgres://staging-db.example \
DOKE_STAGING_SEED_BINDER_CONFIRM=bind-staging-seeds \
DOKE_STAGING_SEED_BINDER_EXECUTE=1 \
DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1 \
npm run execute:private-beta-real-go-attempt:report
```

The binder rejects production-looking URLs and requires local/staging/sandbox markers.

## GO confirmation

A GO decision also requires manual confirmations from the lower gates:

```bash
DOKE_PRIVATE_BETA_REHEARSAL_CONFIRM=rehearse-private-beta \
DOKE_PRIVATE_BETA_GO_LIVE_CONFIRM=launch-private-beta \
npm run execute:private-beta-real-go-attempt:report
```

## Expected statuses

- `private_beta_real_go_attempt_plan_ready`: command chain is wired.
- `private_beta_real_go_attempt_environment_has_blockers`: env values or tools are missing.
- `private_beta_real_go_attempt_no_go`: evidence chain ran but beta must remain blocked.
- `private_beta_real_go_attempt_go`: evidence chain and confirmations are ready for controlled private beta entry.

## Safety rules

- Do not set production URLs.
- Do not set mutation flags without staging seeds approved.
- Do not set manual review flags without real manual review.
- Do not treat generated baselines as approved visual evidence without review.
