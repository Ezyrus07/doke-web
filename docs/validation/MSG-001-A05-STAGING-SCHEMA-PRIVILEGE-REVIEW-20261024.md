# MSG-A05 ? Read-only staging schema compatibility and privilege hardening

**Observed:** 2026-10-24. **Environment:** doke-web-staging (zwkczgewzbsorbrjuzpb). **Decision:** NO-GO for hosted DDL or Edge Functions. This is source review and local synthetic testing only.

## Read-only catalog observations

The inspection queried only `pg_catalog`, `information_schema`, `pg_policies`, `pg_namespace`, and `supabase_migrations.schema_migrations`; no customer rows or secret values were read. It did not change any hosted state.

| Contract area | Verified staging catalog facts | Risk / interpretation |
|---|---|---|
| Domain columns | `public.users` has UUID `id`, text `status`; `orders` and `conversations` have UUID `id`, client/professional UUIDs and text `external_id`; `messages` has UUID `id`, `conversation_id`, `sender_id`, text `status`. | Necessary source columns are present; this is not end-to-end compatibility. |
| Domain constraints | `users_status_check` includes `active`; `messages_status_check` includes `removed`; existing FK and `external_id` uniqueness indexes exist. | Proposed lifecycle trigger's `removed` state is syntactically compatible. |
| Existing triggers | No non-internal triggers on `public.messages`; five on `orders`; two on `storage.objects`. | No direct name collision on the proposed `messages_attachment_retention_after_removed`. Check functional interactions with Orders, Storage and any later deployment changes before release. |
| RLS | `users`, `orders`, `conversations`, `messages`, `storage.objects` have RLS. | Policies and grants are both necessary; RLS being enabled is not itself authorization assurance. |
| Storage policies | Twelve total `storage.objects` policies; exactly four are for the `transaction-attachments` bucket. The other eight are bucket-restricted to profile, service or professional-verification media. | Planned DROP of four targeted policies is technically scoped, but removes current participant SELECT/INSERT and owner UPDATE/DELETE contracts and replaces with lifecycle-dependent SELECT/INSERT. Regression required. |
| Existing helper | `private.can_access_transaction_attachment(text)` is SECURITY DEFINER and has EXECUTE granted to `authenticated`. Its old policies require active actor and order/conversation participation. | Old helper can remain after policy replacement; confirm whether it is still used elsewhere. |
| Schema accessibility | `authenticated` has USAGE on `private`; `anon` does not. | Internal schema naming is not sufficient to protect a SECURITY DEFINER helper granted EXECUTE to `authenticated`. This alone does not prove the schema is exposed through PostgREST. |
| Migrations | Version `20260802220000` is absent. There are 49 later-stamped migrations in staging, mostly unrelated analytics/domain changes. | Must reconcile version order and full later DDL in a faithful isolated schema clone before any release. |
| Status update authority | `message_participants_update` permits authenticated conversation participants to UPDATE messages when they participate in the conversation; the predicate does not require `sender_id = auth.uid()`. A separate `has_column_privilege` check confirmed that `authenticated` can update `status`, `sender_id`, and `conversation_id`. | **Confirmed grant/RLS review blocker:** a participant might mark another participant's message `removed`, which would activate the proposed 30-day orphan-retention trigger. Need explicit product/authorization decision and negative test on the actual schema before GO. |
| Runtime readiness | Seven lifecycle RPCs and `private.transaction_attachment_lifecycle` are absent; feature flag remains false. | Neither staging nor the previously inspected E2E is release-ready. |

## Two source-level security risks found in the proposed migration

**A. Private lifecycle row disclosure through an unused function.** The previous planned SQL created `private.transaction_attachment_from_path(text)` as a SECURITY DEFINER function returning the *entire lifecycle row*, and granted EXECUTE to `authenticated`. There are no source references outside its declaration/grants. Because the inspected staging grants schema USAGE to `authenticated`, this was an unnecessary data access path if deployed. The current local patch limits EXECUTE to `service_role` only. No claim is made of current exploitation: the migration is not deployed.

**B. Caller-supplied actor identity in RLS helper functions.** The previous planned `private.can_read_transaction_attachment(path,actor_id)` and `private.can_upload_transaction_attachment(path,actor_id)` used a caller-supplied actor ID without comparing it with `auth.uid()`. Since `authenticated` needs EXECUTE for Storage RLS evaluation, direct SQL calls could obtain true for another participant's record or pending intent even if the caller's JWT identity is unrelated. The local patch requires `p_actor_id` to match `auth.uid()` in both helpers. The Storage RLS policy already passes `auth.uid()`, so its intended legitimate path is preserved.

## Synthetic PostgreSQL 17 verification after the patch

Using a separate disposable SCRAM-protected local cluster on `127.0.0.1:55493`, the **full versioned migration**, seven privileged RPCs, two Storage policies and the existing synthetic upload/confirmation/message/retention tests passed. Added negative assertions verify:
- `authenticated` and `anon` cannot execute the entire-row private function; `service_role` retains access;
- a legitimate JWT identity still passes the new read and pending-upload helpers;
- a different JWT identity cannot impersonate an authorized actor even when supplying that actor's UUID;
- all prior denied update/delete, cross-user upload, invalid MIME, and inactive actor cases remain blocked;
- pre-migration synthetic backup restoration returns four legacy policies, zero new RPCs, and no lifecycle table.

These tests **do not** reproduce the full actual RLS/constraint graph, PostgREST exposure, Supabase Storage APIs or behavior of existing hosted rows. The synthetic cluster is temporary and must be stopped and deleted after use.

## Explicit unresolved gate

**NO-GO continues.** Before a scoped hosted migration authorization:
1. Review `message_participants_update` and decide whether any participant should be able to set `status='removed'` on another person's message, because MSG-A05 would then orphan attached files.
2. Compare complete staging schema, function definitions and all 49 later migrations with a real-schema-faithful **synthetic** clone; no direct writes to the hosted project.
3. Check service-role-only RPC permissions, private helper grants, available Storage bucket and verification of both legitimate access and denial after proposed policy replacement.
4. Protect a rollback snapshot of actual policy DDL plus trigger/function identities; test in isolation before changing staging.
5. Preserve `attachmentLifecycleEnabled: false`; require an explicit migration/deploy approval for each target, and do not implicitly enable P31.

**State:** HOSTED_SCHEMA_READ_ONLY_AUDITED / SYNTHETIC_PG17_HARDENED_PASS / LOCAL_ONLY / PR_558_UNCHANGED / NO_HOSTED_WRITES / STAGING_NOT_CERTIFIED / P31_HOLD.
