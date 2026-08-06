# COM-B04I attempt 2 — split staging canary result

## Authorization

```text
I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY
```

The authorization was received, consumed, bound to readiness head `baa531e6672fbd752038e7f9b35d436aa6efa486`, and cannot be reused.

## Intended execution

The intended boundary was a single GitHub Actions runner executing the certified Node route handler against staging inside a `SERIALIZABLE READ WRITE` transaction followed by mandatory rollback.

The exact trigger and subsequent registered-workflow bridge commits produced no GitHub Actions workflow run. Therefore:

```text
GitHub Actions run materialized: false
remote Node executor started: false
remote Node route handler executed: false
```

The trigger workflows were archived after the authorization was consumed.

## Authorized fallback executed

A direct authenticated staging fallback executed the real persistence leg using the same two-RPC allowlist:

```text
com_moderation_load_case_v1
com_moderation_commit_case_command_v1
```

The fallback verified:

```text
environment: staging
authenticated session: true
assurance level: aal1
service_role active: true
transaction isolation: serializable
transaction mode: read write
synthetic open_case accepted: true
revision inside transaction: 1
canonical read after write: true
initial evidence materialized: true
rollback completed: true
independent postflight completed: true
persistent residue: false
```

Inside the rollback scope, the expected deltas were observed:

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

After rollback, all eight moderation persistence tables returned to their exact baseline of zero rows. The synthetic case and command were independently confirmed absent.

## Qualification

This is a **split canary**, not a full end-to-end live Node route certification:

```text
local Node handler conformance previously certified: true
real staging persistence RPC executed: true
real staging rollback verified: true
remote Node handler executed: false
end-to-end live route certified: false
```

The persistence and rollback boundary is proven. The remaining gap is a reliable remote Node execution path.

## Effects

```text
staging network read: true
rollback-scoped synthetic mutation: true
persistent staging mutation: false
public traffic enabled: false
runtime deployed: false
real moderation against user content: false
production changed: false
pull request merged: false
```

## Site effect

No visible or functional site change. The exported route remains HTTP 503 with `COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED`.

## Next boundary

`COM-B04I-R1 — repository-only remote Node execution-path recovery`.

Only after that recovery is certified should a distinct attempt-3 staging authorization be requested. The attempt-2 phrase cannot be reused.
