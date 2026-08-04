# REP-A01 — Authority Baseline

## Purpose

Freeze the repository-only authority baseline for `REP-001 — reviews, reputation and rehire` before changing runtime behavior, database schemas, RLS, Edge Functions, staging or production.

This sublot records what currently acts as authority, where browser and server rules diverge, which outcomes are unsafe, and which gates must remain closed.

## Current authority split

| Capability | Current authority | Baseline conclusion |
| --- | --- | --- |
| Review submission | Browser localStorage plus direct authenticated table insert | Not canonical |
| Eligibility | Browser orchestration plus completed-order RLS check | Rules diverge |
| Uniqueness | Local order lookup plus `unique(order_id, reviewer_id)` | Static protection exists; remote concurrency not proven |
| Publication | Authenticated insert requires `published` | Moderation bypass |
| Moderation | Service-role table mutation only | No domain case or appeal contract |
| Reputation | Browser aggregation from local reviews | Not trustworthy |
| Dispute impact | Browser blocks active dispute | Remote insert policy does not |
| Side effects | Separate browser writes | Not atomic |
| Rehire | Absent | No transaction linkage |

## Load-bearing findings

1. `reviews-repository.js` persists review records in `doke.reviews.local.v1` and calculates professional reputation from those browser records.
2. `review-service.js` declares `provider: 'local-mock'` and mutates review, order, conversation, charge, notification and reputation state from the browser.
3. `reviews_completed_order_insert` permits direct authenticated `INSERT` and requires the caller to select `published` status.
4. The browser checks payment release, linked charge and active dispute; the remote insert policy checks completed-order participation only.
5. `unique(order_id, reviewer_id)` is a useful static constraint, but there is no stable command identity, lost-response replay or concurrent remote evidence.
6. No auditable moderation, report, restoration or appeal lifecycle exists for reviews.
7. Public reputation is not a versioned server projection and has no canonical fraud, collusion or dispute-impact policy.
8. The active UI supports client-to-professional reviews while RLS permits either participant to review the counterparty.
9. Review comments can be public without a defined text-safety or personal-data boundary.
10. Rehire does not create a new transaction linked to the prior completed order and current service authority.

## Mandatory invariants

- Authenticated UUID sessions never create authoritative reviews in localStorage.
- Review submission uses a server-owned command with a stable client request identity.
- Exact order participation, configured counterparty, completion, payment and dispute state are server-validated.
- One review per configured actor and order is concurrency-safe and replay-safe.
- New reviews enter an explicit moderation state; the browser cannot choose public visibility.
- Moderation, hiding, removal, restoration and appeal are append-only and audited.
- Reputation is recalculated server-side from eligible canonical review revisions.
- Hidden, removed, fraudulent or invalidated reviews do not influence public reputation.
- Dispute outcomes affect reputation only under an approved, versioned policy.
- Review creation and transaction side effects are atomic or outbox-backed.
- Public projections expose aggregate reputation without private risk signals.
- Rehire creates a new Doke order using current service, pricing and availability authority.
- Browser fixtures and caches never create production reputation authority.

## Preserved blockers

- `REP-B02`: remote eligibility, uniqueness and moderation lifecycle are not proven.
- `REP-B03`: canonical reputation, fraud resistance and dispute impact are undefined.
- `REP-B04`: rehire and retention economics are not implemented.
- DSP and PAY policy/provider blockers remain inherited.

## Planned repository-only sequence

1. **REP-A02** — server-owned eligibility, uniqueness and idempotent review command.
2. **REP-A03** — moderation, reporting, restoration and appeal lifecycle.
3. **REP-A04** — canonical reputation projection, fraud resistance and dispute impact.
4. **REP-A05** — rehire transaction-linkage and retention readiness.

## Explicit non-effects

This baseline performs no network request, database connection, staging read, staging mutation, migration, deployment, provider contact, credential configuration, real review creation, moderation action, reputation change, rehire, user-data change, money movement or production change.
