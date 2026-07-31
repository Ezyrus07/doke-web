'use strict';

const assert = require('assert');
const fs = require('fs');

const configPath = 'config/ord-001-a07d-edge-function-staging-deploy-readiness.json';
const docsPath = 'docs/ORD-001-A07D-EDGE-FUNCTION-STAGING-DEPLOY-READINESS.md';
const workflowPath = '.github/workflows/ord-001-a07d-edge-function-staging-deploy-readiness.yml';

for (const path of [configPath, docsPath, workflowPath]) assert(fs.existsSync(path), `Missing readiness asset: ${path}`);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const docs = fs.readFileSync(docsPath, 'utf8');
const workflow = fs.readFileSync(workflowPath, 'utf8');

assert.strictEqual(config.status, 'edge_function_staging_deploy_readiness_complete_deploy_unauthorized');
assert.strictEqual(config.target.environment, 'staging');
assert.strictEqual(config.target.productionAllowed, false);
assert.strictEqual(config.target.currentlyDeployedVersion, 9);
assert.strictEqual(config.target.currentlyDeployedStatus, 'ACTIVE');
assert.strictEqual(config.target.currentlyDeployedVerifyJwt, false);
assert(/^[a-f0-9]{64}$/.test(config.target.currentlyDeployedBundleSha256));
assert.strictEqual(config.runtime.entrypointPath, 'index.ts');
assert.strictEqual(config.runtime.importMapPath, 'deno.json');
assert.strictEqual(config.runtime.verifyJwtRequiredValue, false);
assert.strictEqual(config.runtime.supabaseJsImport, 'npm:@supabase/supabase-js@2.110.0');
assert.strictEqual(config.authorization.deployAuthorized, false);
assert.strictEqual(config.authorization.remoteCanaryAuthorized, false);
assert.strictEqual(config.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(config.execution.productionChanged, false);
assert.strictEqual(Object.keys(config.bundle).length, 6);
for (const [path, sha] of Object.entries(config.bundle)) {
  assert(fs.existsSync(path), `Frozen bundle file missing: ${path}`);
  assert(/^[a-f0-9]{40}$/.test(sha), `Invalid Git blob SHA: ${sha}`);
}
for (const field of [
  'tokenVerifiedBeforeFreshness',
  'freshnessVerifiedBeforeRunCreation',
  'nonceConsumedBeforeRunCreation',
  'nonceNotPersistedInRunMetadata',
  'a07bAppliedToStaging',
  'a07cAppliedToStaging',
  'repositoryWiringComplete',
  'deployModeUnavailable',
  'genericContinuationRejected',
  'productionTargetRejected',
  'deployedVersionReadOnlyInspected',
  'verifyJwtFalseLocked',
  'importMapFrozen'
]) assert.strictEqual(config.verified[field], true, `${field} must be true`);
for (const fragment of [
  config.authorization.exactPhraseRequired,
  'deployed version: `9`',
  '`verify_jwt`: `false`',
  'npm:@supabase/supabase-js@2.110.0',
  'six frozen `order-event-worker` files'
]) assert(docs.includes(fragment), `Readiness documentation missing: ${fragment}`);
assert(workflow.includes('permissions:\n  contents: read'));
for (const forbidden of ['contents: write','supabase functions deploy','deploy_edge_function','apply_migration']) assert(!workflow.includes(forbidden), `Readiness workflow must not include ${forbidden}`);
console.log('ORD-A07D Edge Function staging deploy readiness audit passed.');
