'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const contract = require(path.join(root, 'config/wal-b03-a01-bank-data-protection-authority.json'));
const fixture = require(path.join(root, 'tests/fixtures/wal-b03-a01-bank-data-protection-cases.json'));
const authority = require(path.join(root, 'backend/modules/wallet/wallet-bank-data-protection-authority.js'));
const predecessor = require(path.join(root, 'backend/modules/wallet/wallet-bank-account-sensitive-data.js'));

let assertions = 0;
function equal(actual, expected, message) {
  assert.equal(actual, expected, message);
  assertions += 1;
}
function ok(actual, message) {
  assert.ok(actual, message);
  assertions += 1;
}
function clone(value) {
  return JSON.parse(JSON.stringify(value));
}
function setPath(target, dottedPath, value) {
  const parts = dottedPath.split('.');
  let cursor = target;
  for (let i = 0; i < parts.length - 1; i += 1) cursor = cursor[parts[i]];
  cursor[parts[parts.length - 1]] = value;
}

const validated = authority.validateAuthorityContract(contract);
equal(validated.contractId, authority.CONTRACT_VERSION, 'contract version');
equal(validated.blockerId, 'WAL-B03', 'blocker binding');
equal(validated.repositoryOnly, true, 'repository-only');
equal(validated.migrationAuthorized, false, 'migration unauthorized');
equal(validated.stagingMutationAuthorized, false, 'staging mutation unauthorized');
equal(validated.productionAuthorized, false, 'production unauthorized');

const runtime = authority.validateRuntimeObservation(contract.runtimeObservation);
equal(runtime.blockerConfirmed, true, 'runtime confirms blocker');
equal(runtime.materialExposure, true, 'exposure is material');
equal(runtime.plaintextAtRest, true, 'plaintext at rest acknowledged');
equal(runtime.plaintextResponsePath, true, 'plaintext response path acknowledged');
equal(runtime.supportAdminRawReadReachableByPolicy, true, 'operator policy exposure acknowledged');
equal(runtime.rowCountObserved, 1, 'one staging row observed without reading values');

const next = authority.deriveNextSafeGate(contract);
equal(next.gate, 'WAL-B03-A02', 'next gate');
equal(next.action, 'prepare_migration_candidate_repository_only', 'next action');
equal(next.requiresSeparateAuthorization, true, 'separate authorization required');
equal(next.migrationApplicationAuthorized, false, 'migration application not authorized');
equal(next.stagingMutationAuthorized, false, 'staging mutation not authorized');

equal(contract.targetArchitecture.keyAuthority.reuseKycCryptoSecrets, false, 'KYC key authority not reused');
ok(!/kyc/i.test(contract.targetArchitecture.keyAuthority.keyAlias), 'WAL key alias is isolated');
ok(contract.targetArchitecture.secretStoreCandidate.relation.startsWith('private.'), 'secret store is private');
equal(contract.targetArchitecture.secretStoreCandidate.directServiceRoleTableAccess, false, 'no direct service-role secret-table access');
equal(contract.targetArchitecture.encryptionCandidate.nondeterministicCiphertextRequired, true, 'ciphertext nondeterministic');
equal(contract.targetArchitecture.encryptionCandidate.genericDecryptRpcAllowed, false, 'no generic decrypt RPC');
equal(contract.targetArchitecture.browserProjection.rawFieldsAllowed.length, 0, 'projection has no raw fields');
equal(contract.targetArchitecture.operatorAccess.supportRawAccess, 'deny', 'support raw access denied');
equal(contract.targetArchitecture.operatorAccess.adminRawAccess, 'deny', 'admin raw access denied');
equal(contract.targetArchitecture.retentionAuthority.durationDays, null, 'retention duration unselected');
equal(contract.targetArchitecture.retentionAuthority.hardcodedDurationForbidden, true, 'hardcoded retention forbidden');

const secretReference = predecessor.createSecretReference({
  referenceId: 'wba_0123456789abcdef01234567',
  secretVersion: 1,
  protectionMode: 'encrypted_server_side',
  createdAt: '2026-10-02T13:00:00Z',
  expiresAt: null
});
const projection = predecessor.createMaskedProjection({
  secretReference,
  account: {
    holderName: 'Synthetic Owner',
    document: '00000000000',
    bankName: 'Synthetic Bank',
    bankCode: '000',
    branch: '0001',
    accountNumber: '123456-7',
    accountType: 'checking',
    pixKey: 'synthetic@example.invalid',
    status: 'pending'
  },
  updatedAt: '2026-10-02T13:00:00Z'
});
equal(predecessor.assertNoRawBankData(projection, 'WAL-B03 regression'), true, 'WAL-A02 projection remains raw-free');
equal(projection.rawBankDataPresent, false, 'WAL-A02 projection raw flag');
equal(projection.supportRawAccess, false, 'WAL-A02 support raw flag');

for (const item of fixture.invalidCases) {
  const mutated = clone(contract);
  setPath(mutated, item.path, item.value);
  let code = '';
  try {
    authority.validateAuthorityContract(mutated);
  } catch (error) {
    code = error && error.code;
  }
  equal(code, item.error, item.id + ' must fail closed');
}

equal(fixture.syntheticOnly, true, 'fixtures synthetic only');
equal(Object.values(contract.prohibitedEffects).every((value) => value === false), true, 'all prohibited effects false');

console.log(`WAL-B03-A01 conformance: ${assertions}/${assertions} PASS`);
