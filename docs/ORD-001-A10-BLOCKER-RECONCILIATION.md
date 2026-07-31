# ORD-001 A10 — Blocker Reconciliation and Domain Handoff

## Objective

Reconcile the remaining `ORD-001` blockers after the successful A07E remote replay canary without claiming false domain closure and without crossing any external authorization boundary.

This is a repository-only sublot. It performs no browser execution, network request, staging mutation, provider selection, account creation, billing action, infrastructure change, deployment, production change or merge.

## Current blocker disposition

### ORD-B02 — real two-context visual canary

`ORD-B02` remains open under `ORD-001`.

The repository preparation, deterministic settlement, fail-closed Playwright executor, cleanup boundary and short-lived authorization-envelope contract are complete. Closure still requires explicit authorization for the identified client, professional and professional-owned service, a valid external envelope, successful `check-env`, the real two-context visual canary and run-scoped cleanup with zero residue.

A generic command such as `próximo`, `pode prosseguir` or any paraphrase does not authorize this execution.

### ORD-B03 — payment lifecycle

`ORD-B03` remains open, but its implementation authority belongs to `PAY-001`.

`ORD-001` must not invent or duplicate payment authority. Financial completion remains blocked until `PAY-001` owns a real PSP webhook lifecycle and exposes the resulting canonical state to the order domain.

### ORD-B04 — scheduling and availability

`ORD-B04` remains open, but its implementation authority belongs to `SCHED-001`.

The ownership handoff is now recorded by `ORD-A11`. `ORD-001` must not create a parallel scheduling authority. Availability, holds, confirmed reservations, conflict protection, timezone, rescheduling and cancellation must become server-canonical under `SCHED-001`, while the order domain consumes one canonical reservation reference.

### ORD-B05 — external staging provider

`ORD-B05` remains open under `ORD-001`.

Railway remains the recommended initial external staging provider, but no provider is selected or bound. Only the exact phrase below may authorize preparation of a non-secret Railway adapter:

`I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`

That phrase does not authorize account creation, a paid plan, billing, secrets, infrastructure creation, deployment, rollback execution, production changes or merge. Each remains independently blocked.

## Reconciliation performed

The matrix previously retained three A07B/A07C actions even though the nonce ledger migration, Cron header migration, Edge freshness deployment and remote replay canary are already complete in staging. Those obsolete actions are removed.

Repeated provider-selection actions are collapsed into one exact, fail-closed instruction. After the A11 handoff, the remaining queue is intentionally short:

1. execute the `SCHED-001` repository baseline and read-only staging security preflight defined by `ORD-A11`;
2. hand off `ORD-B03` to `PAY-001`;
3. await explicit resource authorization for `ORD-B02`;
4. await exactly `I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING` for the limited `ORD-B05` adapter-preparation step.

## Cumulative contract compatibility

The reconciled blocker descriptions retain the canonical clauses required by earlier gates: `authorization envelope`, `external staging release provider` and `explicit provider selection`. This preserves the cumulative A06, A08 and A09 contracts while keeping the A10/A11 ownership and sequencing authoritative.

## Closure decision

No blocker is closed by this sublot.

`ORD-001` is repository-reconciled but not domain-complete. Its exit criteria still require two real accounts to complete the order lifecycle across devices, idempotent repeated actions, durable events and removal of mock authority from production paths.

Production and PR merge remain blocked.
