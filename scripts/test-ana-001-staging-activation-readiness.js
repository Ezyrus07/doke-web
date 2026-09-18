'use strict';

const planner = require('./plan-ana-001-staging-activation');
const config = planner.readConfig();
const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });

function readyEnvironment() {
  const env = {
    DOKE_ENVIRONMENT:'staging',
    DOKE_ANA_TARGET_MARKER:'staging',
    DOKE_ANA_STAGING_AUTHORIZATION:'authorize-ana-staging-canary'
  };
  config.requiredRuntimeEnvironmentNames.forEach((name) => { env[name] = 'synthetic-present'; });
  return env;
}

check('default mode dry-run', planner.resolveMode([]) === 'dry-run');
check('explicit check env', planner.resolveMode(['--check-env']) === 'check-env');

try {
  planner.resolveMode(['--execute']);
  check('execute rejected', false);
} catch (error) {
  check('execute rejected', error.code === 'DOKE_ANA_STAGING_EXECUTION_NOT_AVAILABLE');
}

try {
  planner.resolveMode(['--dry-run','--check-env']);
  check('ambiguous mode rejected', false);
} catch (error) {
  check('ambiguous mode rejected', error.code === 'DOKE_ANA_STAGING_MODE_AMBIGUOUS');
}

const ready = planner.buildPlan(readyEnvironment());
check('ready synthetic environment passes contract', ready.environmentReady === true);
check('ready still cannot execute', ready.capabilities.executeModeAvailable === false);
check('ready performs no network', ready.capabilities.networkRequestsPerformed === 0);
check('ready applies no migrations', ready.capabilities.migrationsApplied === 0);

const noAuth = readyEnvironment();
delete noAuth.DOKE_ANA_STAGING_AUTHORIZATION;
check('missing auth blocked', planner.buildPlan(noAuth).blockers.includes('DOKE_ANA_STAGING_AUTHORIZATION'));

const production = readyEnvironment();
production.DOKE_ENVIRONMENT = 'production';
production.DOKE_ANA_TARGET_MARKER = 'production';
const productionPlan = planner.buildPlan(production);
check('production blocked', productionPlan.environmentReady === false && productionPlan.blockers.includes('production_target_forbidden'));

const missingSecret = readyEnvironment();
delete missingSecret.DOKE_ANALYTICS_SESSION_SECRET;
check('missing runtime env blocked', planner.buildPlan(missingSecret).blockers.includes('DOKE_ANALYTICS_SESSION_SECRET'));

const alteredConfig = readyEnvironment();
alteredConfig.DOKE_ANA_TARGET_MARKER = 'customer';
check('unmarked target blocked', planner.buildPlan(alteredConfig).blockers.includes('DOKE_ANA_TARGET_MARKER_staging_marker_required'));

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({
  contractId: config.contractId,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks
}, null, 2));
if (failedChecks.length) process.exitCode = 1;
