#!/usr/bin/env node
'use strict';

const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, 'utf8');

function replaceOnce(source, oldValue, newValue, label) {
  if (source.includes(newValue)) return source;
  if (!source.includes(oldValue)) throw new Error(`Missing reconciliation anchor: ${label}`);
  return source.replace(oldValue, newValue);
}

const executorPath = 'scripts/execute-ord-001-a06-visual-settlement-playwright.js';
let executor = read(executorPath);
executor = replaceOnce(
  executor,
  "const path = require('path');\n",
  "const path = require('path');\nconst { validateAuthorizationEnvelope } = require('./lib/ord-a06-authorization-envelope');\n",
  'executor helper import'
);
executor = replaceOnce(
  executor,
  "  authorizationAck: 'DOKE_ORD_A06_AUTHORIZATION_ACK',\n",
  "  authorizationAck: 'DOKE_ORD_A06_AUTHORIZATION_ACK',\n  authorizationManifestPath: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH',\n  authorizationManifestDigest: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256',\n",
  'executor manifest env'
);
executor = replaceOnce(
  executor,
  "  'scripts/audit-ord-001-a06-playwright-executor.js',\n",
  "  'scripts/audit-ord-001-a06-playwright-executor.js',\n  'scripts/lib/ord-a06-authorization-envelope.js',\n  'docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md',\n  'docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json',\n",
  'executor required files'
);
executor = replaceOnce(
  executor,
  "    authorizationAcknowledged: process.env[ENV.authorizationAck] === AUTHORIZATION_ACK,\n",
  "    authorizationAcknowledged: process.env[ENV.authorizationAck] === AUTHORIZATION_ACK,\n    hasAuthorizationManifestPath: Boolean(process.env[ENV.authorizationManifestPath]),\n    hasAuthorizationManifestDigest: Boolean(process.env[ENV.authorizationManifestDigest]),\n    authorizationEnvelope: null,\n",
  'executor report manifest state'
);
executor = replaceOnce(
  executor,
  "  requireExact(process.env[ENV.authorizationAck], AUTHORIZATION_ACK, `${ENV.authorizationAck} must explicitly authorize the two staging test accounts.`);\n  requireFlag(ENV.allowNetwork);\n",
  "  requireExact(process.env[ENV.authorizationAck], AUTHORIZATION_ACK, `${ENV.authorizationAck} must explicitly authorize the two staging test accounts.`);\n  requireValue(ENV.authorizationManifestPath);\n  requireValue(ENV.authorizationManifestDigest);\n  requireFlag(ENV.allowNetwork);\n",
  'executor manifest requirements'
);
executor = replaceOnce(
  executor,
  "  if (!report.failures.length) record('environment.fail_closed_gate', 'passed');\n",
  "  if (!report.failures.length) {\n    try {\n      const authorization = validateAuthorizationEnvelope({\n        root,\n        manifestPath: process.env[ENV.authorizationManifestPath],\n        manifestDigest: process.env[ENV.authorizationManifestDigest],\n        expected: {\n          authorizationAck: AUTHORIZATION_ACK,\n          runId,\n          targetMarker: marker,\n          clientEmail,\n          professionalEmail,\n          serviceRef: process.env[ENV.serviceRef],\n          webBaseUrl,\n          apiBaseUrl,\n          supabaseUrl\n        }\n      });\n      report.environment.authorizationEnvelope = authorization.summary;\n      record('environment.authorization_envelope', 'passed', authorization.summary.authorizationId);\n    } catch (error) {\n      report.failures.push(`Authorization envelope rejected: ${error.message}`);\n    }\n  }\n\n  if (!report.failures.length) record('environment.fail_closed_gate', 'passed');\n",
  'executor envelope validation'
);
write(executorPath, executor);

