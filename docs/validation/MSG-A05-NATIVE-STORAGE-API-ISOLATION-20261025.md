# MSG-A05 ? Real Supabase Storage Gateway, isolated native-stack test

**Prepared:** 2026-10-25. **Base:** [Draft PR #563](https://github.com/Ezyrus07/doke-web/pull/563), HEAD `e1688114`. **Decision:** no hosted rollout.

## What the new test actually covers

A GitHub-hosted Ubuntu runner creates a **fresh, unlinked and disposable** Supabase CLI project under the runner's temporary folder (not inside the Kontrat repo). The workflow starts only the local PostgreSQL 17, Auth, PostgREST, Kong and **actual Supabase Storage service**, with unrelated services disabled. No hosted Supabase project, credentials, database, data or bucket is referenced.

The runner checks the locally issued API and database URLs for loopback and the expected ports; it refuses a pre-existing set of Kontrat public tables. It loads a strictly synthetic schema covering the public users, orders, conversations and messages required by the versioned MSG-A05 migration, with a message-update guard. It then uses the local CLI's own local-only anonymous/service keys and a locally signed JWT for three made-up actors. The local CLI project is stopped and deleted in a shell EXIT trap. No `supabase link`, `db push`, `db reset --linked`, remote SQL, deploy or merge is executed.

The HTTP test targets real `/storage/v1` endpoints and checks: non-registered upload rejected; wrong actor unable to upload against someone else's pending lifecycle intent; legitimate owner uploads; Storage persists the JWT-based `owner_id`; trusted confirmation transitions to `uploaded`; valid conversation members can read; outsider is denied read and signed URL; valid participant can request signed URL; client `upsert` is denied with original content preserved; direct owner DELETE is denied; trusted `service_role` delete succeeds and the object becomes unavailable.

## Known limits

The stack is native Supabase Storage, unlike the isolated PostgREST-only JWT test, but the public business schema is **deliberately reduced**; it is not a full clone of staging. Local JWTs are signed with the disposable CLI's test secret; this is not a production GoTrue session test. The fixture exercises a controlled Storage API request directly and uses PostgreSQL only to create/confirm the trusted attachment intent. It does **not** cover all Edge Function orchestration, attachment preview MIME transformations, file size limits for every MIME, upload retries, post-removal lifecycle retention, or production observability.

**Status before GitHub CI:** local Node/Bash static checks only; HTTP test **not yet executed**. No claim of passing Storage API CI is valid before the runner verifies it.

## Strict release boundaries

Keep `attachmentLifecycleEnabled=false`, Draft, P31 HOLD and staging NO-GO. Even if this test passes, separate environment-specific migration-history review, backup/rollback, complete staging dependency checks and release approval remain mandatory.

**Controls:** SYNTHETIC_STORAGE_STACK_ONLY / NO_HOSTED_WRITES / NO_MERGE / NO_PRODUCTION / NO_SECRETS / STAGING_NOT_CERTIFIED / P31_HOLD.
