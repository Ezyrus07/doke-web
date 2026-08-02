#!/usr/bin/env node
'use strict';

const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-c01e-synthetic-order-fixture-lifecycle-readiness.json';
const args = new Set(process.argv.slice(2));

if (!args.has('--dry-run') || args.size !== 1) {
  console.error('SCHED-C01E fixture lifecycle planner is inert. Only --dry-run is available; staging fixture mutation and the bound browser canary require a separately authorized application package.');
  process.exit(2);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const report = {
  contractVersion: config.contractVersion,
  mode: 'dry-run',
  status: 'synthetic_fixture_lifecycle_application_blocked',
  environment: config.environment,
  projectRef: config.projectRef,
  authorization: {
    requiredFixtureLifecyclePhrase: config.authorization.requiredFixtureLifecyclePhrase,
    requiredBrowserReadOnlyPhrase: config.authorization.requiredBrowserReadOnlyPhrase,
    bothPhrasesRequiredInSameEnvelope: config.authorization.bothPhrasesRequiredInSameEnvelope,
    genericNextAllowed: config.authorization.genericNextAllowed
  },
  triggerEvidence: config.triggerEvidence,
  lifecyclePhases: config.lifecycle.phases,
  maximumLifetimeSeconds: config.lifecycle.maximumLifetimeSeconds,
  fixtureManifest: config.fixtureManifest,
  canonicalConfirmedCase: config.canonicalConfirmedCase,
  alternateCase: config.alternateCase,
  cleanup: {
    cleanupAlwaysRequired: config.lifecycle.cleanupAlwaysRequired,
    cleanupMustSurviveCanaryFailure: config.lifecycle.cleanupMustSurviveCanaryFailure,
    independentCleanupVerificationRequired: config.lifecycle.independentCleanupVerificationRequired,
    allowedBoundedRelations: config.cleanup.allowedBoundedRelations,
    forbiddenDependencyRelations: config.cleanup.forbiddenDependencyRelations,
    zeroResidueRequired: config.cleanup.zeroResidueRequired
  },
  capabilities: config.capabilities,
  effects: config.effects,
  nextGate: config.nextGate
};

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
