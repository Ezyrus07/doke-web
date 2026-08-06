# COM-B04I — staging live composition activation and rollback-only route canary

## Scope

COM-B04I consumes the exact single-use authorization:

```text
I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY
```

The authorized execution is restricted to a process-local staging activation inside one GitHub Actions runner. It does not deploy a public runtime, enable public traffic, modify production or merge the pull request.

## Activation model

```text
activation mode: staging_authenticated_server_runtime
runtime lifetime: one canary process
route: communities.moderation.command
handler binding: server-side factory only
public handler default: HTTP 503 COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
public traffic enabled: false
persistent runtime authority: false
```

The canonical COM-B04D composition remains limited to `disabled` and `local_test_double`. COM-B04I wraps its certified preparation path with a staging-only, server-bound invocation layer rather than widening the production-capable core.

## Required security boundaries

```text
server-verified authenticated session: required
canonical server context: required
approved policy fingerprint: required
server UTC clock: required
service-role executor: server only
RPC allowlist: exact
client authority override: prohibited
raw actor/session identifiers in evidence: prohibited
```

Exact RPC allowlist:

```text
com_moderation_load_case_v1
com_moderation_commit_case_command_v1
```

## Transaction boundary

The route canary executes inside:

```text
BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE
SET LOCAL ROLE service_role
...
ROLLBACK
```

The workflow measures all eight moderation persistence tables before, during and after execution. It requires the expected synthetic delta inside the transaction and exact restoration after `ROLLBACK`.

## Fail-closed conditions

Execution aborts and rolls back when any of the following occurs:

- authorization, source head, project, PR or branch mismatch;
- workflow rerun;
- staging credentials unavailable;
- staging project unhealthy;
- required migration, table, RPC or privilege missing;
- no active authenticated session;
- RPC outside the allowlist;
- transaction not `SERIALIZABLE` or service role not active;
- route response not accepted;
- immutable ledger or evidence mismatch;
- count delta mismatch;
- any persistent residue after rollback.

## Expected effects

```text
repository runtime/handler files changed: true
staging network read: true during authorized canary
rollback-scoped synthetic mutation: true during authorized canary
persistent staging mutation: false
process-local runtime activated: true during authorized canary
public traffic enabled: false
runtime deployed: false
real moderation against user content: false
production changed: false
pull request merged: false
```

## Site effect

There is no visible site change. The branch's default exported handler continues returning HTTP 503 unless a valid server-bound canary runtime is injected inside the authorized staging process.

## Matrix

```text
version before: 1.3.112
target version after successful certification: 1.3.113
COM-001 maturity before: 3/6
production gate: blocked
```

A successful rollback-only canary is staging evidence, not production authority and not merge authority.
