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
assert.strictEqual(config.authorization.deployAuthorized, false);
assert.strictEqual(config.authorization.remoteCanaryAuthorized, false);
assert.strictEqual(config.execution.edgeFunctionsDeployed, 0);
assert.strictEqual(config.execution.productionChanged, false);
assert.strictEqual(Object.keys(config.bundle).length, 5);
for (const sha of Object.values(config.bundle)) assert(/^[a-f0-9]{40}$/.test(sha), `Invalid Git blob SHA: ${sha}`);
for (const field of ['tokenVerifiedBeforeFreshness','freshnessVerifiedBeforeRunCreation','nonceConsumedBeforeRunCreation','nonceNotPersistedInRunMetadata','a07bAppliedToStaging','a07cAppliedToStaging','repositoryWiringComplete','deployModeUnavailable','genericContinuationRejected','productionTargetRejected']) assert.strictEqual(config.verified[field], true, `${field} must be true`);
assert(docs.includes(config.authorization.exactPhraseRequired));
assert(workflow.includes('permissions:\n  contents: read'));
for (const forbidden of ['contents: write','supabase functions deploy','apply_migration']) assert(!workflow.includes(forbidden), `Readiness workflow must not include ${forbidden}`);
console.log('ORD-A07D Edge Function staging deploy readiness audit passed.');
