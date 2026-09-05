# COM-A02 — Canonical discovery and membership command contract

## Status

Repository-only contract. No runtime, database, migration, staging, realtime, user data or production authority is granted.

## Goal

Replace mock/local community discovery and direct browser DML with a deterministic server-owned contract for community creation, discovery, invitations, join requests and membership transitions.

## Discovery boundary

The canonical source is `canonical_server` with a complete positive revision.

- `public`: enumerable and detail-visible.
- `private` and `invite_only`: private communities are not enumerable to nonmembers.
- members and the canonical owner may see the exact community.
- incomplete, stale or non-canonical snapshots return `unavailable`; they never become public by fallback.

An invitation may resolve a specific opaque invite, but it does not make the private community globally enumerable.

## Command identity

Every command carries:

- stable UUID `clientRequestId`;
- deterministic `idempotencyKey`;
- immutable `intentFingerprint`;
- membership `subjectKey` for community plus target user;
- expected canonical community revision.

Exact retry returns `replay`. Reusing the request identity with a different intent returns `conflict`.

## Commands

- `create_community`
- `join_public`
- `request_join`
- `cancel_join_request`
- `invite_member`
- `revoke_invite`
- `accept_invite`
- `reject_invite`
- `approve_join_request`
- `reject_join_request`
- `leave_community`

## Membership invariants

- public communities permit authenticated self-join only;
- private and invite-only communities require a canonical request or invitation;
- one active membership, invitation and join request may exist per community/user subject;
- active bans block entry and approval;
- invitations expire and may not exceed 30 days;
- only canonical managers invite, revoke or decide requests;
- invite acceptance/rejection is restricted to the exact invitee;
- join-request cancellation is restricted to the requester;
- every new membership begins as `member`;
- no command in COM-A02 grants moderator or owner authority;
- the owner cannot leave until a separate explicit transfer contract exists;
- revision drift fails as `conflict` rather than silently applying against stale state.

## Decisions

- `accept`: the repository contract accepts an effect intent; it does not write data.
- `replay`: an exact prior outcome is reused.
- `reject`: canonical facts prove the operation is disallowed.
- `conflict`: request identity, uniqueness, target or revision diverged.
- `unavailable`: canonical authority is incomplete or absent.

All outputs keep `writeAuthorized`, `membershipAuthority` and `runtimeMutationAuthority` false.

## Privacy and safety

Command payloads reject credentials, tokens, payment data, identity documents, raw private messages and private keys. Audit and idempotency records retain hashes and opaque identifiers only.

## Follow-up

COM-A03 will define versioned roles, permission ceilings, bans, mutes, restrictions and an immutable audit ledger. Runtime integration, migrations, staging and production remain separately blocked.
