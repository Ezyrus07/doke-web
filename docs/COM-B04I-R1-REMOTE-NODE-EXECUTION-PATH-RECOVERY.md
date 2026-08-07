# COM-B04I-R1 — remote Node execution-path recovery

## Objective

Recover and certify a reliable GitHub Actions path for executing the certified Node moderation handler before any distinct COM-B04I attempt 3 authorization is requested.

COM-B04I attempt 2 proved the real staging persistence, immutable ledger, evidence materialization and rollback boundary. It did not execute the Node handler remotely because no workflow run materialized for the exact trigger and bridge commits.

The remote Node execution path recovered successfully under COM-B04I-R1.

## Recovery protocol

The successful protocol used:

1. workflow preinstalled before trigger;
2. trigger created in a separate commit;
3. exact trigger head checkout;
4. parent verification against the workflow installation head;
5. remote Node execution on a GitHub-hosted runner;
6. sanitized artifact upload;
7. no secrets, environment or staging access.

## Recovery history

### Revision 1

```text
workflow install head: 5f436edfbdc7be6f3227a5e288ab936301a63e22
trigger head: c0178e2d41731d1c2d0f9b8775448b3fa5c2cc91
run: 31137291437
job: 92739396027
workflow materialized: true
exact checkout: true
parent binding: passed
remote Node executor started: false
result: failed in repository audit
staging accessed: false
```

The audit expected a hyphenated marker instead of the canonical underscored error code.

### Revision 2

```text
workflow install head: b719125aee0a7ee8c954fadcb55317802f13292a
trigger head: 3fa2dd130a9d7c6617a7acc1619441ae14ee45e3
run: 31137679848
job: 92740643549
repository audit: 107/107
remote Node executor started: true
artifact ID: 8978678207
result: failed on stale historical readiness audit
staging accessed: false
```

The executor reached Node but re-ran an auditor whose pre-split workflow marker was intentionally stale. The run produced a sanitized failed-closed artifact.

### Revision 3 — certified

```text
workflow install head: 6b2f7c746fb3e0a844d7843014d5c1f56e5fd610
trigger head: 0ea0b4df31725dc2164cd19e25d47e7a211aaf8b
run: 31138130568
job: 92742048610
result: success
repository audit: 115/115
remote Node process executed: true
local canary conformance: 28/28
attempt-2 readiness evidence: certified 58/58
artifact ID: 8978795625
artifact digest: sha256:0257670a8e284497ef7f32797b3e7c738c40c166cb02bd9ffc645f432a99f3a5
```

## Remote Node proof

The GitHub-hosted runner executed Node `v24.18.0` and proved:

```text
exact trigger commit checked out: true
parent matches workflow installation head: true
default moderation handler executed: true
default handler HTTP status: 503
default handler code: COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
local route conformance: 28/28
COM-B04H regression: 121/121 + 159/159
COM-B04G regression: 95/95 + 159/159
repository security checks: passed
diff hygiene: passed
```

This certifies the remote Node execution path and the fail-closed handler. It does not certify a staging live route.

## Security boundary

```text
secrets read: false
environment required: false
staging accessed: false
database accessed: false
runtime deployed: false
public traffic enabled: false
real moderation executed: false
production changed: false
pull request merged: false
```

The attempt-1 and attempt-2 authorizations remain consumed and cannot be reused.

The final certification gate uses structural/grouped deny patterns so its own defensive checks cannot be misclassified as secret or staging usage.

## Workflow closure

After certification, the recovery workflow was archived and now watches only:

```text
config/com-b04i-r1-archived-never-trigger.json
```

No operational trigger remains active for COM-B04I-R1.

## Qualification

```text
GitHub Actions push path recovered: true
remote Node handler process proved: true
default fail-closed handler proved: true
split staging persistence evidence retained: true
staging end-to-end route certified: false
attempt-3 authorization granted: false
```

The Node execution path and the staging persistence path are both individually proven, but they have not yet been exercised together under a distinct attempt-3 authorization.

## Matrix

```text
matrix version: 1.3.112
COM-001 maturity: 3/6
serverAuthority: partial
productionGate: blocked
promotion allowed: false
```

COM-B04I-R1 is infrastructure recovery evidence. It does not promote moderation authority.

## Site effect

There is no visible or functional site change. The default route remains blocked with HTTP 503.

## Next boundary

`COM-B04I-R2 — repository-only attempt-3 authorization envelope and preinstalled staging workflow readiness`.

COM-B04I-R2 may prepare a fresh, preinstalled staging workflow and a distinct single-use authorization phrase. It must not access staging until that new authorization is explicitly supplied. Production and merge remain independently blocked.
