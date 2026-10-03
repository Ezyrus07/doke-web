# WAL-B03-A02 — Bank data protection migration candidate

Repository-only successor of PR #537 at `b0d18389fc5748f6b143f00f30104c3b487c96d4`; Matrix `v1.3.132`.

**Candidate prepared; no SQL applied. WAL-B03 remains OPEN. A03 is blocked.**

## Purpose and authority

The legacy public row combines confidential bank storage and presentation. A01 defines the separation; this candidate materializes only the private storage and a bounded maintenance backfill. Primary authority: `supabase/migrations`; supporting authority: configuration, static checks and this execution plan. WAL-A02 remains the masked DTO authority. Existing backend, Edge Functions, save/get RPCs, public tables, UI, snapshots and browser storage are unchanged.

The source migration was created with `supabase@2.119.0 migration new`. This is not an applied migration or a runtime readiness claim. The authorized scope permits source, static tests and a dry-run **plan**, not SQL execution. No database driver or database credential is used by this batch's workflow.

## Reconciliation and new dependency

Control Center was queried on 2026-10-02: product/matrix/CI LIVE, panel/checkpoint FALLBACK with snapshot drift, staging NOT CONNECTED. The source PR is open/draft/unmerged at the authorized SHA; parent remains `6eb8e55317a20f88f8ecb0f083c00c101b2afc59`. A01-specific push and PR runs are successful. Global workflows have unrelated failures; the two Vercel statuses report build-rate-limit. No global green or preview readiness is claimed. There is no WAL execution packet in the rendered overview; authority comes from the user's exact A02 authorization plus A01, not from a panel suggestion.

Direct staging metadata confirmed one legacy bank-account row, no secret store, pgcrypto 1.3 in `extensions`, Vault 0.3.1, authenticated owner/support row reads, service-role-only save RPC returning the legacy row type. No bank values, keys, ciphertext or decrypted secrets were selected.

**The Vault boundary is platform-compatible rather than ACL-rewriting.** Read-only reconciliation proved that the broad `service_role` Vault grants are owned by `supabase_admin`; managed `postgres` is not superuser, cannot assume `supabase_admin`, and cannot revoke those grants on its behalf. The prior A03 rollback canary therefore failed safe and left no durable key, table or ACL change. Separately, live PostgREST evidence showed 54 cached relations, exactly matching the 54 currently Data-API-reachable `public` relations; exposing `vault` would add 2 more. `service_role` is NOLOGIN, `authenticator` has no Vault usage, no public view/RPC references Vault, all 11 deployed Edge Functions were inspected with no direct Vault access, no repository client selects `.schema('vault')`, and the only observed Vault readers remain the two postgres-owned private SQL functions used by the order-event worker and staging finance sandbox. The candidate now preserves Supabase Vault and treats fresh runtime schema-cache evidence as an external A03 precondition instead of attempting to mutate platform-owned ACLs.

The concurrent UX wallet work is on different branches and runtime files. This batch uses dedicated candidate paths; generated matrix files are the only shared derivatives. The historical SEC-B09 matrix discrepancy is preserved, not silently repaired here.

## Candidate behavior (not yet observed in runtime)

