#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3a = require('../backend/modules/communities/community-realtime-private-auth-r3a');
const config = require('../config/com-b03c-r3e-case-time-policy-snapshot-readiness.json');
const r3dEvidence = require('../docs/validation/COM-B03C-R3D-R3A-POLICY-MATERIALIZATION-EVIDENCE-READINESS.json');
const root = path.resolve(__dirname, '..');
const historicalExecutor = fs.readFileSync(path.join(root, r3e.HISTORICAL_EXECUTOR_PATH), 'utf8');

let checks = 0;
function ok(value, message) { checks += 1; if (!value) throw new Error(`DOKE_COM_B03C_R3E_TEST_FAILED:${message}`); }

ok(config.contractId === r3e.CONTRACT_ID, 'contract id');
ok(config.checkpoint.branch === r3e.REQUIRED_BRANCH, 'branch');
ok(config.checkpoint.pullRequest === r3e.REQUIRED_PULL_REQUEST, 'pull request');
ok(config.checkpoint.matrixVersion === '1.3.113', 'matrix version');
ok(config.checkpoint.maturity === 3, 'maturity');
ok(config.checkpoint.productionGate === 'blocked', 'production gate');
ok(config.predecessor.validationId === r3e.PREDECESSOR_VALIDATION_ID, 'predecessor validation');
ok(config.predecessor.status === r3e.PREDECESSOR_STATUS, 'predecessor status');
ok(r3dEvidence.status === r3e.PREDECESSOR_STATUS, 'R3D evidence status');
ok(r3dEvidence.diagnosticConclusion.presenceExactRootCauseProven === false, 'R3D root cause remains false');
ok(r3dEvidence.authority.stagingReadAuthority === false, 'R3D no staging authority');
ok(config.authority.authorizationPhraseDefined === false, 'no authorization phrase');
ok(config.authority.remoteExecutorCreated === false, 'no remote executor');
ok(config.authority.triggerCreationAuthority === false, 'no trigger authority');
ok(historicalExecutor.includes("select policyname,cmd,roles::text,qual,with_check from pg_policies"), 'historical partial inspection confirmed');
ok(!historicalExecutor.includes('policyname,permissive,roles'), 'historical permissive gap confirmed');
ok(historicalExecutor.includes('await install(db,ds)'), 'historical policy install exists');
ok(historicalExecutor.includes('const policyInspection=await inspect(db,ds)'), 'historical inspection exists');
ok(historicalExecutor.indexOf('const policyInspection=await inspect(db,ds)') < historicalExecutor.indexOf('c=await rt(pub,token)'), 'historical inspection before client');
ok(historicalExecutor.includes('await drop(db,ds)'), 'historical cleanup exists');
ok(JSON.stringify(r3e.CASE_IDS.slice(1)) === JSON.stringify(r3a.ISOLATION_CASES), 'R3E preserves R3A case order');
ok(r3e.CASE_IDS[0] === 'negative_control', 'negative control first');
ok(JSON.stringify(config.snapshotContract.policySnapshotColumns) === JSON.stringify(r3e.REQUIRED_POLICY_COLUMNS), 'policy columns exact');
ok(JSON.stringify(config.snapshotContract.snapshotPhases) === JSON.stringify(r3e.SNAPSHOT_PHASES), 'snapshot phases exact');
ok(JSON.stringify(config.snapshotContract.caseIds) === JSON.stringify(r3e.CASE_IDS), 'case ids exact');

const selectName = 'com_b03c_r3e_case_sel';
const insertName = 'com_b03c_r3e_case_ins';
const expectedPredicate = r3a.buildPredicate('uid_extension_eq', { userId: '00000000-0000-4000-8000-000000000001', topic: 'private:community:test' });
const baselineRow = { policyname: 'preexisting_policy', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: 'true', with_check: null };
const selectRow = { policyname: selectName, permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: expectedPredicate, with_check: null };
const insertRow = { policyname: insertName, permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'INSERT', qual: null, with_check: 'true' };
const expectedPolicies = { selectPolicyName: selectName, insertPolicyName: insertName, selectPredicate: expectedPredicate };
const validCase = r3e.evaluateCaseEvidence({ caseId: 'uid_extension_eq', beforeCase: [baselineRow], afterInstallBeforeSubscribe: [baselineRow, selectRow, insertRow], afterCleanup: [baselineRow], expectedPolicies });
ok(validCase.evidenceComplete === true, 'valid case evidence complete');
ok(validCase.blockers.length === 0, 'valid case no blockers');
ok(validCase.installDelta.added.length === 2, 'exact two policy additions');
ok(validCase.installDelta.changed.length === 0, 'preexisting policy unchanged');
ok(validCase.installDelta.removed.length === 0, 'no policy removed during install');
ok(validCase.cleanupDelta.added.length === 0 && validCase.cleanupDelta.changed.length === 0 && validCase.cleanupDelta.removed.length === 0, 'baseline restored');
ok(validCase.selectExactTextMatch === true, 'expected and stored select text preserved');
ok(validCase.insertControlTrueObserved === true, 'insert true control observed');
ok(validCase.predicateSemanticsProvenByTextComparison === false, 'text match does not prove semantics');
ok(validCase.joinOutcomeCanPromoteCausality === false, 'join cannot auto-promote causality');
ok(validCase.exactRootCauseProven === false, 'root cause remains false');

