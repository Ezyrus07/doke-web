# COM-B04I-R2 — attempt-3 preinstalled staging workflow readiness

## Objective

Prepare the complete staging execution path for COM-B04I attempt 3 **before** any trigger or new staging authority exists.

The workflow is installed on the branch, but it watches only a trigger file that does not exist:

```text
config/com-b04i-r2-attempt-3-staging-trigger.json
```

Therefore this readiness boundary cannot access staging by itself.

## Certified predecessor

COM-B04I-R1 proved that a workflow installed before a later trigger commit is reliably visible to GitHub Actions. Its certified recovery state remains the predecessor for R2.

```text
R1 certified head: e4e42aa85020fc42e55fd94996116f637b706f67
R1 certification run: 31138867230
R1 certification job: 92744275310
matrix: 1.3.112
COM-001 maturity: 3/6
```

## Frozen attempt-3 authorization phrase

```text
I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_3_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY
```

Current lifecycle:

```text
authorization received: false
authorization consumed: false
execution attempted: false
single use: true
reusable after failure: false
```

The phrase grants no authority until it is supplied explicitly in a future user message and materialized as a new, single-file trigger commit.

## Install-before-trigger protocol

The future trigger commit must satisfy all conditions:

1. The only changed file is `config/com-b04i-r2-attempt-3-staging-trigger.json`.
2. That file is newly added, not modified or renamed.
3. Its `workflowInstallHead` equals the trigger commit's immediate parent.
4. The parent already contains `.github/workflows/com-b04i-r2-attempt-3-staging-live-composition-route-canary.yml`.
5. `GITHUB_RUN_ATTEMPT` equals `1`.
6. The exact attempt-3 authorization phrase is present and consumed exactly once.
7. PR #61 remains open, draft and unmerged with auto-merge disabled.
8. Branch and project bindings remain exact.

## Staging canary design

The preinstalled workflow is structurally ready to use the staging environment and its existing protected secrets only after the future trigger exists.

```text
environment: staging
project: zwkczgewzbsorbrjuzpb
runner: ubuntu-24.04
Node: 24
activation: process-local only
public traffic: false
runtime deployment: false
synthetic only: true
outer transaction: SERIALIZABLE READ WRITE
final transaction action: ROLLBACK
```

Exact RPC allowlist:

```text
com_moderation_load_case_v1
com_moderation_commit_case_command_v1
```

The future executor must verify authenticated server session, canonical server context, approved policy, server UTC clock, service-role execution, expected table deltas inside the transaction and zero persistent residue after rollback.

## Handler compatibility

The new attempt-3 runtime has its own attempt contract but presents the already-certified handler contract to the existing server-bound factory. No shared route-handler mutation is needed.

The default exported route remains:

```text
HTTP 503
COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
```

The core composition remains limited to:

```text
disabled
local_test_double
```

## Current authority

```text
repository readiness authority: true
attempt-3 staging execution authority: false
staging read authority: false
staging mutation authority: false
public staging traffic authority: false
persistent staging runtime authority: false
real moderation authority: false
production authority: false
pull request merge authority: false
```

## Current effects

```text
repository readiness files changed: true
attempt-3 trigger created: false
staging accessed: false
database accessed: false
runtime activated: false
public traffic enabled: false
runtime deployed: false
production changed: false
pull request merged: false
```

## Next action

After R2 readiness is certified, obtain the exact attempt-3 authorization phrase. Only then may the single-file trigger be created. Production and merge remain independently blocked.
