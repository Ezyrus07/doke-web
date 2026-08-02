# MSG-001 / A05 — Attachment lifecycle boundary

Status: repository-only, prepared and disabled.

## Root cause

The private bucket and participant RLS existed, but the browser still owned direct upload and delete calls. Remote failures were converted into local pending Base64 attachments, which could look successful without a durable object. There was also no canonical lifecycle ledger for upload intents, attachment-to-message binding, orphan cleanup or retention.

## Frozen authority

- UUID sessions: server-owned signed upload intents.
- Non-UUID fixtures: memory-only previews.
- No local pending fallback for real sessions.
- No persistent Base64 authority.
- The browser cannot generate object paths.
- Authenticated UPDATE and DELETE policies are intentionally absent.
- Removal is authorized by the Edge boundary and executed through the Storage API.

## Signed URLs

Upload tokens are created by the Edge function with the authenticated user client after a server-generated lifecycle intent exists. Supabase signed upload tokens are valid for two hours; the lifecycle intent uses the same expiry window. Read URLs are short-lived at 300 seconds and are never persisted.

## Lifecycle and retention

- pending intent: expires after 2 hours;
- uploaded but not attached: purge candidate after 24 hours;
- attached: retained while the message remains active;
- message marked removed: attachment becomes orphaned and is retained for 30 days;
- cleanup: the dedicated worker removes the object through the Storage API, then records the result.

Direct SQL deletion from storage.objects is prohibited because it would remove only metadata and leave the underlying object billable.

## Repository-only safety

The migration, Edge actions and cleanup function are source contracts only. The frontend feature flag attachmentLifecycleEnabled remains false. No staging Storage policy, object, schedule or deployed function was changed.
