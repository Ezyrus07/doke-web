# COM-B04B — Immutable Moderation Persistence and Migration Readiness

## Scope

COM-B04B prepares a repository-only persistence boundary for the certified `com-b04-moderation-case-authority-v1` contract. It does not apply the migration, connect to Supabase, register runtime routes, execute moderation, access staging, deploy, modify production, or merge the pull request.

## Atomic boundary

The eight logical repository methods required by COM-B04 remain explicit, but all write-side operations are collapsed into one `SECURITY DEFINER` RPC:

- claim the idempotency identity;
- lock the canonical case projection;
- verify the expected revision and prior event hash;
- append the moderation event;
- append optional evidence, decision, sanction, appeal, and media records at the same event revision;
- compare-and-swap the case projection;
- mark idempotency committed;
- return the committed revision.

Any exception rolls the complete PostgreSQL transaction back. The adapter refuses plans that are not `SERIALIZABLE`, atomic, rollback-on-failure, commit-authority false, and complete against the canonical repository method set.

## Private schema

The migration prepares `com_moderation_private` with:

1. `case_projection` — the only mutable canonical projection, protected by expected revision and row lock.
2. `case_event` — immutable, hash-chained case ledger.
3. `command_idempotency` — actor/request identity and committed result.
4. `evidence_record` — opaque evidence reference, digest, and retention metadata only.
5. `decision_record` — immutable recommendation and approval records.
6. `sanction_event` — immutable sanction transitions.
7. `appeal_event` — immutable appeal history bound to the prior decision hash.
8. `media_review_event` — immutable scan and disposition history.

All tables have RLS enabled and forced. Table and sequence privileges are revoked from `public`, `anon`, `authenticated`, and `service_role`. The `service_role` receives execute permission only on the two public RPC functions. The six ledger tables reject `UPDATE` and `DELETE` through immutable triggers.

## RPCs

- `com_moderation_load_case_v1(uuid)`
- `com_moderation_commit_case_command_v1(...)`

Both functions are `SECURITY DEFINER` with a fixed search path. Client roles receive no execute permission.

## Preserved authority boundary

```text
migration applied: false
runtime integrated: false
staging read: false
staging mutation: false
moderation write authority: false
sanction write authority: false
appeal write authority: false
media write authority: false
production authority: false
pull request merge authority: false
```

## Next boundary

`COM-B04C — migration application authorization and staging structural verification`.

That boundary requires separate explicit authorization before any staging migration or structural read is attempted.
