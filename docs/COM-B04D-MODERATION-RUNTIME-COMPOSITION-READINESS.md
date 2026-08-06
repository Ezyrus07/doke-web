# COM-B04D — Moderation Runtime Composition Readiness

## Status

`repository_composition_ready_live_invocation_blocked`

This sublot prepares the server-side composition boundary for community moderation without registering a route, invoking staging, enabling real moderation, deploying code or changing production.

## Root cause

COM-B04, COM-B04B and COM-B04C already provided:

- deterministic moderation business rules;
- immutable persistence and idempotency contracts;
- structurally verified staging tables and RPCs.

The remaining gap was architectural wiring. No component safely connected a server-verified session, canonical authorization and moderation snapshots, the domain evaluator and the service-role repository adapter. Connecting those pieces directly in a route or controller would duplicate policy, allow authority drift and risk exposing `service_role` selection to request data.

## Composition boundary

The new module is:

```text
backend/modules/communities/community-moderation-runtime-composition.js
```

The dependency direction is fixed:

```text
request envelope
  -> server session verifier
  -> canonical context loader
  -> moderation case authority
  -> commit-envelope translator
  -> moderation Supabase repository adapter
  -> one SECURITY DEFINER RPC
```

No route or browser payload may select the executor, actor, authorization, policy, community, target or case authority.

## Server-verified actor

The composition accepts only a session result with:

```text
verified: true
source: server_verified_session
active canonical user
AAL: aal1 or aal2
```

It converts that result into the domain actor shape:

```text
source: server_verified_authenticated_session
authenticated: true
status: active
```

Bearer tokens are passed only to the injected session verifier. They are not copied into the prepared command or persistence payload.

## Canonical context

The context loader must be marked as `canonical_server_context_loader` and return:

- active canonical community snapshot;
- canonical actor authorization and capabilities;
- approved moderation policy;
- canonical target for `open_case`;
- hydrated canonical case for existing-case commands;
- persistence provenance tied to `com_moderation_load_case_v1`.

For an existing case, the hydrated case revision must equal the revision returned by the persistence RPC. A mismatch fails closed with `PERSISTED_CASE_BINDING_REQUIRED` or `PERSISTENCE_PROVENANCE_REQUIRED`.

## Domain and persistence separation

The composition does not reproduce moderation decisions. It calls `evaluateCommand()` from COM-B04. Only an `accept` result can be translated into a persistence command.

The translator preserves:

- domain-derived idempotency key and intent fingerprint;
- expected revision;
- event hash and previous hash;
- serializable transaction plan;
- canonical projection revision;
- optional evidence, decision, sanction, appeal and media ledger records.

The `open_case` translation also materializes the initial report statement as an immutable `evidence_record`. Without this translation, the case could be created while its initial evidence existed only in the command payload.

## Activation modes

Only two modes exist:

```text
disabled
local_test_double
```

`disabled` is the default and rejects invocation with:

```text
COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED
```

`local_test_double` requires an executor explicitly marked `environment: local_test_double`. There is no `live`, `staging` or `production` activation mode in COM-B04D.

## Conformance coverage

The local test verifies:

- dependency fail-closed behavior;
- no route registration;
- no RPC during new-case preparation;
- canonical case load before existing-case evaluation;
- initial evidence persistence mapping;
- projection append behavior;
- hash-chain preservation;
- one atomic commit RPC in the local test-double mode;
- blocked live invocation;
- blocked client actor and authorization overrides;
- blocked invalid session source;
- blocked persistence revision/provenance drift;
- read-only replay behavior;
- bearer-token non-retention.

## Effects

```text
database accessed: false
staging read: false
staging mutation: false
migration applied: false
route registered: false
runtime activated: false
real moderation action: false
deployment executed: false
production changed: false
pull request merged: false
```

## Remaining risks

COM-B04D does not validate:

- a real server auth implementation against staging JWTs;
- live canonical context loaders;
- multiple concurrent database connections;
- runtime observability and error correlation;
- rollout or rollback of an activated route;
- any real report, sanction, appeal or media disposition.

## Next boundary

The next boundary is `COM-B04E — authenticated staging runtime composition canary`.

Any live staging read or invocation requires a new explicit authorization. COM-B04D grants no staging, runtime, production or merge authority.
