# MSG-001 / A01 — Authority baseline

## Outcome

MSG-A01 freezes the current repository authority split without accessing staging. The browser has a Supabase-capable repository and the backend has a messaging service, but persistent local authority and silent fallback remain active.

## Confirmed browser authority gaps

- Conversations persist under `doke.conversations.local.v1` and the legacy `doke.messages.local.v1` key.
- A failed remote read returns local data.
- A failed remote write is retained as pending local success and may synchronize later.
- Authenticated real identities and non-UUID fixtures are not yet separated into remote-only versus memory-only authority.
- Presence, typing and read receipts use `localStorage`, so they are same-browser coordination rather than cross-device realtime.

## Backend and database state

The server messaging module already requires Supabase, validates participant scope and exposes conversation creation, message sending and read-state operations. Repository migrations enable RLS for `conversations` and `messages`, but still declare authenticated browser insert/update policies. No migration publishes either table to Supabase Realtime.

## Attachments

The attachment repository targets the private `transaction-attachments` bucket and creates short-lived signed URLs, but failed uploads become local pending previews. The canonical bucket-policy, cleanup and retention map remains incomplete under MSG-B04.

## Blockers

- **MSG-B02 confirmed:** `conversations` and `messages` are not declared in the Realtime publication.
- **MSG-B03 confirmed:** local and remote authorities can diverge across devices.
- **MSG-B04 confirmed:** the transaction attachment storage lifecycle is not fully mapped and frozen.

## Ordered next work

1. MSG-A02 — remote-only authority for authenticated UUID sessions; non-UUID fixtures memory-only.
2. MSG-A03 — server-owned command/read-state boundary and fail-closed real-session behavior.
3. MSG-A04 — participant-scoped Realtime publication and subscription readiness.
4. MSG-A05 — attachment policy, signed URL, cleanup and retention hardening.

## Safety

- staging reads: 0
- staging mutations: 0
- migrations applied: 0
- realtime publication changes: 0
- storage policy changes: 0
- deployments: 0
- production changes: 0
- accounts or real messages changed: 0
- merge: 0
