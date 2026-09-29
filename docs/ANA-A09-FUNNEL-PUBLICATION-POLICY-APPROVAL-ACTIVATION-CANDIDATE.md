# ANA-A09 Funnel Publication-Policy Approval/Activation Candidate

## Objective

Prepare the approval-aware activation boundary for the exact eight A09 funnel publication policies while keeping publication inactive.

The candidate was authored repository-only. Its approval/activation structure is now installed and validation 055 has passed in staging, while persistent A09 publication policies remain at zero.

## Why this gate exists

The publication orchestration structure is already installed and validated in staging, but the publication-policy table still contains zero A09 funnel rows.

The next safe transition is not scheduler activation. It is an approval contract that makes policy insertion explicit, bounded and auditable.

## Source authority

- orchestration contract: `ana-a09-funnel-snapshot-publication-orchestration-candidate-v1`
- orchestration config blob: `2c99eaac6c03c29fbefe5973ae70b9160ee053d6`
- staging structure evidence blob: `0fa5595dd8b0c0ba925ff46fb7c3dbe0bc150595`
- freshness config blob: `8b9ef1b01de43852101a9021da2423c4269079ba`
- persistent freshness evidence blob: `24ddfedcb29b465f510130befe61d4e4a283e2d2`
- orchestration migration blob: `01a6d7208a9d4d288eb9995325707d0ccdc9a3a6`
- validation 054 blob: `906629533492eec6be83441e51554d6eee4a3a97`
- canonical JSON runtime migration blob: `cd322890ab614226a58c328743e8582c853cc2a4`

## Fixed policy semantics

The future publication set remains bound to:

- policySetId: `ana-a07-a09-funnel-v1-r1`
- revision: `1`
- metric version: `v1`
- metrics: `8`
- window step: `300s`
- projection-delay SLO: `60s`
- derived max lag: `360s`
- max catch-up windows: `3`
- missed-window order: `oldest_first`
- scheduler mechanism: `supabase_pg_cron_database_local`

The publication rows reuse the eight already-active freshness `policyId` values. The activation validator requires those freshness policies to cover the future publication effective time with max lag `360s`.

## Values intentionally not selected

This authorization did **not** supply:

- `windowAnchor`
- `effectiveFrom`

Therefore this candidate does not invent them.

A later project-owner authorization must state both values explicitly. Revision 1 requires `effectiveUntil = null`.

The validator additionally requires:

- `effectiveFrom >= approvedAt`;
- `windowAnchor <= effectiveFrom`;
- `effectiveFrom` aligned to the 300-second grid derived from `windowAnchor`.

## Approval evidence

Future activation evidence must be:

`ana-a09-funnel-publication-policy-activation-approval-evidence-v1`

It binds:

- exact repository HEAD;
- Matrix version;
- authorization-command SHA-256;
- exact eight policy identities;
- exact fixed publication parameters;
- explicit `windowAnchor` and `effectiveFrom`;
- policy insertion authorization;
- activation invocation limit `1`;
- snapshot mutation = false;
- runtime snapshot authority = false;
- snapshot publication authority = false;
- scheduler activation = false;
- production/merge/Ready = false;
- canonical evidence digest.

## Candidate runtime functions

Migration:

`supabase/migrations/20260929133000_ana_a09_funnel_publication_policy_approval_activation_candidate.sql`

Migration blob:

`bccd9801cac5de7bf9b1b689eef985a9d2a93d8a`

Functions:

- `private.validate_analytics_a09_funnel_publication_policy_approval_v1`
- `private.activate_analytics_a09_funnel_publication_policy_approved_v1`

Both are owner `postgres`, `SECURITY DEFINER`, and explicitly denied to `public`, `anon`, `authenticated` and `service_role`.

The activation boundary inserts exactly eight publication-policy rows only after the approval validator passes.

It inserts no freshness row, writes no metric snapshot and creates no cron job.

A second activation of the same revision is rejected by overlap/policy identity checks.

## Validation 055

Rollback-only validation:

`supabase/tests/055_ana_a09_funnel_publication_policy_approval_activation_candidate_validation.sql`

Validation blob:

`c4376ea8140702e87740d52fd574b07ddb86d616`

Validation 055 has now executed in staging with **PASS** and rollback.

It:

1. verified owner and execute boundaries;
2. confirmed A11 publication policy count `1`, A09 publication policy count `0`, and funnel cron count `0`;
3. built the synthetic future approval envelope;
4. proved valid approval acceptance;
5. proved tampered HEAD and scheduler-boundary rejection;
6. transiently inserted exactly eight publication rows;
7. proved the existing A09 runtime policy-set selector resolves all eight;
8. proved replay activation is rejected;
9. proved no funnel snapshot or cron count changes;
10. rolled the transaction back.

Persistent publication-policy delta after validation is **zero**.

## Reconciled staging evidence

Machine-readable evidence:

`reports/generated/ana-a09-funnel-publication-policy-approval-activation-staging-evidence.json`

Evidence blob:

`f5ca619644611251e28705591774b2c5a90f64c8`

Observed staging result:

- applied migration version: `20260929140910`
- validation `055`: **PASS**
- transient publication-policy rows during rollback test: `8`
- persistent A09 publication-policy rows: `0`
- A11 publication policy count: `1`
- A11 scheduler count: `1`
- active A09 freshness policies: `8`
- A09 snapshots: `8 → 8`
- snapshot writes: `0`
- funnel cron: `0 → 0`
- scheduler creates: `0`
- candidate functions installed: `2`
- both functions remain owner `postgres`, `SECURITY DEFINER`, and non-executable by `anon`, `authenticated`, and `service_role`
- real `windowAnchor`: still unselected
- real `effectiveFrom`: still unselected

## Authority after this lot

- repositoryWriteAuthority = consumed by this candidate
- publicationPolicyPersistenceAuthority = `false`
- snapshotMutationAuthority = `false`
- runtimeSnapshotAuthority = `false`
- snapshotPublicationAuthority = `false`
- schedulerAuthority = `false`
- stagingAuthority = `false`
- productionAuthority = `false`
- mergeAuthority = `false`
- Ready for review authority = `false`

ANA remains **3/6**.

## Next gate

After exact-head certification of this staging evidence, prepare a separate **repository-only temporal activation approval envelope**.

That later approval must explicitly state the real `windowAnchor` and `effectiveFrom`. Only after that separate approval may a one-time staging activation of the eight publication-policy rows be considered. Snapshot publication and scheduler activation remain later, independent gates.
