'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'wal-a02-bank-account-sensitive-data-boundary-v1';
const PROJECTION_VERSION = 'wallet-bank-account-masked-projection-v1';
const SECRET_REFERENCE_VERSION = 'wallet-bank-account-secret-reference-v1';
const WITHDRAWAL_DESTINATION_VERSION = 'wallet-withdrawal-destination-reference-v1';
const REDACTED = '[REDACTED_BANK_DATA]';

const FORBIDDEN_RAW_KEYS = Object.freeze([
  'account_holder', 'accountHolder', 'holderName',
  'document', 'taxId', 'cpf', 'cnpj',
  'branch', 'agency',
  'account_number', 'accountNumber',
  'pix_key', 'pixKey'
]);

const ALLOWED_ACCOUNT_TYPES = Object.freeze(['checking', 'savings', 'payment']);
const ALLOWED_PROTECTION_MODES = Object.freeze(['encrypted_server_side', 'tokenized_external_vault']);
const ALLOWED_STATUSES = Object.freeze(['pending', 'verified', 'rejected', 'disabled']);

class BankAccountBoundaryError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'BankAccountBoundaryError';
    this.code = code;
  }
}

function fail(code, message) {
  throw new BankAccountBoundaryError(code, message);
}

function canonicalize(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalize).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalize(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function fingerprint(value, field) {
  const body = { ...value };
  delete body[field];
  return sha256(canonicalize(body));
}

function isSha256(value) {
  return /^[a-f0-9]{64}$/i.test(String(value || ''));
}

function text(value, maxLength) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isoInstant(value) {
  return /^\d{4}-\d{2}-\d{2}T/.test(String(value || '')) && !Number.isNaN(Date.parse(value));
}

function normalizeAccountType(value) {
  const accountType = text(value || 'checking', 40).toLowerCase();
  if (!ALLOWED_ACCOUNT_TYPES.includes(accountType)) {
    fail('WAL_A02_ACCOUNT_TYPE_INVALID', 'Unsupported bank-account type');
  }
  return accountType;
}

function maskTail(value, visible = 4, minimumMask = 4) {
  const normalized = text(value, 240);
  if (!normalized) return '';
  const suffix = normalized.slice(-Math.max(1, visible));
  const maskLength = Math.max(minimumMask, normalized.length - suffix.length);
  return '•'.repeat(maskLength) + suffix;
}

function maskHolderName(value) {
  const words = text(value, 160).split(' ').filter(Boolean);
  if (!words.length) return '';
  return words.map((word) => word.slice(0, 1).toUpperCase() + '•'.repeat(Math.max(2, word.length - 1))).join(' ');
}

function maskDocument(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? maskTail(digits, 4, 7) : '';
}

function maskBranch(value) {
  const normalized = text(value, 32);
  return normalized ? maskTail(normalized, 2, 2) : '';
}

function maskAccountNumber(value) {
  const normalized = text(value, 64);
  return normalized ? maskTail(normalized, 4, 4) : '';
}

function classifyPixKey(value) {
  const normalized = text(value, 200);
  if (!normalized) return 'none';
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized)) return 'email';
  const digits = normalized.replace(/\D/g, '');
  if (digits.length >= 10 && digits.length <= 14) return 'phone_or_document';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(normalized)) return 'random';
  return 'other';
}

function maskPixKey(value) {
  const normalized = text(value, 200);
  if (!normalized) return '';
  const type = classifyPixKey(normalized);
  if (type === 'email') {
    const [local, domain] = normalized.split('@');
    const domainParts = domain.split('.');
    const suffix = domainParts.length > 1 ? '.' + domainParts.pop() : '';
    return local.slice(0, 1) + '•••@•••' + suffix;
  }
  return maskTail(normalized, 4, 6);
}

function inspectSensitiveKeys(value, prefix = '$', found = []) {
  if (!value || typeof value !== 'object') return found;
  if (Array.isArray(value)) {
    value.forEach((item, index) => inspectSensitiveKeys(item, `${prefix}[${index}]`, found));
    return found;
  }
  Object.keys(value).forEach((key) => {
    const path = `${prefix}.${key}`;
    if (FORBIDDEN_RAW_KEYS.includes(key)) found.push(path);
    inspectSensitiveKeys(value[key], path, found);
  });
  return found;
}

function assertNoRawBankData(value, context = 'payload') {
  const paths = inspectSensitiveKeys(value);
  if (paths.length) {
    fail('WAL_A02_RAW_BANK_DATA_FORBIDDEN', `${context} contains forbidden raw bank-data keys: ${paths.join(', ')}`);
  }
  return true;
}

function redactBankAccountForAudit(value) {
  if (Array.isArray(value)) return value.map(redactBankAccountForAudit);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).reduce((output, key) => {
    output[key] = FORBIDDEN_RAW_KEYS.includes(key) ? REDACTED : redactBankAccountForAudit(value[key]);
    return output;
  }, {});
}

