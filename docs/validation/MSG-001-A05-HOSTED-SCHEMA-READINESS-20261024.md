# MSG-001-A05 ? Read-only hosted schema compatibility and migration impact

**Inventory date:** 2026-10-24. **Evidence type:** point-in-time read-only metadata and repository contracts. **Decision:** NO-GO. This report does not authorize SQL writes, schema changes, migrations, Edge Function deploys, secret changes, merge, production promotion or P31 activation.

## What is already present in the repository

The missing RPCs are defined in a single versioned SQL migration:
\`supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql\` (SHA-256 recorded in adjacent JSON). The file is not merely a function patch. It proposes:

- \`private.transaction_attachment_lifecycle\` (attachment status, owner, resource, expiration, retention and failure audit), indexes and service-role-only table grants.
- Four RPCs directly used by \`self-service-operations\` for intent, upload confirmation and removal.
- Three other public RPCs for linking attachments to messages and asynchronous cleanup; private read/upload authorization helpers.
- An after-update trigger on \`public.messages\` to orphan attachments on message removal.
- DROP of four **existing** \`storage.objects\` policies, including authenticated UPDATE/DELETE permissions, replaced with two authenticated SELECT/INSERT policies invoking private helpers.
- Seven \`SECURITY DEFINER\` public RPCs with pinned \`search_path = pg_catalog\` and an explicit REVOKE/GRANT EXECUTE-to-\`service_role\` loop. Effective permissions and RLS behavior still require DB tests; source declarations alone do not certify access.

The frontend remains explicitly disabled (\`attachmentLifecycleEnabled: false\`; MSG-A05 contract status \`repository_only_attachment_lifecycle_ready_disabled\`), which must not be flipped by this work.

## Hosted read-only observations

| Property | doke-web-staging | doke-prof-b05-g4-e2e |
|---|---|---|
| Migration version 20260802220000 present in listed history | No | No |
| Seven planned public lifecycle RPCs found | 0 | 0 |
| New private lifecycle table | Absent | Absent |
| Users/orders/conversations/messages | All exist | Only users exist |
| Private transaction-attachments bucket | Yes, size cap 10 MiB and MIME allowlist | Absent |
| Legacy storage policies targeted for replacement | 4 | 0 |
| Later timestamped migrations in project history | 49 | 30 |

**Critical staging risk:** Applying the old-versioned migration now would perform storage policy replacement on a project that has already received many later migrations. A policy-name conflict, change in table shape, RLS regression, message trigger behavior or role privilege mismatch must be ruled out using an isolated database copy and both positive and negative tests before proposing any hosted DDL.

**Critical E2E risk:** This is a separate professional-verification environment without orders, conversations, messages or the target bucket. The migration is **not compatible as-is** and must not be run there merely to make a few RPC names appear.

Source references: 20260802220000 migration; older transaction-attachment storage migrations; \`supabase/functions/self-service-operations/index.ts\`; \`supabase/functions/transaction-attachment-cleanup/index.ts\`; \`assets/js/core/supabase-config.js\`. Live metadata sources: Supabase \`list_migrations\` and SELECT-only \`pg_catalog\`, \`information_schema\`, \`pg_policies\`, \`storage.buckets\`. No user rows or secret values were read.

## Required isolated pre-release review (NOT EXECUTED)

1. Re-inventory migrations, exact table/column types, Storage policies, function signatures, role grants and bucket settings just before the review. The accompanying JSON is a **historical snapshot**, not a live authority.
2. Review all **later** staging migrations for overlapping Storage policies, message triggers, status transitions and attachment permissions. Confirm the migration's order and intended baseline.
3. Clone an authorized, synthetic staging-like schema locally; apply only a reviewed migration plan. Test actual Postgres compilation, permissions and rollback, with no production or staging writes.
4. Verify \`anon\` and \`authenticated\` cannot execute privileged RPCs directly; \`service_role\` has only intended server access. Test authenticated participant SELECT/INSERT through Storage and deny unrelated actors and UPDATE/DELETE. \`SECURITY DEFINER\` in a public schema is high impact; explicit grants and schema exposure must be independently checked.
5. Test signed upload intent, upload confirmation, removal authorization, message binding, cleanup/retention, 2-hour intent expiry and 30-day retention using synthetic users/resources with negative cases.
6. Capture protected rollback metadata and prior policy DDL; plan a reversible, separately authorized rollout before any database or Edge deployment.
7. Maintain \`attachmentLifecycleEnabled:false\` until positive staging evidence, owner approval and explicit feature activation authority exist.

Supabase's security guidance advises restricting execution on SECURITY DEFINER functions and checking privilege boundaries; merely compiling a migration cannot prove authorization.

## Audit contract

\`scripts/audit-msg-001-a05-hosted-schema-readiness.js\` validates the SHA-256 of the existing migration, its privileged-function and Storage policy declarations, actual Edge call-site references, the disabled UI flag, and the consistency of the point-in-time snapshot. It is **offline only**. It deliberately prints \`NO_GO\` for both historical project snapshots. Even a hypothetical all-green snapshot returns \`LIVE_RECHECK_REQUIRED\`, never a release authorization.

**HOLD:** NO_HOSTED_DDL / NO_MIGRATIONS / NO_SUPABASE_DEPLOY / NO_MERGE / STAGING_NOT_CERTIFIED / P31_HOLD.
