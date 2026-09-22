# COM-B04C — Moderation Persistence Staging Verification

## Scope

COM-B04C applies the repository-certified COM-B04B persistence package to `doke-web-staging` and verifies the resulting PostgreSQL structure. Runtime composition, real moderation, production and pull-request merge remain blocked.

## Applied migrations

```text
20260806004634  com_b04b_moderation_persistence
20260806004832  com_b04c_moderation_fk_indexes
```

## Verified structure

- private schema `com_moderation_private` exists;
- eight expected tables exist;
- RLS is enabled and forced on all eight tables;
- direct DML is revoked from `anon`, `authenticated` and `service_role`;
- six immutable ledger triggers reject `UPDATE` and `DELETE`;
- both RPCs are `SECURITY DEFINER` with fixed search paths;
- RPC execution is service-role-only;
- all moderation foreign keys have covering indexes;
- no persistent moderation rows exist.

The first performance advisor run identified nine uncovered foreign keys across five ledger tables. COM-B04C added one `(case_id, event_revision)` index per affected table. The second advisor run reported zero uncovered foreign keys in `com_moderation_private`.

The eight `RLS enabled, no policy` INFO notices are intentional because these are private server-only tables with all direct privileges revoked. No new COM moderation security warning was reported.

## Rollback-only canary

A synthetic canary executed inside `BEGIN … ROLLBACK` proved:

1. revision 1 is committed atomically;
2. identical retry returns an idempotent replay;
3. invalid expected revision raises `CASE_REVISION_CONFLICT`;
4. ledger mutation raises `IMMUTABLE_MODERATION_LEDGER`;
5. rollback leaves zero persistent rows.

## Preserved boundary

```text
staging schema changed: true
staging synthetic rows persisted: false
runtime integrated: false
real moderation enabled: false
production changed: false
pull request merged: false
```

## Next boundary

`COM-B04D — repository-only runtime composition readiness`.
