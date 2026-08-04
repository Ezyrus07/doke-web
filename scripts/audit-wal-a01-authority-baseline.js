'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const checks = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`WAL-A01 missing required source: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function assertCheck(id, condition, detail) {
  checks.push({ id, passed: Boolean(condition), detail });
  if (!condition) throw new Error(`WAL-A01 audit failed [${id}]: ${detail}`);
}

const contract = JSON.parse(read('config/wal-a01-authority-baseline.json'));
const matrix = read('config/domain-completion-matrix.json');
const localWallet = read('assets/js/repositories/wallet-repository.js');
const financeRepository = read('assets/js/repositories/finance-repository.js');
const walletService = read('backend/modules/wallet/wallet-service.js');
const routeHandlers = read('backend/modules/wallet/route-handlers.js');
const walletFoundation = read('supabase/migrations/005_wallet_runtime_foundation.sql');
const sharedRuntime = read('supabase/migrations/014_finance_wallet_shared_runtime.sql');
const hardenedAuthority = read('supabase/migrations/107_financial_rpc_authority.sql');

assertCheck('contract-id', contract.contractId === 'wal-a01-authority-baseline-v1', 'canonical contract id must remain stable');
assertCheck('domain', contract.domain === 'WAL-001', 'contract must belong to WAL-001');
assertCheck('source-head', /^[0-9a-f]{40}$/.test(contract.sourceHead), 'source head must be a full Git SHA');
assertCheck('scope', contract.scope === 'repository_only', 'baseline must remain repository-only');
assertCheck('real-money-denied', contract.currentAuthority.realMoneyAuthority === false, 'real-money authority must remain false');
assertCheck('provider-transfer-denied', contract.currentAuthority.providerTransferAuthority === false, 'provider transfer authority must remain false');
assertCheck('production-denied', contract.currentAuthority.productionAuthority === false, 'production authority must remain false');
assertCheck('findings-complete', Array.isArray(contract.findings) && contract.findings.length === 8, 'eight baseline findings are required');
assertCheck('blockers-preserved', ['WAL-B02', 'WAL-B03', 'WAL-B04', 'PAY-B01', 'PAY-B03', 'PAY-B04'].every((id) => contract.preservedBlockers.includes(id)), 'wallet and payment blockers must remain explicit');

assertCheck('matrix-domain', matrix.includes('"id": "WAL-001"'), 'domain matrix must contain WAL-001');
assertCheck('matrix-sensitive-blocker', matrix.includes('"id": "WAL-B03"'), 'bank-data blocker must remain in matrix');
assertCheck('matrix-authority-split', matrix.includes('"id": "WAL-B04"'), 'authority-split blocker must remain in matrix');

assertCheck('local-storage-key', localWallet.includes("var STORAGE_KEY = 'doke.wallet.local.v1'"), 'local wallet persistence must stay inventoried');
assertCheck('local-storage-write', localWallet.includes('localStorage.setItem(STORAGE_KEY'), 'local wallet projection write must stay inventoried');
assertCheck('local-bank-fields', localWallet.includes('accountNumber:') && localWallet.includes('pixKey:'), 'full local bank fields must stay inventoried until WAL-A02');
assertCheck('local-fee', localWallet.includes('DOKE_FEE_RATE = 0.05'), 'legacy fixed fee must stay visible as noncanonical debt');

assertCheck('remote-map-bank', financeRepository.includes('function mapRemoteBankAccount'), 'remote bank-account mapping must stay inventoried');
assertCheck('remote-local-projection', financeRepository.includes('function saveRemoteWalletProjection') && financeRepository.includes('localWallet.writeWallet(wallet)'), 'remote projection caching must stay inventoried');
assertCheck('uuid-fail-closed', financeRepository.includes('hasAuthenticatedUuidSession()') && financeRepository.includes('authenticatedAuthorityError'), 'authenticated UUID mutations must fail closed');
assertCheck('unstable-withdraw-id', financeRepository.includes("var transactionId = 'wallet_tx_' + Date.now()") && financeRepository.includes("Math.random().toString(36)"), 'unstable retry identity must stay inventoried until WAL-A04');
assertCheck('withdraw-rpc', financeRepository.includes("callRpc('request_wallet_withdrawal'"), 'preferred withdrawal path must use the hardened RPC');

assertCheck('legacy-bank-handler', routeHandlers.includes("handlers.saveBankAccount = audited('wallet.saveBankAccount'"), 'legacy bank handler must stay inventoried');
assertCheck('legacy-withdraw-handler', routeHandlers.includes("handlers.requestWithdrawal = audited('withdrawals.request'"), 'legacy withdrawal handler must stay inventoried');
assertCheck('legacy-direct-bank-write', walletService.includes(".from('wallet_bank_accounts')") && walletService.includes('.upsert(payload'), 'legacy direct bank-account DML must stay inventoried');
assertCheck('legacy-auto-verified', walletService.includes("status: 'verified'"), 'legacy automatic verification must stay inventoried');
assertCheck('legacy-direct-withdraw', walletService.includes(".from('withdrawals')") && walletService.includes('.insert(payload)'), 'legacy direct withdrawal DML must stay inventoried');
assertCheck('legacy-balance-error-swallow', walletService.includes('adjustWalletBalance') && walletService.includes('.catch(() => null)'), 'legacy ignored balance-adjustment failure must stay inventoried');

assertCheck('plaintext-foundation', ['document text', 'branch text', 'account_number text', 'pix_key text'].every((fragment) => walletFoundation.includes(fragment)), 'plaintext bank fields must stay inventoried');
assertCheck('shared-five-percent', sharedRuntime.includes('0.05'), 'older fixed five-percent finance rule must stay inventoried');
assertCheck('atomic-wallet-lock', hardenedAuthority.includes('for update') && hardenedAuthority.includes('DOKE_WITHDRAWAL_BALANCE_INSUFFICIENT'), 'hardened RPC must lock and validate wallet balance');
assertCheck('stable-id-required', hardenedAuthority.includes('DOKE_WITHDRAWAL_IDEMPOTENCY_REQUIRED') && hardenedAuthority.includes('DOKE_WITHDRAWAL_IDEMPOTENCY_CONFLICT'), 'hardened RPC must require and validate idempotency');
assertCheck('atomic-reservation', hardenedAuthority.includes('set balance_cents = balance_cents - p_amount_cents'), 'hardened RPC must reserve balance atomically');
assertCheck('snapshot-inventory', hardenedAuthority.includes('bank_account_snapshot') && hardenedAuthority.includes('to_jsonb(v_account)'), 'full withdrawal snapshot debt must stay inventoried');

const effects = contract.prohibitedEffects || {};
assertCheck('all-effects-denied', Object.values(effects).every((value) => value === false), 'all remote and financial effects must remain false');

const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total: checks.length,
  passed: checks.filter((item) => item.passed).length,
  failed: checks.filter((item) => !item.passed).length,
  status: 'passed',
  effects
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
