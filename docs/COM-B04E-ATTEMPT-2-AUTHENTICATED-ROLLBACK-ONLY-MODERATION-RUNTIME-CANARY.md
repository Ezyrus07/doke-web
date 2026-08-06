# COM-B04E attempt 2 — authenticated rollback-only moderation runtime canary

## Objective

Execute the COM-B04D moderation composition against the real COM-B04B staging persistence RPCs with one existing active authenticated session. Every synthetic write must remain inside one outer `SERIALIZABLE` transaction and must be removed by `ROLLBACK`.

## New explicit authority

Attempt 2 is authorized once by the distinct phrase:

```text
I_EXPLICITLY_AUTHORIZE_COM_B04E_ATTEMPT_2_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING
```

The authorization was consumed successfully by attempt 2. It was independent from attempt 1, single-use and non-reusable after any workflow attempt. It did not authorize workflow reruns, route registration, runtime deployment, real moderation, production changes or pull-request merge.

## Attempt 1 prerequisite

The attempt-2 executor verified the canonical attempt-1 record before any network or database operation:

```text
attempt-1 status: authorization_consumed_pre_execution_audit_failed
attempt-1 run: 31065331290
authorization consumed: true
executor started: false
database connection attempted: false
rollback-scoped mutation executed: false
persistent residue: false
all eight moderation tables after attempt 1: zero
```

The original authorization and original trigger were not reused.

## Target

```text
environment: staging
project: doke-web-staging
project ref: zwkczgewzbsorbrjuzpb
pull request: 61
branch: com/com-001-baseline-audit
```

## Isolated implementation

Attempt 2 used separate files:

```text
backend/runtime/staging/community-moderation-rollback-canary-attempt-2.js
scripts/test-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js
scripts/execute-com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.js
scripts/audit-com-b04e-attempt-2-readiness.js
scripts/audit-com-b04e-attempt-2-execution-envelope.js
config/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.json
.github/workflows/com-b04e-attempt-2-authenticated-rollback-only-canary-readiness.yml
.github/workflows/com-b04e-attempt-2-authenticated-rollback-only-moderation-runtime-canary.yml
```

No attempt-1 file is repurposed as the attempt-2 trigger.

## Runtime boundary

The production-facing COM-B04D composition remained:

```text
activationMode: disabled
routeRegistered: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

The attempt-2 boundary first invoked the normal COM-B04D method and required:

```text
COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED
```

Only after proving the live path was blocked did the dedicated rollback-only wrapper use the prepared persistence command.

## Authenticated actor

The executor selected one existing active staging session by joining:

```text
auth.sessions
auth.users
public.users
```

The selected session was active, not expired, not deleted, not banned and used `aal1`. No user or session was created. Raw user ID, session ID, email, token and password were not persisted or logged. Only SHA-256 evidence, role and AAL appeared in the sanitized report.

## Synthetic command

The canary executed one synthetic `open_case` command with synthetic community, target, owner and request UUIDs. The evidence reference was opaque and did not identify real content.

Observed domain result:

```text
decision: accept
reason: MODERATION_CASE_OPEN_ACCEPTED
expected revision: 0
next revision: 1
initial immutable evidence record: present
```

## Transaction protocol

```text
1. Verify attempt-1 closure.
2. Verify the new authorization envelope and first workflow attempt.
3. Verify PR, project, migrations, schema and privileges.
4. Record baseline counts for all eight moderation tables.
5. Select and hash one active authenticated staging session.
6. BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE.
7. Capture the server UTC clock.
8. SET LOCAL ROLE service_role.
9. Prepare the synthetic command through COM-B04D.
10. Prove the normal COM-B04D live invocation path is blocked.
11. Verify the derived case is absent through the load RPC.
12. Execute exactly one COM-B04B atomic SECURITY DEFINER commit RPC.
13. Read the case through the load RPC.
14. RESET ROLE and verify rollback-scoped rows and count deltas.
15. ROLLBACK.
16. Verify exact baseline restoration and zero synthetic residue.
```

No `COMMIT` statement was permitted or executed.

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

After rollback, all eight counts matched the baseline exactly.

## Attempt 2 outcome

```text
run: 31067102891
authorization job: 92506997430 — success
canary job: 92507013853 — success
authorized head: bbe3b52354a7e540a27cadb30c30159fb531485e
workflow run attempt: 1
authorization consumed: true
workflow rerun allowed: false
```

Execution result:

```text
authenticated session verified: true
assurance level: aal1
actor role: professional
core activation mode: disabled
core live path blocked: true
domain decision: accept
domain reason: MODERATION_CASE_OPEN_ACCEPTED
transaction isolation: serializable
revision observed inside transaction: 1
initial evidence materialized: true
transaction rolled back: true
counts restored after rollback: true
persistent residue: false
raw identifiers exposed: false
```

The executor used the PostgreSQL TLS pooler and the `service_role` database role only inside the outer transaction. The sanitized artifact contains only hashes for the actor, session and synthetic case.

## Artifact

```text
artifact id: 8954212159
name: com-b04e-attempt-2-authenticated-rollback-only-canary-31067102891
size: 1696 bytes
digest: sha256:46e17bee0b21b76cfbb1e185ae9fe05eea7f6793091871e15b4f63f09dcbc510
expires: 2026-08-20T02:58:51Z
sanitized: true
```

## Independent postflight

A separate read after the workflow confirmed:

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

## Fail-closed behavior preserved

The canary would have failed and consumed the authorization if any of these conditions had been violated:

- attempt-1 closure inconsistent;
- attempt-2 phrase, contract, target or one-shot state drifted;
- workflow run attempt not `1`;
- PR not open, draft, unmerged and without auto-merge;
- project not `ACTIVE_HEALTHY`;
- required migrations, tables, functions or privileges drifted;
- no eligible authenticated session existed;
- transaction or `service_role` guard failed;
- COM-B04D live path was not blocked;
- domain decision, evidence translation, revision or hash chain differed;
- rollback-scoped deltas differed;
- rollback failed to restore baseline counts;
- any residue remained.

The consumed workflow trigger was archived after success. A rerun or modification of the original attempt-2 envelope cannot start another canary.

## Effects

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

## Certified boundary

COM-B04E is canary-certified: the authenticated composition-to-persistence handoff and mandatory rollback guarantee worked against staging. The site runtime remains disabled and no endpoint exists. Route wiring, deployment, live moderation and production remain separate future authorization boundaries.
