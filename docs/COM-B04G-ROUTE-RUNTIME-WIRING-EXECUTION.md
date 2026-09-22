# COM-B04G — repository-only blocked route wiring execution

## Authorization

```text
I_EXPLICITLY_AUTHORIZE_COM_B04G_REPOSITORY_ONLY_ROUTE_REGISTRY_AND_MODULE_LOADER_WIRING
```

```text
authorization received: true
authorization consumed: true
single use: true
reusable after attempt: false
source head: 758a56571472f4b75c9ab55ef5255fb4d16ad985
```

The authorization covers only repository wiring. It does not authorize staging access, deployment, traffic, live composition, real moderation, production or pull-request merge.

## Executed repository changes

```text
route registered in repository: true
communities module loaded in repository: true
blocked handler exported: true
runtime activated: false
```

### Route registry

```text
name: communities.moderation.command
method: POST
path: /communities/:communityId/moderation/commands
module: communities
handler: executeModerationCommand
allowed roles: client, professional, support, admin
scope: canonical_community_moderation_authority
idempotency required: true
audit required: true
service role required: true
request freshness required: true
RLS validation required: true
authorization gate: backend_route_guard_plus_canonical_domain_authority
```

### Module loader

`backend/shared/http/module-route-loader.js` now imports:

```text
backend/modules/communities/route-handlers.js
```

The `communities` module is present in the immutable module map, and `getHandler()` resolves `executeModerationCommand`.

## Mandatory fail-closed handler

The handler does not import or invoke:

- `community-moderation-runtime-composition`;
- the Supabase repository adapter;
- `createClient`;
- RPCs or tables;
- network clients;
- environment credentials;
- staging or production services.

Every invocation fails before inspecting request data or dependencies:

```text
HTTP 503
COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED
retryable: false
runtimeActivated: false
stagingTrafficEnabled: false
realModerationEnabled: false
```

This allows route-registry and module-loader composition to be tested without creating an operational moderation endpoint.

## Preserved security boundary

COM-B04D remains unchanged:

```text
activation modes: disabled, local_test_double
live invocation: blocked
routeRegistered inside composition: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

The repository route exists, but it cannot reach the moderation composition.

## Effects

```text
repository route registry changed: true
repository module loader changed: true
repository blocked handler created: true
staging read executed: false
staging mutation executed: false
staging deployment executed: false
staging traffic enabled: false
real moderation enabled: false
real sanction enabled: false
real appeal enabled: false
real media disposition enabled: false
production changed: false
pull request merged: false
```

## Site effect

There is no visible or functional site change in any deployed environment.

The route is present only in the PR branch. Even if this branch is started locally, the endpoint intentionally returns `503` and performs no domain or database operation.

## Matrix synchronization

```text
matrix version: 1.3.111
canonical commit: 4badbbe0d542f3f216e6ab72fbe599a649524216
sync run: 31103318270
sync job: 92622061274
sync result: success
COM-001 maturity: 3/6
serverAuthority: partial
stagingEvidence: staging_canary
productionGate: blocked
promotion allowed: false
```

## Repository certification

```text
certified head: be8a8fe9c4f89ff6d41a034f4de244cc8410eedd
run: 31103590796
job: 92622986902
result: success
COM-B04G conformance: 92/92
COM-B04G audit: 153/153
blocked route invocation: passed
COM-B04F historical continuity: passed
COM-B04E regression: 36/36 + 194/194
COM-B04D regression: 39/39 + 155/155 + 72/72
repository-only security checks: passed
diff hygiene: passed
```

The deterministic sync and repository certification registered COM-B04E, COM-B04F and COM-B04G evidence without promoting operational authority.

Repository wiring alone does not make moderation operational.

## Next boundary

`COM-B04H — live composition activation readiness` must define how a deployed server obtains verified session, canonical context, service-role executor, audit storage and policy approval.

COM-B04H must remain repository-only unless a separate authorization explicitly grants staging deployment or traffic. Real moderation, production and merge remain independently blocked.
