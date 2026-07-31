#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FORBIDDEN_FLAGS = new Set(['--execute', '--apply', '--repair', '--mutate', '--run-canary']);
const args = process.argv.slice(2);
const forbidden = args.find((arg) => FORBIDDEN_FLAGS.has(arg));
if (forbidden) {
  console.error(`SCHED-A07 planner is dry-run only; ${forbidden} is not supported.`);
  process.exit(2);
}

const configPath = path.resolve('config/sched-001-a07-history-canary-readiness.json');
const canaryPath = path.resolve('supabase/tests/020_sched_a07_rolled_back_canaries.sql');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const canary = fs.readFileSync(canaryPath, 'utf8');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const authorizationPresent = process.env.SCHED_A07_AUTHORIZATION === config.authorization.exactPhrase;

const plan = {
  mode: 'dry-run only',
  project: `${config.staging.projectName} (${config.staging.projectRef})`,
  authorizationPresent,
  authorizationRequired: config.authorization.exactPhrase,
  migrationHistory: {
    aligned: config.staging.migrationHistoryAligned,
    commands: config.historyRepair.commands,
    directTableMutationAllowed: config.historyRepair.directSchemaMigrationsTableMutationAllowed,
    schemaMutationExpected: config.historyRepair.schemaMutationExpected
  },
  canary: {
    path: path.relative(process.cwd(), canaryPath).replaceAll('\\', '/'),
    sha256: sha256(canary),
    bytes: Buffer.byteLength(canary),
    finalStatement: config.rolledBackCanaries.finalStatement,
    persistentRowsAllowed: config.rolledBackCanaries.persistentRowsAllowed,
    tests: config.rolledBackCanaries.tests
  },
  stillBlocked: config.authorization.stillBlockedAfterExactPhrase,
  executeModeAvailable: false
};

console.log(JSON.stringify(plan, null, 2));
