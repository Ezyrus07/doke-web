#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = {
  module: 'backend/modules/communities/community-server-authority-contract.js',
  config: 'config/com-b02-server-authority-contract.json',
  docs: 'docs/COM-B02-SERVER-AUTHORITY-CONTRACT.md',
  audit: 'scripts/audit-com-b02-server-authority-contract.js',
  test: 'scripts/test-com-b02-server-authority-contract.js',
  workflow: '.github/workflows/com-b02-server-authority-contract.yml'
};

let checks = 0;
function check(value, message) { checks += 1; assert.ok(value, message); }
function equal(actual, expected, message) { checks += 1; assert.strictEqual(actual, expected, message); }
function text(key) { return fs.readFileSync(path.join(root, files[key]), 'utf8'); }

for (const [key, rel] of Object.entries(files)) {
  check(fs.existsSync(path.join(root, rel)), `${key} exists`);
  check(fs.statSync(path.join(root, rel)).size > 20, `${key} nonempty`);
}

const source = text('module');
const config = JSON.parse(text('config'));
const docs = text('docs');
const workflow = text('workflow');

check(source.includes("const CONTRACT_ID = 'com-b02-server-authority-contract-v1'"), 'contract id');
for (const fn of ['validateAuthenticatedCaller','validateCommandEnvelope','evaluateDiscoveryAccess','evaluateMembershipTransition','evaluateRoleTransition','createRepositoryPort']) {
  check(source.includes(`function ${fn}`), `function ${fn}`);
}
for (const phrase of ['SERVER_VERIFIED_SESSION_REQUIRED','CLIENT_ACTOR_OVERRIDE_PROHIBITED','ACTIVE_BAN_BLOCKS_MEMBERSHIP','OWNER_TRANSFER_REQUIRED','SELF_OWNER_ELEVATION_PROHIBITED']) {
  check(source.includes(phrase), `guard ${phrase}`);
}
for (const forbidden of ['fetch(', 'axios', 'process.env', 'createClient(', 'service_role', 'SUPABASE_URL', 'SUPABASE_KEY', 'localStorage', 'sessionStorage']) {
  check(!source.includes(forbidden), `forbidden ${forbidden}`);
}

equal(config.contractId, 'com-b02-server-authority-contract-v1', 'config contract');
equal(config.scope, 'repository_only', 'scope');
equal(config.runtimeIntegrated, false, 'runtime false');
equal(config.migrationPrepared, false, 'migration not prepared');
equal(config.migrationApplied, false, 'migration not applied');
equal(config.stagingValidated, false, 'staging false');
equal(config.callerAuthority.source, 'server_verified_session', 'caller source');
equal(config.callerAuthority.clientActorOverrideAllowed, false, 'actor override false');
equal(config.repositoryPort.kind, 'supabase_server_repository_port', 'repository port');
equal(config.repositoryPort.directClientSupabaseAccessAllowed, false, 'client Supabase false');
for (const value of Object.values(config.operationalGates || {})) equal(value, false, 'gate false');
for (const [key, value] of Object.entries(config.authority)) {
  if (!['contractAuthority','serverBoundaryAuthority','repositoryPortAuthority'].includes(key)) equal(value, false, `${key} false`);
}
for (const value of Object.values(config.prohibitedEffects)) equal(value, false, 'prohibited effect false');
check(config.nextSublot.startsWith('COM-B02B '), 'next sublot');

for (const phrase of ['server_verified_session','Supabase-backed','sem conexão','client authority','COM-B02B']) {
  check(docs.includes(phrase), `docs ${phrase}`);
}
check(workflow.includes('permissions:\n  contents: read'), 'read only');
check(workflow.includes('node scripts/audit-com-b02-server-authority-contract.js'), 'audit step');
check(workflow.includes('node scripts/test-com-b02-server-authority-contract.js'), 'test step');
check(workflow.includes('COM-B01 predecessor regression'), 'B01 regression');
check(workflow.includes('COM-A05 regression'), 'A05 regression');
check(workflow.includes('git diff --check'), 'diff hygiene');
check(!workflow.includes('secrets.'), 'no secrets');
check(!workflow.includes('supabase db'), 'no Supabase command');

console.log(`COM-B02 audit passed: ${checks}/${checks}`);
