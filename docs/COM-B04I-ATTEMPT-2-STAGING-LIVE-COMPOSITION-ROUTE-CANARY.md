# COM-B04I attempt 2 — staging live composition activation and rollback-only route canary

## Authorization

```text
I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY
```

The authorization is single-use, bound to readiness head `baa531e6672fbd752038e7f9b35d436aa6efa486`, and cannot be reused after success or failure.

## Scope

```text
environment: staging
activation: process-local inside one GitHub Actions runner
route: communities.moderation.command
public traffic enabled: false
synthetic input only: true
runtime deployed: false
production authority: false
merge authority: false
```

## Execution boundary

```text
BEGIN ISOLATION LEVEL SERIALIZABLE READ WRITE
SET LOCAL ROLE service_role
execute server-bound route handler
verify immutable event and evidence rows
ROLLBACK
verify exact baseline counts
verify zero synthetic residue
```

The only permitted RPCs are:

```text
com_moderation_load_case_v1
com_moderation_commit_case_command_v1
```

## Fail-closed gates

Execution aborts on authorization, source head, PR, branch, project, migration, privilege, authenticated-session, transaction, policy, route-response, immutable-ledger, count-delta or residue mismatch.

## Expected effects

```text
staging network read: true
rollback-scoped synthetic mutation: true
persistent staging mutation: false
process-local runtime activation: true
public traffic: false
runtime deployment: false
real moderation: false
production change: false
pull request merge: false
```

## Site effect

No visible site change. The default exported route handler remains HTTP 503 (`COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED`).
