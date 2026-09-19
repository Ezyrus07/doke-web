'use strict';

const fs = require('fs');
const path = require('path');
const planner = require('./plan-ana-001-staging-activation');

const root = path.resolve(__dirname, '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'ana-001-staging-activation-readiness.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });

check('contract id', config.contractId === 'ana-001-staging-activation-readiness-v1');
check('repository only', config.scope === 'repository_only');
check('execute unavailable', config.executionModeAvailable === false);
check('production forbidden', config.productionAllowed === false);
check('generic continuation rejected', config.requiredAuthorization.genericContinuationAccepted === false);
check('exact authorization phrase', config.requiredAuthorization.exactPhrase === 'authorize-ana-staging-canary');
check('seven artifacts', config.artifacts.length === 7);
check('five migrations first', config.artifacts.slice(0,5).every((item) => item.kind === 'migration'));
check('two edge functions after migrations', config.artifacts.slice(5).every((item) => item.kind === 'edge_function'));
check('migration chain includes A03 hardening follow-up', config.artifacts[3] && config.artifacts[3].path === 'supabase/migrations/20260919002000_ana_a03_server_event_idempotency_hardening.sql');
check('migration chain includes A05 hardening follow-up', config.artifacts[4] && config.artifacts[4].path === 'supabase/migrations/20260919002100_ana_a05_reconciliation_dimension_hardening.sql');
check('hardening sequence follows base migrations',
  config.activationSequence.indexOf('apply_A03_server_event_idempotency_hardening') > config.activationSequence.indexOf('apply_A05_reconciliation_runtime')
  && config.activationSequence.indexOf('apply_A05_reconciliation_dimension_hardening') > config.activationSequence.indexOf('apply_A03_server_event_idempotency_hardening'));
check('client activation occurs after direct canaries', config.activationSequence.indexOf('enable_analytics_client_only_in_controlled_staging') > config.activationSequence.indexOf('run_order_projection_and_reconciliation_canaries'));
check('destructive rollback forbidden', config.rollback.destructiveSchemaRollbackAllowed === false);
Object.entries(config.prohibitedEffects).forEach(([key,value]) => check('prohibited ' + key, value === false));

const plan = planner.buildPlan({});
check('empty environment blocked', plan.environmentReady === false);
check('dry capability no effects', plan.capabilities.networkRequestsPerformed === 0 && plan.capabilities.migrationsApplied === 0 && plan.capabilities.edgeFunctionsDeployed === 0);
check('all artifact fingerprints match', plan.artifacts.every((artifact) => artifact.fingerprintMatches));

check('package dry run', packageJson.scripts['plan:ana-001-staging-activation:dry-run'] === 'node scripts/plan-ana-001-staging-activation.js --dry-run');
check('package check env', packageJson.scripts['plan:ana-001-staging-activation:check-env'] === 'node scripts/plan-ana-001-staging-activation.js --check-env');

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({
  contractId: config.contractId,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
