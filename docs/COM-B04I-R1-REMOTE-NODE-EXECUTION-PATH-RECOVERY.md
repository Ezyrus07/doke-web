# COM-B04I-R1 — remote Node execution-path recovery

## Objective

Recover and certify a reliable GitHub Actions path for executing the certified Node moderation handler before any distinct COM-B04I attempt 3 authorization is requested.

COM-B04I attempt 2 proved the real staging persistence, immutable ledger, evidence materialization and rollback boundary. It did not execute the Node handler remotely because no workflow run materialized for the exact trigger and bridge commits.

## Recovery protocol

The recovery uses two separate repository commits:

1. workflow preinstalled before trigger;
2. one-shot trigger created in a separate commit whose parent is the workflow installation head.

The workflow watches only:

```text
config/com-b04i-r1-remote-node-execution-trigger.json
```

The trigger run must check out its exact head and prove that its parent already contained the workflow.

## Remote Node proof

The GitHub-hosted runner must:

- start a Node 24 process;
- execute the COM-B04I local route conformance;
- execute the attempt-2 readiness audit;
- invoke the exported default moderation handler;
- observe HTTP 503 with `COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED`;
- write and upload sanitized execution evidence.

This proves workflow materialization, exact checkout and remote Node execution. It does not certify a staging live route.

## Security boundary

```text
secrets required: false
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

## Success criteria

```text
workflow run created: true
exact trigger commit checked out: true
parent matches workflow installation head: true
remote Node process executed: true
default handler returned HTTP 503: true
local canary conformance passed: true
attempt-2 readiness audit passed: true
sanitized artifact uploaded: true
staging accessed: false
```

## Matrix

```text
matrix version: 1.3.112
COM-001 maturity: 3/6
serverAuthority: partial
productionGate: blocked
promotion allowed: false
```

COM-B04I-R1 is infrastructure recovery evidence. It does not promote moderation authority.

## Next boundary

After successful certification, prepare a distinct attempt-3 authorization envelope using the recovered, preinstalled workflow pattern. Attempt 3 must still require new explicit authorization before any staging secret or database access.
