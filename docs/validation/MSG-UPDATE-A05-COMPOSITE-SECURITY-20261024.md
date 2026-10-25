# MSG-A05 + Message Update Guard ? composite integration after privilege hardening

**Validated:** 2026-10-25. **Source:** stacked on PR #559 (8f8bd33d); local-only branch `codex/msg-a05-update-integration-001-local`. **Hosted decision: NO-GO** pending faithful staging replication, API JWT and rollback evidence.

## Reconciled source

The source here now combines:
- MSG-A05 lifecycle migration `20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql` with removal of an unused `authenticated` EXECUTE grant on the SECURITY DEFINER, whole-row function `private.transaction_attachment_from_path(text)`.
- JWT actor binding in both `private.can_read_transaction_attachment(path, actor_id)` and `private.can_upload_transaction_attachment(path, actor_id)`; direct actor ID spoofing cannot satisfy `auth.uid()`.
- Message-update guard migration `20261025022849_message_update_authority_guard.sql`, limiting authorized recipients to read status and original senders to removal.
- The 2026-10-24 read-only staging permission inventory in `MSG-001-A05-STAGING-SCHEMA-PRIVILEGE-REVIEW-20261024.md`. Staging still has the old Storage policies and does not have these schema changes deployed.

Local security commits `38a1f305` and `2f5631f7` were cherry-picked with source provenance. The integration test's original demonstration of a synthetic private-row leak was replaced by **negative checks that fail if that exposure returns**.

## Verified in disposable PostgreSQL 17

The isolated Windows SCRAM PostgreSQL 17 test runner binds to `127.0.0.1:55495`, verifies data-directory identity, uses only synthetic actors/messages/attachments, and deletes the temporary cluster after each execution. **Both directions passed**:

1. MSG-A05 lifecycle, then message update guard.
2. Message update guard, then MSG-A05 lifecycle.

For each migration order, the checks confirm that both triggers coexist; a recipient may mark a message read without orphaning the attachment; an unrelated/recipient actor cannot delete the sender's message or affect retention; the original sender may remove their own message and orphan an attached file with approximately 30-day retention.

Hardened privilege checks:
- `anon` and `authenticated` have no EXECUTE grant on the full-row private attachment helper; `service_role` retains EXECUTE.
- A separate authenticated user cannot call the full-row helper successfully.
- Passing the original owner's UUID while signed in as another actor does **not** authorize the read or upload helper.
- The original owner still passes both read and pending-upload helper checks.

The previous synthetic reproduction of the unsafe old grant is retained in the earlier commit/history and preceding report revision, but the active regression now expects and verifies **denial**.

## CI and safety limitations

`.github/workflows/kontrat-message-attachment-integration.yml` runs the same source migrations in both orders on two disposable synthetic PostgreSQL 17 databases using a CI-only Postgres service. The workflow does not connect to the actual Supabase instances or contain hosted credentials. **Remote CI has not run for this branch**. Passing locally is not CI certification.

The baseline reconstructs the relevant eleven message columns, role access and key RLS policy patterns, but is **not** a complete byte-for-byte staging clone. Real Supabase JWT/PostgREST, Storage gateway, later migrations, policies outside this scope, and a staging-specific backup/rollback plan remain unverified. The MSG-A05 historical migration version may have been applied in other uninspected environments; its file change needs a per-environment history decision before any release.

**Do not deploy or run hosted DDL; do not merge or mark ready.** Keep the MSG-A05 feature flag off and the P31 hold active. Next step is remote CI on a separately approved PR Draft, followed by staging-faithful synthetic tests. The current branch/commits remain local.

**State:** `COMPOSITE_LOCAL_PG17_PASS / PRIVATE_ROW_DENIED / ACTOR_SPOOFING_DENIED / HOSTED_NO_GO / NO_PUSH / STAGING_NOT_CERTIFIED / P31_HOLD`.
