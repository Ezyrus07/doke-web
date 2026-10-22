# PR #550 + PR #546 — Local integration certification

Date: 2026-10-21. Local-only candidate: `codex/pr550-pr546-integration-001-local`.

## Sources and composition

- PR #549: `81c2519643959ed8d2707b2a03c923e53c9e0ea6`.
- PR #550: `5caa41c30b933f1e9ac72cbf4cd9ea811299dc50`.
- PR #546: `b5d157f14d62fe13eb277ffb8ef4d6d8ab9e59aa`.
- Merge uses PR #550 as its first parent and PR #546 as its second parent.
- Merge conflicts were confined to `docs/DOMAIN-COMPLETION-MATRIX.md` and `reports/generated/domain-completion-matrix-report.json`. Both artifacts were regenerated from the combined code.
- The local patch `marketplace-pr550-pr546-test-alignment-001.patch` was applied to two tests only; application service logic was not weakened.

## Evidence from the combined tree

| Validation | Outcome |
| --- | --- |
| Selected local contract suites (orders, proposals, messages, authenticated transport, route guard, authority policy) | 9/9 PASS |
| `node --test tests/ux-journey-001-route-context.test.cjs` | 17/17 PASS |
| `node tests/ux-journey-001-browser.cjs` in Edge at 390/820/1366 | 21/21 PASS |
| `tests/e2e/quote-submission-journey.spec.js` with fixture API | First full run: 8/9 PASS; second full run: 9/9 PASS |
| Separate rerun of the 820-pixel quote scenario | 1/1 PASS |
| `npm run audit:domain-completion-matrix` | PASS (23 domains, 15 critical flows, 12 critical blockers) |
| `npm run audit:agent-governance` | PASS |

## Preserved safety contracts

- Demo professional alias is denied the order owned by the canonical professional; the real matching fixture identity can accept it.
- Accepted-order conversation update uses the real command reliability executor with a synthetic server acknowledgement that checks actor, order and command identity.
- Focus after page reload is awaited after the deferred frame; unrelated focused controls remain protected by existing tests.
- No real network services, live Supabase credentials or migrations were exercised in these fixtures.

## Open gates and limitations

- The first full quote browser run had one intermittent 820px failure: `[data-details-input]` remained hidden after a 15-second visibility timeout. It passed in isolation and on the second complete run. **Do not label this run flake-free.**
- Combined GitHub Actions CI is **not yet certified**; the `kontrat-journey-integration-ci.yml` workflow is local until publication is explicitly authorized.
- No real staging/backend/RLS, financial escrow, payment release, authorization or durability certification is implied.
- Domain matrix still reports 12 critical blockers. P31 Control Center gates remain separate and on hold.
- **No push, GitHub merge, deployment, hosted writes, Supabase changes or Control Center edits are authorized by this local certification.**

Status: `LOCAL_VALIDATED_WITH_E2E_INTERMITTENCY / COMBINED_CI_NOT_RUN / STAGING_NOT_CERTIFIED / HOLD BEFORE HOSTED WRITES`.
