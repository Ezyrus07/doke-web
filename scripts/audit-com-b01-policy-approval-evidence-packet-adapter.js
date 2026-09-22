#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-policy-approval-evidence-packet-adapter.js',
  config: 'config/com-b01-policy-approval-evidence-packet-adapter-boundary.json',
  fixtures: 'tests/fixtures/com-b01-policy-approval-evidence-packet-adapter-cases.json',
  test: 'scripts/test-com-b01-policy-approval-evidence-packet-adapter.js',
  docs: 'docs/COM-B01-POLICY-APPROVAL-EVIDENCE-PACKET-ADAPTER.md',
  workflow: '.github/workflows/com-b01-policy-approval-evidence-packet-adapter.yml',
  gate: 'backend/modules/communities/community-policy-operational-integration-gate.js',
  template: 'config/com-b01-server-owned-policy-approval-evidence-template.json',
  templateCertification: 'docs/validation/COM-B01-POLICY-APPROVAL-EVIDENCE-TEMPLATE-CERTIFICATION.json'
};

let checks = 0;
function check(value, message) {
  checks += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  checks += 1;
  assert.strictEqual(actual, expected, message);
}
function text(key) {
  return fs.readFileSync(path.join(root, files[key]), 'utf8');
}
function json(key) {
  return JSON.parse(text(key));
}
function gitBlobSha(relativePath) {
  const content = fs.readFileSync(path.join(root, relativePath));
  const header = Buffer.from(`blob ${content.length}\0`, 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

for (const [key, relativePath] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, relativePath)), `${key} exists`);
  check(fs.statSync(path.join(root, relativePath)).size > 20, `${key} nonempty`);
}

const source = text('module');
const config = json('config');
const fixtures = json('fixtures');
const test = text('test');
const docs = text('docs');
const workflow = text('workflow');
const template = json('template');
const templateCertification = json('templateCertification');

// Protected source boundary must remain byte-identical.
equal(gitBlobSha(files.gate), '4c4424401b52060303735f178058a34d138ff42c', 'canonical gate protected blob');
equal(gitBlobSha(files.template), 'e98a7fcb57706a17edae9bd3bbaaa36c42801817', 'approval evidence template protected blob');
equal(gitBlobSha(files.templateCertification), '517479c1e1ae92226422fd0d27f77c73f4665738', 'template certification protected blob');

// Adapter module remains pure and repository-only.
check(source.startsWith("'use strict';"), 'strict mode');
check(source.includes("require('./community-policy-operational-integration-gate.js')"), 'canonical gate constants reused');
check(source.includes('function buildCanonicalPolicyPacket'), 'adapter builder exists');
check(source.includes("decision: 'blocked_repository_only'"), 'fail-closed decision exists');
check(source.includes("decision: 'canonical_policy_packet_ready_repository_evidence_only'"), 'repository-only ready decision exists');
check(source.includes('referencePresenceAloneGrantsApproval') === false, 'module does not encode config-only approval shortcut');
check(!source.includes('Date.now('), 'no hidden clock');
check(!source.includes('new Date('), 'no hidden date');
check(!source.includes('fetch('), 'no fetch');
check(!source.includes('axios'), 'no axios');
check(!source.includes('process.env'), 'no credentials');
check(!source.includes('createClient(') && !source.includes('@supabase/') && !source.includes('supabase-js'), 'no Supabase client');
check(!source.includes('XMLHttpRequest'), 'no xhr');
check(!source.includes('WebSocket'), 'no realtime transport');
check(!source.includes('child_process'), 'no subprocess/runtime bridge');
check(!source.includes('fs.'), 'no filesystem authority in adapter');

// Boundary config must preserve scope and blockers without granting authority.
equal(config.contractId, 'com-b01-policy-approval-evidence-packet-adapter-v1', 'adapter contract id');
equal(config.sourceBoundaryId, 'COM-B01', 'no successor id created');
equal(config.scope, 'repository_only', 'repository-only scope');
equal(config.authorizedSourceHead, '5eb51438fa6a89e1a3c8587eabeab16153d18855', 'authorized source head');
equal(config.canonicalGateContractId, 'com-b01-policy-operational-integration-gate-v1', 'canonical gate binding');
equal(config.templateSchemaId, 'com-b01-server-owned-policy-approval-evidence-template-v1', 'template binding');
equal(config.currentMaterializedEvidence.templateStatus, 'approval_evidence_incomplete', 'current template incomplete');
equal(config.currentMaterializedEvidence.approvalComplete, false, 'current approval incomplete');
equal(config.currentMaterializedEvidence.approvedPolicyPresent, false, 'current approved policy false');
equal(config.currentMaterializedEvidence.policyApprovalAuthority, false, 'current policy authority false');
equal(config.currentMaterializedEvidence.expectedAdapterDecision, 'blocked_repository_only', 'current decision blocked');
equal(config.currentMaterializedEvidence.canonicalPolicyPacketReady, false, 'current canonical packet not ready');

for (const blocker of ['COM-B02', 'COM-B03', 'COM-B04', 'AUTH-001', 'ADM-B03', 'ADM-B04', 'LEGAL-B01', 'LEGAL-B03', 'LEGAL-B04']) {
  check(config.preservedBlockers.includes(blocker), `preserved blocker ${blocker}`);
}
for (const [key, value] of Object.entries(config.authority)) {
  if (key === 'repositoryOnlyContractAuthority') equal(value, true, 'repository contract authority true');
  else equal(value, false, `${key} false`);
}
for (const [key, value] of Object.entries(config.prohibitedEffects)) equal(value, false, `prohibited ${key} false`);

