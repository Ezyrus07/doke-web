#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const configPath = path.join(root, 'config/dsp-a01-authority-baseline.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const checks = [];

function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

check('contract id', config.contractId === 'dsp-a01-authority-baseline-v1');
check('domain', config.domain === 'DSP-001');
check('repository-only scope', config.scope === 'repository_only');
check('runtime not integrated', config.runtimeIntegrated === false);
check('migration not prepared', config.migrationPrepared === false);
check('migration not applied', config.migrationApplied === false);
check('staging not validated', config.stagingValidated === false);
check('policy absent', config.approvedPolicyPresent === false);
check('provider chargeback absent', config.providerChargebackIntegrated === false);
check('operator workflow incomplete', config.operatorCaseWorkflowComplete === false);

const expectedBlockers = ['DSP-B01', 'DSP-B03', 'DSP-B04', 'PAY-B01', 'PAY-B03', 'PAY-B04', 'WAL-B02', 'WAL-B03', 'WAL-B04'];
expectedBlockers.forEach((blocker) => check(`blocker ${blocker}`, config.preservedBlockers.includes(blocker)));

const expectedRules = {
  prePaymentCancellation: 'contract_only_no_financial_effect',
  postPaymentCancellation: 'dispute_required',
  openDispute: 'participant_and_linked_order_validation_required',
  respondDispute: 'counterparty_and_linked_order_validation_required',
  refundDecision: 'blocked_policy_reconciliation_and_operator_evidence_required',
  releaseDecision: 'blocked_policy_reconciliation_and_operator_evidence_required',
  providerChargeback: 'blocked_provider_integration_required',
  appealDecision: 'blocked_case_workflow_and_policy_required'
};
Object.entries(expectedRules).forEach(([key, value]) => check(`decision rule ${key}`, config.decisionRules[key] === value));

check('six baseline findings', Array.isArray(config.baselineFindings) && config.baselineFindings.length === 6);
check('critical policy finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F01' && item.severity === 'critical' && item.blockedBy === 'DSP-B01'));
check('provider finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F02' && item.blockedBy === 'DSP-B03'));
check('support finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F03' && item.blockedBy === 'DSP-B04'));
check('authority split finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F04'));
check('terminal effect finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F05'));
check('state map finding', config.baselineFindings.some((item) => item.id === 'DSP-A01-F06'));
check('ten mandatory invariants', Array.isArray(config.mandatoryInvariants) && config.mandatoryInvariants.length === 10);
check('four next sublots', Array.isArray(config.nextSublots) && config.nextSublots.length === 4);

Object.entries(config.authority).forEach(([key, value]) => {
  check(`authority ${key}`, key === 'contractAuthority' ? value === true : value === false);
});
Object.entries(config.prohibitedEffects).forEach(([key, value]) => check(`prohibited effect ${key}`, value === false));

config.observedSurfaces.forEach((relativePath) => check(`observed surface ${relativePath}`, fs.existsSync(path.join(root, relativePath))));

const localContract = read('scripts/test-order-cancellation-dispute-contract.js');
const backendWallet = read('backend/modules/wallet/wallet-service.js');
const financeRepository = read('assets/js/repositories/finance-repository.js');
const walletRepository = read('assets/js/repositories/wallet-repository.js');
const migration107 = read('supabase/migrations/107_financial_rpc_authority.sql');
const migration108 = read('supabase/migrations/108_financial_operator_authority.sql');
const financialOperations = read('supabase/functions/financial-operations/operations.mjs');

check('local contract exercises localStorage', localContract.includes('localStorage'));
check('local contract exercises cancellation', localContract.includes('cancelBeforePayment'));
check('local contract exercises dispute opening', localContract.includes('openDispute'));
check('local contract exercises professional response', localContract.includes('respondDispute'));
check('local contract exercises held payment', localContract.includes("paymentStatus === 'held'") || localContract.includes("paymentStatus, 'held'"));
check('backend exposes dispute projection', backendWallet.includes('DISPUTE_SELECT') && backendWallet.includes('normalizeDispute'));
check('backend references payment disputes', backendWallet.includes('payment_disputes'));
check('frontend finance repository exists', financeRepository.length > 500);
check('frontend wallet repository exists', walletRepository.length > 500);
check('financial rpc migration references dispute authority', migration107.includes('dispute') || migration107.includes('payment_disputes'));
check('operator migration references dispute authority', migration108.includes('dispute') || migration108.includes('payment_disputes'));
check('financial operations runtime exists', financialOperations.length > 500);

const failed = checks.filter((item) => !item.passed);
const result = {
  contractId: config.contractId,
  sourceHead: config.sourceHead,
  total: checks.length,
  passed: checks.length - failed.length,
  failed: failed.length,
  status: failed.length ? 'failed' : 'passed',
  failedChecks: failed.map((item) => item.name),
  effects: config.prohibitedEffects
};

console.log(JSON.stringify(result, null, 2));
if (failed.length) process.exit(1);
