# COM-B04H — live composition activation readiness

## Scope

COM-B04H is repository-only. It defines the proof package required before any future live staging activation of the moderation composition.

It does not activate the route, deploy runtime code, access staging, enable traffic, execute moderation, change production or merge the pull request.

## Current certified boundary

```text
route: communities.moderation.command
path: /communities/:communityId/moderation/commands
handler: executeModerationCommand
handler result: HTTP 503
failure code: COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
composition activation mode: disabled
runtime activated: false
```

The current route handler and composition root remain unchanged.

## Candidate activation mode

```text
staging_authenticated_server_runtime
```

This is only a named candidate for a future separately authorized sublot. COM-B04H does not add it to `ACTIVATION_MODES` and does not make it executable.

## Required dependencies

### Verified session

```text
authority: server_verified_session_boundary
method: verify
source: supabase_auth_get_user
server only: true
client actor override: prohibited
raw token logging: prohibited
```

### Canonical context

```text
authority: canonical_server_context_loader
method: load
source: canonical_server_context
approved policy required: true
persisted case binding required: true
client context override: prohibited
```

### Server clock

```text
authority: server_utc_clock
method: now
client timestamp trusted: false
```

### Service-role executor

```text
authority: server_service_role
method: rpc
environment: staging
server only: true
arbitrary RPC: prohibited
direct table access: prohibited
service-role key exposure: prohibited
```

Exact RPC allowlist:

```text
com_moderation_load_case_v1
com_moderation_commit_case_command_v1
```

### Immutable audit storage

```text
authority: immutable_moderation_audit_storage
source: com_moderation_commit_case_command_v1
append only: true
transaction bound: true
immutable ledger required: true
```

### Policy approval

```text
authority: approved_moderation_policy_boundary
status: approved
policy fingerprint required: true
institutional approval recorded: true
```

### Request boundary

```text
idempotency required: true
audit required: true
request freshness required: true
RLS validation required: true
client authority override: prohibited
```

## Bound predecessor blobs

```text
composition: 83c56aab710cc1bc5e0b18d6e9e659d5f671f478
route registry: cda8292ce3669a2b76b70ed2d2aae9a017973254
module route loader: 7b3c897c0bf20069b733632c0b424b8664eb8cf5
blocked route handler: 4c35c1df8f622505c5a206bb3824f9973088538c
```

Any drift requires a new readiness evaluation before activation authorization.

## Fail-closed decision

The evaluator returns `ready_for_separate_com_b04i_activation_authorization` only when every proof is exact and every operational authority remains false.

Any missing proof, expanded RPC allowlist, changed blob, live flag, deployment flag, traffic flag, production flag or merge flag returns:

```text
live_composition_activation_blocked
```

Readiness is not runtime authority.

## Effects

```text
repository readiness files changed: true
route handler changed: false
composition changed: false
database accessed: false
staging changed: false
runtime activated: false
traffic enabled: false
real moderation executed: false
production changed: false
pull request merged: false
```

## Site effect

There is no visible or functional site change.

The deployed application is unchanged. The branch route still returns `503` and performs no database or moderation operation.

## Matrix synchronization

```text
version before: 1.3.111
version: 1.3.112
canonical commit: 05c40d4aaa53a5699643eed1e2634d2e07dcaff3
sync run: 31106422249
sync job: 92632656989
sync result: success
COM-001 maturity: 3/6
serverAuthority: partial
stagingEvidence: staging_canary
productionGate: blocked
promotion allowed: false
```

Matrix reconciliation results:

```text
COM-B04: 59/59
COM-B04B: 172/172 + 21/21 + 64/64
COM-B04C: 80/80 + 59/59
COM-B04D: 39/39 + 155/155 + 72/72
COM-B04G: 95/95 + 159/159
COM-B04H: 108/108 + 138/138
restricted diff: passed
```

## Repository certification

```text
certified head: e7e769ce18c846fbd40d3cabf5a0d7ada055f1f7
run: 31107031100
job: 92634750174
result: success
COM-B04H conformance: 113/113
COM-B04H audit: 143/143
immutable predecessor blobs: passed
fail-closed runtime boundary: passed
COM-B04G regression: 95/95 + 159/159
COM-B04D regression: 39/39 + 155/155 + 72/72
repository-only security checks: passed
diff hygiene: passed
```

## Next authorization boundary

```text
I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY
```

That phrase is not granted by COM-B04H. It will be required separately before changing the handler/composition for a staging-only activation and rollback-only route canary.

Production and pull-request merge remain independently prohibited.
