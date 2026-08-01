# SCHED-001 / B04C — Authenticated ORD/SCHED staging closure

## Result

The exactly authorized authenticated ORD/SCHED composition canary passed on Doke staging in run `30716088197`, job `91411759384`, at head `c2bddcd061d2136e07d8c3790abf8f66884c480f`.

Exact result:

```text
authenticated_ord_sched_composition_canary_passed
```

The authorization was consumed and cannot be reused.

## Proven behavior

The canary used four synthetic authenticated personas, one synthetic published service and three synthetic orders inside one PostgreSQL `SERIALIZABLE` transaction. It proved:

- client scheduling preference remained intent rather than order authority;
- hold creation did not schedule the order;
- client confirmation was denied;
- idempotent replay returned the same result and divergent payload reuse was rejected;
- professionals could accept orders but could not manufacture scheduled state;
- starting work required the matching confirmed canonical reservation;
- confirmation atomically projected reservation reference, time and `scheduled` status;
- rescheduling preserved the canonical reservation ID;
- generic cancellation was blocked while canonical schedule authority was active;
- canonical reservation cancellation atomically cleared reference and time and returned the order to `accepted`;
- replacing a canonical reservation with a reservation from another order was rejected;
- incomplete projection was rejected;
- a failed cross-domain projection rolled back to its command savepoint without changing the prior order or reservation state;
- ORD scheduled and accepted events were emitted under the shared correlation ID.

## Transaction and cleanup

The final statement was `ROLLBACK`; `COMMIT` was prohibited. All 15 canary residue counters were zero and all 8 authority counters were unchanged. Independent post-run Supabase verification reconfirmed zero residue and zero authority rows.

Seven earlier authorized attempts failed closed while progressively exposing harness assumptions. Every attempt ended in rollback with zero residue and no authority drift. The successful attempt did not weaken B04D or the generic ORD lifecycle graph.

## Scope preserved

No production access, migration, deploy, frontend connection, Cron activation, worker activation, billing change, infrastructure change, merge, auto-merge, real-user-data use or persistent canary row occurred.

Matrix and blocker reconciliation are intentionally performed in a separate validated phase.
