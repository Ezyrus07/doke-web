#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => {
  console.error(`[PROF-A03] ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const files = {
  operations: 'supabase/functions/self-service-operations/operations.mjs',
  migration: 'supabase/migrations/148_professional_profile_reconciliation_authority.sql',
  sqlTest: 'supabase/tests/017_professional_profile_reconciliation_authority_validation.sql',
  service: 'assets/js/services/professional-profile-service.js',
  repository: 'assets/js/repositories/professional-profiles-repository.js',
  runtimeTest: 'scripts/test-professional-profile-reconciliation-runtime.js',
  a02Evidence: 'docs/validation/PROF-001-A02-PROFILE-AUTHORITY-RETIREMENT.json',
  evidenceJson: 'docs/validation/PROF-001-A03-PROFILE-RECONCILIATION.json',
  evidenceMarkdown: 'docs/validation/PROF-001-A03-PROFILE-RECONCILIATION.md',
};

Object.values(files).forEach((file) => assert(exists(file), `required file missing: ${file}`));

const operations = read(files.operations);
assert(
  operations.includes("'update_professional_profile_reconciled'"),
  'self-service allowlist is missing update_professional_profile_reconciled'
);

const migration = read(files.migration);
[
  'create or replace function public.update_professional_profile_reconciled',
  "v_user.role <> 'professional'",
  "v_professional.setup_status <> 'active'",
  "v_professional.verification_status <> 'verified'",
  "v_professional.document_status <> 'verified'",
  'perform public.update_account_profile(',
  "when 'update_professional_profile_reconciled' then",
  'execute_self_service_operation_internal_pre_prof_a03',
  'DOKE_PROFESSIONAL_PROFILE_FIELD_FORBIDDEN',
  'revoke all on function public.update_professional_profile_reconciled',
  'to service_role'
].forEach((marker) => assert(migration.includes(marker), `migration marker missing: ${marker}`));

assert(
  !/grant\s+execute\s+on\s+function\s+public\.update_professional_profile_reconciled[\s\S]*?\s+to\s+(?:anon|authenticated)\b/i.test(migration),
  'reconciled professional mutation cannot be directly granted to browser roles'
);

const service = read(files.service);
[
  "invokeSelfService('update_professional_profile_reconciled'",
  'base.refreshCurrentProfile()',
  'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_SUBJECT_MISMATCH',
  'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_INVALID',
  "source: 'server'",
  'reconciled: true'
].forEach((marker) => assert(service.includes(marker), `professional service marker missing: ${marker}`));
[
  'repo.updateActiveProfile',
  'base.updateCurrentProfile',
  'previousProfessionalProfile',
  'localStorage',
  'sessionStorage'
].forEach((marker) => assert(!service.includes(marker), `split/local professional editor authority remains: ${marker}`));

const repository = read(files.repository);
assert(
  repository.includes('DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE'),
  'repository fail-closed boundary must remain after PROF-A03'
);
assert(
  !repository.includes("'update_professional_profile_reconciled'"),
  'reconciled active edit authority belongs to the service operation, not the repository'
);

const runtimeTest = read(files.runtimeTest);
[
  'update_professional_profile_reconciled',
  'profile.refreshCurrentProfile',
  'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_SUBJECT_MISMATCH',
  'operationCalls.length, 1'
].forEach((marker) => assert(runtimeTest.includes(marker), `runtime coverage missing: ${marker}`));

const sqlTest = read(files.sqlTest);
[
  'PROF_A03_DIRECT_BROWSER_GRANT',
  'PROF_A03_SERVICE_ROLE_GRANT_MISSING',
  'PROF_A03_RECONCILIATION_SUBJECT_MISMATCH',
  'PROF_A03_PROFESSIONAL_PAYLOAD_NOT_RECONCILED',
  'PROF_A03_PROTECTED_ACCOUNT_STATE_MUTATED',
  'PROF_A03_FORBIDDEN_FIELD_ACCEPTED',
  'rollback;'
].forEach((marker) => assert(sqlTest.includes(marker), `SQL validation marker missing: ${marker}`));

const a02 = JSON.parse(read(files.a02Evidence));
assert(a02.status === 'done', 'PROF-A02 must remain done');
assert(a02.validation && a02.validation.finalEvidence === 'success', 'PROF-A02 final evidence must be reconciled before PROF-A03');
assert(a02.validation && a02.validation.finalQualityRunNumber === 765, 'PROF-A02 final Quality evidence is inconsistent');
assert(a02.validation && a02.validation.finalCanaryRunNumber === 538, 'PROF-A02 final Canary evidence is inconsistent');
assert(a02.validation && a02.validation.finalDiagnosticRunNumber === 558, 'PROF-A02 final Diagnostic evidence is inconsistent');

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'PROF-001' && evidence.sublot === 'PROF-A03', 'PROF-A03 evidence identity is invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'PROF-A03 evidence status is invalid');
assert(evidence.safety && evidence.safety.productionChanged === false, 'PROF-A03 cannot claim a production change');
assert(evidence.safety && evidence.safety.realAccountChanged === false, 'PROF-A03 cannot claim a real-account change');
assert(evidence.safety && evidence.safety.persistentSyntheticAccountCreated === false, 'PROF-A03 validation cannot leave a synthetic account');

const stagingValidated = evidence.validation && evidence.validation.stagingValidation === 'success';
if (stagingValidated) {
  assert(evidence.status === 'validation_pending' || evidence.status === 'done', 'validated staging evidence requires validation_pending or done status');
  assert(evidence.safety.stagingChanged === true, 'validated staging evidence must acknowledge the staging change');
  assert(evidence.safety.migrationApplied === true, 'validated staging evidence must acknowledge the migration');
  assert(evidence.safety.edgeFunctionDeployed === true, 'validated staging evidence must acknowledge the Edge deployment');
  assert(evidence.staging && evidence.staging.projectId === 'zwkczgewzbsorbrjuzpb', 'staging project evidence is missing');
  assert(evidence.staging && evidence.staging.migrationName === 'professional_profile_reconciliation_authority', 'staging migration name is inconsistent');
  assert(evidence.staging && evidence.staging.migrationVersion === '20260727110417', 'staging migration version is inconsistent');
  assert(evidence.staging && evidence.staging.edgeFunction === 'self-service-operations', 'staging Edge Function evidence is missing');
  assert(evidence.staging && evidence.staging.edgeFunctionVersion === 6, 'staging Edge Function version is inconsistent');
  assert(evidence.staging && evidence.staging.verifyJwt === true, 'staging Edge Function must remain JWT verified');
  assert(evidence.staging && evidence.staging.syntheticAuthUsersAfterValidation === 0, 'staging validation left a synthetic auth user');
  assert(evidence.staging && evidence.staging.syntheticPublicUsersAfterValidation === 0, 'staging validation left a synthetic public user');
  assert(evidence.validation.sqlValidation === 'success_with_rollback', 'staging SQL rollback evidence is missing');
  assert(evidence.validation.directBrowserGrant === 'denied', 'browser-role ACL evidence is missing');
  assert(evidence.validation.serviceRoleExecute === 'allowed', 'service-role ACL evidence is missing');
} else {
  assert(evidence.safety && evidence.safety.stagingChanged === false, 'unvalidated evidence cannot claim a staging change');
  assert(evidence.safety && evidence.safety.migrationApplied === false, 'unvalidated evidence cannot claim migration application');
  assert(evidence.safety && evidence.safety.edgeFunctionDeployed === false, 'unvalidated evidence cannot claim Edge deployment');
}

if (evidence.status === 'done') {
  assert(evidence.validation && evidence.validation.finalEvidence === 'success', 'DONE requires final evidence success');
  assert(evidence.validation && evidence.validation.finalQualityRunNumber > 0, 'DONE requires final Quality evidence');
  assert(evidence.validation && evidence.validation.finalCanaryRunNumber > 0, 'DONE requires final Canary evidence');
  assert(evidence.validation && evidence.validation.finalDiagnosticRunNumber > 0, 'DONE requires final Diagnostic evidence');
}

if (!process.exitCode) {
  console.log('[PROF-A03] active professional editor now crosses one atomic server operation.');
  console.log('[PROF-A03] base identity and professional payload reconcile from canonical server state.');
  console.log('[PROF-A03] browser roles cannot directly execute the privileged database mutation.');
  console.log('[PROF-A03] PROF-A02 final documentary evidence is consistent.');
  if (stagingValidated) console.log('[PROF-A03] staging migration, JWT-verified Edge v6 and rollback validation are evidenced.');
}