- One transaction, bounded lock and statement timeouts, capability/role/ACL/collision checks before DDL.
- Do **not** mutate Supabase-managed Vault ACLs. Require `service_role` to remain NOLOGIN, require `authenticator` to lack Vault usage, and fail closed on any public Vault wrapper/view or unexpected non-Vault SQL consumer.
- Preserve postgres Vault USAGE/SELECT/create-secret authority and keep `private.invoke_order_event_worker_if_needed()` plus `private.assert_staging_finance_sandbox()` unavailable to `service_role`.
- Require fresh runtime evidence immediately before A03 that `vault` is absent from the PostgREST/Data API schema cache; PostgreSQL grants alone are not accepted as proof of external reachability.
- A session marker plus `current_user = postgres` prevents accidental execution. **The marker does not confer human authorization**, and must not be set by automated deploy/CI.
- No `IF NOT EXISTS` or replacement of existing objects: collisions fail closed.
- `private.wallet_bank_data_keys_v1`: versioned WAL Vault references, a single active key, retirement metadata. No raw key column; no KYC key reuse.
- `private.wallet_bank_account_secrets_v1`: ciphertext, opaque UUID reference, user identity, secret/key versions and lifecycle fields. RLS enabled, no API policies, all PUBLIC/anon/authenticated/service_role privileges revoked and effective ACLs asserted.
- Candidate key generation happens only in future authorized installation: 32 random bytes, WAL alias `wal-bank-data-key-v1`. The source contains no key material.
- The private backfill is SECURITY INVOKER, postgres-only, has a fixed `pg_catalog` search path, bounded expected count 1, no raw input parameter and no raw return. It is never automatically invoked by the migration.
- Backfill locks source writes and private storage during the transaction. It encrypts exactly five fields using AES-256/PGP, preserves null/empty values, and binds user, opaque reference, payload version, secret version and key version inside the envelope.
- Existing ciphertext is verified, never silently overwritten. Repeated invocation after successful unchanged backfill returns inserted=0, verified=1; version, source-count or payload drift aborts the whole call.
- Internal roundtrip equality checks data and binding; a second encryption checks nondeterminism; a wrong-key probe must fail. Only counts/booleans leave the function. Errors are fixed operation codes, never SQLERRM or plaintext. Null assignments limit live references; they are **not** proof of secure memory erasure.
- No generic decrypt, provider adapter, support break-glass, masked public view or changed API response is introduced.

AES is explicitly selected. The Supabase 2026-09-25 changelog identifies legacy Blowfish/CAST5 issues; those ciphers are not used. Pinning AES does not certify the staging engine, key entropy or runtime behavior without execution tests.

## Retention and rotation boundaries

No retention duration is approved. `purge_after` and `destroyed_at` are constrained to NULL until a later approved policy enables purge. No scheduled retention job or delete function exists. Legacy plaintext survives this batch and future A03 until A04/A05 gates pass.

Versioned key references allow a later rotation protocol: provision a new WAL key, re-encrypt in bounded transactions, validate bindings and projection/reference equivalence, retain the old version for rollback, then retire it under separate approval. This candidate does **not** implement or certify rotation.

A shared WAL key is not per-account crypto-erasure. Retiring a registry row does not destroy Vault material; foreign keys intentionally block deleting referenced keys. Future erasure must resolve live ciphertext, backup/PITR copies, retention holds and key authority. Do not mark crypto-erasure complete from lifecycle columns alone. A01's target remains pending implementation.

## Dry-run and runtime validation plan — NOT EXECUTED

Use synthetic values only and a separately authorized disposable executor. Do not copy the existing staging row into a fixture, query result, log or report.

| Case | Required future result |
|---|---|
| Missing authorization marker; non-postgres executor | Abort before DDL |
| anon/authenticated or `authenticator` gains Vault access | Abort before key creation |
| `service_role` becomes LOGIN-capable, a public Vault wrapper appears, or an unexpected Vault consumer exists | Abort transaction |
| Fresh PostgREST schema-cache evidence cannot prove `vault` is unexposed | Do not execute A03 |
| postgres loses required Vault access or service_role gains direct worker/sandbox/backfill execution | Abort transaction |
| Existing alias, relation or function; missing crypto capability | Abort; no partial installation |
| SQL installation within a rollback-only transaction | All candidate objects and Vault key disappear after rollback |
| anon/authenticated/service_role access, including owner/support/admin JWT identities | No private table access or backfill execution |
| One synthetic source row, then same operation twice | First inserted=1/verified=1; second inserted=0/verified=1; no ciphertext rewrite |
| Null/empty/non-ASCII fields | Exact envelope roundtrip, no normalization or loss |
| Wrong key, altered ciphertext, swapped user/reference/version | Failure; no partial writes; no raw diagnostic |
| Missing, duplicate or changed source count; changed legacy bank fields after first backfill | Fail closed; require reconciliation |
| Concurrent legacy writer and concurrent backfill | Bounded lock wait/timeout; no lost update |
| Successful/failing calls captured by API/DB/audit logging | No key, payload, bank values or decrypted result |
| Rollback after intentional failure following encryption | No residual secret rows; legacy row unchanged |

