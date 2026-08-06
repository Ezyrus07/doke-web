'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };
const paths = {
  config: 'config/com-b04c-moderation-persistence-staging-verification.json',
  evidence: 'docs/validation/COM-B04C-MODERATION-PERSISTENCE-STAGING-VERIFICATION.json',
  doc: 'docs/COM-B04C-MODERATION-PERSISTENCE-STAGING-VERIFICATION.md',
  baseMigration: 'supabase/migrations/20260805205800_com_b04b_moderation_persistence.sql',
  indexMigration: 'supabase/migrations/20260805214700_com_b04c_moderation_fk_indexes.sql'
};
for (const relative of Object.values(paths)) {
  check(fs.existsSync(path.join(root, relative)), `${relative} exists`);
  check(fs.statSync(path.join(root, relative)).size > 100, `${relative} nonempty`);
}
const config = JSON.parse(read(paths.config));
const evidence = JSON.parse(read(paths.evidence));
const doc = read(paths.doc);
const baseMigration = read(paths.baseMigration);
const indexMigration = read(paths.indexMigration);
equal(config.contractId, 'com-b04c-moderation-persistence-staging-verification-v1', 'contract');
equal(config.status, 'staging_migrations_applied_structurally_verified_runtime_blocked', 'status');
equal(config.project.ref, 'zwkczgewzbsorbrjuzpb', 'project');
equal(config.migrations.map((item) => item.version), ['20260806004634','20260806004832'], 'migrations');
check(config.migrations.every((item) => item.applied), 'applied migrations');
equal(config.structure.tableCount, 8, 'tables');
equal(config.structure.immutableTriggerCount, 6, 'triggers');
equal(config.structure.rpcCount, 2, 'rpcs');
equal(config.structure.policyCount, 0, 'policies');
equal(config.structure.persistentRowCount, 0, 'rows');
for (const key of ['allTablesRlsEnabled','allTablesRlsForced','directDmlRevokedFromAnon','directDmlRevokedFromAuthenticated','directDmlRevokedFromServiceRole','rpcSearchPathFixed','rpcServiceRoleExecute','foreignKeysIndexed']) equal(config.structure[key], true, key);
for (const key of ['rpcAnonExecute','rpcAuthenticatedExecute','privateSchemaUsageAnon','privateSchemaUsageAuthenticated','privateSchemaUsageServiceRole']) equal(config.structure[key], false, key);
equal(config.rollbackCanary.transaction, 'BEGIN_ROLLBACK', 'rollback');
equal(config.rollbackCanary.idempotentReplay, true, 'replay');
equal(config.rollbackCanary.revisionConflictError, 'CASE_REVISION_CONFLICT', 'conflict');
equal(config.rollbackCanary.immutableLedgerError, 'IMMUTABLE_MODERATION_LEDGER', 'immutable');
equal(config.rollbackCanary.persistentResidue, false, 'residue');
equal(config.advisors.unindexedForeignKeysForComModerationBeforeHardening, 9, 'advisor before');
equal(config.advisors.unindexedForeignKeysForComModerationAfterHardening, 0, 'advisor after');
equal(config.runtime.adapterIntegrated, false, 'runtime');
equal(config.effects.productionChanged, false, 'production');
equal(config.effects.pullRequestMerged, false, 'merge');
for (const value of Object.values(config.remainingAuthority)) equal(value, false, 'authority');
equal(evidence.status, 'staging_structural_verification_passed', 'evidence status');
equal(evidence.verification.tables, '8/8', 'evidence tables');
equal(evidence.verification.foreignKeysIndexed, true, 'evidence indexes');
equal(evidence.rollbackCanary.transactionRolledBack, true, 'evidence rollback');
equal(evidence.rollbackCanary.persistentResidue, false, 'evidence residue');
for (const marker of ['20260806004634  com_b04b_moderation_persistence','20260806004832  com_b04c_moderation_fk_indexes','CASE_REVISION_CONFLICT','IMMUTABLE_MODERATION_LEDGER','COM-B04D — repository-only runtime composition readiness']) check(doc.includes(marker), marker);
check(baseMigration.includes('force row level security'), 'forced rls');
check(baseMigration.includes('to service_role;'), 'service role');
for (const name of ['appeal_event_case_revision_idx','decision_record_case_revision_idx','evidence_record_case_revision_idx','media_review_event_case_revision_idx','sanction_event_case_revision_idx']) check(indexMigration.includes(name), name);
console.log(`COM-B04C audit passed: ${checks}/${checks}`);
