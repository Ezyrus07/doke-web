# COM-B04E attempt 2 — authenticated rollback-only moderation runtime canary

## Objective

Validate the COM-B04D composition against the real COM-B04B persistence RPCs in `doke-web-staging`, using one existing active authenticated session. All synthetic writes must remain inside one outer `SERIALIZABLE` transaction and be removed by `ROLLBACK`.

## Explicit authority

Attempt 2 is authorized once by the distinct phrase:

```text
I_EXPLICITLY_AUTHORIZE_COM_B04E_ATTEMPT_2_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING
```

The authorization was consumed by run `31067102891`. It is single-use, non-reusable and does not authorize reruns, route registration, deployment, real moderation, production changes or merge.

## Attempt-1 closure

The executor verified the previous attempt before any network or database operation:

```text
attempt-1 status: authorization_consumed_pre_execution_audit_failed
attempt-1 run: 31065331290
authorization consumed: true
executor started: false
database connection attempted: false
rollback-scoped mutation executed: false
persistent residue: false
```

No attempt-1 file is repurposed as the attempt-2 trigger.

## Runtime boundary

```text
activationMode: disabled
routeRegistered: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

The wrapper first invokes the normal COM-B04D live path and requires:

```text
COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED
```

Only after that proof may the dedicated rollback-only wrapper use the prepared persistence command.

## Authenticated actor

An existing active staging session was selected from `auth.sessions`, `auth.users` and `public.users`. The session used `aal1`; no user or session was created. Raw user ID, session ID, email, token and password were not retained. The report contains only role, AAL and SHA-256 evidence.

## Transaction protocol

```text
1. Verify attempt-1 closure and the attempt-2 one-shot envelope.
2. Verify PR, project, migrations, schema and privileges.
3. Record baseline counts for all eight moderation tables.
4. Select and hash one active authenticated session.
5. BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE.
6. Capture the server UTC clock.
7. SET LOCAL ROLE service_role.
8. Prepare the synthetic open_case command through COM-B04D.
9. Prove the normal COM-B04D live path is blocked.
10. Verify the derived case is absent through the load RPC.
11. Execute one COM-B04B atomic SECURITY DEFINER commit RPC.
12. Read the case back through the load RPC.
13. RESET ROLE and inspect rollback-scoped rows.
14. ROLLBACK.
15. Verify exact baseline restoration and zero residue.
```

No `COMMIT` statement is permitted. None was executed.

## Observed rollback-scoped delta

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

## Successful execution

```text
run: 31067102891
authorization job: 92506997430 — success
canary job: 92507013853 — success
authorized head: bbe3b52354a7e540a27cadb30c30159fb531485e
workflow attempt: 1
```

Observed result:

```text
authenticated session verified: true
assurance level: aal1
actor role: professional
core activation mode: disabled
core live path blocked: true
domain decision: accept
domain reason: MODERATION_CASE_OPEN_ACCEPTED
transaction isolation: serializable
revision inside transaction: 1
initial evidence materialized: true
transaction rolled back: true
counts restored after rollback: true
persistent residue: false
raw identifiers exposed: false
```

The atomic event hash was `ed7f465eaaad4d6db2955a8bb5c59fdb5866a85fa72c7607cffe62902e8cd856`; the synthetic case is represented only by SHA-256 `beea9704863d82417026c0be58604d7a8412060a241013d3d3f8f727d7510878`.

## Sanitized artifact

```text
artifact id: 8954212159
name: com-b04e-attempt-2-authenticated-rollback-only-canary-31067102891
size: 1696 bytes
digest: sha256:46e17bee0b21b76cfbb1e185ae9fe05eea7f6793091871e15b4f63f09dcbc510
expires: 2026-08-20T02:58:51Z
```

## Independent postflight

```text
case_projection: 0
case_event: 0
command_idempotency: 0
evidence_record: 0
decision_record: 0
sanction_event: 0
appeal_event: 0
media_review_event: 0
synthetic case absent: true
synthetic event absent: true
synthetic command absent: true
synthetic evidence absent: true
persistent residue: false
```

## Effects and limits

```text
staging reads: executed
synthetic rollback-scoped staging writes: executed
persistent staging writes: prohibited
persistent staging writes executed: false
new user/session creation: not executed
route registration: not executed
runtime deployment: not executed
real moderation: not executed
production changes: not executed
pull-request merge: not executed
```

The consumed attempt-2 trigger is archived and cannot start another canary.

## Certified boundary

COM-B04E is canary-certified: the authenticated composition-to-persistence handoff and mandatory rollback worked against staging. The runtime remains disabled and no endpoint exists. Route wiring, deployment, live moderation and production require separate explicit authorization.
