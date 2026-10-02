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
  console.error(JSON.stringify({
    contractId: contract.contractId,
    status: 'blocked',
    error: contract.migrationAuthorized
      ? 'ANA_HARDENING_EXECUTION_REQUIRES_APPROVED_MIGRATION_EXECUTOR'
      : 'ANA_HARDENING_EXECUTION_NOT_AUTHORIZED',
    requiredExplicitAuthorization: contract.requiredExplicitAuthorization,
    stagingMutationAllowed: contract.stagingMutationAllowed,
    migrationAuthorized: contract.migrationAuthorized,
    productionAllowed: contract.productionAllowed
  }, null, 2));
  process.exit(2);
}

console.log(JSON.stringify({
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
  authorization: contract.authorization,
  plannedMigration: contract.plannedMigration,
  plannedChanges: {
    enableRls: contract.plannedChanges.enableRls,
    forceRls: contract.plannedChanges.forceRls,
    createPolicies: contract.plannedChanges.createPolicies,
    preserveExistingGrants: contract.plannedChanges.preserveExistingGrants,
    indexes: contract.plannedChanges.indexes
  },
  executionBoundary: 'DDL is applied only through the approved staging migration executor; this planner never connects to a database.',
  effects: {
    networkRequests: false,
    databaseConnections: false,
    stagingReads: false,
    stagingMutations: false,
    migrationApplied: false,
    productionChanges: false
  }
}, null, 2));
