# COM-A03 — Governance, discipline and immutable audit ledger

## Scope

`COM-A03` defines a repository-only contract for canonical community roles, permission ceilings, role assignment, bans, mutes, restrictions, expiry and an append-only audit chain.

It does not integrate runtime code, create migrations, access staging, mutate a real community or grant operational authority.

## Role invariants

- `owner`, `moderator` and `member` are immutable system roles.
- Custom roles are versioned and may contain only known permissions.
- An actor may never grant a permission they do not effectively possess.
- Non-owners may not create a role containing owner-only permissions.
- Self promotion is prohibited: a role may not be assigned to the acting user by that same command.
- A role at or above the actor's rank may not be assigned or revoked.
- `owner` requires a separate ownership-transfer contract.
- The base `member` role cannot be removed from an active member.
- A custom role cannot be deleted while still assigned.

## Discipline invariants

- Bans, mutes and restrictions require a canonical actor, target, reason and community revision.
- A moderator cannot discipline themselves, the owner, or a target at equal or higher rank.
- Temporary sanctions have explicit UTC expiry and policy maximums.
- Only bans may be structurally permanent; a permanent ban requires the owner and operational approval remains blocked.
- Repeating the same intent is a replay; changing the payload under the same request identity is a conflict.
- Lift and expiry append a new state transition. They do not delete the original sanction.
- Automatic expiry requires a canonical `system_worker` actor and an already elapsed deadline.

## Audit ledger

Every accepted governance or discipline transition can produce an immutable event containing:

- event, community and actor IDs;
- command and reason code;
- target role, target user or sanction reference;
- monotonic revision;
- previous event hash;
- immutable intent fingerprint;
- allowlisted metadata;
- SHA-256 event hash.

The append-only chain rejects changed history, missing links, duplicate revisions and sensitive raw data.

## Authority

All structural decisions keep the following false:

```text
roleWriteAuthority
disciplineWriteAuthority
auditWriteAuthority
runtimeMutationAuthority
stagingAuthority
productionAuthority
```

## Follow-up

`COM-A04` will define posts, channels, messages, realtime subscriptions and server-enforced rate limits.
