#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a10-blocker-reconciliation.json';
const DOC_PATH = 'docs/ORD-001-A10-BLOCKER-RECONCILIATION.md';
const EVIDENCE_PATH = 'docs/validation/ORD-001-A10-BLOCKER-RECONCILIATION.json';
const WORKFLOW_PATH = '.github/workflows/ord-001-a10-blocker-reconciliation.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';

[CONFIG_PATH, DOC_PATH, EVIDENCE_PATH, WORKFLOW_PATH, MATRIX_PATH].forEach((file) => {
  assert(fs.existsSync(file), `Missing ORD-A10 blocker reconciliation asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

const compareVersions = (left, right) => {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
};

assert.strictEqual(config.contractVersion, 'ord-a10-blocker-reconciliation-v1');
assert.strictEqual(config.status, 'repository_reconciliation_complete_external_and_cross_domain_blockers_remain');
assert.strictEqual(config.domain, 'ORD-001');
assert.strictEqual(config.scope, 'repository_only');
assert.strictEqual(config.reconciliation.blockersClosedByThisSublot, 0);
assert.strictEqual(config.reconciliation.domainClosureClaimed, false);
assert.strictEqual(config.orderedNextActions.length, 4);
assert(config.orderedNextActions[0].includes('SCHED-A03'));

const disposition = Object.fromEntries(config.blockerDisposition.map((item) => [item.id, item]));
assert.deepStrictEqual(Object.keys(disposition).sort(), ['ORD-B02', 'ORD-B03', 'ORD-B04', 'ORD-B05']);
assert.strictEqual(disposition['ORD-B02'].owner, 'ORD-001');
assert.strictEqual(disposition['ORD-B02'].remainsOpen, true);
assert.strictEqual(disposition['ORD-B02'].genericContinuationAuthorizes, false);
assert.strictEqual(disposition['ORD-B03'].owner, 'PAY-001');
assert.strictEqual(disposition['ORD-B03'].remainsOpen, true);
assert.strictEqual(disposition['ORD-B04'].owner, 'SCHED-001');
assert.strictEqual(disposition['ORD-B04'].remainsOpen, true);
assert.strictEqual(disposition['ORD-B05'].requiredPhrase, 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING');
assert.strictEqual(disposition['ORD-B05'].genericContinuationAuthorizes, false);

Object.values(config.forbidden).forEach((value) => assert.strictEqual(value, true));
assert.strictEqual(config.evidence.networkRequestsPerformed, 0);
assert.strictEqual(config.evidence.stagingMutationsPerformed, 0);
assert.strictEqual(config.evidence.providerAccountsUsed, 0);
assert.strictEqual(config.evidence.productionChanged, false);
assert.strictEqual(config.evidence.pullRequestMerged, false);

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.reconciliation.obsoleteA07ActionsRemoved, 3);
assert.strictEqual(evidence.reconciliation.remainingOrderedActions, 4);
assert.strictEqual(evidence.reconciliation.blockersClosed, 0);
assert.strictEqual(evidence.reconciliation.domainClosureClaimed, false);
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.deploymentsPerformed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);

assert(compareVersions(matrix.version, '1.3.46') >= 0, `Matrix version ${matrix.version} predates SCHED-A03.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(ord, 'ORD-001 domain missing from completion matrix');
assert.deepStrictEqual(ord.blockers.map((blocker) => blocker.id), ['ORD-B02', 'ORD-B03', 'ORD-B04', 'ORD-B05']);
assert.strictEqual(ord.nextActions.length, 4);
assert(ord.nextActions[0].includes('exact independent staging authorization'));

const blockers = Object.fromEntries(ord.blockers.map((blocker) => [blocker.id, blocker]));
assert(blockers['ORD-B02'].description.includes('authorization envelope'));
assert(blockers['ORD-B05'].description.includes('external staging release provider'));
assert(blockers['ORD-B05'].description.includes('explicit provider selection'));
assert(blockers['ORD-B03'].description.includes('PAY-001'));
assert(blockers['ORD-B04'].description.includes('SCHED-001'));

[
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  'scripts/audit-ord-001-a10-blocker-reconciliation.js',
  WORKFLOW_PATH
].forEach((path) => assert(ord.requiredPaths.includes(path), `Matrix requiredPaths missing: ${path}`));
assert(ord.tests.includes('audit:ord-001-a10-blocker-reconciliation'));

config.reconciliation.obsoleteActionsRemoved.forEach((obsolete) => {
  assert(!ord.nextActions.includes(obsolete), `Obsolete action remains in matrix: ${obsolete}`);
});

[
  'ORD-B02',
  'ORD-B03',
  'ORD-B04',
  'ORD-B05',
  'PAY-001',
  'SCHED-001',
  'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING',
  'No blocker is closed by this sublot',
  'Production and PR merge remain blocked'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a10-blocker-reconciliation.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('curl '));
assert(!workflow.includes('railway '));
assert(!workflow.includes('--execute'));

console.log('ORD-A10 blocker reconciliation audit passed.');
