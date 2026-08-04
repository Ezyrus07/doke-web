'use strict';

const fs = require('fs');
const path = require('path');

const contractPath = path.resolve(__dirname, '..', 'config', 'wal-a01-authority-baseline.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const cases = [];

function check(id, predicate, detail) {
  const passed = Boolean(predicate);
  cases.push({ id, passed, detail });
  if (!passed) throw new Error(`WAL-A01 conformance failed [${id}]: ${detail}`);
}

check('canonical-contract', contract.contractId === 'wal-a01-authority-baseline-v1', 'contract id mismatch');
check('frozen-status', contract.status === 'baseline_frozen_followup_required', 'baseline cannot claim completion');
check('repository-only', contract.scope === 'repository_only', 'scope must remain repository-only');
check('hybrid-ui', contract.currentAuthority.userFacingAuthority === 'hybrid', 'current UI authority must remain hybrid');
check('partial-server', contract.currentAuthority.serverAuthority === 'partial', 'current server authority must remain partial');
check('security-blocked', contract.currentAuthority.securityGate === 'blocked', 'security gate must remain blocked');
check('production-blocked', contract.currentAuthority.productionGate === 'blocked', 'production gate must remain blocked');
check('no-real-money', contract.currentAuthority.realMoneyAuthority === false, 'real-money authority is forbidden');
check('no-provider-transfer', contract.currentAuthority.providerTransferAuthority === false, 'provider transfer authority is forbidden');

const findings = contract.findings || [];
check('eight-findings', findings.length === 8, 'exactly eight findings are required');
check('unique-findings', new Set(findings.map((item) => item.id)).size === findings.length, 'finding ids must be unique');
check('critical-findings', findings.filter((item) => item.severity === 'critical').length === 2, 'two critical findings are required');
check('finding-evidence', findings.every((item) => Array.isArray(item.evidencePaths) && item.evidencePaths.length >= 2), 'every finding must cite at least two repository paths');
check('browser-persistence-finding', findings.some((item) => item.id === 'WAL-A01-F01' && item.category === 'sensitive_browser_persistence'), 'browser persistence finding is required');
check('plaintext-finding', findings.some((item) => item.id === 'WAL-A01-F02' && item.category === 'plaintext_bank_data'), 'plaintext bank-data finding is required');
check('authority-split-finding', findings.some((item) => item.id === 'WAL-A01-F03' && item.category === 'authority_split'), 'authority split finding is required');
check('retry-finding', findings.some((item) => item.id === 'WAL-A01-F04' && item.category === 'retry_idempotency'), 'retry identity finding is required');
check('provider-finding', findings.some((item) => item.id === 'WAL-A01-F08' && item.category === 'provider_dependency'), 'provider dependency finding is required');

const invariants = contract.mandatoryInvariants || [];
check('invariant-count', invariants.length === 8, 'eight mandatory invariants are required');
check('no-local-uuid', invariants.some((item) => item.includes('UUID sessions never create local financial outcomes')), 'UUID fail-closed invariant is required');
check('unavailable-not-zero', invariants.some((item) => item.includes('zero or empty wallet')), 'unavailable-state invariant is required');
check('masked-bank-data', invariants.some((item) => item.includes('not persisted in browser storage')), 'bank-data masking invariant is required');
check('stable-retry', invariants.some((item) => item.includes('stable client request identity')), 'stable retry invariant is required');
check('provider-confirmation', invariants.some((item) => item.includes('provider-confirmed transfer evidence')), 'provider confirmation invariant is required');
check('pay-b03-boundary', invariants.some((item) => item.includes('PAY-B03')), 'commercial policy boundary is required');

const blockers = contract.preservedBlockers || [];
check('wallet-blockers', ['WAL-B02', 'WAL-B03', 'WAL-B04'].every((id) => blockers.includes(id)), 'all wallet blockers must be preserved');
check('payment-blockers', ['PAY-B01', 'PAY-B03', 'PAY-B04'].every((id) => blockers.includes(id)), 'all payment dependencies must be preserved');

const sublots = contract.nextSublots || [];
check('sublot-order', sublots.map((item) => item.id).join(',') === 'WAL-A02,WAL-A03,WAL-A04,WAL-A05', 'follow-up order must remain deterministic');
check('external-provider-block', sublots.find((item) => item.id === 'WAL-A05')?.authority === 'blocked_external_provider', 'provider-transfer work must remain externally blocked');

const effects = contract.prohibitedEffects || {};
check('effect-count', Object.keys(effects).length === 10, 'ten prohibited-effect fields are required');
check('effects-all-false', Object.values(effects).every((value) => value === false), 'every prohibited effect must remain false');

const result = {
  contractId: contract.contractId,
  total: cases.length,
  passed: cases.filter((item) => item.passed).length,
  failed: cases.filter((item) => !item.passed).length,
  status: 'passed'
};

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
