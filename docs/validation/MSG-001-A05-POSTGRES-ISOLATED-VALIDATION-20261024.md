# MSG-A05 ? PostgreSQL 17 isolated execution and synthetic restore

**2026-10-24. Local validation only. NO-GO for hosted deployment.**

## Defect and scope of code fix

The unchanged migration file \`supabase/migrations/20260802220000_msg_a05_transaction_attachment_lifecycle_contract.sql\` failed to compile in PostgreSQL 17.10 at \`pg_catalog.coalesce(...)\`. A total of **11** improper schema qualifications of SQL expression constructs were found: \`pg_catalog.coalesce\`, \`pg_catalog.greatest\`, \`pg_catalog.least\` and \`pg_catalog.trim\`. The local patch removes only those qualifications, preserving the intended expressions and workflow. The first failed attempt was transactional: no lifecycle table remained and the four old synthetic Storage policies survived.

## Independent local verification

A new SCRAM-protected PostgreSQL 17.10 cluster was initialized on Windows in \`%TEMP%/kontrat-msg-a05-ephemeral-pg-20261024\`, listening only at \`127.0.0.1:55493\`. It did not connect to any hosted Supabase project, existing PostgreSQL service, or real user data.

A fresh synthetic database included minimal \`public\`, \`private\`, \`storage\` and \`auth\` fixtures; synthetic users, orders, conversations and messages; simulated legacy Storage policies and roles. The **actual versioned SQL migration**, with the 11 syntax fixes, compiled and applied. Tests confirmed:
- Seven expected public RPCs, restricted from \`anon\`/\`authenticated\` and executable by \`service_role\`.
- Replacement of four old synthetic Storage policies by two new lifecycle policies.
- Order upload intent, authenticated Storage insert, upload confirmation, conversation attachment to a message and 30-day orphan-retention trigger.
- Negative cases: direct \`authenticated\` invocation of privileged RPC denied; inactive actor and invalid MIME denied; cross-actor Storage insert denied; authenticated UPDATE/DELETE blocked.
- A \`pg_dump\` of the pre-migration synthetic state was restored to a second isolated DB. It contained four old policies, zero lifecycle RPCs and no lifecycle table.
- Both new databases were deleted after testing.

Artifacts: three SQL fixtures under \`scripts/fixtures/msg-a05-postgres-isolated-*.sql\`; guarded local runner \`scripts/test-msg-a05-isolated-postgres.ps1\`; Linux CI runner \`scripts/test-msg-a05-isolated-postgres-ci.sh\`; draft read-only GitHub workflow \`doke-msg-a05-isolated-postgres.yml\`. The remote CI has not run.

## Limitations and release hold

These fixtures are **not** a clone of actual Supabase schemas, real Storage behavior, later staging migrations, JWT/GoTrue or production rollback. The tested restore is a *synthetic backup restore*, not an authorized staging rollback. The historical schema snapshot still correctly reports NO-GO: staging lacks the lifecycle table/RPCs and contains legacy policies; E2E lacks core domain tables and the bucket. Before any hosted SQL, review later staging migrations, restore exact policy DDL and capture approved staging rollback evidence in a separately authorized environment.

**Migration provenance caution:** The file is an older timestamped migration (August 2026). Check all environments before changing any already-applied migration in a release branch. The two inspected target projects did not report this version applied, but that does not establish global absence.

**Status:** PG17_SYNTHETIC_LOCAL_PASS / NO_REMOTE_PUSH / NO_HOSTED_DDL / NO_MERGE / STAGING_NOT_CERTIFIED / P31_HOLD.