function createSecretReference(input) {
  if (!input || typeof input !== 'object') fail('WAL_A02_SECRET_REFERENCE_INVALID', 'Secret reference input is required');
  assertNoRawBankData(input, 'secret reference');
  const body = {
    referenceVersion: SECRET_REFERENCE_VERSION,
    contractVersion: CONTRACT_VERSION,
    referenceId: text(input.referenceId, 200),
    secretVersion: Number(input.secretVersion),
    protectionMode: text(input.protectionMode, 64),
    storageAuthority: 'server_only',
    browserReadable: false,
    supportRawAccess: false,
    breakGlassRawAccess: false,
    createdAt: text(input.createdAt, 64),
    expiresAt: input.expiresAt == null ? null : text(input.expiresAt, 64),
    productionAuthority: false,
    providerTransferAuthority: false
  };
  if (!/^wba_[A-Za-z0-9_-]{16,180}$/.test(body.referenceId)) {
    fail('WAL_A02_SECRET_REFERENCE_INVALID', 'Opaque bank-account referenceId is required');
  }
  if (!Number.isInteger(body.secretVersion) || body.secretVersion < 1) {
    fail('WAL_A02_SECRET_REFERENCE_INVALID', 'secretVersion must be a positive integer');
  }
  if (!ALLOWED_PROTECTION_MODES.includes(body.protectionMode)) {
    fail('WAL_A02_SECRET_REFERENCE_INVALID', 'Unsupported protection mode');
  }
  if (!isoInstant(body.createdAt) || (body.expiresAt !== null && !isoInstant(body.expiresAt))) {
    fail('WAL_A02_SECRET_REFERENCE_INVALID', 'Valid ISO timestamps are required');
  }
  return Object.freeze({ ...body, referenceFingerprint: fingerprint(body, 'referenceFingerprint') });
}

function validateSecretReference(reference) {
  if (!reference || reference.referenceVersion !== SECRET_REFERENCE_VERSION || reference.contractVersion !== CONTRACT_VERSION) {
    fail('WAL_A02_SECRET_REFERENCE_INVALID', 'Unsupported secret reference');
  }
  const rebuilt = createSecretReference(reference);
  if (!isSha256(reference.referenceFingerprint) || reference.referenceFingerprint !== rebuilt.referenceFingerprint) {
    fail('WAL_A02_FINGERPRINT_MISMATCH', 'Secret reference fingerprint mismatch');
  }
  return rebuilt;
}

function normalizeTransientAccount(account) {
  if (!account || typeof account !== 'object') fail('WAL_A02_ACCOUNT_INPUT_INVALID', 'Transient bank-account input is required');
  const normalized = {
    holderName: text(account.holderName || account.accountHolder || account.account_holder, 160),
    document: text(account.document || account.taxId, 40),
    bankName: text(account.bankName || account.bank_name, 120),
    bankCode: text(account.bankCode || account.bank_code, 20),
    branch: text(account.branch || account.agency, 32),
    accountNumber: text(account.accountNumber || account.account_number, 64),
    accountType: normalizeAccountType(account.accountType || account.account_type),
    pixKey: text(account.pixKey || account.pix_key, 200),
    status: text(account.status || 'pending', 40).toLowerCase()
  };
  if (!normalized.holderName) fail('WAL_A02_ACCOUNT_INPUT_INVALID', 'Account holder is required');
  if (!normalized.pixKey && (!normalized.bankName || !normalized.accountNumber)) {
    fail('WAL_A02_ACCOUNT_INPUT_INVALID', 'Pix key or bank name and account number are required');
  }
  if (!ALLOWED_STATUSES.includes(normalized.status)) {
    fail('WAL_A02_ACCOUNT_INPUT_INVALID', 'Unsupported bank-account status');
  }
  return normalized;
}

function createMaskedProjection(input) {
  if (!input || typeof input !== 'object') fail('WAL_A02_PROJECTION_INVALID', 'Projection input is required');
  const reference = validateSecretReference(input.secretReference);
  const account = normalizeTransientAccount(input.account);
  const updatedAt = text(input.updatedAt || reference.createdAt, 64);
  if (!isoInstant(updatedAt)) fail('WAL_A02_PROJECTION_INVALID', 'Projection updatedAt must be an ISO timestamp');
  const destinationKind = account.pixKey ? 'pix' : 'bank_account';
  const body = {
    projectionVersion: PROJECTION_VERSION,
    contractVersion: CONTRACT_VERSION,
    bankAccountReferenceId: reference.referenceId,
    bankAccountSecretVersion: reference.secretVersion,
    bankName: account.bankName,
    bankCode: account.bankCode,
    accountType: account.accountType,
    holderNameMasked: maskHolderName(account.holderName),
    documentMasked: maskDocument(account.document),
    branchMasked: maskBranch(account.branch),
    accountNumberMasked: maskAccountNumber(account.accountNumber),
    pixKeyMasked: maskPixKey(account.pixKey),
    pixKeyType: classifyPixKey(account.pixKey),
    destinationKind,
    destinationLabel: destinationKind === 'pix'
      ? `Pix ${maskPixKey(account.pixKey)}`
      : `${account.bankName || 'Banco'} ${maskAccountNumber(account.accountNumber)}`,
    status: account.status,
    updatedAt,
    browserStorageAllowed: true,
    rawBankDataPresent: false,
    supportRawAccess: false,
    productionAuthority: false,
    providerTransferAuthority: false
  };
  assertNoRawBankData(body, 'masked projection');
  return Object.freeze({ ...body, projectionFingerprint: fingerprint(body, 'projectionFingerprint') });
}

