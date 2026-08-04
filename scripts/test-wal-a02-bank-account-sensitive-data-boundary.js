'use strict';

const assert = require('node:assert/strict');
const fixture = require('../tests/fixtures/wal-a02-bank-account-sensitive-data-cases.json');
const boundary = require('../backend/modules/wallet/wallet-bank-account-sensitive-data');

const cases = [];
function check(id, fn) {
  try {
    fn();
    cases.push({ id, passed: true });
  } catch (error) {
    cases.push({ id, passed: false, error: error.message });
    throw new Error(`WAL-A02 conformance failed [${id}]: ${error.message}`);
  }
}

function expectCode(code, fn) {
  assert.throws(fn, (error) => error && error.code === code);
}

const secret = boundary.createSecretReference({
  referenceId: 'wba_synthetic_reference_0001',
  secretVersion: 1,
  protectionMode: 'encrypted_server_side',
  createdAt: '2026-08-04T18:20:00.000Z',
  expiresAt: null
});

check('contract-version', () => assert.equal(boundary.CONTRACT_VERSION, fixture.contractId));
check('secret-reference-version', () => assert.equal(secret.referenceVersion, boundary.SECRET_REFERENCE_VERSION));
check('secret-reference-server-only', () => assert.equal(secret.storageAuthority, 'server_only'));
check('secret-reference-browser-denied', () => assert.equal(secret.browserReadable, false));
check('secret-reference-support-raw-denied', () => assert.equal(secret.supportRawAccess, false));
check('secret-reference-authority-denied', () => assert.equal(secret.productionAuthority || secret.providerTransferAuthority, false));
check('secret-reference-fingerprint', () => assert.match(secret.referenceFingerprint, /^[a-f0-9]{64}$/));
check('secret-reference-validation', () => assert.deepEqual(boundary.validateSecretReference(secret), secret));
check('secret-reference-tamper', () => expectCode('WAL_A02_FINGERPRINT_MISMATCH', () => boundary.validateSecretReference({ ...secret, secretVersion: 2 })));
check('secret-reference-raw-field-rejected', () => expectCode('WAL_A02_RAW_BANK_DATA_FORBIDDEN', () => boundary.createSecretReference({ ...secret, accountNumber: '1234' })));
check('secret-reference-invalid-id', () => expectCode('WAL_A02_SECRET_REFERENCE_INVALID', () => boundary.createSecretReference({ referenceId: 'short', secretVersion: 1, protectionMode: 'encrypted_server_side', createdAt: '2026-08-04T18:20:00.000Z' })));
check('secret-reference-invalid-mode', () => expectCode('WAL_A02_SECRET_REFERENCE_INVALID', () => boundary.createSecretReference({ referenceId: 'wba_synthetic_reference_0002', secretVersion: 1, protectionMode: 'plaintext', createdAt: '2026-08-04T18:20:00.000Z' })));

fixture.positiveCases.forEach((testCase, index) => {
  const caseSecret = boundary.createSecretReference({
    referenceId: `wba_synthetic_reference_100${index}`,
    secretVersion: index + 1,
    protectionMode: index % 2 ? 'tokenized_external_vault' : 'encrypted_server_side',
    createdAt: '2026-08-04T18:20:00.000Z'
  });
  const projection = boundary.createMaskedProjection({
    account: testCase.account,
    secretReference: caseSecret,
    updatedAt: '2026-08-04T18:21:00.000Z'
  });
  check(`${testCase.id}-kind`, () => assert.equal(projection.destinationKind, testCase.expected.destinationKind));
  check(`${testCase.id}-browser-safe`, () => assert.equal(boundary.inspectSensitiveKeys(projection).length, 0));
  check(`${testCase.id}-raw-values-absent`, () => {
    const serialized = JSON.stringify(projection);
    ['holderName', 'document', 'branch', 'accountNumber', 'pixKey'].map((key) => testCase.account[key]).filter((value) => typeof value === 'string' && value.length >= 4).forEach((value) => {
      assert.equal(serialized.includes(value), false, `raw sensitive value leaked: ${value}`);
    });
  });
  check(`${testCase.id}-fingerprint`, () => assert.match(projection.projectionFingerprint, /^[a-f0-9]{64}$/));
  check(`${testCase.id}-validation`, () => assert.deepEqual(boundary.validateMaskedProjection(projection), projection));
  if (testCase.expected.documentMaskedSuffix) {
    check(`${testCase.id}-document-mask`, () => assert.equal(projection.documentMasked.endsWith(testCase.expected.documentMaskedSuffix), true));
  }
  if (testCase.expected.accountMaskedSuffix) {
    check(`${testCase.id}-account-mask`, () => assert.equal(projection.accountNumberMasked.endsWith(testCase.expected.accountMaskedSuffix), true));
  }
  if (testCase.expected.pixMaskedSuffix) {
    check(`${testCase.id}-pix-mask`, () => assert.equal(projection.pixKeyMasked.endsWith(testCase.expected.pixMaskedSuffix), true));
  }
  if (testCase.expected.pixMaskContains) {
    check(`${testCase.id}-pix-mask-format`, () => assert.equal(projection.pixKeyMasked.includes(testCase.expected.pixMaskContains), true));
  }
  const destination = boundary.createWithdrawalDestinationReference({
    projection,
    secretReference: caseSecret,
    createdAt: '2026-08-04T18:22:00.000Z'
  });
  check(`${testCase.id}-withdrawal-safe`, () => assert.equal(boundary.inspectSensitiveKeys(destination).length, 0));
  check(`${testCase.id}-withdrawal-authority-denied`, () => assert.equal(destination.providerTransferAuthority || destination.settlementAuthority || destination.productionAuthority, false));
  check(`${testCase.id}-withdrawal-validation`, () => assert.deepEqual(boundary.validateWithdrawalDestinationReference(destination), destination));
});

