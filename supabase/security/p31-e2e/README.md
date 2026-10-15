# P31 E2E table privileges and workflow containment

Prepared locally only. No Supabase/GitHub/Vercel operation was applied.

## Authority and boundary

Target: bqmmbopwfgwffkbtheab only. Never use zwkczgewzbsorbrjuzpb. Base checkpoint: 14165c38ba5014f72626c3cecc6cfc783aef0f0e. Frozen A+B fingerprint: 11e0436d8530ab8260e53491507f6907af798da723b9a713f85c0242a751c0c5. The frontend/API/Auth boundaries from handoff 006 are out of this patch and remain blocked.

## Expected access

Five tables: users, user_profiles, client_profiles, audit_logs, notifications. Before: anon/authenticated each have SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN. After: authenticated keeps SELECT on users under users_self_read; anon has no access; authenticated has no table access to the other four. Those four had no client RLS policy, so no legitimate direct row operation was demonstrated. Server-side operations through service_role and owner/definer functions remain unchanged. No PUBLIC grant, column ACL or inherited client role was found in the focused baseline. All grantors were postgres. Future consumers requiring more access need separately approved operation/ownership contracts.

## SQL

- table-privileges.sql: transaction, drift guards, minimal revokes, service/RLS preservation checks and effective access verification.
- verify-table-privileges.sql: metadata-only READ ONLY verification.
- rollback-table-privileges.sql: restore the observed eight privileges after checking the exact expected hardened boundary. Restores excessive privileges and needs separate exceptional approval.
- test-table-privileges.cjs: disposable local PostgreSQL 17 tests; uses only 127.0.0.1:5637, refuses an existing cluster directory, stops its own cluster. Creates synthetic fixture data only locally. Not a full KYC or hosted canary.

The p31.target_ref session setting is explicit consent, not proof of server identity. A future authorized executor MUST first pin/verify the administrative connection by project metadata, ref and database host. Set that session setting only after checking the ref, then execute the reviewed SQL. Do not trust a mutable custom GUC to prove isolation.

## Future sequence and separate authorizations

1. Read fresh project/workflow/PR identity, ACLs, memberships, column grants, RLS/policies and concurrency. Record a sanitized pre-change snapshot. Abort on drift.
2. GitHub authorization: disable only workflow 361768192 using the PUT in workflow-containment.json. Preserve PR #489 and branch. Verify state disabled_manually and no outstanding job. Existing runs require waiting or separately authorized cancellation. Obtain owner confirmation for external consumers. Do not change staging secrets.
3. Supabase authorization: execute only table-privileges.sql on the pinned E2E connection as postgres. No DML, role/schema/default-ACL/RLS/function/bucket/publication changes. Snapshot is retained outside the DB; transaction snapshots are temporary only.
4. Read-only verify-table-privileges.sql plus catalog diff: 79 client grant entries removed, own users SELECT retained, service ACLs/policies and unrelated resources unchanged. Do not run remote TRUNCATE probes.
5. Any authenticated application canary, cleanup, data/resource provisioning, frontend/API retarget or deployment requires its own authorization. This patch does not make the marketplace backend complete.
6. Failure before COMMIT rolls back transactionally. Failure after COMMIT: capture diagnostics and obtain exceptional approval before rollback-table-privileges.sql. Do not restore grants over newer ACL/role/policy drift. Leave workflow disabled during rollback/investigation. Enable only with the separate reactivation criteria.

## Remaining risks

Default ACLs for future tables are intentionally untouched. Consumer absence is not globally proven. Workflow concurrency was per github.ref, not project-wide. SMTP/Auth hooks, Edge environment secrets, external workers/webhooks and API configuration are not certified. KYC sandbox schema differs from A+B; required marketplace resources remain absent. No weakening of RLS or blind migration replay is proposed.

## Local governance

PostgreSQL ACL/RLS tests passed. The global Matrix scans the entire root under APP-001. Its two derived artifacts were regenerated deterministically in this isolated branch to reflect the added package. Configuration, historical snapshot, maturity and blockers are unchanged. Commit requires all applicable governance gates. Existing local/browser certification remains attached to the frozen original checkpoint, not this uncommitted candidate.

Disabling G4 can leave required CI status checks absent and block future merge of PR #489; review repository rules with the owner. It does not cancel existing runs. No exclusivity claim follows from an empty default-branch code search.
