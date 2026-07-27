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
assert(evidence.safety && evidence.safety.stagingChanged === false, 'PROF-A03 cannot claim a staging change before deployment');
assert(evidence.safety && evidence.safety.migrationApplied === false, 'PROF-A03 cannot claim migration application before staging validation');
assert(evidence.safety && evidence.safety.edgeFunctionDeployed === false, 'PROF-A03 cannot claim Edge deployment before deployment');

if (!process.exitCode) {
  console.log('[PROF-A03] active professional editor now crosses one atomic server operation.');
  console.log('[PROF-A03] base identity and professional payload reconcile from canonical server state.');
  console.log('[PROF-A03] browser roles cannot directly execute the privileged database mutation.');
  console.log('[PROF-A03] PROF-A02 final documentary evidence is consistent.');
}