const baseProjection = boundary.createMaskedProjection({
  account: fixture.positiveCases[0].account,
  secretReference: secret,
  updatedAt: '2026-08-04T18:21:00.000Z'
});

check('projection-tamper', () => expectCode('WAL_A02_FINGERPRINT_MISMATCH', () => boundary.validateMaskedProjection({ ...baseProjection, status: 'verified' })));
check('projection-raw-key-rejected', () => expectCode('WAL_A02_RAW_BANK_DATA_FORBIDDEN', () => boundary.validateMaskedProjection({ ...baseProjection, account_number: '9999' })));
check('projection-authority-rejected', () => expectCode('WAL_A02_AUTHORITY_FORBIDDEN', () => boundary.validateMaskedProjection({ ...baseProjection, productionAuthority: true, projectionFingerprint: boundary.sha256('tampered') })));
check('projection-invalid-account-type', () => expectCode('WAL_A02_ACCOUNT_TYPE_INVALID', () => boundary.createMaskedProjection({ account: { ...fixture.positiveCases[0].account, accountType: 'crypto' }, secretReference: secret, updatedAt: '2026-08-04T18:21:00.000Z' })));
check('projection-missing-destination', () => expectCode('WAL_A02_ACCOUNT_INPUT_INVALID', () => boundary.createMaskedProjection({ account: { holderName: 'Synthetic', accountType: 'checking' }, secretReference: secret, updatedAt: '2026-08-04T18:21:00.000Z' })));
check('withdrawal-reference-mismatch', () => {
  const other = boundary.createSecretReference({ referenceId: 'wba_synthetic_reference_other', secretVersion: 1, protectionMode: 'encrypted_server_side', createdAt: '2026-08-04T18:20:00.000Z' });
  expectCode('WAL_A02_REFERENCE_MISMATCH', () => boundary.createWithdrawalDestinationReference({ projection: baseProjection, secretReference: other, createdAt: '2026-08-04T18:22:00.000Z' }));
});
check('withdrawal-raw-key-rejected', () => expectCode('WAL_A02_RAW_BANK_DATA_FORBIDDEN', () => boundary.validateWithdrawalDestinationReference({ destinationVersion: boundary.WITHDRAWAL_DESTINATION_VERSION, contractVersion: boundary.CONTRACT_VERSION, accountNumber: '1234' })));
check('nested-sensitive-detection', () => assert.deepEqual(boundary.inspectSensitiveKeys({ metadata: { bankAccount: { pixKey: 'secret' } } }), ['$.metadata.bankAccount.pixKey']));
check('nested-sensitive-assertion', () => expectCode('WAL_A02_RAW_BANK_DATA_FORBIDDEN', () => boundary.assertNoRawBankData({ payload: { document: '123' } }, 'test')));
check('audit-redaction', () => {
  const redacted = boundary.redactBankAccountForAudit({ accountNumber: '1234', nested: { pix_key: 'secret' }, safe: 'ok' });
  assert.equal(redacted.accountNumber, boundary.REDACTED);
  assert.equal(redacted.nested.pix_key, boundary.REDACTED);
  assert.equal(redacted.safe, 'ok');
});
check('mask-holder', () => assert.equal(boundary.maskHolderName('Pessoa Exemplo'), 'P••••• E••••••'));
check('mask-document', () => assert.equal(boundary.maskDocument('123.456.789-00').endsWith('8900'), true));
check('mask-branch', () => assert.equal(boundary.maskBranch('1234').endsWith('34'), true));
check('mask-account', () => assert.equal(boundary.maskAccountNumber('987654-3').endsWith('54-3'), true));
check('mask-pix-email', () => assert.equal(boundary.maskPixKey('pessoa@example.test'), 'p•••@•••.test'));
check('mask-pix-phone', () => assert.equal(boundary.maskPixKey('+55 31 99999-1234').endsWith('1234'), true));
check('pix-class-email', () => assert.equal(boundary.classifyPixKey('person@example.test'), 'email'));
check('pix-class-phone', () => assert.equal(boundary.classifyPixKey('+55 31 99999-1234'), 'phone_or_document'));
check('pix-class-random', () => assert.equal(boundary.classifyPixKey('123e4567-e89b-12d3-a456-426614174000'), 'random'));

const result = {
  contractId: boundary.CONTRACT_VERSION,
  total: cases.length,
  passed: cases.filter((item) => item.passed).length,
  failed: cases.filter((item) => !item.passed).length,
  status: 'passed'
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
