#!/usr/bin/env node
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const CONFIG_PATH = 'config/sched-001-a05-persistence-readiness.json';
const EXECUTE_FLAGS = new Set(['--execute', '--apply', '--apply-migration', '--mutate']);
const args = new Set(process.argv.slice(2));

for (const flag of EXECUTE_FLAGS) {
  if (args.has(flag)) {
    console.error(`SCHED-A05 is dry-run only; ${flag} is forbidden.`);
    process.exit(2);
  }
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const migrations = config.migrations.map((item) => {
  const source = fs.readFileSync(item.path);
  return {
    ...item,
    sha256: crypto.createHash('sha256').update(source).digest('hex'),
    bytes: source.length
  };
});

const output = {
  mode: args.has('--check-env') ? 'check-env' : 'dry-run',
  target: 'doke-web-staging',
  projectRef: config.stagingPreflight.projectRef,
  authorizationRequired: config.authorization.exactPhrase,
  authorizationPresent: process.env.DOKE_SCHED_STAGING_AUTHORIZATION === config.authorization.exactPhrase,
  executeModeAvailable: false,
  migrations,
  requiredOrder: config.compatibilityGate.requiredOrder,
  preflight: config.stagingPreflight,
  postApplicationAssertions: config.postApplicationAssertions,
  rollback: config.rollback,
  nextActions: config.orderedNextActions
};

console.log(JSON.stringify(output, null, 2));
