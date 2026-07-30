'use strict';

const crypto = require('crypto');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a07c-staging-migration-readiness.json';
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const migration = fs.readFileSync(config.migration.path);
const actualSha256 = crypto.createHash('sha256').update(migration).digest('hex');
const args = new Set(process.argv.slice(2));

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function buildBasePlan() {
  if (actualSha256 !== config.migration.sha256) {
    const error = new Error('ORD-A07C migration SHA-256 does not match the canonical readiness contract.');
    error.code = 'DOKE_ORD_A07C_MIGRATION_HASH_MISMATCH';
    throw error;
  }

  return {
    domain: config.domain,
    sublot: config.sublot,
    target: 'staging',
    migration: {
      path: config.migration.path,
      sha256: actualSha256,
      functionOnly: config.migration.changesOnlyFunction,
      changesCronSchedule: false,
    },
    authorization: {
      exactPhraseRequired: config.authorization.exactPhrase,
      applicationAuthorized: false,
      edgeFunctionDeployAuthorized: false,
      remoteCanaryAuthorized: false,
      productionAuthorized: false,
    },
    preservedBehavior: config.preservedBehavior,
    postApplicationAssertions: config.postApplicationAssertions,
    execution: {
      mode: 'planning_only',
      networkRequestsPerformed: 0,
      databaseMutationsPerformed: 0,
      migrationsApplied: 0,
      cronJobsChanged: 0,
      edgeFunctionsDeployed: 0,
      productionChanged: false,
    },
  };
}

function checkEnvironment(plan) {
  const target = String(process.env.DOKE_TARGET_ENVIRONMENT || '');
  const phrase = String(process.env.DOKE_ORD_A07C_AUTHORIZATION || '');
  const sha256 = String(process.env.DOKE_ORD_A07C_MIGRATION_SHA256 || '');

  if (target === 'production') {
    const error = new Error('Production target is prohibited for ORD-A07C.');
    error.code = 'DOKE_ORD_A07C_PRODUCTION_TARGET_PROHIBITED';
    throw error;
  }

  const recognized = target === 'staging'
    && phrase === config.authorization.exactPhrase
    && sha256 === config.migration.sha256;

  return {
    ...plan,
    authorization: {
      ...plan.authorization,
      applicationAuthorized: recognized,
      environmentRecognized: target === 'staging',
      phraseRecognized: phrase === config.authorization.exactPhrase,
      migrationHashRecognized: sha256 === config.migration.sha256,
    },
    execution: {
      ...plan.execution,
      mode: 'check_env_only',
    },
  };
}

if (args.has('--execute') || args.has('--apply') || args.has('--deploy')) {
  const error = new Error('ORD-A07C execution is intentionally unavailable in this planner.');
  error.code = 'DOKE_ORD_A07C_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE';
  throw error;
}

if (!args.has('--dry-run') && !args.has('--check-env')) {
  const error = new Error('Use --dry-run or --check-env. There is no execute mode.');
  error.code = 'DOKE_ORD_A07C_PLANNING_MODE_REQUIRED';
  throw error;
}

const plan = buildBasePlan();
const result = args.has('--check-env') ? checkEnvironment(plan) : plan;
process.stdout.write(`${JSON.stringify(deepFreeze(result), null, 2)}\n`);
