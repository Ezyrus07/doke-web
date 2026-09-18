#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');

const CONFIG_PATH = 'config/ana-001-staging-activation-readiness.json';

function readConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}

function gitBlobSha(path) {
  const content = fs.readFileSync(path);
  const header = Buffer.from('blob ' + content.length + '\0', 'utf8');
  return crypto.createHash('sha1').update(Buffer.concat([header, content])).digest('hex');
}

function resolveMode(argv) {
  const args = Array.isArray(argv) ? argv : [];
  if (args.includes('--execute')) {
    const error = new Error('ANA staging activation execution is intentionally unavailable from this planner.');
    error.code = 'DOKE_ANA_STAGING_EXECUTION_NOT_AVAILABLE';
    error.status = 428;
    throw error;
  }
  const flags = args.filter((value) => String(value).startsWith('--'));
  const unknown = flags.filter((value) => !['--dry-run','--check-env'].includes(value));
  if (unknown.length) {
    const error = new Error('Unknown ANA staging readiness option: ' + unknown.join(', '));
    error.code = 'DOKE_ANA_STAGING_OPTION_INVALID';
    error.status = 400;
    throw error;
  }
  if (args.includes('--dry-run') && args.includes('--check-env')) {
    const error = new Error('Select only one ANA staging readiness mode.');
    error.code = 'DOKE_ANA_STAGING_MODE_AMBIGUOUS';
    error.status = 400;
    throw error;
  }
  return args.includes('--check-env') ? 'check-env' : 'dry-run';
}

function artifactStatus(config) {
  return config.artifacts.map((artifact) => {
    const exists = fs.existsSync(artifact.path);
    const actualBlobSha = exists ? gitBlobSha(artifact.path) : null;
    return Object.freeze({
      ...artifact,
      exists,
      actualBlobSha,
      fingerprintMatches: exists && actualBlobSha === artifact.repositoryBlobSha
    });
  });
}

function targetLooksSafe(env, config) {
  const environment = String(env.DOKE_ENVIRONMENT || '').trim().toLowerCase();
  const marker = String(env.DOKE_ANA_TARGET_MARKER || '').trim().toLowerCase();
  const productionLike = config.targetPolicy.productionMarkersForbidden.some((value) =>
    environment.includes(value) || marker.includes(value)
  );
  const markerAllowed = config.targetPolicy.allowedMarkers.some((value) => marker.includes(value));
  return Object.freeze({
    environment,
    marker,
    environmentIsStaging: environment === config.targetPolicy.requiredEnvironment,
    markerAllowed,
    productionBlocked: !productionLike
  });
}

function buildPlan(env) {
  const source = env || process.env;
  const config = readConfig();
  const artifacts = artifactStatus(config);
  const target = targetLooksSafe(source, config);
  const authorizationMatches =
    String(source[config.requiredAuthorization.environmentVariable] || '') === config.requiredAuthorization.exactPhrase;
  const runtimeEnvironment = Object.freeze(Object.fromEntries(
    config.requiredRuntimeEnvironmentNames.map((name) => [name, Boolean(source[name])])
  ));
  const allRuntimeEnvironmentPresent = Object.values(runtimeEnvironment).every(Boolean);
  const fingerprintsMatch = artifacts.every((artifact) => artifact.fingerprintMatches);
  const environmentReady =
    fingerprintsMatch
    && target.environmentIsStaging
    && target.markerAllowed
    && target.productionBlocked
    && authorizationMatches
    && allRuntimeEnvironmentPresent;

  const blockers = [];
  if (!fingerprintsMatch) blockers.push('repository_artifact_fingerprint_mismatch');
  if (!target.environmentIsStaging) blockers.push('DOKE_ENVIRONMENT_staging_required');
  if (!target.markerAllowed) blockers.push('DOKE_ANA_TARGET_MARKER_staging_marker_required');
  if (!target.productionBlocked) blockers.push('production_target_forbidden');
  if (!authorizationMatches) blockers.push(config.requiredAuthorization.environmentVariable);
  for (const [name, present] of Object.entries(runtimeEnvironment)) {
    if (!present) blockers.push(name);
  }

  return Object.freeze({
    contractId: config.contractId,
    status: environmentReady
      ? 'staging_environment_ready_execution_still_unavailable'
      : 'staging_activation_not_authorized',
    artifacts,
    target,
    authorization: {
      exactPhraseRequired: true,
      genericContinuationAccepted: false,
      authorizationMatches
    },
    runtimeEnvironment,
    activationSequence: config.activationSequence,
    syntheticCanaryRequirements: config.syntheticCanaryRequirements,
    rollback: config.rollback,
    capabilities: {
      dryRunAvailable: true,
      checkEnvAvailable: true,
      executeModeAvailable: false,
      networkRequestsPerformed: 0,
      databaseConnectionsPerformed: 0,
      migrationsApplied: 0,
      edgeFunctionsDeployed: 0,
      stagingMutationsPerformed: 0,
      productionMutationsPerformed: 0,
      secretsRead: false,
      secretsWritten: false
    },
    environmentReady,
    blockers
  });
}

function main(argv) {
  const mode = resolveMode(argv || process.argv.slice(2));
  const plan = buildPlan(process.env);
  process.stdout.write(JSON.stringify({ mode, ...plan }, null, 2) + '\n');
  if (mode === 'check-env' && !plan.environmentReady) process.exitCode = 2;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(JSON.stringify({
      error: error.code || 'DOKE_ANA_STAGING_READINESS_FAILED',
      status: error.status || 500,
      message: error.message
    }) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  CONFIG_PATH,
  readConfig,
  gitBlobSha,
  resolveMode,
  artifactStatus,
  targetLooksSafe,
  buildPlan,
  main
});