const rogue = { policyname: 'rogue_policy', permissive: 'PERMISSIVE', roles: '{authenticated}', cmd: 'SELECT', qual: 'true', with_check: null };
const rogueCase = r3e.evaluateCaseEvidence({ caseId: 'uid_extension_eq', beforeCase: [baselineRow], afterInstallBeforeSubscribe: [baselineRow, selectRow, insertRow, rogue], afterCleanup: [baselineRow], expectedPolicies });
ok(rogueCase.evidenceComplete === false, 'rogue policy invalidates evidence');
ok(rogueCase.blockers.includes('UNEXPECTED_POLICY_DELTA'), 'rogue delta blocker');
const changedBaseline = { ...baselineRow, qual: 'false' };
const changedCase = r3e.evaluateCaseEvidence({ caseId: 'uid_extension_eq', beforeCase: [baselineRow], afterInstallBeforeSubscribe: [changedBaseline, selectRow, insertRow], afterCleanup: [baselineRow], expectedPolicies });
ok(changedCase.evidenceComplete === false, 'preexisting policy mutation invalidates evidence');
ok(changedCase.blockers.includes('UNEXPECTED_POLICY_DELTA'), 'changed baseline blocker');
const residueCase = r3e.evaluateCaseEvidence({ caseId: 'uid_extension_eq', beforeCase: [baselineRow], afterInstallBeforeSubscribe: [baselineRow, selectRow, insertRow], afterCleanup: [baselineRow, selectRow], expectedPolicies });
ok(residueCase.evidenceComplete === false, 'cleanup residue invalidates evidence');
ok(residueCase.blockers.includes('BASELINE_NOT_RESTORED_AFTER_CLEANUP'), 'cleanup blocker');
let missingColumnRejected = false;
try { r3e.normalizePolicyRow({ policyname: 'bad' }); } catch (error) { missingColumnRejected = String(error.code || '').startsWith('DOKE_COM_B03C_R3E_POLICY_COLUMN_MISSING_'); }
ok(missingColumnRejected, 'missing snapshot column rejected');

const positive = r3e.evaluateRepositoryReadiness({
  predecessorValidationId: config.predecessor.validationId,
  predecessorStatus: config.predecessor.status,
  r3dCertified: true,
  r3dExactRootCauseProven: false,
  policySnapshotColumns: config.snapshotContract.policySnapshotColumns,
  snapshotPhases: config.snapshotContract.snapshotPhases,
  caseIds: config.snapshotContract.caseIds,
  ...config.diagnosticControls,
  stagingReadPlanned: false, stagingMutationPlanned: false, triggerCreationPlanned: false, authorizationPhraseDefined: false,
  remoteExecutorCreated: false, realtimePolicyMutationPlanned: false, realtimeSubscriptionPlanned: false,
  authIdentityLifecyclePlanned: false, communityPostsExecutionPlanned: false, channelMessagesExecutionPlanned: false,
  domainMutationPlanned: false, publicationMutationPlanned: false, runtimeDeployPlanned: false, productionPlanned: false,
  mergePlanned: false, realUserMutationPlanned: false
});
ok(positive.decision === 'repository_case_time_policy_snapshot_contract_ready', 'positive readiness');
ok(positive.repositoryReadinessAuthority === true, 'repository authority');
ok(positive.stagingReadAuthority === false, 'no staging read');
ok(positive.stagingMutationAuthority === false, 'no staging mutation');
ok(positive.realtimePolicyLifecycleAuthority === false, 'no policy lifecycle authority');
ok(positive.realtimeSubscriptionAuthority === false, 'no realtime subscription authority');
ok(positive.runtimeDeployAuthority === false, 'no runtime deploy authority');
ok(positive.productionAuthority === false, 'no production authority');
ok(positive.pullRequestMergeAuthority === false, 'no merge authority');
ok(positive.exactRootCauseProven === false, 'readiness cannot prove root cause');
const unsafe = r3e.evaluateRepositoryReadiness({ predecessorValidationId: config.predecessor.validationId, predecessorStatus: config.predecessor.status, r3dCertified: true, r3dExactRootCauseProven: false, policySnapshotColumns: config.snapshotContract.policySnapshotColumns, snapshotPhases: config.snapshotContract.snapshotPhases, caseIds: config.snapshotContract.caseIds, ...config.diagnosticControls, stagingReadPlanned: true });
ok(unsafe.decision === 'blocked_repository_only', 'staging intent blocked');
ok(unsafe.stagingReadAuthority === false, 'blocked staging authority false');
console.log(`COM-B03C-R3E readiness: ${checks}/${checks} checks passed`);
