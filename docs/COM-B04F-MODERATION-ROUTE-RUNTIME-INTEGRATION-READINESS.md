# COM-B04F — moderation route/runtime integration readiness

## Objective

Freeze the first server route candidate that can eventually connect the COM-B04D moderation composition to the shared staging API runtime, while preserving every runtime and remote boundary as disabled.

COM-B04F is repository-only. It does not modify the central route registry, module route loader, staging runtime, HTTP server, release contract, Supabase project, database, production or pull-request merge state.

## Certified predecessors

```text
COM-B04D composition contract: com-b04d-moderation-runtime-composition-readiness-v1
composition activationMode: disabled
composition routeRegistered: false

COM-B04E attempt-2 status: authenticated_rollback_only_canary_passed
run: 31067102891
job: 92507013853
artifact: 8954212159
persistent residue: false
final certification run: 31067665889
final certification job: 92508727556
```

The canary proved authenticated preparation, atomic persistence and mandatory rollback. It did not grant route or runtime authority.

## Candidate route

```text
name: communities.moderation.command
method: POST
path: /communities/:communityId/moderation/commands
module: communities
handler: executeModerationCommand
roles: client, professional, support, admin
scope: canonical_community_moderation_authority
```

The HTTP route is intentionally a command boundary. The route-level role gate is only coarse authentication. Final authorization must remain inside the canonical community moderation context and domain authority.

## Mandatory route properties

```text
idempotencyRequired: true
auditRequired: true
serviceRoleRequired: true
requestFreshnessRequired: true
rlsValidationRequired: true
authorizationGate: backend_route_guard_plus_canonical_domain_authority
```

No client payload may supply actor, policy, community, target, case, authorization, service-role material or runtime activation state. COM-B04D continues to reject authority overrides and derives canonical state on the server.

## Current integration state

```text
candidate present in route-registry.js: false
communities present in module-route-loader.js: false
runtime route handler exported: false
staging-api-runtime.js changed: false
node-http-server.js changed: false
runtime-release-contract.js changed: false
```

The candidate is only a deeply frozen manifest in:

```text
backend/modules/communities/community-moderation-route-runtime-readiness.js
```

The same module exposes a defensive handler that always fails with:

```text
COM_B04F_ROUTE_ACTIVATION_NOT_AUTHORIZED
HTTP 503
retryable: false
```

This handler is not registered or loaded. It exists as defense in depth if premature wiring is attempted in a later change.

## Repository readiness versus activation authority

COM-B04F can be repository-ready while activation remains blocked.

Repository readiness requires:

- COM-B04D contract identity unchanged;
- COM-B04D activation mode still `disabled`;
- COM-B04D route still unregistered;
- successful COM-B04E attempt-2 evidence bound to run `31067102891`;
- zero persistent residue;
- candidate absent from the central route registry;
- `communities` absent from the module route loader;
- no runtime handler export.

Activation additionally requires separate evidence or authorization for every item below:

```text
institutional policy approval
route-registry mutation
module-route-loader mutation
runtime wiring
staging deployment
staging traffic
real moderation
```

COM-B04F grants none of them.

## Preserved blockers

```text
INSTITUTIONAL_POLICY_APPROVAL_REQUIRED
EXPLICIT_ROUTE_REGISTRY_AUTHORIZATION_REQUIRED
EXPLICIT_MODULE_LOADER_AUTHORIZATION_REQUIRED
EXPLICIT_RUNTIME_WIRING_AUTHORIZATION_REQUIRED
EXPLICIT_STAGING_DEPLOYMENT_AUTHORIZATION_REQUIRED
EXPLICIT_STAGING_TRAFFIC_AUTHORIZATION_REQUIRED
EXPLICIT_REAL_MODERATION_AUTHORIZATION_REQUIRED
```

Production and merge remain prohibited independently.

## Matrix effect

```text
matrix version: 1.3.110
COM-001 maturity before: 3/6
COM-001 maturity after: 3/6
promotion allowed: false
```

Preparing a candidate route does not make moderation operational.

## Site effect

There is no visible or functional site effect. No browser request can reach this candidate because it is absent from both central runtime integration surfaces.

## Rollback

Remove the COM-B04F contract, config, test, audit, workflow and this document. No database, staging or production rollback is required.

## Next boundary

```text
COM-B04G
→ separate authorization for route registry and module loader wiring
→ keep runtime traffic and real moderation disabled unless separately authorized
```

Any route registration, loader mutation, staging runtime connection, deployment, traffic, real moderation, production change or merge requires explicit authority appropriate to that exact scope.
