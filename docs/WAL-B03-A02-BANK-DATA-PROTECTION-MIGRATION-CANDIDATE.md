# WAL-B03-A02 — Bank data protection migration candidate

Repository-only successor of PR #537 at `b0d18389fc5748f6b143f00f30104c3b487c96d4`; Matrix `v1.3.132`.

**Candidate prepared; no SQL applied. WAL-B03 remains OPEN. A03 is blocked.**

## Purpose and authority

The legacy public row combines confidential bank storage and presentation. A01 defines the separation; this candidate materializes only the private storage and a bounded maintenance backfill. Primary authority: `supabase/migrations`; supporting authority: configuration, static checks and this execution plan. WAL-A02 remains the masked DTO authority. Existing backend, Edge Functions, save/get RPCs, public tables, UI, snapshots and browser storage are unchanged.

The source migration was created with `supabase@2.119.0 migration new`. This is not an applied migration or a runtime readiness claim. The authorized scope permits source, static tests and a dry-run **plan**, not SQL execution. No database driver or database credential is used by this batch's workflow.

## Reconciliation and new dependency

Control Center was queried on 2026-10-02: product/matrix/CI LIVE, panel/checkpoint FALLBACK with snapshot drift, staging NOT CONNECTED. The source PR is open/draft/unmerged at the authorized SHA; parent remains `6eb8e55317a20f88f8ecb0f083c00c101b2afc59`. A01-specific push and PR runs are successful. Global workflows have unrelated failures; the two Vercel statuses report build-rate-limit. No global green or preview readiness is claimed. There is no WAL execution packet in the rendered overview; authority comes from the user's exact A02 authorization plus A01, not from a panel suggestion.

Direct staging metadata confirmed one legacy bank-account row, no secret store, pgcrypto 1.3 in `extensions`, Vault 0.3.1, authenticated owner/support row reads, service-role-only save RPC returning the legacy row type. No bank values, keys, ciphertext or decrypted secrets were selected.

**Vault ACL remediation is now part of the repository-only candidate, but remains unapplied.** Read-only staging reconciliation found that `service_role` has Vault schema usage, SELECT/DELETE on Vault relations, EXECUTE on `vault.create_secret(...)` and `vault.update_secret(...)`, plus EXECUTE on the internal `_crypto_aead_det_decrypt(...)` primitive. No direct Vault access was found in deployed Edge Functions or repository clients, and the observed Vault readers are postgres-owned private SQL functions used by the order-event worker and staging finance sandbox. The candidate therefore revokes all Vault relation privileges, all Vault function EXECUTE privileges and schema USAGE from `service_role`, while asserting that postgres retains the minimum Vault authority needed by those internal consumers. A03 must still prove this in rollback-only runtime canaries before any committing application.

The concurrent UX wallet work is on different branches and runtime files. This batch uses dedicated candidate paths; generated matrix files are the only shared derivatives. The historical SEC-B09 matrix discrepancy is preserved, not silently repaired here.

## Candidate behavior (not yet observed in runtime)

- One transaction, bounded lock and statement timeouts, capability/role/ACL/collision checks before DDL.
- Before candidate storage DDL, revoke all current Vault relation privileges, Vault function EXECUTE privileges and Vault schema USAGE from `service_role`; then assert no effective Vault access remains for that role.
- Preserve postgres Vault USAGE/SELECT/create-secret authority and keep `private.invoke_order_event_worker_if_needed()` plus `private.assert_staging_finance_sandbox()` unavailable to `service_role`.
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
| anon/authenticated has Vault access before hardening | Abort before key creation |
| service_role after hardening still has Vault schema, relation, column or function authority | Abort transaction |
| postgres loses required Vault access or service_role gains direct worker/sandbox function execution | Abort transaction |
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

1. Recheck the Vault consumer inventory and exact effective ACLs. The candidate must remove all direct `service_role` Vault authority while preserving the two postgres-owned private consumers; otherwise STOP.
2. Recheck candidate/source SHA, SQL SHA-256, Matrix, staging project identity/schema/grants/counts, migration history, collisions and the operational change gate. Stop on any drift. Verify logging configuration and recovery readiness without dumping sensitive values.
3. Prepare and authorize a synthetic rollback-only canary with exact scripts and evidence schema. Do not execute a generic `db push` over the pending repository migration stack.
4. Prove installation rollback on the exact engine/extensions and negative role tests. Runtime evidence must contain only counts/booleans and opaque operation references.
5. Only with explicit application authority install the exact migration once and record repository filename versus remote history identity. No provider/deploy action.
6. With distinct bounded-backfill authority, quiesce writes; in a transaction with fixed timeouts invoke the private function for the freshly reconciled count. STOP if it is not 1. Verify counts and rollback canary before committing a real backfill.
7. Keep WAL-B03 OPEN. A04 separately implements masked save/get/operator/UI and withdrawal-reference cutover; A05 separately retires legacy plaintext after equivalence.

## Rollback / containment

Before commit, PostgreSQL transaction rollback must remove candidate DDL, Vault insertion and backfill writes together; this is a **planned** assertion, not a proved result. For the future rollback-only installation canary, prepare a separately reviewed copy that changes only the terminal COMMIT to ROLLBACK and inserts aggregate assertions before it; record both digests. Do not wrap the original committing file inside an outer transaction: its COMMIT would commit that transaction. Do not bypass an ACL check to make a canary pass.

After an installation/backfill commit but before cutover, keep the unused private objects inaccessible and stop further calls; existing paths still use the preserved legacy table. If removal is required, author a separately approved forward recovery migration after checking dependencies and that no consumer was activated. Never drop a Vault key while ciphertext or recovery depends on it. After A04, returning to plaintext is not a safe default rollback: use protected forward recovery.

## Static verification and limits

`python scripts/test-wal-b03-a02-migration-candidate.py` parses SQL and PL/pgSQL with pglast 7.20 (PostgreSQL 17 parser), checks candidate/ACL/binding/return boundaries, verifies Vault relation/function/schema hardening plus preserved postgres consumer authority, and runs negative source mutations. It cannot prove relation resolution, role execution, encryption, concurrency or rollback. There is no mock database test presented as runtime evidence.

Run A01 and WAL-A02 regressions, financial RPC authority checks, deterministic matrix generation/audit, agent governance and diff hygiene. Generated matrix derivatives may change inventory counts only; maturity, production gates, canonical matrix config and SEC-B09 state are not changed.

References: [Supabase Vault](https://supabase.com/docs/guides/database/vault), [pgcrypto](https://www.postgresql.org/docs/17/pgcrypto.html), [Supabase PostgreSQL security update](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes).
