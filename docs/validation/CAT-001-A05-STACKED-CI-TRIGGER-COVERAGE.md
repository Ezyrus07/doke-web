# CAT-001 / CAT-A05 — Stacked CI trigger coverage

**Status:** `TRIGGER COVERAGE CORRECTED — FINAL CI PENDING`

## Root cause

The canonical workflows accepted `pull_request` events only when the PR base was `MAIN`, `main` or `master`. PR #12 is intentionally stacked on `prof/prof-001-baseline-audit`, so its heads did not create pull-request-triggered runs.

Quality also accepted `push` on `cat/**`, but the connected run-inspection surface returns pull-request-triggered runs only. Canary and Diagnostic were more restrictive: their push triggers covered `prof/**`, not `cat/**`. Those two lanes therefore did not execute for CAT heads.

The previous `workflow_runs: []` result was a mixture of two conditions:

- Quality could execute as a push run but was not observable through the PR-only connector filter;
- Canary and Diagnostic had no valid CAT trigger and were not executing.

## Correction

The existing canonical workflows were corrected. No temporary workflow was created.

- Quality PR bases now include `auth/**`, `prof/**` and `cat/**`.
- Canary PR bases now include `auth/**`, `prof/**` and `cat/**`.
- Diagnostic PR bases now include `auth/**`, `prof/**` and `cat/**`.
- Canary push branches now include `cat/**`.
- Diagnostic push branches now include `cat/**`.
- Existing mainline and `workflow_dispatch` triggers were preserved.

## First observable proof

After the trigger correction, head `4019c0a14f87f0a42e8e900d16bd20a3d6fbf1db` immediately produced pull-request-triggered runs visible through the connector:

- Quality run `#1182`, ID `30353193887`;
- Canary run `#760`, ID `30353193413`;
- Diagnostic run `#846`, ID `30353193396`.

These runs prove trigger observability only. They are not final closure evidence because subsequent permanent-audit commits changed the head.

## Permanent regression boundary

`scripts/audit-stacked-ci-trigger-coverage.js` fails if:

- Quality, Canary or Diagnostic lose stacked PR coverage;
- Canary or Diagnostic lose `cat/**` push coverage;
- Quality loses `cat/**` push coverage;
- blocking E2E or the 105 visual structural guards disappear from Quality;
- `workflow_dispatch` is removed.

## Safety

- production unchanged;
- staging unchanged;
- no accounts or orders changed;
- no SMS, OAuth or paid configuration changed;
- PR #12 remains open, draft and unmerged;
- parent PR #11 remains open, draft and unmerged.

## Remaining closure condition

Quality, blocking E2E, 105 visual structural guards, Canary and Diagnostic must all succeed on one final stable head before CAT-A04, CAT-B04 and CAT-A05 can be marked complete.
