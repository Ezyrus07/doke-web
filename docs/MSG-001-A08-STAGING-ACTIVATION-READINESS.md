# MSG-A08 — Staging Activation Readiness

## Status

Repository-only. No staging read, migration, deployment, Realtime setting, Storage policy, account, message, attachment, production or merge effect was executed.

## Why this sublot exists

MSG-A04 through MSG-A07 are repository-ready, but their operational closure depends on coordinated remote changes. Executing those changes without a fixed order creates avoidable failure modes: a lost command response can duplicate effects, attachment resources can be exposed before ownership canaries, Realtime publication can leak signals to non-participants, and Presence can be enabled before private-channel authorization is proven.

MSG-A08 freezes the activation process without authorizing it. A generic continuation command is never sufficient to apply a migration, deploy an Edge Function, alter Realtime settings or run authenticated staging canaries.

## Mandatory order

1. **MSG-A07B — command reliability.** Deploy and prove acknowledgements, persistent idempotency, lost-response replay and concurrent deduplication first.
2. **MSG-A05B — attachment lifecycle.** Apply lifecycle resources and deploy cleanup with `attachmentLifecycleEnabled=false`.
3. **MSG-A04B — message Realtime.** Apply publication with `messagesRealtimeEnabled=false`; validate participant isolation and canonical rereads.
4. **MSG-A06B — Presence and typing.** Apply private-channel authorization with `messagesPresenceEnabled=false`; validate participants and deny outsiders.

No phase may start until the preceding phase has passed and its evidence has been recorded. A failure stops the sequence.

## Preflight

- pin the exact PR head and reject any moved head;
- verify the target is the staging project and explicitly reject production;
- capture migration history read-only and compare pending names with Git;
- validate Edge Function source closure and permanent gates A01–A08;
- confirm all three browser feature flags remain false;
- use synthetic UUID personas and synthetic resource paths only;
- name the rollback owner before the first remote effect;
- create a new run-scoped evidence manifest.

Remote Dashboard SQL edits and routine use of migration repair are forbidden. Migration files remain the source of truth, and only one operator may apply them at a time.

## Canary groups

### A07B

Prove lost-response replay with the same command ID, single materialization under concurrent replay, rejection of payload drift, no retry of functional errors and denial of cross-actor replay.

### A05B

Prove the complete synthetic owner lifecycle, cross-owner denial, server-generated paths, scoped orphan cleanup and retention behavior. Storage metadata must never be deleted through direct SQL.

### A04B

Prove participant INSERT/UPDATE signals, outsider isolation, absence of DELETE subscription authority, signal-only payload handling and canonical remote reread.

### A06B

Prove participant Presence join/sync/leave, typing Broadcast, outsider channel denial and cleanup after disconnect. Presence is an ephemeral hint, not a durable identity or audit authority.

## Rollback model

Rollback is fail-closed and non-destructive. Browser flags remain false throughout canaries. Edge runtime rollback redeploys the last known-good source. Database or policy rollback uses a separately reviewed compensating migration; migration history is not rewritten as an ordinary rollback mechanism. If any isolation assertion fails, the sequence stops before feature activation.

## Exit criteria

- each phase has a fresh explicit authorization;
- every preflight and canary assertion passes on the exact head;
- evidence contains before/after migration and function versions without secrets or real-user identifiers;
- production effects remain zero;
- blockers are updated only after evidence review;
- feature flags are enabled only by a separate staging decision after remote resources pass.

## Supabase constraints incorporated

- Realtime Broadcast and Presence authorization is enforced with RLS on `realtime.messages` and private channels;
- Presence is not used for high-frequency durable state;
- migrations are applied from versioned files in timestamp order by one coordinated operator;
- Edge Functions are deployed as separate versioned artifacts.
