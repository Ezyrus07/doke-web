#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');

function compareVersions(left, right) {
  const normalize = (value) => String(value || '').split('.').map((part) => Number(part) || 0);
  const a = normalize(left);
  const b = normalize(right);
  const size = Math.max(a.length, b.length);
  for (let index = 0; index < size; index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta) return delta > 0 ? 1 : -1;
  }
  return 0;
}
const required = [
  'scripts/lib/ord-a06-authorization-envelope.js',
  'scripts/prepare-ord-001-a06-authorization-envelope.js',
  'scripts/execute-ord-001-a06-visual-settlement-playwright.js',
  'scripts/audit-ord-001-a06-authorization-envelope.js',
  'docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md',
  'docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json',
  '.github/workflows/ord-001-a06-authorization-envelope.yml',
  'config/domain-completion-matrix.json',
  'package.json'
];

required.forEach((file) => assert(fs.existsSync(file), `Missing ORD-A06 authorization envelope asset: ${file}`));

const helper = read('scripts/lib/ord-a06-authorization-envelope.js');
const preparer = read('scripts/prepare-ord-001-a06-authorization-envelope.js');
const executor = read('scripts/execute-ord-001-a06-visual-settlement-playwright.js');
const docs = read('docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md');
const evidenceSource = read('docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json');
const evidence = JSON.parse(evidenceSource);
const workflow = read('.github/workflows/ord-001-a06-authorization-envelope.yml');
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const pkg = JSON.parse(read('package.json'));

function requireAll(label, source, fragments) {
  fragments.forEach((fragment) => assert(source.includes(fragment), `${label} missing: ${fragment}`));
}

requireAll('helper', helper, [
  "ENVELOPE_VERSION = 'ord-a06-authorization-v1'",
  'MAX_TTL_MS = 2 * 60 * 60 * 1000',
  'Authorization manifest must remain outside the repository working tree.',
  'Authorization manifest digest mismatch.',
  'Authorization manifest has expired.',
  'consent.client !== true',
  'scope.maxOrders !== 1',
  'clientEmailSha256',
  'professionalEmailSha256',
  'serviceRefSha256',
  'webBaseUrlSha256',
  'apiBaseUrlSha256',
  'supabaseUrlSha256',
  'validateAuthorizationEnvelope'
]);

requireAll('preparer', preparer, [
  "AUTHORIZATION_DECISION = 'I_EXPLICITLY_AUTHORIZE_ORD_A06_VISUAL_CANARY'",
  "writeAuthorization: 'DOKE_ORD_A06_WRITE_AUTHORIZATION'",
  "authorizationOutputPath: 'DOKE_ORD_A06_AUTHORIZATION_OUTPUT_PATH'",
  "authorizationTtlMinutes: 'DOKE_ORD_A06_AUTHORIZATION_TTL_MINUTES'",
  'ttlMinutes < 5 || ttlMinutes > 120',
  'Authorization output already exists; refusing to overwrite it.',
  "mode: 0o600, flag: 'wx'",
  'validateAuthorizationEnvelope',
  'performsNetworkRequest: false',
  'performsMutation: false'
]);

requireAll('executor', executor, [
  "authorizationManifestPath: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH'",
  "authorizationManifestDigest: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256'",
  "requireValue(ENV.authorizationManifestPath)",
  "requireValue(ENV.authorizationManifestDigest)",
  'validateAuthorizationEnvelope({',
  "record('environment.authorization_envelope', 'passed'",
  'authorizationEnvelope'
]);

assert.strictEqual(evidence.status, 'authorization_envelope_contract_complete_not_issued');
assert.strictEqual(evidence.contract.manifestRequiredByExecutor, true);
assert.strictEqual(evidence.contract.outsideRepositoryRequired, true);
assert.strictEqual(evidence.contract.ttlMaximumMinutes, 120);
assert.strictEqual(evidence.contract.maxOrders, 1);
assert.strictEqual(evidence.currentExecution.authorizationDecisionReceived, false);
assert.strictEqual(evidence.currentExecution.envelopeIssued, false);
assert.strictEqual(evidence.currentExecution.networkRequestsPerformed, false);
assert.strictEqual(evidence.currentExecution.mutationsPerformed, false);
assert.strictEqual(evidence.currentExecution.ordersCreated, 0);
assert.strictEqual(evidence.currentExecution.productionChanged, false);
Object.values(evidence.privacy).forEach((value) => assert.strictEqual(value, false));

const forbiddenEvidence = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
  /https?:\/\//i,
  /\bservice_[0-9]{6,}_[a-z0-9_-]+\b/i,
  /(?:password|senha|token|service[_-]?role[_-]?key)\s*[:=]\s*['\"][^'\"]+['\"]/i
];
forbiddenEvidence.forEach((pattern) => assert(!pattern.test(evidenceSource), `Evidence contains raw sensitive material matching ${pattern}`));

requireAll('docs', docs, [
  'Capacidade técnica não equivale a autorização.',
  'O simples comando “próximo” não é interpretado como essa autorização.',
  'TTL máximo: 120 minutos',
  'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH',
  'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256',
  'Nenhum envelope emitido deve ser versionado.'
]);

const scripts = pkg.scripts || {};
assert.strictEqual(scripts['audit:ord-001-a06-authorization-envelope'], 'node scripts/audit-ord-001-a06-authorization-envelope.js');
assert.strictEqual(scripts['prepare:ord-001-a06-authorization-envelope:dry-run'], 'node scripts/prepare-ord-001-a06-authorization-envelope.js --dry-run');
assert.strictEqual(scripts['prepare:ord-001-a06-authorization-envelope:check-env'], 'node scripts/prepare-ord-001-a06-authorization-envelope.js --check-env');
assert.strictEqual(scripts['prepare:ord-001-a06-authorization-envelope'], 'node scripts/prepare-ord-001-a06-authorization-envelope.js --write');

assert(compareVersions(matrix.version, '1.3.21') >= 0, `Matrix version ${matrix.version} predates the A06 authorization contract.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 missing from completion matrix.');
[
  'scripts/lib/ord-a06-authorization-envelope.js',
  'scripts/prepare-ord-001-a06-authorization-envelope.js',
  'scripts/audit-ord-001-a06-authorization-envelope.js',
  'docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md',
  'docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json',
  '.github/workflows/ord-001-a06-authorization-envelope.yml'
].forEach((file) => assert(ord.requiredPaths.includes(file), `ORD-001 matrix missing authorization asset: ${file}`));
assert(ord.tests.includes('audit:ord-001-a06-authorization-envelope'));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B02' && blocker.description.includes('authorization envelope')));

requireAll('workflow', workflow, [
  'Doke ORD-A06 Authorization Envelope',
  'node scripts/audit-ord-001-a06-authorization-envelope.js',
  'node scripts/prepare-ord-001-a06-authorization-envelope.js --dry-run',
  'node scripts/execute-ord-001-a06-visual-settlement-playwright.js --dry-run',
  'node scripts/audit-ord-001-a06-execution-readiness.js',
  'node scripts/audit-domain-completion-matrix.js'
]);
[
  '--write',
  '--check-env',
  '--execute',
  'DOKE_ORD_A06_CLIENT_EMAIL',
  'DOKE_ORD_A06_CLIENT_PASSWORD',
  'DOKE_ORD_A06_SERVICE_ROLE_KEY'
].forEach((fragment) => assert(!workflow.includes(fragment), `Static authorization workflow must not contain ${fragment}`));

console.log('ORD-A06 authorization envelope audit passed.');
