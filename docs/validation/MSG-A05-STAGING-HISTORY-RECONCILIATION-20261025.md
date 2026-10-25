# MSG-A05 ? Staging migration history reconciliation (read-only)

**Observed:** 2026-10-25, against the Kontrat marketplace *staging* Supabase database, **read-only tools only**. **Verdict: STAGING NO-GO / HOLD BEFORE HOSTED WRITES.**

## Evidence and exact scope

The historical migration register returned **218 applied versions**, latest \`20261002002201_ana_a09_funnel_scheduler_activation\`. The proposed historical MSG-A04 (\`20260802183100\`), MSG-A05 (\`20260802220000\`) and MSG-A06 (\`20260802234000\`) migrations are **not registered**, and neither is the message UPDATE guard (\`20261025022849\`). **49** registered versions are chronologically later than the proposed MSG-A05 version. Version ordering matters; it is *not* proof that an older unregistered migration can be applied safely.

The current isolated repository checkout has **187** SQL files in \`supabase/migrations\`. Only **11** SQL filenames share exact versions with the 218 staged migration records; **207** applied versions have no matching local filename, while **46 of the 49** migrations later than MSG-A05 have no matching versioned SQL in this checkout. Historical naming conventions and alternate repository history can explain part of this discrepancy. **This is a history-alignment blocker, not a claim that the SQL was lost or that migrations can be safely repaired by changing history records.**

The same read-only catalog inspection found: MSG-A05 lifecycle table absent; all target internal functions absent; both message lifecycle and authority triggers absent; four legacy transaction-attachment Storage policies still present; and \`authenticated\` still had direct UPDATE privileges on \`sender_id\`, \`conversation_id\`, \`attachments\` and other sensitive \`messages\` columns. These are observed schema/authorization **risks**, not tests that change real data.

The machine-readable evidence snapshot is \`MSG-A05-STAGING-MIGRATION-HISTORY-SNAPSHOT-20261025.json\` and contains migration **version identifiers** and limited schema metadata only. There are no user rows, customer records, object paths, live credentials or service-role keys. It is a dated snapshot: an audit of the file **is not a fresh query** and must not be presented as a live certification.

## Fail-closed gate

\`scripts/audit-msg-staging-history-no-go.js\` requires a consistent, dated snapshot, all four local proposal versions, the 49 later migrations, and the known hosted-policy/grant blockers; it also checks the version alignment against the actual local SQL filenames. It emits \`STAGING_NO_GO\` deterministically.

\`scripts/test-msg-staging-history-no-go.js\` asserts the observed counts (218, 49, 187, 11, 207, 46), verifies that \`--assert-ready\` explicitly exits nonzero, and proves a corrupted snapshot is rejected. The corresponding GitHub workflow has **read-only repository permissions**, no database URL or tokens, and performs **zero hosted calls**.

An all-green check for this workflow means only **the HOLD gate correctly detects and documents a NO-GO**. It does not certify the staging database for release. Any changes in the live environment require **a new read-only observation and independently reviewed attestation**.

## Sequence required before any release approval

1. Reconcile version history, origin and checksums of the 218 hosted migrations and the repo's archived/aliased SQL. Specifically review the 49 later migrations for changes to messages, private functions, Storage policies, Auth and order/conversation dependencies. Names alone are **not a SQL body diff**.
2. Design a **forward-only, newly timestamped** migration plan that applies the MSG-A05 and message authority changes to the verified current hosted schema. Never reclassify an unapplied historical migration as applied, and never use \`supabase migration repair\`, \`db push\` or hosted writes in this phase.
3. Verify GoTrue/Storage/Edge Function orchestration and the actual staging API contract, together with a reviewed backup and recovery/compensation plan. Existing isolated synthetic CI, even when green, is insufficient.
4. Obtain separately scoped explicit authorization for staging DDL/deployment only after review. Keep \`attachmentLifecycleEnabled=false\`, all PRs Draft, and P31 HOLD.

**Status:** \`READ_ONLY_HISTORY_SNAPSHOT / 218_REGISTERED / 49_LATER_THAN_MSG_A05 / 11_EXACT_LOCAL_MATCHES / FOUR_TARGETS_UNAPPLIED / HISTORICAL_DRIFT_BLOCKED / STAGING_NO_GO / NO_HOSTED_WRITES / P31_HOLD\`.

Supabase reference: https://supabase.com/docs/reference/cli/supabase-migration-list (migration list compares local and remote version identifiers); https://supabase.com/docs/reference/cli/supabase-migration-repair (repair mutates hosted history and is **not authorized**).
