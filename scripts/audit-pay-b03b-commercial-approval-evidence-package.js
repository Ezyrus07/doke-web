#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const readJson = (file) => JSON.parse(read(file));
const assert = (condition, message) => {
  if (!condition) throw new Error('PAY-B03B audit failed: ' + message);
};

const paths = Object.freeze({
  module: 'backend/modules/payments/payment-commercial-approval-evidence.js',
  config: 'config/pay-b03b-commercial-approval-evidence-package.json',
  fixture: 'tests/fixtures/pay-b03b-commercial-approval-evidence-cases.json',
  docs: 'docs/PAY-B03B-COMMERCIAL-APPROVAL-EVIDENCE-PACKAGE.md',
  evidence: 'docs/validation/PAY-B03B-COMMERCIAL-APPROVAL-EVIDENCE-PACKAGE.json',
  audit: 'scripts/audit-pay-b03b-commercial-approval-evidence-package.js',
  test: 'scripts/test-pay-b03b-commercial-approval-evidence-package.js',
  workflow: '.github/workflows/pay-b03b-commercial-approval-evidence-package.yml'
});

Object.values(paths).forEach((file) => assert(fs.existsSync(path.join(ROOT, file)), 'missing asset: ' + file));

const source = read(paths.module);
const config = readJson(paths.config);
const fixture = readJson(paths.fixture);
const docs = read(paths.docs);
const evidence = readJson(paths.evidence);
const workflow = read(paths.workflow);

assert(config.contractVersion === 'pay-b03b-commercial-approval-evidence-package-v1', 'contract version mismatch');
assert(config.requestVersion === 'pay-commercial-approval-request-v1', 'request version mismatch');
assert(config.evidenceVersion === 'pay-commercial-approval-evidence-v1', 'evidence version mismatch');
assert(config.packageVersion === 'pay-commercial-policy-approval-package-v1', 'package version mismatch');
assert(config.readinessVersion === 'pay-commercial-policy-approval-readiness-v1', 'readiness version mismatch');
assert(config.b03aBinding.contractVersion === 'pay-b03a-commercial-policy-decision-gate-v1', 'PAY-B03A binding mismatch');
assert(config.b03aBinding.readinessDecision === 'blocked_repository_only', 'PAY-B03A must remain blocked');
assert(config.parameterRegistry.parameters.length === 9, 'nine parameters required');
assert(config.parameterRegistry.parameters.every((item) => item.state === 'pending' && item.value === null && item.approvalEvidenceFingerprint === null), 'parameters must remain pending');
assert(config.requests.length === 4, 'four approval requests required');
assert(JSON.stringify(config.requests.map((item) => item.scope).sort()) === JSON.stringify([
  'executive_business',
  'finance_risk_operations',
  'legal_consumer_contracts',
  'tax_accounting'
]), 'approval scopes mismatch');
assert(config.requests.find((item) => item.scope === 'legal_consumer_contracts').requiredReviewerClass === 'qualified_external', 'legal external review required');
assert(config.requests.find((item) => item.scope === 'tax_accounting').requiredReviewerClass === 'qualified_external', 'tax external review required');
assert(Array.isArray(config.evidence) && config.evidence.length === 0, 'repository must not invent approval evidence');
assert(config.package.status === 'blocked_pending_approvals', 'package must remain blocked');
assert(config.package.approvalsStructurallyComplete === false, 'approvals cannot be complete');
assert(config.package.pendingApprovalScopes.length === 4, 'all approval scopes must remain pending');
assert(config.package.pendingParameterIds.length === 9, 'all parameters must remain pending');
assert(config.readiness.decision === 'blocked_pending_approvals', 'readiness must remain blocked');
assert(JSON.stringify(config.blockers) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'blockers drifted');

