# ANA-A09 — Canonical funnel snapshot append invocation contract candidate

## Objective

Define the server-side, fail-closed bridge between the staging-certified A09 canonical funnel payload adapter and the existing A04 append-only snapshot primitive.

This lot is **repository-only**. It does not apply a migration, invoke an append, write a snapshot, activate a scheduler, publish a runtime surface, touch production, merge the PR or move it to Ready.

## Source authorities

- Payload adapter: `ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1`.
- Staging payload evidence: validation `051 = PASS`, blob `ddd29090dde2a3b131d8cc1871b3eb82843c130d`.
- A04 append primitive: `public.append_analytics_metric_snapshot_v1(jsonb)`, source blob `64da0e7aec1ea15c9a58656ab1b0a63c8b7065a5`.
- A05 reconciliation/revision semantics: blob `3bc753fe72a9a031ca43664ac28c8a659920c7ac`.
- Matrix binding: `v1.3.132`, config blob `b741af2cf7770d7fdb6969081ce19f8ceb8b3acd`.

## Candidate functions

### Authorization validator

`private.validate_a09_snapshot_append_invocation_authorization_v1`

A future invocation must provide explicit project-owner authorization evidence bound to:

- the exact repository HEAD;
- the exact Domain Completion Matrix version;
- one exact `windowStart/windowEnd`;
- the payload-adapter staging evidence blob;
- the A04 and A05 source blobs;
- exactly eight maximum snapshot writes.

The future authorization evidence must explicitly authorize one bounded append window and snapshot mutation while keeping continuous runtime snapshot authority, snapshot-publication authority, scheduler, production, merge and Ready authority false.

### Append invoker

`private.invoke_a09_canonical_funnel_snapshot_append_v1`

When—and only when—a later explicit staging mutation authorization exists, the function is designed to:

1. validate the exact authorization evidence;
2. compute the eight canonical A09 global-funnel payloads;
3. require the adapter state `payloads_computed_candidate`;
4. require exactly eight payloads;
5. pass each payload to A04 `append_analytics_metric_snapshot_v1`;
6. accept only `APPENDED` or `NO_CHANGE`;
7. process at most eight writes in one PostgreSQL transaction.

A replay for the same authorized window is bounded by A04 fingerprint idempotency. A divergent concurrent revision still fails closed through A04's SQLSTATE `40001` behavior.

## Privilege boundary

Both private candidate functions are owned by `postgres`, use `SECURITY DEFINER`, and revoke EXECUTE from:

- `public`;
- `anon`;
- `authenticated`;
- `service_role`.

Therefore installing the candidate in a later structure-only staging lot still does not create an application-callable append path.

## Validation 052

`supabase/tests/052_ana_a09_canonical_funnel_snapshot_append_invocation_contract_validation.sql` is structural and rollback-only.

It verifies:

- both functions exist;
- owner/security-definer boundaries;
- no client/service-role EXECUTE;
- exact source-evidence bindings;
- the invoker references the payload adapter and A04 append primitive;
- the eight-write cap;
- absence of scheduler and continuous snapshot/publication authority;
- snapshot row count remains unchanged.

Validation 052 intentionally **does not call the invoker**.

## Maturity

ANA remains **3/6**. This candidate creates a safe path to a future bounded append canary; it does not itself grant append invocation, snapshot mutation, runtime snapshot, publication or scheduler authority.

## Next gate

After exact-head repository certification—and Domain Matrix regeneration if the new migration candidate makes generated governance artifacts stale—a separate staging-structure authorization may apply only the candidate migration and run validation 052.

That future structure-only authorization must still keep:

- `appendInvocationAuthority=false`;
- `snapshotMutationAuthority=false`;
- `runtimeSnapshotAuthority=false`;
- `snapshotPublicationAuthority=false`;
- `schedulerAuthority=false`.

## Staging structure installation — validation 052 PASS

The private append-invocation contract structure is now installed in `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

- repository migration: `20260928134000`
- migration blob: `5661652eb4a428976419c46db5d66bcb0e2505b1`
- staging ledger version: `20260928141605`
- validation `052`: **PASS**
- validation blob: `60a6326327bf673a2f3d81a60f1f44b8609ffa17`

Validation 052 remained structural and rollback-only. It did not invoke `private.invoke_a09_canonical_funnel_snapshot_append_v1` and detected no snapshot mutation.

Runtime privilege verification confirms that `anon`, `authenticated` and `service_role` have no `EXECUTE` privilege on either the authorization validator or append invoker. Installing the structure therefore did not create an application-callable append path.

Canonical staging evidence:

- `reports/generated/ana-a09-canonical-funnel-snapshot-append-invocation-contract-staging-structure-evidence.json`

The current authorities remain:

- `appendInvocationAuthority=false`
- `snapshotMutationAuthority=false`
- `runtimeSnapshotAuthority=false`
- `snapshotPublicationAuthority=false`
- `schedulerAuthority=false`

ANA remains **3/6**.

The next functional gate is a repository-only bounded first-append canary authorization contract for one explicit time window. No append or snapshot mutation is authorized by this evidence reconciliation.

