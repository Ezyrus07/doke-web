'use strict';

const crypto = require('crypto');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a07b-staging-migration-readiness.json';

function deepFreeze(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(deepFreeze));
  if (!value || typeof value !== 'object') return value;
  return Object.freeze(Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, deepFreeze(nested)])
  ));
}

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function sha256File(path) {
  return crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

function resolveMode(argv = []) {
  if (argv.includes('--execute')) {
    const error = new Error('ORD-A07B staging migration execution is not available from the readiness planner.');
    error.code = 'DOKE_ORD_A07B_STAGING_MIGRATION_EXECUTION_NOT_AVAILABLE';
    error.status = 428;
    throw error;
  }

  const supported = argv.filter((argument) => argument.startsWith('--'));
  const unknown = supported.filter((argument) => !['--dry-run', '--check-env'].includes(argument));
  if (unknown.length > 0) {
    const error = new Error(`Unknown ORD-A07B readiness option: ${unknown.join(', ')}`);
    error.code = 'DOKE_ORD_A07B_STAGING_MIGRATION_OPTION_INVALID';
    error.status = 400;
    throw error;
  }

  if (argv.includes('--dry-run') && argv.includes('--check-env')) {
    const error = new Error('Select only one ORD-A07B readiness mode.');
    error.code = 'DOKE_ORD_A07B_STAGING_MIGRATION_MODE_AMBIGUOUS';
    error.status = 400;
    throw error;
  }

  return argv.includes('--check-env') ? 'check-env' : 'dry-run';
}

function buildReadinessPlan(options = {}) {
  const env = options.env || process.env;
  const config = readConfig();
  const actualSha256 = sha256File(config.migration.path);
  const migrationHashMatches = actualSha256 === config.migration.sha256;
  const targetIsStaging = env.DOKE_ORD_A07B_TARGET_ENV === 'staging';
  const suppliedHashMatches = env.DOKE_ORD_A07B_MIGRATION_SHA256 === config.migration.sha256;
  const authorizationMatches =
    env.DOKE_ORD_A07B_MIGRATION_AUTHORIZATION === config.authorization.exactPhrase;
  const productionBlocked =
    env.DOKE_ORD_A07B_TARGET_ENV !== 'production'
    && env.DOKE_ENV !== 'production'
    && env.NODE_ENV !== 'production';

  const environmentReady =
    migrationHashMatches
    && targetIsStaging
    && suppliedHashMatches
    && authorizationMatches
    && productionBlocked;

  const blockers = [];
  if (!migrationHashMatches) blockers.push('canonical_migration_sha256_mismatch');
  if (!targetIsStaging) blockers.push('staging_target_required');
  if (!suppliedHashMatches) blockers.push('operator_supplied_migration_sha256_required');
  if (!authorizationMatches) blockers.push('exact_staging_migration_authorization_required');
  if (!productionBlocked) blockers.push('production_target_prohibited');

  return deepFreeze({
    status: environmentReady
      ? 'staging_migration_environment_ready_execution_still_unavailable'
      : 'staging_migration_application_unauthorized',
    migration: {
      path: config.migration.path,
      expectedSha256: config.migration.sha256,
      actualSha256,
      hashMatches: migrationHashMatches
    },
    stagingPreflight: config.stagingPreflight,
    checks: {
      targetIsStaging,
      suppliedHashMatches,
      authorizationMatches,
      productionBlocked,
      environmentReady
    },
    authorization: {
      exactPhraseRequired: true,
      genericCommandsAccepted: false,
      scopeAfterAuthorization: config.authorization.authorizedScopeAfterExactPhrase,
      stillBlocked: config.authorization.stillBlockedAfterExactPhrase
    },
    rollback: config.rollback,
    capabilities: {
      dryRunAvailable: true,
      checkEnvAvailable: true,
      executeModeAvailable: false,
      networkRequestsPerformed: 0,
      databaseMutationsPerformed: 0,
      migrationsApplied: 0,
      edgeFunctionsDeployed: 0,
      productionChanged: false
    },
    blockers
  });
}

function main(argv = process.argv.slice(2)) {
  const mode = resolveMode(argv);
  const plan = buildReadinessPlan();
  process.stdout.write(`${JSON.stringify({ mode, ...plan }, null, 2)}\n`);
  if (mode === 'check-env' && !plan.checks.environmentReady) {
    process.exitCode = 2;
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${JSON.stringify({
      error: error.code || 'DOKE_ORD_A07B_STAGING_MIGRATION_READINESS_FAILED',
      status: error.status || 500,
      message: error.message
    })}\n`);
    process.exitCode = 1;
  }
}

module.exports = {
  CONFIG_PATH,
  buildReadinessPlan,
  deepFreeze,
  main,
  readConfig,
  resolveMode,
  sha256File
};
