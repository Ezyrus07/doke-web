# SCHED-001 C01D — Authenticated browser read-only canary readiness

## Objective

Freeze a fail-closed repository contract for a future authenticated browser canary that verifies the canonical schedule presentation introduced by SCHED-C01C across orders and messages.

This sublot is readiness only. It does not access staging, resolve credentials, create an authorization envelope, launch a browser or execute the canary.

## Exact independent authorization

Generic continuation does not authorize browser execution.

The only phrase accepted by the future execution gate is:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING
```

That phrase will authorize only one separately prepared, read-only, authenticated browser canary against Doke staging. It will not authorize production, mutations, scheduling commands, migrations, deployments, Cron, workers, billing, infrastructure, merge or auto-merge.

## Read-only boundary

The future canary must use two isolated `BrowserContext` instances: one authorized client account and one authorized professional account.

The login token exchange may occur only during authentication. After login, the browser network guard must allow only `GET`, `HEAD` and `OPTIONS`. Any other method must fail the run before evidence is accepted.

The browser must never receive a service-role key. Direct database access and direct scheduling RPC calls are forbidden.

## External authorization envelope

Credentials, raw account identifiers, raw order identifiers and the authorization envelope must remain outside the repository.

The envelope must:

- expire within two hours;
- bind the exact authorization phrase digest;
- bind the PR head SHA;
- bind the staging target;
- bind the client and professional accounts;
- bind the permitted read-only order cases;
- permit persisted reports to contain only digests, counts and assertion results.

## Cases

The externally supplied case manifest may contain at most four orders.

It must include:

- one `canonical_confirmed` order with a complete canonical tuple;
- one `client_intent` or `none` order.

A live `incomplete_projection` fixture must not be manufactured. If an unexpected incomplete projection is observed, the canary must fail closed and emit no user-facing claim that the schedule is confirmed.

## Surfaces

The same order must expose the same schedule authority and compatible presentation across:

1. orders card;
2. orders detail drawer;
3. messages order summary;
4. messages order detail.

The canary must also prove that:

- `Data desejada` is absent from the messages summary as an independent schedule authority;
- `Agenda do anúncio` is absent from the messages summary as an independent schedule authority;
- confirm, reschedule and cancel schedule controls are absent;
- client intent and availability never claim confirmation;
- canonical confirmation requires the complete tuple.

## Evidence policy

Screenshots, video, trace and HTML reports are disabled because they may expose names, services, dates or other user-linked information.

The future JSON report may persist only:

- assertion names and pass/fail results;
- authority counts;
- SHA-256 digests of bound resources;
- the tested head SHA;
- zero-mutation network-guard results.

It must not persist credentials, e-mails, UUIDs, usernames, raw order IDs, raw service IDs or browser storage.

## Current effects

- staging reads: `0`;
- staging mutations: `0`;
- accounts used: `0`;
- browser contexts created: `0`;
- network requests: `0`;
- migrations: `0`;
- deployments: `0`;
- production access: `0`;
- merge or auto-merge: `0`.

## Next gate

After this readiness package is validated, SCHED-C01D remains blocked until the exact independent authorization phrase is supplied. Only then may a separate execution package be prepared and run.

## Canonical runtime consolidation

The authenticated browser executor now owns login synchronization, local fulfillment of the pinned Supabase defer script, DOM and dependency watchdogs, awaited order initialization, terminal remote hydration validation, phase timeouts, sanitized checkpoints and bounded cleanup. The runner is limited to the outer process watchdog. Runtime source rewriting and the two legacy preparer scripts were removed.

This consolidation is repository-only. It performs no browser execution, credential resolution, staging read, staging mutation, migration, deployment, production access or merge. SCHED-C01D remains blocked until a fresh exact authorization is supplied together with the independently authorized SCHED-C01E lifecycle.
