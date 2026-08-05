'use strict';

const CONTRACT_ID = 'com-b02c-staging-migration-application-authorization-v1';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING';
const REQUIRED_MIGRATION_PATH = 'supabase/migrations/20260805121500_com_b02b_server_authority.sql';
const REQUIRED_MIGRATION_GIT_BLOB_SHA = 'fd74f6abc029023c4e0972b32b35daca975c3d57';

function blocked(reason) {
  return Object.freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    singleExecutionAuthorization: false,
    migrationExecutionAuthority: false,
    stagingAuthority: false,
    productionAuthority: false
  });
}

function evaluateStagingMigrationAuthorization(input) {
  if (!input || typeof input !== 'object') return blocked('AUTHORIZATION_PACKET_REQUIRED');
  if (input.authorizationPhrase !== REQUIRED_AUTHORIZATION_PHRASE) return blocked('EXPLICIT_AUTHORIZATION_PHRASE_REQUIRED');
  if (input.targetEnvironment !== 'staging') return blocked('STAGING_TARGET_REQUIRED');
  if (input.migrationPath !== REQUIRED_MIGRATION_PATH) return blocked('MIGRATION_PATH_MISMATCH');
  if (input.migrationGitBlobSha !== REQUIRED_MIGRATION_GIT_BLOB_SHA) return blocked('MIGRATION_BLOB_MISMATCH');
  if (input.productionAllowed !== false) return blocked('PRODUCTION_MUST_REMAIN_BLOCKED');
  if (input.authorizationConsumed === true) return blocked('AUTHORIZATION_ALREADY_CONSUMED');
  if (input.executionAttempted === true) return blocked('PRIOR_EXECUTION_ATTEMPT_REQUIRES_NEW_AUTHORIZATION');

  return Object.freeze({
    contractId: CONTRACT_ID,
    decision: 'authorized_for_single_staging_execution',
    reason: null,
    singleExecutionAuthorization: true,
    migrationExecutionAuthority: true,
    stagingAuthority: true,
    productionAuthority: false,
    migrationPath: REQUIRED_MIGRATION_PATH,
    migrationGitBlobSha: REQUIRED_MIGRATION_GIT_BLOB_SHA
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_MIGRATION_PATH,
  REQUIRED_MIGRATION_GIT_BLOB_SHA,
  evaluateStagingMigrationAuthorization
});