const packagePath = 'package.json';
const pkg = JSON.parse(read(packagePath));
const scripts = pkg.scripts || (pkg.scripts = {});
scripts['audit:ord-001-a06-authorization-envelope'] = 'node scripts/audit-ord-001-a06-authorization-envelope.js';
scripts['prepare:ord-001-a06-authorization-envelope:dry-run'] = 'node scripts/prepare-ord-001-a06-authorization-envelope.js --dry-run';
scripts['prepare:ord-001-a06-authorization-envelope:check-env'] = 'node scripts/prepare-ord-001-a06-authorization-envelope.js --check-env';
scripts['prepare:ord-001-a06-authorization-envelope'] = 'node scripts/prepare-ord-001-a06-authorization-envelope.js --write';
write(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const executorEvidencePath = 'docs/validation/ORD-001-A06-PLAYWRIGHT-EXECUTOR.json';
const executorEvidence = JSON.parse(read(executorEvidencePath));
executorEvidence.executor.authorizationEnvelopeRequired = true;
const requiredEnvironment = executorEvidence.requiredEnvironment || (executorEvidence.requiredEnvironment = []);
for (const name of ['DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH', 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256']) {
  if (!requiredEnvironment.includes(name)) requiredEnvironment.splice(2, 0, name);
}
if (!executorEvidence.remainingBlockers.includes('short_lived_resource_bound_authorization_envelope')) {
  executorEvidence.remainingBlockers.unshift('short_lived_resource_bound_authorization_envelope');
}
write(executorEvidencePath, `${JSON.stringify(executorEvidence, null, 2)}\n`);

const executorDocsPath = 'docs/ORD-001-A06-PLAYWRIGHT-EXECUTOR.md';
let executorDocs = read(executorDocsPath);
if (!executorDocs.includes('## Envelope de autorização obrigatório')) {
  executorDocs = `${executorDocs.trimEnd()}\n\n## Envelope de autorização obrigatório\n\nAlém das flags anteriores, \`--check-env\` e \`--execute\` exigem \`DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH\` e \`DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256\`.\n\nO envelope precisa estar fora do repositório, ter validade máxima de duas horas e estar vinculado por SHA-256 ao runId, marcador, duas contas, serviço e três URLs. Consulte \`docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md\`.\n`;
  write(executorDocsPath, executorDocs);
}

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(read(matrixPath));
matrix.version = '1.3.21';
matrix.updatedAt = '2026-07-29T22:45:00-03:00';
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!ord) throw new Error('ORD-001 missing from completion matrix.');
const appendUnique = (target, values) => values.forEach((value) => { if (!target.includes(value)) target.push(value); });
appendUnique(ord.requiredPaths, [
  'scripts/lib/ord-a06-authorization-envelope.js',
  'scripts/prepare-ord-001-a06-authorization-envelope.js',
  'scripts/audit-ord-001-a06-authorization-envelope.js',
  'docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md',
  'docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json',
  '.github/workflows/ord-001-a06-authorization-envelope.yml'
]);
appendUnique(ord.tests, ['audit:ord-001-a06-authorization-envelope']);
appendUnique(ord.evidence, [
  'A short-lived authorization envelope contract now binds one runId to the authorized client, professional, service and staging targets using SHA-256 without committing raw identifiers.',
  'The authorization file must remain outside the repository, match an operator-supplied digest, expire within two hours, prohibit production, limit execution to one order and require cleanup.',
  'The authorization envelope preparer is inert by default: dry-run performs no reads of credentials, check-env writes nothing, and write requires a separate explicit decision plus a dedicated flag.',
  'The Playwright executor now rejects check-env and execute unless the envelope digest, lifetime, resource bindings and target bindings all validate.'
]);
const blocker = ord.blockers.find((entry) => entry.id === 'ORD-B02');
if (blocker) blocker.description = 'Canonical reads, canary commands, cleanup, deterministic settlement, readiness discovery and the fail-closed Playwright executor pass. A short-lived authorization envelope is now mandatory; ORD-B02 remains until explicit authorization is issued, check-env passes and the real two-context visual canary is executed.';
ord.nextActions = [
  'Receive an explicit operational authorization decision for the identified staging client, professional and professional-owned service.',
  'Issue one short-lived resource-bound authorization envelope outside the repository and retain only its path and SHA-256 in the executor environment.',
  'Supply credentials, approved targets and service-role secret only to the executor process, then run check-env without browser, network or mutations.',
  'Permit execute only after every authorization binding passes; review requested, accepted, quoted and optimistic-conflict evidence and prove cleanup twice with zero residue.',
  'Harden worker invocation freshness and replay resistance.'
];
write(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);

console.log('ORD-A06 non-workflow authorization reconciliation complete.');
