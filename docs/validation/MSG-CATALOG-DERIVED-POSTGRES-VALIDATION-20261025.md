# MSG-A05 + Message Authority ? Staging catalog-derived synthetic validation

**Inventory:** 2026-10-25. **Source:** SELECT-only metadata from `doke-web-staging`; no user rows, secrets or hosted writes. **Parent:** Draft PR #560, SHA `d3a13c993d775c3bed29c17ef37db588fd682904`. **Decision:** NO-GO for hosted deployment.

## Source and fidelity

`docs/validation/MSG-CATALOG-STAGING-METADATA-20261025.json` is a dated, read-only snapshot from `pg_catalog` and `pg_policies`. It contains only table metadata, constraints and policy expressions for public.users/orders/conversations/messages and the four transaction-attachment Storage policies. It does not copy production rows, credentials, user identifiers or private data.

`scripts/generate-msg-staging-catalog-fixture.js` compiles the snapshot into a PostgreSQL 17 synthetic fixture, with a deterministic `--check` mode to detect drift. The result reproduces all **48** columns of the four public domain tables, all **12** selected RLS policies (eight on public tables and four legacy attachment Storage policies), and **25 of 25** catalog constraints. Four foreign keys to auth.users, schedule_reservations, services and service_versions now use minimal primary-key-only synthetic reference tables, not replicas of those services. All rows inserted afterward are fabricated test actors, orders, conversations and messages.

The fixture uses **stub implementations** of `auth.uid()`, `storage.foldername()` and the *legacy* `private.can_access_transaction_attachment()` to compile policy expressions without installing Supabase services. The legacy helper intentionally returns false; this cannot establish equivalent pre-migration Storage access. Actual Supabase Auth, HTTP/JWT, PostgREST, Storage API and complete service tables were not recreated. Current staging triggers outside this narrowed dependency graph were not executed. It is an explicitly limited **catalog-derived** replica, not a complete staging clone.

## Verified on isolated PostgreSQL 17

`scripts/test-msg-staging-catalog-integration-postgres.ps1` creates an independent local SCRAM cluster on `127.0.0.1:55496`, verifies its user, version and data-directory identity and disposes of the cluster and test files after execution. Both orders completed successfully:
1. MSG-A05 attachment lifecycle migration then message UPDATE authority guard.
2. Message UPDATE authority guard then MSG-A05 lifecycle.

The pre-migration synthetic fixture asserts 48 columns, 12 policies, 25 constraints and four legacy Storage policies, plus reproduces the original *participant-can-edit-another-sender's-message* risk on a synthetic row inside a transaction that is rolled back. Both migrations then compiled. The existing composite regression verifies permitted recipient read, sender-only removal, 30-day orphan retention, denied unrelated removal, denied full-record function EXECUTE and spoofed actor IDs, and preserved legitimate attachment read/upload checks.

**Synthetic recovery check:** `pg_dump` was taken before migrations and `pg_restore` into a second temporary database. It restored the pre-migration structure: four legacy attachment policies, twelve total replicated policies, twenty-five local constraints, zero new message triggers and no lifecycle table. This verifies a synthetic backup/restore method only, **not** a staging rollback or data-safe hosted migration reversal.

The two local runs each completed and deleted all temporary clusters. No hosted Supabase SQL writes or migrations occurred.

## Prepared CI

`.github/workflows/kontrat-staging-catalog-fidelity.yml` uses an isolated PostgreSQL 17 service and runs `scripts/test-msg-staging-catalog-integration-ci.sh`, which builds two synthetic test databases for both migration orders and uses the matching PostgreSQL 17 Docker image for backup/restoration. Guards require the synthetic CI user/database and loopback host; no Supabase secrets are used. **The revised external-FK/Storage coverage is still local and has not run remotely.** Linux shell syntax was checked on WSL.

## Remaining release blockers

1. Four external FKs now compile with ID-only synthetic reference targets; the actual Auth, services, service_versions and schedule_reservations schemas, related business triggers and operations remain outside this fixture. Audit the later staging migrations for overlaps with the historical MSG-A05 version.
2. Validate authenticated **HTTP REST/PostgREST and Storage API** flows with real test JWTs, including direct role grants and error codes. In this turn authentication remained simulated via session claim GUCs.
3. Synthetic Storage RLS now verifies authenticated UPDATE/DELETE denial and service_role deletion. Real Storage HTTP API behaviors (including upload overwrite/upsert), old-helper compatibility and client error codes remain untested; Supabase documentation requires SELECT+UPDATE for upsert.
4. Prepare a reviewed environment-specific backup/rollback with exact previous policy DDL and affected-row strategy. No live backup or staging data clone was performed.
5. Keep `attachmentLifecycleEnabled=false`, retain Draft state, and require separate scoped approval for migrations, deploys, secret changes, merges and P31 activation.

**Status:** `CATALOG_DERIVED_PG17_LOCAL_PASS / BOTH_ORDERS_PASS / SYNTHETIC_RESTORE_PASS / CI_UNPUBLISHED / HOSTED_NO_GO / NO_MERGE / P31_HOLD`.

## 2026-10-25 external FK and Storage extension

A separate source-only branch added all four external FK definitions using metadata-grounded, ID-only stub targets and synthetic referents. Negative SQL checks reject nonexistent references and deletion of used service/service_version records; transactional checks validate schedule deletion SET NULL and auth.users deletion CASCADE. These do **not** establish business-level correctness of those referenced tables.

After the lifecycle migrations, synthetic Storage-policy checks deny direct authenticated UPDATE and DELETE and preserve trusted service_role cleanup. No real HTTP Storage call or JWT request was made. Docker Desktop's local Linux engine was unavailable, so a local Supabase/PostgREST gateway could not be provisioned without additional environment changes. This remains an explicit release blocker. The synthetic PostgreSQL 17 local test runners remove their temporary clusters.
