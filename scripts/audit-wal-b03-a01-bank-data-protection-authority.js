'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const json = (relative) => JSON.parse(read(relative));

const contract = json('config/wal-b03-a01-bank-data-protection-authority.json');
const predecessor = json('config/wal-a02-bank-account-sensitive-data-boundary.json');
const matrix = json('config/domain-completion-matrix.json');
const moduleSource = read('backend/modules/wallet/wallet-bank-data-protection-authority.js');
const docs = read('docs/WAL-B03-A01-BANK-DATA-PROTECTION-AUTHORITY.md');
const walletFoundation = read('supabase/migrations/005_wallet_runtime_foundation.sql');
const financialRpc = read('supabase/migrations/107_financial_rpc_authority.sql');
const dispatcher = read('supabase/migrations/135_self_service_operation_dispatcher.sql');
const edge = read('supabase/functions/self-service-operations/index.ts');
const walletService = read('backend/modules/wallet/wallet-service.js');
const financeRepository = read('assets/js/repositories/finance-repository.js');

const checks = [];
function check(id, predicate, detail) {
  const passed = Boolean(predicate);
  checks.push({ id, passed, detail });
  if (!passed) throw new Error(`WAL-B03-A01 audit failed [${id}]: ${detail}`);
}

const wal = (matrix.domains || []).find((domain) => domain.id === 'WAL-001');
const walB03 = wal && (wal.blockers || []).find((blocker) => blocker.id === 'WAL-B03');

check('contract-id', contract.contractId === 'wal-b03-a01-bank-data-protection-authority-v1', 'contract id mismatch');
check('source-head', contract.sourceHead === '6eb8e55317a20f88f8ecb0f083c00c101b2afc59', 'source HEAD mismatch');
check('matrix-version', contract.matrixVersion === '1.3.132' && matrix.version === '1.3.132', 'matrix version mismatch');
check('repository-only', contract.scope === 'repository_only', 'scope must remain repository-only');
check('predecessor', contract.dependsOn.includes(predecessor.contractId) && predecessor.contractId === 'wal-a02-bank-account-sensitive-data-boundary-v1', 'WAL-A02 predecessor missing');
check('blocker-open', Boolean(walB03) && /encryption, masking, retention and support-access policy/i.test(walB03.description), 'WAL-B03 must remain open');
check('wal-state-preserved', wal.maturity === 3 && wal.securityGate === 'blocked' && wal.productionGate === 'blocked', 'WAL maturity/gates cannot be promoted');
check('no-migration-claim', contract.migrationPrepared === false && contract.migrationApplied === false, 'migration cannot be claimed');
check('no-runtime-claim', contract.runtimeIntegrated === false && contract.stagingMutationPerformed === false && contract.productionChanged === false, 'runtime/staging/production cannot be claimed');
check('authorization-boundary', contract.authorization.repositoryWriteAuthority === true &&
  contract.authorization.migrationAuthority === false &&
  contract.authorization.stagingMutationAuthority === false &&
  contract.authorization.productionAuthority === false &&
  contract.authorization.deployAuthority === false &&
  contract.authorization.mergeAuthority === false &&
  contract.authorization.readyForReviewAuthority === false, 'authorization mismatch');

for (const field of ['account_holder', 'document', 'branch', 'account_number', 'pix_key']) {
  check('foundation-plaintext-' + field, walletFoundation.includes(field + ' text'), 'current foundation must evidence plaintext ' + field);
  check('contract-sensitive-' + field, contract.sensitiveFields.includes(field), 'contract must classify ' + field);
}

