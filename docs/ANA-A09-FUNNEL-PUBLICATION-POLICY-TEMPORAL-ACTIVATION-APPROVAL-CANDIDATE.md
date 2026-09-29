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
