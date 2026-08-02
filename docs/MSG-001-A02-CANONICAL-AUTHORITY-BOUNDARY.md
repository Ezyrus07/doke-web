# MSG-001 / A02 — Canonical authority boundary

## Outcome

MSG-A02 separates real messaging authority from fixture behavior without accessing staging. Authenticated UUID sessions now read and write conversations exclusively through Supabase. Non-UUID and anonymous fixtures remain available only in runtime memory.

## Real sessions

- no browser persistence of conversations or messages;
- no merge between local and remote rows;
- no fallback to stale local data after a remote read failure;
- no pending local success after a remote write failure;
- missing Supabase client or canonical Supabase session rejects with `DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE`;
- remote data may be cached only in process memory for the current authority class.

## Fixtures

- non-UUID identities use `fixture-memory`;
- static mock data may seed memory when explicitly requested;
- save, list and clear operations do not call `localStorage`;
- legacy storage keys are not deleted automatically, but canonical paths no longer consult them.

## Compatibility

The public repository API remains available. Realtime, server-owned command routing and attachment lifecycle are deliberately unchanged and stay assigned to MSG-A03, MSG-A04 and MSG-A05.

## Blockers

- MSG-B02 remains open for Realtime publication.
- MSG-B03 is narrowed: persistent conversation/message divergence is removed, while presence, typing and read receipts remain local-only.
- MSG-B04 remains open for attachment lifecycle hardening.

## Safety

- staging reads: 0
- staging mutations: 0
- migrations applied: 0
- Realtime publication changes: 0
- Storage policy changes: 0
- deployments: 0
- production changes: 0
- accounts or real messages changed: 0
- merge: 0
