# ANA-A09 Funnel Publication-Policy Temporal Activation Approval Candidate

## Objective

Bind the **temporal parameters only** for the future one-shot activation of the eight A09 funnel publication policies.

This lot does not generate live activation evidence and does not authorize an activation invocation.

## Source bindings

- source HEAD: `ef48e0471510ae9a5fa8b950f53f2e7f71827c37`
- Matrix: `v1.3.132`
- parent activation candidate blob: `09280227fae55e7c549d9e099bfe3948dd647915`
- validation-055 staging evidence blob: `f5ca619644611251e28705591774b2c5a90f64c8`
- activation migration blob: `bccd9801cac5de7bf9b1b689eef985a9d2a93d8a`
- validation 055 blob: `c4376ea8140702e87740d52fd574b07ddb86d616`
- applied staging migration: `20260929140910`

## Selected temporal values

The project-owner authorization explicitly selected:

- `windowAnchor = 1970-01-01T00:00:00Z`
- `effectiveFrom = 2026-10-01T00:00:00Z`
- `effectiveUntil = null`

The staging read-only verification confirms:

- the effective time is aligned to the 300-second grid derived from the anchor;
- all eight required freshness policies cover the selected effective time;
- A09 publication-policy count remains `0`;
- A09 funnel cron count remains `0`;
- A09 global snapshot count remains `8`;
- the validator and activator functions are installed;
- A11 remains intact.

## Important deadline

The installed approval validator requires:

`effectiveFrom >= approvedAt`

Therefore a future real activation approval must be created and invoked **no later than 2026-10-01T00:00:00Z**.

If that deadline passes, these temporal values must not be used for activation. A new repository-only temporal selection with a later `effectiveFrom` is required.

This prevents a stale activation from backdating publication authority.

## No live approval evidence in this lot

This candidate deliberately does **not** create:

- `approvalId`;
- `approvedAt`;
- activation authorization command;
- activation authorization SHA-256;
- canonical approval evidence digest;
- `policyInsertAuthorized = true`;
- activation invocation authority.

Those fields can only be derived from a future explicit authorization that grants one-shot staging activation and publication-policy persistence.

The current candidate therefore cannot be passed to the runtime activator as valid live approval evidence.

## Fixed publication semantics

The selected temporal values remain attached to the already-certified policy set:

- policySetId: `ana-a07-a09-funnel-v1-r1`
- revision: `1`
- metrics: `8`
- metric version: `v1`
- window step: `300s`
- projection-delay SLO: `60s`
- derived max lag: `360s`
- max catch-up windows: `3`
- order: `oldest_first`

No scheduler authority is granted by selecting these values.

## Authority after this lot

- temporalSelectionAuthority = consumed
- publicationPolicyPersistenceAuthority = `false`
- activationInvocationAuthority = `false`
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

After exact-head repository certification, a **new explicit activation authorization** may be considered before the temporal deadline.

That future authorization must grant only:

- one-shot publication-policy persistence for exactly eight rows;
- one activation invocation;
- staging authority for that invocation.

It must continue to deny snapshot mutation, runtime snapshot authority, snapshot publication, scheduler activation, production, merge and Ready.

If `2026-10-01T00:00:00Z` is reached before the activation gate is authorized and executed, stop and select a later `effectiveFrom` instead.


## One-shot activation — reconciled staging evidence

The one-shot activation is now complete and machine-readable evidence is stored at:

`reports/generated/ana-a09-funnel-publication-policy-one-shot-activation-staging-evidence.json`

Evidence blob:

`e90054442245f5fe71d41d309cbb7e2809d10ec2`

Committed staging result:

- publication policies: `0 → 8`
- exact parameter rows: `8`
- approvalId: `ana-a09-funnel-publication-approval-r1-82e59c9dc24d`
- approvedAt: `2026-09-29T14:56:34.375466Z`
- activation authorization digest: `82e59c9dc24d94a4f48a832d46caf35e9a5a424046d90f2794e9ed9d9227a1a7`
- activation evidence digest: `2db1282f585217ab76069ba564c94f9133d08b3fa4c7d2f87fea76049684c829`
- currently effective policies: `0`
- effective policies at `2026-10-01T00:00:01Z`: `8`
- runtime selector metric count at `T0+1s`: `8`
- snapshots: `8 → 8`
- snapshot writes: `0`
- funnel cron jobs: `0`
- scheduler creates: `0`
- A11 publication policy: `1`
- A11 scheduler: `1`

The earlier activation attempt bound to authorization digest `eada577b71c277836d214e7f40414b76bc3a97b2ae40fb3a3b820fc5873a11b7` rolled back with SQLSTATE `22012` and left zero persistent A09 publication policies. The successful retry uses the distinct digest above.

The eight policies exist persistently now, but their `effectiveFrom` remains `2026-10-01T00:00:00Z`. This reconciliation grants no new runtime snapshot, snapshot publication, scheduler, production, merge or Ready authority.

## Next gate after activation

After exact-head certification, the next gate is a **repository-only bounded runtime publication canary contract**.

That contract must remain separate from scheduler activation. It may define an explicitly authorized bounded publication window and expected snapshot-write envelope, but no snapshot publication may run and no A09 cron may be created without another explicit staging authorization.
