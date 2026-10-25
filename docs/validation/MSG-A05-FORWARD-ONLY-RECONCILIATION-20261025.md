# MSG-A05 ? Forward-only staging proposal and SQL provenance review (NO-GO)

**Evidence date:** 2026-10-25. **Change set:** stacked on Draft PR #565. **Status:** REVIEW ONLY / NO DEPLOYMENT AUTHORITY / \`attachmentLifecycleEnabled=false\` / P31 HOLD.

## 1. What is known from the hosted staging migration ledger

The read-only Supabase migration ledger contains **218 applied migration versions**, latest \`20261002002201\`. The historical MSG-A04 \`20260802183100\`, MSG-A05 \`20260802220000\`, MSG-A06 \`20260802234000\`, and the new message-update guard \`20261025022849\` are **not applied**.

**49** already-applied migrations have versions later than the *unapplied* MSG-A05. This checkout contains **187** SQL files, with only **11** matching applied version numbers, including **3** among those 49. Therefore neither chronological SQL playback nor repairing version-history rows is safe to infer from this checkout alone.

## 2. SQL-body-level analysis (not just filenames)

The staging ledger contains a text SQL-statement array for each of those 49 later migrations. We used SELECT-only SQL to calculate **length, statement count, MD5 fingerprint, and bounded keyword flags**, without copying their actual SQL bodies into Git or touching application data. See \`MSG-A05-STAGING-LATER-SQL-FINGERPRINTS-20261025.json\`.

**46 of 49** contain no identified references to \`messages\`, \`conversations\`, \`transaction_attachment\`, \`storage.objects\`, or \`storage.buckets\` under the explicitly recorded case-insensitive keyword checks. Three reference \`storage.objects\`:
- \`20260918232524\`: professional KYC JSONB compatibility;
- \`20260918234449\`: professional KYC evidence lifecycle;
- \`20260918234602\`: professional KYC GC dry-run.

The SQL contexts of **all three** target the \`professional-verification-media\` bucket. None of the 49 matched the MSG-A05 \`transaction-attachments\` bucket or referenced the \`messages\` / \`conversations\` tables by the inspected patterns. This is **not proof of noninterference**: dynamic SQL, helper functions, cross-schema privileges, and migrations predating MSG-A05 require further inspection.

For the **three** later migrations having identical local/remote version IDs (\`20260920114049\`, \`20260922001808\`, \`20260923003844\`), raw SQL hashes differed. Direct source-body comparisons found **equivalent normalized text** after stripping comments, insignificant whitespace and optional outer \`BEGIN;\` / \`COMMIT;\` wrappers. The normalized-body MD5 values are pinned in \`scripts/audit-msg-forward-only-sql-reconciliation.js\`. This is *lexical* equivalence only, not a proof from an SQL parser or execution test. The other **46** later applied migrations have **no version-identical local SQL file**; their remote SQL fingerprints are recorded, but full local provenance is unresolved.

Versioned source SHA-256 (CRLF normalized to LF) is independently checked for MSG-A04, MSG-A05, MSG-A06 and the message-update guard. None of those four historical versions is treated as applied remotely.

## 3. Existing staging state and migration blast radius

The hosted catalogue still shows the **four legacy** \`transaction-attachments\` Storage policies and **no** MSG-A05 lifecycle table or seven public internal attachment RPCs. \`public.messages\` continues to allow \`authenticated\` UPDATE on \`sender_id\`, \`conversation_id\`, \`attachments\`, and other non-status columns. The proposed MSG-A05 changes \`storage.objects\` policies specifically for the \`transaction-attachments\` bucket, grants privileged RPCs, introduces a lifecycle table and AFTER UPDATE orphan/retention trigger. The message-update guard restricts column UPDATE rights to \`status\`/\`body\` and introduces a BEFORE UPDATE authority trigger.

Because the KYC migrations also query \`storage.objects\`, **the impact of global GRANT/REVOKE and policies shared across buckets still needs validation**. Existing synthetic Storage/PostgREST CI passed in separate, disposable environments, but neither represents a full current staging clone.

## 4. Proposed forward-only plan ? not executable or authorized

This is a **design**. No new migration file, hosted SQL, migration repair, secret change, or deploy is part of this PR.

| Phase | Required preparation or check | Stop condition |
| --- | --- | --- |
| P0 ? Fresh provenance | Re-observe hosted \`supabase_migrations.schema_migrations\`, \`pg_catalog\`, \`pg_policies\` and current Storage/RPC grants; reconcile the 46 missing later files to authoritative source or archived history | Any unapplied predecessor, changed SQL hash, or unexplained object |
| P1 ? Dependency closure | Inspect all invoked functions and grants for \`users\`, \`orders\`, \`conversations\`, \`messages\`, \`storage.objects\`; verify the 3 KYC SQL bodies and legacy transaction policies coexist with the planned changes | Shared policy/function collision or unresolved migration ordering |
| P2 ? Forward-only authoring | **Only after review approval**, generate NEW timestamps with \`supabase migration new\` for a current-schema MSG-A05 adaptation followed by the message-update authority guard. Preserve verified source logic/security fixes; **do not reuse** \`20260802220000\` or \`20261025022849\` as hosted migration identifiers | Any attempt to insert historical version-history records or replay older SQL blindly |
| P3 ? Full isolated rehearsal | Replay forward-only candidates over a metadata-faithful schema with real Auth/PostgREST/Storage and synthetic objects; check KYC \`professional-verification-media\` unaffected, lifecycle JWT actor binding, transition ordering, grant/RLS, old and new message flows | Failing negative authorization, Storage upsert expectations, or incomplete recovery test |
| P4 ? Reviewed recovery | Create a separately approved, environment-specific backup and compensation/rollback runbook; record object/policy DDL, compatibility and expected row effects. Verify restores in disposable replica | No verified recovery method |
| P5 ? Separate hosted approval | Seek explicit **staging-only** authorization for scoped forward DDL, with release flags still OFF. On approval, execute one bounded change window, read-only postchecks plus authorized synthetic canary, then independently decide flag activation | Missing explicit authorization, stale preflight, drift, or unexpected changes |

MSG-A04 and MSG-A06 historical proposals are **not** silently included in the MSG-A05 forward-only migration; their dependencies, especially realtime publication and presence/typing, require their own review.

Ordering for a proposed future implementation must guarantee: the lifecycle schema/function/policy prerequisites exist before the message-retention trigger can run, and the authenticated message guard's BEFORE UPDATE transition logic is compatible with the lifecycle AFTER UPDATE orphaning. Existing CI tested both orders in reduced synthetic schemas; P3 must repeat with the fully reconciled current schema.

## 5. CI contract and limits

\`scripts/audit-msg-forward-only-sql-reconciliation.js\` reads only versioned snapshots and local source SQL. It validates all **49** later ledger fingerprints, flags the three isolated KYC bucket references, verifies three exact-version local source normalized digests, and checks four proposed source hashes. \`--assert-release-ready\` **must exit nonzero**. Negative tests prove altered fingerprint metadata fails closed. The associated GitHub Actions workflow uses only \`contents: read\` and has no hosted credentials.

A green CI result means **the historical source/SQL review is consistent and the hosted HOLD is enforced**. It does not authorize a migration, prove absence of hidden dependencies, or certify staging. Snapshot material is dated and must be refreshed for future use.

**Terminal disposition:** \`FORWARD_ONLY_PLAN_ONLY / SQL_FINGERPRINT_49_OF_49 / THREE_KYC_STORAGE_REFERENCES / ZERO_DIRECT_MSG_ATTACHMENT_REFERENCES_IN_INSPECTED_PATTERNS / THREE_NORMALIZED_LOCAL_MATCHES / 46_UNMATCHED_LATER_SOURCE_FILES / STAGING_NO_GO / NO_MERGE / NO_HOSTED_WRITES / P31_HOLD\`.

Supabase CLI docs: [migrations](https://supabase.com/docs/guides/deployment/database-migrations), [list comparison](https://supabase.com/docs/reference/cli/supabase-migration-list), and [repair warning](https://supabase.com/docs/reference/cli/supabase-migration-repair).
