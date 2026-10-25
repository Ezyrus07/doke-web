# MSG-UPDATE-AUTHORITY-001 ? message update privileges

**Inventory date:** 2026-10-24, Bahia timezone. **Migration version:** 20261025022849 (UTC). **Status:** LOCAL_PG17_VALIDATED / HOSTED_NO_GO.

## Read-only staging evidence

The current staging project has RLS on public.messages and a permissive message_participants_update policy for users who participate in the conversation. Its table-level UPDATE grant to authenticated applies to all message columns, including ID, sender_id, conversation_id, status, body, attachments, metadata, read_at, and created_at. No sender-specific UPDATE rule was observed in that RLS policy. We did NOT try altering hosted records or read user messages.

This creates a possible direct PostgREST/SQL authorization risk even if the application UI does not expose an arbitrary edit feature.

## Necessary backend behavior

backend/modules/messaging/messaging-service.js uses context.supabase (authenticated user client) for client/professional operations. Removing a message updates status=removed and body='' only after the backend checks the actor is its sender. Marking a conversation read updates status=read for messages other than those sent by the actor. These operations must keep working. Internal staff operations use context.serviceSupabase.

## Local proposal

Generated an entirely new SQL migration with the Supabase CLI, rather than modifying an already-applied historical file. It revokes table-level and existing column-level UPDATE from authenticated, then grants status/body UPDATE only.

A SECURITY INVOKER BEFORE UPDATE trigger enforces immutable identity, conversation, timestamps and all other fields. The only authenticated transitions accepted are: sender removes their own non-removed message and clears the body, or recipient marks a non-removed message read without changing body. Non-authenticated, non-service callers are rejected; server service_role and designated database owner roles remain able to perform controlled internal updates.

The backend now excludes status=removed when marking a conversation read. If the Supabase client does not support required neq filters, the backend throws instead of risking an unfiltered update.

## Synthetic validation

In a dedicated SCRAM-protected local PostgreSQL 17 instance on 127.0.0.1:55494, applying the new migration to a synthetic table/policy fixture succeeded. The regression fixture confirmed:
- authenticated cannot update sender_id, conversation_id, ID, metadata, read_at or other immutable fields;
- legitimate recipient read, legitimate sender removal, and idempotent read work;
- recipient cannot remove another person's message; sender cannot rewrite body or self-mark-read;
- removed messages cannot be resurrected;
- nonparticipant cannot update foreign conversation messages (RLS);
- service_role updates remain permitted.

The JavaScript backend test verified sender exclusion, removed-state exclusion, fail-closed missing neq and denial to nonparticipants. Synthetic database was removed. The temporary PostgreSQL cluster must be shut down and deleted after validation.

A new read-only GitHub Actions workflow is prepared to run these checks against PostgreSQL 17 with synthetic data only. It has not been run remotely on this local branch.

## Important limitations

The test fixtures reproduce the relevant policy and grant shapes but are NOT a complete current staging clone. A hosted migration is NOT authorized by passing synthetic tests. Before any deployment, test on a faithful synthetic staging-like schema, review all interacting message/Storage triggers, exercise actual authenticated REST paths, verify rollback and grants, and obtain explicit approval for each hosted write. Existing attached-message MSG-A05 migration remains separate and on HOLD. Feature flags must remain disabled.

Two legacy MSG-A01/A03 audit scripts assume LF-only YAML newlines. On the Windows working tree, they fail on a formatting assertion unrelated to the new messaging logic; this is an unverified environment-specific limitation, not evidence of passing legacy audits. Independent messaging API and dynamic checks should be reported separately.

**HOLD:** NO_HOSTED_DDL / NO_MERGE / NO_SUPABASE_DEPLOY / STAGING_NOT_CERTIFIED / P31_HOLD.
