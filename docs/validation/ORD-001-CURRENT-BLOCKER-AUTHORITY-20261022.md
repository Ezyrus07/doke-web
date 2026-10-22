# ORD-001 — Alternative A current blocker authority (22 Oct 2026)

**State:** LOCAL PATCH CANDIDATE, NOT MERGED. This document does not authorize provider selection, account creation, billing, migrations, staging access or production writes.

## Source of truth and chronology

- Source configuration: config/domain-completion-matrix.json, v1.3.106.
- Active ORD-001 blockers in the current snapshot: ORD-B02 (browser formal closure), ORD-B03 (PAY-001 financial dependency).
- ORD-B05 was removed in commit f8a46b8a on 2026-10-05 after an authorized, isolated Vercel staging-runtime deployment. That **historical milestone** is not the same as authorization for a future external provider.
- Existing selection gate: config/ord-001-a09b0-provider-adapter-boundary.json and config/ord-001-a10-blocker-reconciliation.json. The A10 file preserves historical ORD-B05 disposition and exact separate-selection guard I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING. providerSelected=false, providerSpecificAdapterBound=false and genericContinuationAuthorizes=false remain mandatory. Neither the historical identifier nor its closure is authorization to select Railway.
- Historical SCHED-B04C config/evidence retains the then-recorded remainingOrd = [ORD-B02, ORD-B03, ORD-B05]. Do not rewrite that signed, historical list to make it match today's blockers; distinguish historical evidence from current authority.

## ORD-B02: two distinct historical phases

1. On 2026-10-05, the staging Preview runtime was reachable and preflighted, but an initial browser preflight could not log in because synthetic credentials were unavailable. The initial preflight issued no order/message mutation.
2. On 2026-10-06, a separate authenticated two-account browser canary passed at SHA 280787d0b6130d89c2963c7b197118f9021b9daa. docs/validation/ORD-001-A08-STAGING-RELEASE-READINESS.json records order acceptance, active conversation and a message persisting after reload/relogin. This does not assert a corresponding canary at this local PR SHA.
3. ORD-B02's formal closure still requires a specific signed authorization envelope identifying resources, an independent check-env, a real two-context visual canary, and runId-scoped cleanup verified with zero residue on the explicitly authorized target release. Those conditions remain OPEN. Historic success does not authorize password rotation, emails, hosted traffic, writes or payment testing.

Historic caveats: 387 observed browser request failures (mostly aborted navigation, not independently triaged); raw console transcript not archived; isolated staging runtime SSO was disabled during that historical canary; payment/escrow untested.

## Why the cumulative audits differed

- ORD-A08 and ORD-A09B0 audited ORD-B05 **absent** from current blocker lists.
- ORD-A10 (post v1.3.70) also audited ORD-B05 **absent**.
- SCHED-B04C, SCHED-C01A and SCHED-C01B still required ORD-B05 **present** in the live list, although their historical files describe earlier states.
- Windows checkout line endings introduced separate string-matching failures in the auditors; normalizing text when auditing preserves the exact requirements without modifying application code.
- Alternative A updates the three SCHED *live* blocker expectations while preserving the SCHED-B04C original historical remainingOrd array, and explicitly verifies the independent provider-selection policy.
- A08 now checks the actual historical canary evidence and mandatory contemporary ORD-B02 closure guards rather than asserting a stale credential-blocker phrase.

## Acceptance

- Run node scripts/audit-ord-001-current-blocker-authority.js (static current authority and historical evidence).
- Run the nine read-only ORD-A05/A06/A08/A09B0/A10 and SCHED-B04C/C01A/C01B audits.
- Run npm run write:domain-completion-matrix, npm run audit:domain-completion-matrix and npm run audit:agent-governance.
- Run combined regressions for synthetic orders, auth, messaging, route focus and quote flow, as feasible.
- PR #551 remains unmodified; release/staging/RLS/escrow and all Control Center P31 decisions are separate certifications.
- All 51 historical P31 blockers remain UNKNOWN_HOLD until signed individual decisions, including the ORD-B05 item in that **historic** inventory; no automatic state rewrite.

**Gate:** ALTERNATIVE_A_LOCAL_ONLY / PROVIDER_SELECTION_UNAUTHORIZED / ORD-B02_OPEN / P31-021_ADOPTION_PENDING / P31-022_UNAUTHORIZED / STAGING_NOT_CERTIFIED / HOLD_BEFORE_HOSTED_WRITES.
