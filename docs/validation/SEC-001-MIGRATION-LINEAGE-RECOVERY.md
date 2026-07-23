# SEC-001 — Migration lineage recovery

## Status

**Recovered for review. Not approved for staging replay or production promotion.**

This recovery restores the source lineage that was absent from Git while the corresponding security work already appeared in historical delivery evidence and staging snapshots.

## Recovery base

- Parent candidate: `62f643c0cc75cdf4ecb11e0937774013a215f0a9`
- Recovery commit: `03ad12807b9e1de33d11711d883ab2a7bc0f771e`
- Source artifact: prior official cumulative delivery `doke-web-security-public-data-authority-cumulative(1).zip`
- Integrity authority: `doke-security-public-data-authority-checksums.json`

The recovered files were compared byte-for-byte against the SHA-256 manifest from that delivery.

## Recovered authority

- migrations `110` through `134`;
- `supabase/functions/service-moderation-operations/*`;
- security contract tests for notifications, public data, attachments, service media, quote templates and moderation;
- staging validation SQL for public authority, moderation authority and private transaction attachments;
- browser moderation repository migrated from direct privileged RPC calls to the Edge Function boundary;
- operational documentation for Supabase-managed default ACLs.

## Local validation

The following recovered contracts passed locally before publication:

- notification authority;
- notifications Supabase repository;
- public data authority;
- service-media Storage authority;
- transaction attachment repository and Storage authority;
- service moderation operator authority;
- service moderation operations runtime;
- service moderation flow and audit history;
- service quote template ownership;
- self-service function `search_path` hardening;
- security permission contract;
- local security abuse canary;
- JavaScript and MJS syntax checks.

## Deployment prohibition

Do **not** replay migrations `110`–`134` merely because they are now present in Git. They are historical lineage and have evidence of prior remote application. Before any deployment:

1. compare the remote migration registry with every recovered file;
2. verify names, ordering, checksums and duplicate migration numbers;
3. classify each migration as already applied, equivalent, divergent or absent;
4. run read-only validation queries;
5. produce a reviewed reconciliation plan;
6. execute mutations only through a separate approved canary with rollback.

## Remaining SEC-001 blockers

- remote lineage reconciliation;
- leaked-password protection in Supabase Auth;
- platform-owned default ACL review;
- CSP and CORS closure;
- rate limits and abuse controls;
- authenticated HTTP evidence for privileged Edge Functions;
- staging negative-permission validation.

This recovery resolves only the **missing Git source lineage** portion of SEC-B08.
