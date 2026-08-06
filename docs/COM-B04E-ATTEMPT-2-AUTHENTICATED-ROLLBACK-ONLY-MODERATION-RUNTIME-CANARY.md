# COM-B04E attempt 2 — authenticated rollback-only moderation runtime canary

## Objective

Execute the COM-B04D moderation composition against the real COM-B04B staging persistence RPCs with one existing active authenticated session. Every synthetic write must remain inside one outer `SERIALIZABLE` transaction and must be removed by `ROLLBACK`.

## New explicit authority

Attempt 2 is authorized once by the distinct phrase:

```text
I_EXPLICITLY_AUTHORIZE_COM_B04E_ATTEMPT_2_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING
```

This authorization is independent from attempt 1, single-use and non-reusable after any workflow attempt. It does not authorize workflow reruns, route registration, runtime deployment, real moderation, production changes or pull-request merge.

## Attempt 1 prerequisite

The attempt-2 executor must verify the canonical attempt-1 record before any network or database operation:

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

The original authorization and original trigger are not reusable.

## Target

```text
environment: staging
project: doke-web-staging
project ref: zwkczgewzbsorbrjuzpb
pull request: 61
branch: com/com-001-baseline-audit
```

## Isolated implementation

Attempt 2 uses separate files:

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

The production-facing COM-B04D composition remains:

```text
activationMode: disabled
routeRegistered: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

The attempt-2 boundary must first invoke the normal COM-B04D method and require:

```text
COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED
```

Only after proving the live path is blocked may the dedicated rollback-only wrapper use the prepared persistence command.

## Authenticated actor

The executor selects one existing active staging session by joining:

```text
auth.sessions
auth.users
public.users
```

The session must be active, not expired, not deleted, not banned, and use `aal1` or `aal2`. No user or session is created. Raw user ID, session ID, email, token and password are not persisted or logged. Only SHA-256 evidence, role and AAL may appear in the sanitized report.

## Synthetic command

The canary executes one synthetic `open_case` command with synthetic community, target, owner and request UUIDs. The evidence reference is opaque and does not identify real content.

Expected domain result:

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

After rollback, all eight counts must match the baseline exactly.

## Fail-closed behavior

The attempt fails and consumes the authorization if any of these conditions is violated:

- attempt-1 closure is inconsistent;
- attempt-2 phrase, contract, target or one-shot state drifts;
- workflow run attempt is not `1`;
- PR is not open, draft, unmerged and without auto-merge;
- project is not `ACTIVE_HEALTHY`;
- required migrations, tables, functions or privileges drift;
- no eligible authenticated session exists;
- transaction or `service_role` guard fails;
- COM-B04D live path is not blocked;
- domain decision, evidence translation, revision or hash chain differs;
- rollback-scoped deltas differ;
- rollback fails to restore baseline counts;
- any residue remains.

The executor writes a sanitized report even when it fails before opening the database transaction.

## Effects allowed

```text
staging reads: allowed
synthetic rollback-scoped staging writes: allowed
persistent staging writes: prohibited
new user/session creation: prohibited
route registration: prohibited
runtime deployment: prohibited
real moderation: prohibited
production changes: prohibited
pull-request merge: prohibited
```

## Success boundary

A successful attempt proves the authenticated composition-to-persistence handoff and rollback guarantee. It still does not activate a route or runtime. Those remain separate future authorization boundaries.