equal(config.mapping['policyMetadata.semanticVersion'], 'policyVersion', 'version mapping config');
equal(config.mapping['policyMetadata.policyHash'], 'policyHash', 'hash mapping config');
equal(config.mapping['policyMetadata.effectiveAtUtc'], 'effectiveAt', 'effectiveAt mapping config');
equal(config.mapping['adapterInput.policyAuthorId'], 'policyAuthorId', 'explicit author source');
equal(config.mapping['adapterInput.policyDomains'], 'policyDomains', 'explicit domain source');
equal(config.evidenceReferenceContract.referenceType, 'sha256', 'hash-only evidence reference');
equal(config.evidenceReferenceContract.referencePresenceAloneGrantsApproval, false, 'reference presence is not approval');
check(config.nonMappedMetadata['policyMetadata.supersedesHash'].includes('not_emitted'), 'supersedesHash not emitted');

// Existing materialized evidence remains fail-closed.
equal(template.status, 'approval_evidence_incomplete', 'template status unchanged');
equal(template.approvalComplete, false, 'template approvalComplete unchanged');
equal(template.approvedPolicyPresent, false, 'template approvedPolicyPresent unchanged');
equal(template.policyApprovalAuthority, false, 'template policyApprovalAuthority unchanged');
equal(template.reviewerEvidence.filter((item) => item.reviewerIdentity !== null).length, 0, 'no reviewer identity materialized');
equal(templateCertification.approvalsRecorded, 0, 'certification records zero approvals');
equal(templateCertification.authority.policyApprovalGranted, false, 'certification grants no policy approval');
equal(templateCertification.authority.runtimeMutationAuthority, undefined, 'certification does not invent runtimeMutationAuthority field');
equal(templateCertification.authority.handlerRuntimeAuthorized, false, 'certification runtime remains blocked');

// Conformance fixture includes the required negative space and one synthetic positive.
equal(fixtures.expected.total, fixtures.cases.length, 'fixture total');
check(fixtures.expected.total >= 20, 'broad conformance coverage');
equal(fixtures.expected.ready, 1, 'one synthetic ready case');
equal(fixtures.expected.blocked, fixtures.expected.total - 1, 'all other fixture cases blocked');
for (const requiredMutation of [
  'missing_author', 'missing_domains', 'missing_reviewer', 'missing_identity', 'invalid_identity',
  'duplicate_identity', 'duplicate_role', 'unknown_role', 'decision_rejected', 'bad_timestamp',
  'bad_hash', 'hash_drift', 'bad_version', 'version_drift', 'bad_effective_at', 'raw_policy',
  'missing_reference', 'author_is_reviewer'
]) {
  check(fixtures.cases.some((item) => item.mutation === requiredMutation), `fixture mutation ${requiredMutation}`);
}

check(test.includes('gate.evaluatePolicyApproval(positive.canonicalPolicyPacket)'), 'positive packet verified by canonical evaluator');
check(test.includes('current materialized template remains blocked'), 'current template fail-closed test');
check(test.includes("approvedPolicyPresent, false"), 'adapter never grants approvedPolicyPresent');
check(test.includes("policyApprovalAuthority, false"), 'adapter never grants policy authority');
check(test.includes("runtimeMutationAuthority, false"), 'runtime authority asserted false');
check(test.includes("stagingAuthority, false"), 'staging authority asserted false');
check(test.includes("productionAuthority, false"), 'production authority asserted false');

for (const phrase of [
  'does not create `COM-B02CZ` or `R5I`',
  'policyAuthorId',
  'policyDomains',
  'evidenceReference',
  'supersedesHash',
  'blocked_repository_only',
  'COM-B02',
  'COM-B03',
  'COM-B04'
]) {
  check(docs.includes(phrase), `docs phrase ${phrase}`);
}

check(workflow.includes('permissions:\n  contents: read'), 'workflow contents read only');
check(workflow.includes('fetch-depth: 0'), 'workflow has lineage history');
check(workflow.includes('git merge-base --is-ancestor'), 'source ancestry guard');
check(workflow.includes('node --check backend/modules/communities/community-policy-approval-evidence-packet-adapter.js'), 'module syntax step');
check(workflow.includes('node scripts/audit-com-b01-policy-approval-evidence-packet-adapter.js'), 'adapter audit step');
check(workflow.includes('node scripts/test-com-b01-policy-approval-evidence-packet-adapter.js'), 'adapter conformance step');
check(workflow.includes('node scripts/audit-com-b01-policy-operational-integration-gate.js'), 'canonical audit regression');
check(workflow.includes('node scripts/test-com-b01-policy-operational-integration-gate.js'), 'canonical conformance regression');
check(workflow.includes('npm run audit:domain-completion-matrix'), 'matrix audit');
check(workflow.includes('npm run audit:agent-governance'), 'governance audit');
check(workflow.includes('git diff --check'), 'diff hygiene');
check(!workflow.includes('contents: write'), 'workflow cannot write contents');
check(!workflow.includes('secrets.'), 'workflow references no secrets');
check(!workflow.includes('curl '), 'workflow has no curl transport');
check(!workflow.includes('wget '), 'workflow has no wget transport');
check(!workflow.includes('supabase'), 'workflow has no Supabase command');
check(!workflow.includes('workflow_dispatch'), 'no reusable manual trigger authority');

console.log(`COM-B01 approval evidence packet adapter audit passed: ${checks}/${checks}`);