function validateMaskedProjection(projection) {
  if (!projection || projection.projectionVersion !== PROJECTION_VERSION || projection.contractVersion !== CONTRACT_VERSION) {
    fail('WAL_A02_PROJECTION_INVALID', 'Unsupported masked projection');
  }
  assertNoRawBankData(projection, 'masked projection');
  if (projection.rawBankDataPresent !== false || projection.browserStorageAllowed !== true || projection.supportRawAccess !== false) {
    fail('WAL_A02_PROJECTION_INVALID', 'Masked projection authority flags are invalid');
  }
  if (projection.productionAuthority !== false || projection.providerTransferAuthority !== false) {
    fail('WAL_A02_AUTHORITY_FORBIDDEN', 'Masked projection cannot grant financial authority');
  }
  if (!/^wba_[A-Za-z0-9_-]{16,180}$/.test(String(projection.bankAccountReferenceId || '')) || !Number.isInteger(projection.bankAccountSecretVersion)) {
    fail('WAL_A02_PROJECTION_INVALID', 'Masked projection reference is invalid');
  }
  if (!isSha256(projection.projectionFingerprint) || projection.projectionFingerprint !== fingerprint(projection, 'projectionFingerprint')) {
    fail('WAL_A02_FINGERPRINT_MISMATCH', 'Masked projection fingerprint mismatch');
  }
  return Object.freeze({ ...projection });
}

function createWithdrawalDestinationReference(input) {
  if (!input || typeof input !== 'object') fail('WAL_A02_WITHDRAWAL_DESTINATION_INVALID', 'Withdrawal destination input is required');
  const reference = validateSecretReference(input.secretReference);
  const projection = validateMaskedProjection(input.projection);
  if (projection.bankAccountReferenceId !== reference.referenceId || projection.bankAccountSecretVersion !== reference.secretVersion) {
    fail('WAL_A02_REFERENCE_MISMATCH', 'Projection and secret reference do not match');
  }
  const createdAt = text(input.createdAt, 64);
  if (!isoInstant(createdAt)) fail('WAL_A02_WITHDRAWAL_DESTINATION_INVALID', 'Withdrawal destination createdAt must be ISO');
  const body = {
    destinationVersion: WITHDRAWAL_DESTINATION_VERSION,
    contractVersion: CONTRACT_VERSION,
    bankAccountReferenceId: reference.referenceId,
    bankAccountSecretVersion: reference.secretVersion,
    projectionFingerprint: projection.projectionFingerprint,
    destinationKind: projection.destinationKind,
    destinationLabel: projection.destinationLabel,
    createdAt,
    rawBankDataPresent: false,
    providerTransferAuthority: false,
    settlementAuthority: false,
    productionAuthority: false
  };
  assertNoRawBankData(body, 'withdrawal destination');
  return Object.freeze({ ...body, destinationFingerprint: fingerprint(body, 'destinationFingerprint') });
}

function validateWithdrawalDestinationReference(destination) {
  if (!destination || destination.destinationVersion !== WITHDRAWAL_DESTINATION_VERSION || destination.contractVersion !== CONTRACT_VERSION) {
    fail('WAL_A02_WITHDRAWAL_DESTINATION_INVALID', 'Unsupported withdrawal destination');
  }
  assertNoRawBankData(destination, 'withdrawal destination');
  if (destination.rawBankDataPresent !== false || destination.providerTransferAuthority !== false || destination.settlementAuthority !== false || destination.productionAuthority !== false) {
    fail('WAL_A02_AUTHORITY_FORBIDDEN', 'Withdrawal destination cannot grant transfer or production authority');
  }
  if (!isSha256(destination.destinationFingerprint) || destination.destinationFingerprint !== fingerprint(destination, 'destinationFingerprint')) {
    fail('WAL_A02_FINGERPRINT_MISMATCH', 'Withdrawal destination fingerprint mismatch');
  }
  return Object.freeze({ ...destination });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  PROJECTION_VERSION,
  SECRET_REFERENCE_VERSION,
  WITHDRAWAL_DESTINATION_VERSION,
  FORBIDDEN_RAW_KEYS,
  REDACTED,
  BankAccountBoundaryError,
  sha256,
  inspectSensitiveKeys,
  assertNoRawBankData,
  redactBankAccountForAudit,
  maskHolderName,
  maskDocument,
  maskBranch,
  maskAccountNumber,
  classifyPixKey,
  maskPixKey,
  createSecretReference,
  validateSecretReference,
  createMaskedProjection,
  validateMaskedProjection,
  createWithdrawalDestinationReference,
  validateWithdrawalDestinationReference
});
