'use strict';

const CONTRACT_VERSION = 'wal-b03-a01-bank-data-protection-authority-v1';
const PREDECESSOR_CONTRACT = 'wal-a02-bank-account-sensitive-data-boundary-v1';
const EXPECTED_SOURCE_HEAD = '6eb8e55317a20f88f8ecb0f083c00c101b2afc59';
const EXPECTED_MATRIX_VERSION = '1.3.132';
const SENSITIVE_FIELDS = Object.freeze([
  'account_holder',
  'document',
  'branch',
  'account_number',
  'pix_key'
]);

class BankDataProtectionAuthorityError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BankDataProtectionAuthorityError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new BankDataProtectionAuthorityError(code, message);
}

function sameMembers(actual, expected) {
  if (!Array.isArray(actual) || actual.length !== expected.length) return false;
  const left = [...actual].sort();
  const right = [...expected].sort();
  return left.every((value, index) => value === right[index]);
}

function validateRuntimeObservation(observation) {
  if (!observation || typeof observation !== 'object') {
    fail('WAL_B03_RUNTIME_OBSERVATION_REQUIRED', 'Runtime observation is required');
  }
  if (observation.readOnlyInspection !== true || observation.valuesInspected !== false) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Observation must be read-only and value-free');
  }
  if (observation.table !== 'public.wallet_bank_accounts') {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Unexpected bank-account table');
  }
  if (!Number.isInteger(observation.walletBankAccountRowCountObserved) || observation.walletBankAccountRowCountObserved < 0) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Observed row count must be non-negative');
  }
  if (!sameMembers(observation.plaintextColumns, SENSITIVE_FIELDS)) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Plaintext field inventory is incomplete');
  }
  if (!Array.isArray(observation.cryptoLikeColumnsObserved) || observation.cryptoLikeColumnsObserved.length !== 0) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Runtime cannot be represented as cryptographically protected');
  }
  if (observation.rlsEnabled !== true ||
      observation.authenticatedTableSelect !== true ||
      observation.ownerOrSupportAdminSelectPolicy !== true) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Current read exposure was not captured exactly');
  }
  if (!observation.saveRpc ||
      observation.saveRpc.returnsCurrentRowType !== true ||
      observation.saveRpc.authenticatedExecute !== false ||
      observation.saveRpc.serviceRoleExecute !== true) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Current save RPC authority was not captured exactly');
  }
  if (!observation.selfServicePath ||
      observation.selfServicePath.dispatcherSerializesSaveResultToJson !== true ||
      observation.selfServicePath.edgeReturnsDispatcherResult !== true ||
      observation.selfServicePath.maskedResponseEnforced !== false) {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Current response exposure was not captured exactly');
  }
  if (!observation.installedCapabilities ||
      observation.installedCapabilities.pgcrypto !== '1.3' ||
      observation.installedCapabilities.supabaseVault !== '0.3.1') {
    fail('WAL_B03_RUNTIME_OBSERVATION_INVALID', 'Observed crypto capabilities do not match preflight');
  }

  return Object.freeze({
    blockerConfirmed: true,
    materialExposure: true,
    plaintextAtRest: true,
    plaintextResponsePath: true,
    supportAdminRawReadReachableByPolicy: true,
    rowCountObserved: observation.walletBankAccountRowCountObserved
  });
}