const authorityObjects = [config.authority, config.b03aBinding, config.package, config.readiness];
for (const object of authorityObjects) {
  [
    'production',
    'providerContactAuthorized',
    'paymentProcessingAuthorized',
    'fundCustodyAuthorized',
    'remoteExecutionAuthorized'
  ].forEach((field) => assert(object[field] === false, 'authority field must remain false: ' + field));
}
assert(config.authority.legalApprovalGranted === false, 'legal approval must remain false');
assert(config.authority.taxAccountingApprovalGranted === false, 'tax/accounting approval must remain false');
assert(config.authority.executiveApprovalGranted === false, 'executive approval must remain false');

assert(config.sourceRegister.sources.length >= 7, 'official source register incomplete');
const allowedHosts = new Set(['www.planalto.gov.br', 'www.bcb.gov.br', 'www.gov.br']);
for (const item of config.sourceRegister.sources) {
  const url = new URL(item.url);
  assert(url.protocol === 'https:' && allowedHosts.has(url.hostname), 'non-official source: ' + item.sourceId);
  assert(item.verifiedOn === '2026-08-04', 'source verification date mismatch');
}
assert(/^[a-f0-9]{64}$/.test(config.sourceRegister.sourceRegisterFingerprint), 'source register fingerprint invalid');

assert(fixture.contractVersion === config.contractVersion, 'fixture contract mismatch');
assert(fixture.totalCases === 39 && fixture.positiveCases === 5 && fixture.negativeCases === 34, 'fixture counts mismatch');
assert(fixture.cases.length === 39, 'fixture inventory mismatch');
assert(new Set(fixture.cases.map((item) => item.caseId)).size === 39, 'fixture IDs must be unique');

assert(evidence.contractVersion === config.contractVersion, 'evidence contract mismatch');
assert(evidence.status === 'passed_repository_only', 'evidence status mismatch');
assert(evidence.conformance.total === 39 && evidence.conformance.passed === 39, 'evidence conformance mismatch');
assert(evidence.approvalsRecorded === 0, 'approval evidence count must remain zero');
assert(evidence.parametersApproved === 0, 'approved parameter count must remain zero');
assert(JSON.stringify(evidence.blockers) === JSON.stringify(['PAY-B01', 'PAY-B03', 'PAY-B04']), 'evidence blockers mismatch');

[
  'PAY-B03B',
  '39/39',
  'qualified_external',
  'blocked_pending_approvals',
  'PAY-B03 permanece aberto',
  'não substitui parecer jurídico',
  'não substitui parecer tributário',
  'PAY-B01',
  'PAY-B03',
  'PAY-B04'
].forEach((fragment) => assert(docs.toLowerCase().includes(fragment.toLowerCase()), 'documentation missing: ' + fragment));

[
  "const CONTRACT_VERSION = 'pay-b03b-commercial-approval-evidence-package-v1'",
  "const REQUEST_VERSION = 'pay-commercial-approval-request-v1'",
  "const EVIDENCE_VERSION = 'pay-commercial-approval-evidence-v1'",
  "const PACKAGE_VERSION = 'pay-commercial-policy-approval-package-v1'",
  'qualified_external',
  'blocked_pending_approvals',
  'blocked_runtime_alignment_and_provider_selection_required',
  'PAY_B03B_ROLE_SEPARATION',
  'PAY_B03B_EXTERNAL_REVIEW_REQUIRED',
  'PAY_B03B_AUTHORITY_FORBIDDEN'
].forEach((fragment) => assert(source.includes(fragment), 'module missing: ' + fragment));

[
  "require('node:http')",
  "require('node:https')",
  "require('node:net')",
  "require('node:tls')",
  "require('node:child_process')",
  'fetch(',
  'axios',
  'process.env',
  'SUPABASE_',
  'privateKey',
  'secretKey'
].forEach((fragment) => assert(!source.includes(fragment), 'module contains prohibited runtime capability: ' + fragment));

assert(workflow.includes('permissions:\n  contents: read'), 'workflow must remain read-only');
[
  'contents: write',
  'pull-requests: write',
  'secrets.',
  'git push',
  'curl ',
  'psql ',
  'supabase ',
  'npm publish'
].forEach((fragment) => assert(!workflow.includes(fragment), 'workflow contains prohibited fragment: ' + fragment));

console.log('PAY-B03B commercial approval evidence package audit passed.');
