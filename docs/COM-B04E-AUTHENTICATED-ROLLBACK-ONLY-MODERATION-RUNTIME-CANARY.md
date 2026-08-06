# COM-B04E — Authenticated rollback-only moderation runtime composition canary

## Objective

Exercise the COM-B04D moderation composition with a real active staging authentication session and the real COM-B04B persistence RPCs, while guaranteeing that all synthetic writes remain inside one outer `SERIALIZABLE` transaction that ends with `ROLLBACK`.

## Explicit authority

The canary is authorized once by the exact phrase:

```text
I_EXPLICITLY_AUTHORIZE_COM_B04E_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING
```

The authorization is single-use and is consumed by the first execution attempt, including a failed attempt. It does not authorize a workflow rerun, route registration, runtime deployment, real moderation, production changes or pull-request merge.

## Target

```text
environment: staging
project: doke-web-staging
project ref: zwkczgewzbsorbrjuzpb
pull request: 61
branch: com/com-001-baseline-audit
```

## Execution boundary

The canary uses a dedicated staging wrapper:

```text
backend/runtime/staging/community-moderation-rollback-canary.js
```

The production-facing COM-B04D composition remains configured as:

```text
activationMode: disabled
routeRegistered: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

Before the canary wrapper uses the prepared persistence command, it calls the normal COM-B04D invocation method and requires the failure:

```text
COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED
```

This proves that COM-B04E does not silently introduce a live activation mode into COM-B04D.

## Authenticated actor

The executor selects one existing active staging session by joining:

```text
auth.sessions
auth.users
public.users
```

Required properties:

```text
session not expired
user not deleted
user not banned
application user status active
AAL aal1 or aal2
```

The raw user ID, session ID, token, password and email are never written to the report or printed to logs. Only SHA-256 identity evidence, role and AAL are retained.

No new session or user is created.

## Synthetic command

The command is an `open_case` using only synthetic canonical identifiers and an opaque evidence reference. It does not point to a real community, post, member or media asset.

The domain must return:

```text
decision: accept
reason: MODERATION_CASE_OPEN_ACCEPTED
expected revision: 0
next revision: 1
```

The COM-B04D translator must materialize the initial report as one immutable `evidence_record`.

## Transaction protocol

```text
1. Verify PR, project, migrations, schema and privileges.
2. Record baseline counts for all eight moderation tables.
3. Select and hash one active authenticated staging session.
4. BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE.
5. Capture the server UTC clock.
6. SET LOCAL ROLE service_role.
7. Prepare the synthetic command through COM-B04D.
8. Prove the normal COM-B04D live invocation path is blocked.
9. Verify the derived synthetic case is absent through the load RPC.
10. Execute one COM-B04B atomic SECURITY DEFINER commit RPC.
11. Read the case back through the load RPC.
12. RESET ROLE and verify rollback-scoped rows and count deltas.
13. ROLLBACK.
14. Verify baseline counts are fully restored and no synthetic residue exists.
```

No `COMMIT` statement is permitted.

## Expected rollback-scoped delta

```text
case_projection: +1
case_event: +1
command_idempotency: +1
evidence_record: +1
decision_record: +0
sanction_event: +0
appeal_event: +0
media_review_event: +0
```

After rollback, every table must return to its exact baseline count.

## Fail-closed behavior

The canary fails if any of these conditions is not satisfied:

- authorization packet is missing, mismatched, reused or rerun;
- project, PR, branch, schema or migration identity drifts;
- no valid active authenticated session is available;
- transaction is not `serializable` and rollback-scoped;
- `service_role` is not active during the RPC calls;
- the core COM-B04D live path is not blocked;
- the domain does not accept the synthetic command;
- the initial evidence is not materialized;
- the atomic RPC does not produce revision `1`;
- hash-chain or canonical read-after-write validation fails;
- rollback-scoped count deltas differ from the expected values;
- post-rollback counts differ from baseline;
- any synthetic residue remains.

The authorization remains consumed after any execution attempt.

## Effects allowed

```text
staging reads: allowed
synthetic rollback-scoped staging writes: allowed
persistent staging writes: prohibited
route registration: prohibited
runtime deployment: prohibited
real report creation: prohibited
real content mutation: prohibited
real sanction or appeal mutation: prohibited
production changes: prohibited
pull-request merge: prohibited
```

## Next boundary

A successful COM-B04E canary proves the composition and persistence handoff under a real authenticated staging session. It does not activate an endpoint. Any route wiring or deploy must be a later sublot with separate explicit authorization.
