#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fixtures = require('../tests/fixtures/com-b02c-staging-migration-authorization-cases.json');
const gate = require('../backend/modules/communities/community-staging-migration-authorization-gate');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildPacket(mutation) {
  if (mutation === 'missing') return null;
  const packet = clone(fixtures.validPacket);
  if (mutation === 'phrase') packet.authorizationPhrase = 'WRONG';
  if (mutation === 'environment') packet.targetEnvironment = 'production';
  if (mutation === 'path') packet.migrationPath = 'supabase/migrations/other.sql';
  if (mutation === 'blob') packet.migrationGitBlobSha = '0'.repeat(40);
  if (mutation === 'production') packet.productionAllowed = true;
  if (mutation === 'consumed') packet.authorizationConsumed = true;
  return packet;
}

let passed = 0;
for (const item of fixtures.cases) {
  const result = gate.evaluateStagingMigrationAuthorization(buildPacket(item.mutation));
  assert.strictEqual(result.decision, item.expectedDecision, item.name);
  assert.strictEqual(result.productionAuthority, false, `${item.name}: production`);
  if (item.expectedDecision === 'blocked_repository_only') {
    assert.strictEqual(result.migrationExecutionAuthority, false, `${item.name}: execution`);
  }
  passed += 1;
}

assert.strictEqual(passed, fixtures.expected.total);
console.log(`COM-B02C authorization conformance passed: ${passed}/${fixtures.expected.total}`);
