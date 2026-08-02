#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const CONFIG_PATH = 'config/sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.json';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-C01E-SYNTHETIC-ORDER-FIXTURE-LIFECYCLE-READINESS.json';
const PLANNER_PATH = 'scripts/plan-sched-001-c01e-synthetic-order-fixture-lifecycle.js';

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.authorization.bothPhrasesRequiredInSameEnvelope, true);
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.authorization.fixtureMutationCovered, false);
assert.strictEqual(config.authorization.browserExecutionCovered, false);
assert.strictEqual(config.accountPolicy.authUserCreationForbidden, true);
assert.strictEqual(config.accountPolicy.realAccountUseForbidden, true);
assert.strictEqual(config.lifecycle.cleanupAlwaysRequired, true);
assert.strictEqual(config.lifecycle.cleanupMustSurviveCanaryFailure, true);
assert.strictEqual(config.lifecycle.independentCleanupVerificationRequired, true);
assert.strictEqual(config.fixtureManifest.orderCount, 2);
assert.strictEqual(config.fixtureManifest.scheduleReservationCount, 1);
assert.strictEqual(config.fixtureManifest.conversationCount, 2);
assert.strictEqual(config.canonicalConfirmedCase.directScheduleProjectionWriteForbidden, true);
assert.strictEqual(config.mutationBoundary.browserMutationForbidden, true);
assert.strictEqual(config.mutationBoundary.paymentsForbidden, true);
assert.strictEqual(config.cleanup.abortOnForbiddenDependency, true);
assert.strictEqual(config.cleanup.zeroResidueRequired, true);
assert.strictEqual(config.capabilities.fixtureProvisioningAvailable, false);
assert.strictEqual(config.capabilities.fixtureCleanupAvailable, false);
assert.strictEqual(config.capabilities.browserExecutionAvailable, false);
assert.strictEqual(config.effects.stagingMutations, 0);
assert.strictEqual(config.effects.accountsCreated, 0);
assert.strictEqual(config.effects.ordersCreated, 0);
assert.strictEqual(config.effects.paymentsCreated, 0);

const dryRun = spawnSync(process.execPath, [PLANNER_PATH, '--dry-run'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'synthetic_fixture_lifecycle_application_blocked');
assert.strictEqual(report.environment, 'doke-web-staging');
assert.strictEqual(report.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(report.authorization.requiredFixtureLifecyclePhrase, config.authorization.requiredFixtureLifecyclePhrase);
assert.strictEqual(report.authorization.requiredBrowserReadOnlyPhrase, config.authorization.requiredBrowserReadOnlyPhrase);
assert.strictEqual(report.authorization.bothPhrasesRequiredInSameEnvelope, true);
assert.strictEqual(report.authorization.genericNextAllowed, false);
assert.strictEqual(report.triggerEvidence.visibleOrderCards, 0);
assert.strictEqual(report.triggerEvidence.stagingMutations, 0);
assert.deepStrictEqual(report.lifecyclePhases, config.lifecycle.phases);
assert.strictEqual(report.maximumLifetimeSeconds, 3600);
assert.strictEqual(report.fixtureManifest.orderCount, 2);
assert.strictEqual(report.fixtureManifest.canonicalConfirmedOrderCount, 1);
assert.strictEqual(report.fixtureManifest.alternateOrderCount, 1);
assert.strictEqual(report.fixtureManifest.sameClientProfessionalPairRequired, true);
assert.strictEqual(report.canonicalConfirmedCase.orderStatus, 'scheduled');
assert.deepStrictEqual(report.alternateCase.orderStatusAllowed, ['requested', 'accepted']);
assert.strictEqual(report.cleanup.cleanupAlwaysRequired, true);
assert.strictEqual(report.cleanup.cleanupMustSurviveCanaryFailure, true);
assert.strictEqual(report.cleanup.independentCleanupVerificationRequired, true);
assert(report.cleanup.allowedBoundedRelations.includes('public.orders'));
assert(report.cleanup.forbiddenDependencyRelations.includes('public.payments'));
assert.strictEqual(report.cleanup.zeroResidueRequired, true);
assert.deepStrictEqual(report.capabilities, config.capabilities);
assert.deepStrictEqual(report.effects, config.effects);
assert.strictEqual(report.nextGate, config.nextGate);

const output = dryRun.stdout;
assert(!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(output));
assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(output));
assert(!/eyJ[A-Za-z0-9_-]{20,}/.test(output));
assert(!/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i.test(output));
assert(!/\bsk_[A-Za-z0-9_-]{20,}\b/i.test(output));
assert(!/"password"\s*:/i.test(output));
assert(!/"serviceRoleKey"\s*:/i.test(output));
assert(!/postgres(?:ql)?:\/\//i.test(output));

const noMode = spawnSync(process.execPath, [PLANNER_PATH], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(noMode.status, 2);
assert(noMode.stderr.includes('Only --dry-run is available'));

const executeAttempt = spawnSync(process.execPath, [PLANNER_PATH, '--execute'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(executeAttempt.status, 2);
assert(executeAttempt.stderr.includes('require a separately authorized application package'));

const checkEnvAttempt = spawnSync(process.execPath, [PLANNER_PATH, '--check-env'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(checkEnvAttempt.status, 2);

const extraFlagAttempt = spawnSync(process.execPath, [PLANNER_PATH, '--dry-run', '--execute'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(extraFlagAttempt.status, 2);

console.log('SCHED-C01E synthetic order fixture lifecycle readiness tests passed.');
