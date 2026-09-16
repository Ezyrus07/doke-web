#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
let checks = 0;
const check = (value, message) => { checks += 1; assert.ok(value, message); };
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };

const pkg = JSON.parse(read('package.json'));
const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
const doc = read('docs/DOMAIN-COMPLETION-MATRIX.md');
const report = JSON.parse(read('reports/generated/domain-completion-matrix-report.json'));
const config = JSON.parse(read('config/com-b04d-moderation-runtime-composition-readiness.json'));
const evidence = JSON.parse(read('docs/validation/COM-B04D-MODERATION-RUNTIME-COMPOSITION-READINESS.json'));
const domain = matrix.domains.find((item) => item.id === 'COM-001');
const flow = matrix.criticalFlows.find((item) => item.id === 'FLOW-12');

check(domain, 'COM-001 domain exists');
check(flow, 'FLOW-12 exists');
check(['1.3.109', '1.3.110', '1.3.111', '1.3.112'].includes(matrix.version), 'supported matrix version');
equal(domain.maturity, 3, 'maturity preserved');
equal(domain.userFacingAuthority, 'hybrid', 'UI authority preserved');
equal(domain.serverAuthority, 'partial', 'server authority partial');
equal(domain.stagingEvidence, 'staging_canary', 'staging evidence preserved');
equal(domain.productionGate, 'blocked', 'production blocked');
check(flow.blockers.includes('COM-B04'), 'FLOW-12 blocker retained');

const blocker = domain.blockers.find((item) => item.id === 'COM-B04');
check(blocker, 'COM-B04 blocker retained');

if (matrix.version === '1.3.109') {
  equal(matrix.updatedAt, '2026-08-05T22:02:00-03:00', 'pre-sync timestamp');
  equal(blocker.category, 'moderation_runtime_composition', 'pre-sync blocker category');
  const priorAction = 'Prepare repository-only moderation runtime composition under COM-B04D; any live staging invocation or real moderation action requires separate explicit authorization.';
  check(domain.nextActions.includes(priorAction), 'pre-sync next action retained');
  equal(report.version, '1.3.109', 'pre-sync report version');
  equal(report.generatedAt, '2026-08-05T22:02:00-03:00', 'pre-sync report timestamp');
} else {
  for (const required of [
    'backend/modules/communities/community-moderation-runtime-composition.js',
    'config/com-b04d-moderation-runtime-composition-readiness.json',
    'scripts/test-com-b04d-moderation-runtime-composition-readiness.js',
    'scripts/audit-com-b04d-moderation-runtime-composition-readiness.js',
    'scripts/audit-com-b04d-domain-matrix-reconciliation.js',
    'docs/COM-B04D-MODERATION-RUNTIME-COMPOSITION-READINESS.md',
    'docs/validation/COM-B04D-MODERATION-RUNTIME-COMPOSITION-READINESS.json',
    '.github/workflows/com-b04d-moderation-runtime-composition-readiness.yml'
  ]) check(domain.requiredPaths.includes(required), `required path: ${required}`);

  const auditScript = 'audit:com-b04d-moderation-runtime-composition-readiness';
  const testScript = 'test:com-b04d-moderation-runtime-composition-readiness';
  check(domain.tests.includes(auditScript), 'matrix B04D audit command');
  check(domain.tests.includes(testScript), 'matrix B04D test command');
  equal(pkg.scripts[auditScript], 'node scripts/audit-com-b04d-moderation-runtime-composition-readiness.js', 'package B04D audit');
  equal(pkg.scripts[testScript], 'node scripts/test-com-b04d-moderation-runtime-composition-readiness.js', 'package B04D test');

  for (const marker of [
    'COM-B04D repository-certified the moderation runtime composition boundary',
    'initial report evidence is materialized into the immutable evidence ledger',
    'Live staging invocation, route registration, real moderation actions and production remain blocked.'
  ]) {
    check(domain.evidence.some((item) => item.includes(marker)), `matrix evidence: ${marker}`);
    check(doc.includes(marker), `doc evidence: ${marker}`);
  }

  if (matrix.version === '1.3.110') {
    equal(matrix.updatedAt, '2026-08-05T22:17:00-03:00', 'B04D sync timestamp');
    equal(blocker.category, 'moderation_authenticated_staging_canary', 'B04D blocker category');
    equal(blocker.description, 'Moderation runtime composition is repository-certified and persistence is structurally verified in staging, but authenticated live invocation, route activation and real moderation execution are not active.', 'B04D blocker description');
    const nextAction = 'Execute an authenticated rollback-only moderation composition canary in staging under COM-B04E only after separate explicit authorization.';
    check(domain.nextActions.includes(nextAction), 'B04E next action');
    check(doc.includes(nextAction), 'doc B04E next action');
    check(doc.includes('Baseline: 2026-08-05T22:17:00-03:00.'), 'doc B04D baseline');
  } else if (matrix.version === '1.3.111') {
    equal(matrix.updatedAt, '2026-08-06T09:36:00-03:00', 'B04G sync timestamp');
    equal(blocker.category, 'moderation_live_composition_activation', 'B04G blocker category');
    equal(blocker.description, 'Authenticated rollback-only composition canary passed and repository route/module wiring is certified, but the wired handler remains fail-closed and live composition, deployment, traffic and real moderation are not active.', 'B04G blocker description');
    const nextAction = 'Prepare COM-B04H repository-only live composition activation readiness; staging deployment, traffic and real moderation require separate explicit authorization.';
    check(domain.nextActions.includes(nextAction), 'B04H next action');
    check(doc.includes(nextAction), 'doc B04H next action');
    check(domain.evidence.some((item) => item.includes('COM-B04G repository-wired')), 'B04G evidence');
    check(doc.includes('Baseline: 2026-08-06T09:36:00-03:00.'), 'doc B04G baseline');
  } else {
    equal(matrix.updatedAt, '2026-08-06T10:24:00-03:00', 'B04H sync timestamp');
    equal(blocker.category, 'moderation_staging_live_activation_authorization', 'B04H blocker category');
    equal(blocker.description, 'COM-B04H repository-certified the live composition activation proof package, but the route handler remains HTTP 503, the composition remains disabled and staging activation, traffic and real moderation require separate COM-B04I authorization.', 'B04H blocker description');
    const nextAction = 'Authorize and execute COM-B04I staging live composition activation and rollback-only route canary only after the exact separate authorization phrase.';
    check(domain.nextActions.includes(nextAction), 'B04I next action');
    check(doc.includes(nextAction), 'doc B04I next action');
    check(domain.evidence.some((item) => item.includes('COM-B04H repository-certified')), 'B04H evidence');
    check(doc.includes('Baseline: 2026-08-06T10:24:00-03:00.'), 'doc B04H baseline');
  }

  equal(report.version, matrix.version, 'post-sync report version');
  equal(report.generatedAt, matrix.updatedAt, 'post-sync report timestamp');
}

