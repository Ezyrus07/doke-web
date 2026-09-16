# COM-B04G — route registry and module loader wiring authorization readiness

## Objective

Prepare a single-use authorization boundary for the smallest repository-only wiring step after COM-B04F.

This sublot does **not** register the route, load the communities module, activate the moderation composition, access staging, deploy runtime code, enable traffic, execute real moderation, change production or merge the pull request.

## Current state

```text
authorization received: false
authorization consumed: false
execution attempted: false
route registered: false
communities module loaded: false
runtime handler exported: false
composition activationMode: disabled
staging accessed: false
production changed: false
pull request merged: false
```

## Required exact authorization

```text
I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING
```

The phrase is single-use. Any execution attempt consumes it, whether the execution succeeds or fails. A rerun or second attempt requires a new explicit authorization.

## Baseline binding

The authorization gate is bound to the exact current blobs:

```text
COM-B04F readiness contract:
e3af9ea714d81f77b6e08d270e5afe6897fc67a2

backend/shared/http/route-registry.js:
a0456c2c98662b7f2c48f6426e56e5b0330624eb

backend/shared/http/module-route-loader.js:
d5322507bf7d0ecee4313aab1a7b9c04c9df29c9
```

Any baseline drift blocks execution and requires a new readiness evaluation.

## Candidate route

```text
name: communities.moderation.command
method: POST
path: /communities/:communityId/moderation/commands
module: communities
handler: executeModerationCommand
scope: canonical_community_moderation_authority
```

Required route properties:

```text
idempotencyRequired: true
auditRequired: true
serviceRoleRequired: true
requestFreshnessRequired: true
rlsValidationRequired: true
```

## Repository changes authorized only after the exact phrase

1. Add the frozen candidate route to `backend/shared/http/route-registry.js`.
2. Create `backend/modules/communities/route-handlers.js` with a fail-closed handler only.
3. Load that communities module from `backend/shared/http/module-route-loader.js`.
4. Add repository-only conformance, audit and evidence for the wiring.

No other file or authority is implicitly included.

## Mandatory fail-closed handler

The wired handler must not call `createModerationRuntimeComposition`, Supabase, RPCs, tables, network clients or staging services.

Every invocation must fail with:

```text
HTTP 503
COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
```

This proves route and loader composition without creating a live moderation endpoint.

## Explicitly excluded authority

```text
live composition authority: false
staging read authority: false
staging mutation authority: false
staging deployment authority: false
staging traffic authority: false
real moderation authority: false
real sanction authority: false
real appeal authority: false
real media disposition authority: false
production authority: false
pull request merge authority: false
```

## Security and lifecycle rules

- The authorization phrase must match exactly.
- The COM-B04F readiness contract and central HTTP blobs must match exactly.
- The scope must remain repository-only.
- The handler must remain blocked-only.
- COM-B04D must remain in `disabled` activation mode.
- Any prior execution attempt blocks reuse.
- Consumed authorization cannot be replayed.
- Staging, traffic, real moderation, production and merge remain independently authorized boundaries.

## Site effect

There is no visible or functional site effect in this readiness sublot.

Even after a future authorized COM-B04G wiring execution, the repository route will intentionally return `503`; no deployed environment changes are included.

## Matrix

```text
matrix version: 1.3.110
COM-001 maturity: 3/6
serverAuthority: partial
promotion allowed by this readiness sublot: false
```

## Next action

Obtain the exact single-use authorization phrase. Only then may the repository-only blocked route wiring be executed.