function validateAuthorityContract(contract) {
  if (!contract || typeof contract !== 'object') {
    fail('WAL_B03_CONTRACT_REQUIRED', 'Authority contract is required');
  }
  if (contract.contractId !== CONTRACT_VERSION ||
      contract.sourceHead !== EXPECTED_SOURCE_HEAD ||
      contract.matrixVersion !== EXPECTED_MATRIX_VERSION ||
      contract.scope !== 'repository_only') {
    fail('WAL_B03_CONTRACT_IDENTITY_INVALID', 'Contract identity/source binding is invalid');
  }
  if (!Array.isArray(contract.dependsOn) || !contract.dependsOn.includes(PREDECESSOR_CONTRACT)) {
    fail('WAL_B03_PREDECESSOR_REQUIRED', 'WAL-A02 predecessor is required');
  }
  if (contract.blockerId !== 'WAL-B03') {
    fail('WAL_B03_BLOCKER_BINDING_INVALID', 'Contract must bind WAL-B03');
  }

  const authorization = contract.authorization || {};
  const forbiddenAuthority = [
    'migrationAuthority',
    'stagingMutationAuthority',
    'productionAuthority',
    'deployAuthority',
    'mergeAuthority',
    'readyForReviewAuthority'
  ];
  if (authorization.repositoryWriteAuthority !== true ||
      forbiddenAuthority.some((key) => authorization[key] !== false)) {
    fail('WAL_B03_AUTHORITY_OVERREACH', 'A01 may only authorize repository writes');
  }

  if (contract.runtimeIntegrated !== false ||
      contract.migrationPrepared !== false ||
      contract.migrationApplied !== false ||
      contract.stagingMutationPerformed !== false ||
      contract.productionChanged !== false) {
    fail('WAL_B03_STATE_OVERCLAIM', 'A01 cannot claim runtime/migration/staging/production completion');
  }

  if (!sameMembers(contract.sensitiveFields, SENSITIVE_FIELDS)) {
    fail('WAL_B03_SENSITIVE_FIELDS_INVALID', 'Sensitive fields drifted from WAL-A02');
  }

  const target = contract.targetArchitecture || {};
  const key = target.keyAuthority || {};
  if (key.provider !== 'supabase_vault' ||
      key.domain !== 'WAL-001' ||
      key.reuseKycCryptoSecrets !== false ||
      key.repositorySecretMaterialAllowed !== false ||
      key.browserKeyAccess !== false ||
      key.supportKeyAccess !== false ||
      /kyc/i.test(String(key.keyAlias || ''))) {
    fail('WAL_B03_KEY_AUTHORITY_INVALID', 'Key authority must be WAL-specific and isolated');
  }

  const store = target.secretStoreCandidate || {};
  if (!String(store.relation || '').startsWith('private.') ||
      store.exposedThroughDataApi !== false ||
      store.directAnonAccess !== false ||
      store.directAuthenticatedAccess !== false ||
      store.directServiceRoleTableAccess !== false ||
      !Array.isArray(store.plaintextColumnsAllowed) ||
      store.plaintextColumnsAllowed.length !== 0) {
    fail('WAL_B03_SECRET_STORE_INVALID', 'Secret store boundary is invalid');
  }

  const encryption = target.encryptionCandidate || {};
  if (encryption.engine !== 'pgcrypto' ||
      encryption.cipher !== 'aes256' ||
      encryption.nondeterministicCiphertextRequired !== true ||
      encryption.decryptionMustVerifyBinding !== true ||
      encryption.genericDecryptRpcAllowed !== false) {
    fail('WAL_B03_ENCRYPTION_CONTRACT_INVALID', 'Encryption candidate must fail closed');
  }

  const projection = target.browserProjection || {};
  if (projection.contract !== 'wallet-bank-account-masked-projection-v1' ||
      !Array.isArray(projection.rawFieldsAllowed) ||
      projection.rawFieldsAllowed.length !== 0 ||
      projection.ownerRawReadAllowed !== false ||
      projection.supportRawReadAllowed !== false ||
      projection.adminRawReadAllowed !== false) {
    fail('WAL_B03_PROJECTION_INVALID', 'Owner/operator projection must be masked-only');
  }

  const operator = target.operatorAccess || {};
  if (operator.supportRawAccess !== 'deny' ||
      operator.adminRawAccess !== 'deny' ||
      operator.breakGlassRawAccess !== 'not_defined_not_authorized') {
    fail('WAL_B03_OPERATOR_ACCESS_INVALID', 'Raw operator/break-glass access is unauthorized');
  }

  const response = target.responseContract || {};
  if (response.saveMustReturnMaskedProjectionOnly !== true ||
      response.getMustReturnMaskedProjectionOnly !== true ||
      response.rawRowTypeReturnForbidden !== true ||
      response.selfServiceJsonRawSecretReturnForbidden !== true) {
    fail('WAL_B03_RESPONSE_CONTRACT_INVALID', 'Save/get responses must be masked-only');
  }

  const retention = target.retentionAuthority || {};
  if (retention.durationApproved !== false ||
      retention.durationDays !== null ||
      retention.hardcodedDurationForbidden !== true ||
      retention.purgeAfterRequiresApprovedPolicy !== true) {
    fail('WAL_B03_RETENTION_AUTHORITY_INVALID', 'A01 cannot invent retention duration');
  }

  const logging = target.loggingAuthority || {};
  if (logging.rawBankDataAllowed !== false || logging.decryptedPayloadAllowed !== false) {
    fail('WAL_B03_LOGGING_INVALID', 'Raw/decrypted bank data cannot enter logs');
  }

  if (!Array.isArray(contract.orderedFutureGates) ||
      contract.orderedFutureGates.map((gate) => gate.id).join(',') !== 'WAL-B03-A02,WAL-B03-A03,WAL-B03-A04,WAL-B03-A05' ||
      contract.orderedFutureGates.some((gate) => gate.requiresSeparateAuthorization !== true)) {
    fail('WAL_B03_FUTURE_GATES_INVALID', 'Future mutation gates must remain separate');
  }

  if (!contract.prohibitedEffects ||
      Object.values(contract.prohibitedEffects).some((value) => value !== false)) {
    fail('WAL_B03_PROHIBITED_EFFECT_INVALID', 'A01 prohibited effects must remain false');
  }

  validateRuntimeObservation(contract.runtimeObservation);

  return Object.freeze({
    contractId: contract.contractId,
    blockerId: contract.blockerId,
    status: contract.status,
    repositoryOnly: true,
    migrationAuthorized: false,
    stagingMutationAuthorized: false,
    productionAuthorized: false
  });
}

function deriveNextSafeGate(contract) {
  validateAuthorityContract(contract);
  return Object.freeze({
    gate: 'WAL-B03-A02',
    action: 'prepare_migration_candidate_repository_only',
    requiresSeparateAuthorization: true,
    migrationApplicationAuthorized: false,
    stagingMutationAuthorized: false,
    productionAuthorized: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  PREDECESSOR_CONTRACT,
  EXPECTED_SOURCE_HEAD,
  EXPECTED_MATRIX_VERSION,
  SENSITIVE_FIELDS,
  BankDataProtectionAuthorityError,
  validateRuntimeObservation,
  validateAuthorityContract,
  deriveNextSafeGate
});