equal(report.name, 'domain-completion-matrix', 'report name');
equal(report.status, 'passed', 'report status');
const reportDomain = report.domains.find((item) => item.id === 'COM-001');
check(reportDomain && reportDomain.filesMatched >= 17, 'report scans COM paths');

equal(config.status, 'repository_composition_ready_live_invocation_blocked', 'config status');
equal(config.composition.defaultActivationMode, 'disabled', 'config disabled');
equal(config.composition.liveActivationModePresent, false, 'config no live mode');
equal(config.composition.routeRegistered, false, 'config route false');
equal(config.securityBoundary.persistedCaseBindingRequired, true, 'config persistence binding');
equal(config.translationBoundary.initialEvidenceMaterialized, true, 'config initial evidence');
equal(config.effects.databaseAccessed, false, 'config no database access');
equal(config.effects.stagingRead, false, 'config no staging read');
equal(config.effects.stagingMutation, false, 'config no staging mutation');
equal(config.effects.runtimeActivated, false, 'config runtime blocked');
equal(config.effects.productionChanged, false, 'config production blocked');
equal(config.effects.pullRequestMerged, false, 'config PR unmerged');
for (const value of Object.values(config.remainingAuthority)) equal(value, false, 'remaining authority false');

equal(evidence.status, 'repository_composition_ready_live_invocation_blocked', 'evidence status');
check(['prepared_repository_only_pending_final_ci_binding', 'repository_certified_live_invocation_blocked'].includes(evidence.result), 'evidence result');
equal(evidence.composition.liveMode, false, 'evidence live false');
equal(evidence.composition.routeRegistered, false, 'evidence route false');
equal(evidence.verifiedProperties.initialEvidenceMaterialized, true, 'evidence initial record');
equal(evidence.effects.databaseAccessed, false, 'evidence no database');
equal(evidence.effects.stagingRead, false, 'evidence no staging read');
equal(evidence.effects.stagingMutation, false, 'evidence no staging mutation');
equal(evidence.effects.runtimeActivated, false, 'evidence runtime blocked');
equal(evidence.effects.productionChanged, false, 'evidence production blocked');

console.log(`COM-B04D matrix reconciliation audit passed: ${checks}/${checks}`);