The backfill's row lock ends with its transaction. A03 must quiesce legacy bank writes and A04 must repeat equivalence immediately before cutover. A03 alone does not maintain synchronization, block raw owner/support reads, mask save/get, sanitize withdrawal snapshots/metadata/log history, or retire browser copies. These remain explicit A04/A05 work.

## A03 execution envelope (requires another authorization)

1. Recheck the Vault consumer inventory, `service_role` NOLOGIN state, `authenticator` Vault denial, public wrappers/views, deployed Edge Functions and repository schema-client usage; otherwise STOP.
2. Re-prove from live PostgREST/Data API runtime evidence that `vault` is absent from the schema cache. This is an external gate: the migration cannot infer Data API exposure from platform-managed Vault grants.
3. Recheck candidate/source SHA, SQL SHA-256, Matrix, staging project identity/schema/counts, migration history, collisions and the operational change gate. Stop on any drift. Verify logging configuration and recovery readiness without dumping sensitive values.
4. Prepare and authorize the exact platform-compatible rollback-only canary. Do not execute a generic `db push` over the pending repository migration stack.
5. Prove installation rollback on the exact engine/extensions and negative role tests. Runtime evidence must contain only counts/booleans and opaque operation references.
6. Only with explicit application authority install the exact migration once and record repository filename versus remote history identity. No provider/deploy action.
7. With distinct bounded-backfill authority, quiesce writes; in a transaction with fixed timeouts invoke the private function for the freshly reconciled count. STOP if it is not 1. Verify counts and rollback canary before committing a real backfill.
8. Keep WAL-B03 OPEN. A04 separately implements masked save/get/operator/UI and withdrawal-reference cutover; A05 separately retires legacy plaintext after equivalence.

## Rollback / containment

The 2026-10-02 A03 attempt against the superseded ACL-revocation candidate failed safe before any durable installation and post-checks confirmed no residual WAL key, private table, probe secret or ACL change. That run does **not** certify this remediated candidate. The next rollback-only canary must be rebuilt from the new exact digest, require fresh external PostgREST schema-cache evidence first, replace only the terminal COMMIT with ROLLBACK, and keep aggregate evidence free of bank/secret values. Do not wrap the original committing file inside an outer transaction: its COMMIT would commit that transaction.

After an installation/backfill commit but before cutover, keep the unused private objects inaccessible and stop further calls; existing paths still use the preserved legacy table. If removal is required, author a separately approved forward recovery migration after checking dependencies and that no consumer was activated. Never drop a Vault key while ciphertext or recovery depends on it. After A04, returning to plaintext is not a safe default rollback: use protected forward recovery.

## Static verification and limits

`python scripts/test-wal-b03-a02-migration-candidate.py` parses SQL and PL/pgSQL with pglast 7.20 (PostgreSQL 17 parser), rejects platform-managed Vault ACL mutation, checks Data API boundary guards, private consumer ownership/execute isolation, encryption/binding/return boundaries, and scans application/Edge Function sources for direct Vault schema clients. It cannot prove the live PostgREST exposed-schema set; that remains mandatory runtime evidence immediately before A03. There is no mock database test presented as runtime evidence.

Run A01 and WAL-A02 regressions, financial RPC authority checks, deterministic matrix generation/audit, agent governance and diff hygiene. Generated matrix derivatives may change inventory counts only; maturity, production gates, canonical matrix config and SEC-B09 state are not changed.

References: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [pgcrypto](https://www.postgresql.org/docs/17/pgcrypto.html), [Supabase PostgreSQL security update](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