check('rpc-row-return', /returns public\.wallet_bank_accounts/i.test(financialRpc) && /returning \* into v_account/i.test(financialRpc), 'current row-return exposure missing');
check('rpc-plaintext-input', ['p_account_holder','p_document','p_branch','p_account_number','p_pix_key'].every((token) => financialRpc.includes(token)), 'current plaintext parameters incomplete');
check('dispatcher-json-return', dispatcher.includes('to_jsonb(public.save_wallet_bank_account('), 'dispatcher serialization evidence missing');
check('edge-return', edge.includes('return jsonResponse(req, 200, result ?? {});'), 'Edge response evidence missing');
check('backend-full-select', /BANK_ACCOUNT_SELECT\s*=\s*['"][^'"]*document[^'"]*account_number[^'"]*pix_key/i.test(walletService), 'backend raw select evidence missing');
check('frontend-full-map', financeRepository.includes('accountNumber: row.account_number') && financeRepository.includes('pixKey: row.pix_key'), 'frontend raw mapping evidence missing');

check('runtime-readonly', contract.runtimeObservation.readOnlyInspection === true && contract.runtimeObservation.valuesInspected === false, 'runtime observation must be value-free');
check('runtime-row-count', contract.runtimeObservation.walletBankAccountRowCountObserved === 1, 'preflight observed one row');
check('runtime-no-crypto-columns', contract.runtimeObservation.cryptoLikeColumnsObserved.length === 0, 'runtime cannot claim crypto columns');
check('runtime-rls', contract.runtimeObservation.rlsEnabled === true && contract.runtimeObservation.authenticatedTableSelect === true && contract.runtimeObservation.ownerOrSupportAdminSelectPolicy === true, 'current read exposure not preserved');
check('capability-pgcrypto', contract.runtimeObservation.installedCapabilities.pgcrypto === '1.3', 'pgcrypto mismatch');
check('capability-vault', contract.runtimeObservation.installedCapabilities.supabaseVault === '0.3.1', 'Vault mismatch');

check('wal-key-authority', contract.targetArchitecture.keyAuthority.provider === 'supabase_vault' &&
  contract.targetArchitecture.keyAuthority.domain === 'WAL-001' &&
  contract.targetArchitecture.keyAuthority.reuseKycCryptoSecrets === false, 'WAL-specific key authority missing');
check('private-secret-store', contract.targetArchitecture.secretStoreCandidate.relation.startsWith('private.') &&
  contract.targetArchitecture.secretStoreCandidate.exposedThroughDataApi === false, 'secret store must be private');
check('no-direct-secret-grants', contract.targetArchitecture.secretStoreCandidate.directAnonAccess === false &&
  contract.targetArchitecture.secretStoreCandidate.directAuthenticatedAccess === false &&
  contract.targetArchitecture.secretStoreCandidate.directServiceRoleTableAccess === false, 'direct secret-store access must be denied');
check('encryption-candidate', contract.targetArchitecture.encryptionCandidate.engine === 'pgcrypto' &&
  contract.targetArchitecture.encryptionCandidate.cipher === 'aes256' &&
  contract.targetArchitecture.encryptionCandidate.nondeterministicCiphertextRequired === true, 'encryption candidate invalid');
check('no-generic-decrypt', contract.targetArchitecture.encryptionCandidate.genericDecryptRpcAllowed === false, 'generic decrypt RPC forbidden');
check('masked-only', contract.targetArchitecture.browserProjection.rawFieldsAllowed.length === 0 &&
  contract.targetArchitecture.browserProjection.ownerRawReadAllowed === false &&
  contract.targetArchitecture.browserProjection.supportRawReadAllowed === false &&
  contract.targetArchitecture.browserProjection.adminRawReadAllowed === false, 'owner/operator reads must be masked-only');
check('response-boundary', Object.values(contract.targetArchitecture.responseContract).every((value) => value === true), 'response boundary incomplete');
check('retention-unselected', contract.targetArchitecture.retentionAuthority.durationApproved === false &&
  contract.targetArchitecture.retentionAuthority.durationDays === null &&
  contract.targetArchitecture.retentionAuthority.hardcodedDurationForbidden === true, 'retention duration must remain unselected');
check('no-raw-logging', contract.targetArchitecture.loggingAuthority.rawBankDataAllowed === false &&
  contract.targetArchitecture.loggingAuthority.decryptedPayloadAllowed === false, 'raw/decrypted logging forbidden');
check('future-gates', contract.orderedFutureGates.map((gate) => gate.id).join(',') === 'WAL-B03-A02,WAL-B03-A03,WAL-B03-A04,WAL-B03-A05' &&
  contract.orderedFutureGates.every((gate) => gate.requiresSeparateAuthorization === true), 'future gates invalid');
check('blockers-preserved', ['WAL-B02','WAL-B03','WAL-B04','PAY-B01','PAY-B03','PAY-B04'].every((id) => contract.preservedBlockers.includes(id)), 'blockers must remain');
check('prohibited-effects', Object.values(contract.prohibitedEffects).every((value) => value === false), 'prohibited effects must remain false');

check('module-static-only', !/\b(fetch|axios|XMLHttpRequest|https?\.request|pg\.Client|createClient)\b/.test(moduleSource), 'authority module must not use network/database clients');
check('module-no-env', !/process\.env/.test(moduleSource), 'authority module must not read credentials');
check('docs-open-blocker', docs.includes('WAL-B03 permanece OPEN') && docs.includes('migrationApplied: false') && docs.includes('stagingMutationPerformed: false'), 'docs must preserve blocked state');
check('docs-no-secret-values', !/SUPABASE_(SERVICE_ROLE|SECRET)_KEY\s*=|postgres:\/\/|BEGIN PRIVATE KEY/.test(docs), 'docs must not contain credentials');

console.log(`WAL-B03-A01 audit: ${checks.length}/${checks.length} PASS`);
