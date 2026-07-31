#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  root: 'backend/modules/scheduling/scheduling-composition-root.js',
  repository: 'backend/modules/scheduling/scheduling-postgres-repository.js',
  service: 'backend/modules/scheduling/scheduling-service.js',
  config: 'config/sched-001-b02-composition-root-readiness.json',
  docs: 'docs/SCHED-001-B02-COMPOSITION-ROOT-READINESS.md',
  evidence: 'docs/validation/SCHED-001-B02-COMPOSITION-ROOT-READINESS.json',
  test: 'scripts/test-sched-001-b02-composition-root-runtime.js',
  workflow: '.github/workflows/sched-001-b02-composition-root-readiness.yml'
});

Object.values(PATHS).forEach((path) => {
  assert(fs.existsSync(path), `Missing SCHED-B02A asset: ${path}`);
});

const root = fs.readFileSync(PATHS.root, 'utf8');
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const test = fs.readFileSync(PATHS.test, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');
const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));

assert.strictEqual(config.contractVersion, 'sched-b02-composition-root-readiness-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_only_trusted_composition_root_readiness');
assert.strictEqual(config.environment, 'doke-web-staging');
assert.strictEqual(config.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.activation.defaultState, 'disabled');
assert.strictEqual(config.activation.failClosed, true);
assert.strictEqual(config.activation.productionBlocked, true);
assert.strictEqual(config.composition.poolMustBeInjected, true);
assert.strictEqual(config.composition.connectionStringParsingAllowed, false);
assert.strictEqual(config.composition.serviceRoleKeyHandlingAllowed, false);
assert.strictEqual(config.capabilities.repositoryRuntimeImplemented, true);
assert.strictEqual(config.capabilities.stagingRuntimeActivated, false);
assert.strictEqual(config.capabilities.authenticatedCanaryExecuted, false);
assert.strictEqual(config.capabilities.productionActivationAvailable, false);
assert.deepStrictEqual(config.blockers.closed, []);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B04']);
assert.deepStrictEqual(evidence.blockers.remainingOpen, config.blockers.remainingOpen);
assert.strictEqual(evidence.mutations.database, 0);
assert.strictEqual(evidence.mutations.stagingRuntime, 0);
assert.strictEqual(evidence.mutations.production, 0);
assert.strictEqual(evidence.mutations.deployment, 0);

[
  "const ACTIVATION_FLAG = 'DOKE_SCHEDULING_RUNTIME_ENABLED'",
  "const ENVIRONMENT_FLAG = 'DOKE_RUNTIME_ENVIRONMENT'",
  "const PROJECT_REF_FLAG = 'SUPABASE_PROJECT_REF'",
  "const STAGING_PROJECT_REF = 'zwkczgewzbsorbrjuzpb'",
  "rawFlag !== 'true'",
  "environment !== STAGING_ENVIRONMENT",
  "projectRef !== STAGING_PROJECT_REF",
  "nodeEnvironment === 'production'",
  "typeof pool.connect !== 'function'",
  "isolationLevel: config.isolationLevel || 'serializable'",
  'createSchedulingPostgresRepository',
  'createSchedulingService',
  'DOKE_SCHEDULE_RUNTIME_DISABLED'
].forEach((fragment) => assert(root.includes(fragment), `Composition root missing ${fragment}`));

[
  'DOKE_SCHEDULING_RUNTIME_ENABLED=true',
  'DOKE_RUNTIME_ENVIRONMENT=staging',
  'SUPABASE_PROJECT_REF=zwkczgewzbsorbrjuzpb',
  'SCHED-B02 permanece aberto',
  'SCHED-B04 permanece aberto',
  'SCHED-B02B — authenticated staging composition canary',
  'nenhuma mutação de staging',
  'nenhuma alteração de produção'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

[
  'activation_flag_disabled',
  'production_environment_blocked',
  'staging_project_ref_mismatch',
  'DOKE_SCHEDULE_COMPOSITION_SERVICE_INVALID',
  'SCHED-B02 fail-closed scheduling composition root runtime tests passed.'
].forEach((fragment) => assert(test.includes(fragment), `Runtime test missing ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-b02-composition-root-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-b02-composition-root-runtime.js'));
assert(workflow.includes('node scripts/audit-sched-001-a05-persistence-readiness.js'));
assert(workflow.includes('node scripts/audit-domain-completion-matrix.js'));

const forbidden = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_SECRET_KEY',
  'DATABASE_URL',
  'createClient(',
  'supabase functions deploy',
  'supabase db push',
  'supabase migration repair',
  'git push',
  'contents: write'
];
forbidden.forEach((fragment) => {
  assert(!root.includes(fragment), `Composition root contains forbidden fragment ${fragment}`);
  assert(!workflow.includes(fragment), `Workflow contains forbidden fragment ${fragment}`);
});

console.log('SCHED-B02 trusted composition root readiness audit passed.');
