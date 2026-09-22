# COM-A01 — Community Authority Baseline

## Purpose

Freeze the current repository authority for `COM-001` before server-owned community commands are introduced.

This sublot is **repository-only**. It does not connect to Supabase, read or mutate staging, apply migrations, deploy functions, create real communities, change real memberships, publish content, apply sanctions, upload media or alter production.

## Current authority split

The current community implementation has three competing authority surfaces:

1. `community-service.js` loads discovery data from `Doke.mockData`.
2. `community-domain.js` persists communities, events, deletions and audit records in browser `localStorage`.
3. Supabase migrations expose partial remote RLS for `communities`, `community_members` and `community_posts`, including authenticated direct DML.

These surfaces do not define one canonical community identity or one command boundary.

## Browser-local capabilities

The local domain already models:

- custom roles and granular permissions;
- channels and announcement restrictions;
- slow mode and link blocking;
- join requests;
- bans, mutes, restrictions and channel discipline;
- local event and audit records;
- owner identity aliases assembled from account, profile and email keys.

Those capabilities are not backed by a canonical server schema or append-only audit authority.

## Remote capabilities

The current remote model provides:

- `communities`;
- `community_members`;
- `community_posts`;
- public/private visibility RLS;
- canonical owner membership trigger;
- fixed roles `owner`, `moderator` and `member`;
- public self-join for public communities;
- direct authenticated post insert as `published`.

The remote model does **not** provide canonical:

- invitations or private join-request decisions;
- custom role and permission versions;
- bans, mutes, restrictions or sanction expiry;
- channels, community chat or message identity;
- realtime subscription authorization;
- moderation cases, restoration or appeals;
- media validation, scanning or retention;
- stable command idempotency and lost-response replay.

## Baseline findings

| ID | Severity | Boundary |
|---|---|---|
| COM-A01-F01 | Critical | Browser `localStorage` can manufacture community authority |
| COM-A01-F02 | High | Discovery and internal state use different local sources |
| COM-A01-F03 | Critical | Authenticated direct DML bypasses server-owned commands |
| COM-A01-F04 | Critical | Invitations and private membership decisions are absent remotely |
| COM-A01-F05 | High | Fixed database roles diverge from custom browser permissions |
| COM-A01-F06 | Critical | Discipline is local and lacks immutable cases |
| COM-A01-F07 | High | Posts are inserted directly as published |
| COM-A01-F08 | High | Community realtime authority is absent |
| COM-A01-F09 | High | Channels and chat are browser-local |
| COM-A01-F10 | High | Generic reports do not form a community moderation lifecycle |
| COM-A01-F11 | Medium | Browser-derived identity aliases are not canonical subjects |
| COM-A01-F12 | High | Media safety and retention authority are absent |

## Required command boundaries

### Discovery and membership

A future server-owned boundary must define public, member, owner, operator and unavailable projections. Private communities must not be enumerable by nonmembers. Invitations and join requests require stable identity, expiry, revision, idempotency and audited decisions.

### Roles and discipline

Roles and permissions must be versioned server-side. Actors may never grant authority they do not possess. Owner membership must remain immutable. Bans, mutes and restrictions require canonical cases, reasons, actor identity, expiry, revision, restoration and an append-only event chain.

### Posts, channels and realtime

Posts and messages require a server-owned content command, explicit lifecycle, stable request identity and lost-response replay. Channel access, send permissions, slow mode, rate limits and realtime subscription authorization must use the same canonical membership projection.

### Reports, appeals and media

Reports must validate target type and identity. Sanctions, removal, restoration and appeal need an auditable case lifecycle and operator separation. Media requires upload validation, malware scanning, moderation, retention and deletion rules.

## Explicit non-effects

COM-A01 grants no:

- community runtime mutation authority;
- membership, role or discipline authority;
- post publication or realtime authority;
- moderation or media authority;
- migration, staging, deployment or production authority.

## Planned repository sequence

1. `COM-A02` — canonical discovery, invitations, join requests and idempotent membership commands.
2. `COM-A03` — canonical roles, permissions, bans, mutes, restrictions and audit ledger.
3. `COM-A04` — canonical posts, channels, messages, realtime and rate-limit authority.
4. `COM-A05` — reports, sanctions, restoration, appeals and media-moderation readiness.

Operational activation remains blocked by `COM-B02`, `COM-B03`, `COM-B04`, identity, admin and legal dependencies.
