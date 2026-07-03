'use strict';

/**
 * Supabase local/staging execution gate for the first real backend validation.
 *
 * This contract stays framework-neutral. The CLI runner consumes it to print or
 * execute the exact sequence that must pass before any frontend API canary.
 */

const SUPABASE_EXECUTION_ENVIRONMENT = Object.freeze({
  dbUrl: 'SUPABASE_DB_URL',
  stagingApiUrl: 'DOKE_STAGING_API_URL',
  allowMutations: 'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
  stagingAllowMutations: 'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  reportPath: 'DOKE_SUPABASE_VALIDATION_REPORT'
});

const REQUIRED_MIGRATIONS = Object.freeze([
  'supabase/migrations/001_identity_profiles.sql',
  'supabase/migrations/002_marketplace_core.sql',
  'supabase/migrations/003_communication_finance_community.sql',
  'supabase/migrations/004_mvp_backend_security_foundation.sql',
  'supabase/migrations/005_wallet_runtime_foundation.sql',
  'supabase/migrations/006_runtime_idempotency_audit_foundation.sql'
]);

const REQUIRED_SEEDS = Object.freeze([
  'supabase/seed/001_seed_reference_data.sql',
  'supabase/seed/002_mvp_controlled_seed.sql'
]);

const REQUIRED_SQL_TESTS = Object.freeze([
  'supabase/tests/001_rls_matrix_validation.sql',
  'supabase/tests/002_idempotency_and_audit_validation.sql',
  'supabase/tests/003_policy_negative_cases.sql',
  'supabase/tests/004_runtime_e2e_postconditions.sql',
  'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
]);

const STATIC_GATE_COMMANDS = Object.freeze([
  command('audit:supabase-backend-readiness', 'npm', ['run', 'audit:supabase-backend-readiness'], 'backend_contracts'),
  command('audit:api-endpoint-readiness', 'npm', ['run', 'audit:api-endpoint-readiness'], 'backend_contracts'),
  command('audit:runtime-idempotency-audit', 'npm', ['run', 'audit:runtime-idempotency-audit'], 'runtime_contracts'),
  command('audit:staging-e2e-validation', 'npm', ['run', 'audit:staging-e2e-validation'], 'runtime_contracts'),
  command('validate:staging-e2e:dry-run', 'npm', ['run', 'validate:staging-e2e:dry-run'], 'runtime_contracts')
]);

const SQL_PREFLIGHT_TESTS = Object.freeze(REQUIRED_SQL_TESTS.slice(0, 3));
const SQL_POSTCONDITION_TESTS = Object.freeze(REQUIRED_SQL_TESTS.slice(3));

const RELEASE_GATES = Object.freeze([
  gate('migrations_apply_cleanly', 'Migrations 001 through 006 apply without disabling RLS.'),
  gate('seeds_create_expected_identities', 'Seeds create client, professional, support and admin identities for staging validation.'),
  gate('rls_negative_cases_pass', 'SQL tests 001 through 003 pass with real RLS enabled.'),
  gate('runtime_e2e_passes', 'validate:staging-e2e passes with real staging tokens and explicit mutation consent.'),
  gate('idempotency_replay_persists', 'SQL test 005 proves response_body replay and request_hash persistence.'),
  gate('audit_events_persist', 'Critical support/finance actions write admin_audit_events.'),
  gate('frontend_provider_stays_mock', 'authProvider/dataProvider stay mock until this gate is explicitly signed off.')
]);

function command(name, bin, args, group, options) {
  return Object.freeze(Object.assign({
    name,
    bin,
    args: Object.freeze(args.slice()),
    group,
    required: true
  }, options || {}));
}

function gate(name, description) {
  return Object.freeze({ name, description });
}

function psqlCommand(name, file, group) {
  return command(name, 'psql', ['${SUPABASE_DB_URL}', '-v', 'ON_ERROR_STOP=1', '-f', file], group, { file });
}

function buildExecutionPlan(options) {
  const opts = options || {};
  const includeLocalReset = Boolean(opts.includeLocalReset);
  const commands = [];

  if (includeLocalReset) {
    commands.push(command('supabase.start', 'supabase', ['start'], 'local_supabase'));
    commands.push(command('supabase.db.reset', 'supabase', ['db', 'reset'], 'local_supabase'));
  }

  STATIC_GATE_COMMANDS.forEach((entry) => commands.push(entry));
  SQL_PREFLIGHT_TESTS.forEach((file, index) => {
    commands.push(psqlCommand(`sql.preflight.${index + 1}`, file, 'sql_preflight'));
  });
  commands.push(command('validate:staging-e2e', 'npm', ['run', 'validate:staging-e2e'], 'runtime_e2e', {
    requiresEnvironment: Object.freeze([
      SUPABASE_EXECUTION_ENVIRONMENT.stagingApiUrl,
      SUPABASE_EXECUTION_ENVIRONMENT.stagingAllowMutations
    ])
  }));
  SQL_POSTCONDITION_TESTS.forEach((file, index) => {
    commands.push(psqlCommand(`sql.postcondition.${index + 1}`, file, 'sql_postconditions'));
  });

  return Object.freeze(commands);
}

function listRequiredFiles() {
  return Object.freeze([
    ...REQUIRED_MIGRATIONS,
    ...REQUIRED_SEEDS,
    ...REQUIRED_SQL_TESTS,
    'scripts/validate-staging-e2e.js',
    'backend/shared/testing/staging-e2e-scenarios.js'
  ]);
}

module.exports = Object.freeze({
  SUPABASE_EXECUTION_ENVIRONMENT,
  REQUIRED_MIGRATIONS,
  REQUIRED_SEEDS,
  REQUIRED_SQL_TESTS,
  SQL_PREFLIGHT_TESTS,
  SQL_POSTCONDITION_TESTS,
  STATIC_GATE_COMMANDS,
  RELEASE_GATES,
  buildExecutionPlan,
  listRequiredFiles
});
