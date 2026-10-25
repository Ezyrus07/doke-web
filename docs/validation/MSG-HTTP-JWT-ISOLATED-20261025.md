# MSG-HTTP-JWT-001 ? Synthetic PostgREST authorization

**Date:** 2026-10-25. **Branch:** `codex/msg-http-jwt-gateway-001-local`, stacked on Draft PR #562 (HEAD `7db8f6f2ac3a819bc294d8441597c07acabdd47f`). **NO-GO** for hosted database changes.

## Purpose and test boundary

Run actual HTTP requests against an **isolated PostgREST server** with JWT signatures verified using a synthetic HMAC key, while all SQL uses the staging-catalog-derived synthetic PostgreSQL 17 schema. This is materially more representative of an authenticated REST request than setting session variables with SQL alone; however, it does **not** claim integration with Supabase Auth/GoTrue, Kong, Supabase Storage, or actual hosted JWTs.

On the remote GitHub Actions runner, the workflow starts a PostgreSQL 17 service dedicated to the job and a `postgrest/postgrest:v14.18` container on loopback. An independent `msg_http_authenticator` role with no inherited privileges can switch only to the synthetic `anon` and `authenticated` roles. Its login password and JWT signing secret are hard-coded **synthetic CI-only test values**, never project credentials. The role does not inherit or possess `service_role` privileges.

The setup compiles the source migrations (MSG-A05 and the message UPDATE authority guard) against the catalog-derived fixture; `auth.uid()` is configured within this *synthetic database only* to read `request.jwt.claims` supplied by actual PostgREST JWT decoding.

The JS regression sends HTTP GET/PATCH requests using locally signed tokens, and requires:

- Valid recipient JWT can SELECT and mark received messages read.
- Absent, expired and tampered tokens cannot SELECT private messages.
- A token claiming `service_role` is rejected because the gateway login cannot become that role.
- A non-participant cannot SELECT or UPDATE messages belonging to another conversation.
- A participant cannot patch the sender ID or remove another person's message.
- Sender can remove their own message; recipient cannot resurrect it.
- The opposite-direction recipient can mark a message read.
- The internal `private.transaction_attachment_from_path` function is **not available through public-schema RPC**.

No messages, users, keys, buckets or objects in a hosted environment are accessed. No actual Storage upload, upsert, signed URL or deletion is made.

## Test status

Local static Node and Bash syntax checks: to be recorded after running. Actual HTTP/PostgREST results: **pending remote GitHub Actions**. The Windows Docker Linux engine is unavailable, so the workflow must be published as a Draft PR to run on the isolated Linux CI runner.

## Separate release blockers

The test is **not** a complete staging clone: foreign reference targets remain ID-only stubs, the legacy Storage helper body is a stub, and the GoTrue/Auth and Storage services are not present. The newer PostgREST version may not exactly match the deployed Supabase Data API version; compare behavior before promotion. A real Supabase API/Storage integration test on a disposable, completely separated local environment is still required, as are later-migration reconciliation and an environment-specific rollback plan.

**Controls:** NO_SUPABASE_HOSTED_WRITES / NO_MERGE / NO_PRODUCTION / NO_STORAGE_GATEWAY_CERTIFICATION / STAGING_NOT_CERTIFIED / P31_HOLD.
