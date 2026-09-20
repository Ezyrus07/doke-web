'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(
  fs.readFileSync(path.join(root, 'config', 'ana-001-defense-in-depth-hardening-readiness.json'), 'utf8')
);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute');

if (execute) {
  console.error(
    JSON.stringify(
      {
        contractId: contract.contractId,
        status: 'blocked',
        error: 'ANA_HARDENING_EXECUTION_NOT_AUTHORIZED',
        requiredExplicitAuthorization: contract.requiredExplicitAuthorization,
        stagingMutationAllowed: contract.stagingMutationAllowed,
        migrationAuthorized: contract.migrationAuthorized,
        productionAllowed: contract.productionAllowed
      },
      null,
      2
    )
  );
  process.exit(2);
}

const result = {
  contractId: contract.contractId,
  mode: checkEnv ? 'check_env' : dryRun ? 'dry_run' : 'plan',
  environment: contract.environment,
  projectRef: contract.projectRef,
  status: contract.status,
  productionAllowed: contract.productionAllowed,
  stagingMutationAllowed: contract.stagingMutationAllowed,
  migrationAuthorized: contract.migrationAuthorized,
  genericContinuationAccepted: contract.genericContinuationAccepted,
  requiredExplicitAuthorization: contract.requiredExplicitAuthorization,
  plannedMigration: {
    filePresent: contract.plannedMigration.filePresent,
    path: contract.plannedMigration.path
  },
  plannedChanges: {
    enableRls: contract.plannedChanges.enableRls,
    forceRls: contract.plannedChanges.forceRls,
    createPolicies: contract.plannedChanges.createPolicies,
    preserveExistingGrants: contract.plannedChanges.preserveExistingGrants,
    indexes: contract.plannedChanges.indexes
  },
  preApplyRequiredChecks: [
    'target project ref equals zwkczgewzbsorbrjuzpb',
    'four ANA tables still exist in private schema',
    'four ANA tables still have RLS disabled and FORCE RLS disabled',
    'anon/authenticated direct table grants remain absent',
    'service_role direct table grant remains SELECT only',
    'postgres and service_role retain BYPASSRLS',
    'four canonical ANA functions remain postgres-owned SECURITY DEFINER and executable only by postgres/service_role',
    'three FK covering indexes remain absent',
    'canonical ANA no-shim staging canary evidence remains valid'
  ],
  postApplyRequiredChecks: contract.validationPlan.slice(-1),
  effects: {
    networkRequests: false,
    databaseConnections: false,
    stagingReads: false,
    stagingMutations: false,
    migrationCreated: false,
    migrationApplied: false,
    productionChanges: false
  }
};

console.log(JSON.stringify(result, null, 2));
