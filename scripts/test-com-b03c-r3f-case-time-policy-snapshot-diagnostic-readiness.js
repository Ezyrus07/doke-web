#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');
const executor = require('./execute-com-b03c-r3f-case-time-policy-snapshot-diagnostic');
const verifier = require('./verify-com-b03c-r3f-case-time-policy-snapshot-evidence');
const config = require('../config/com-b03c-r3f-case-time-policy-snapshot-diagnostic-readiness.json');

let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks += 1; }

async function main() {
  const readiness = r3f.evaluateRepositoryImplementationReadiness({
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorEvidenceHead: config.predecessor.evidenceHead,
    predecessorRecertRun: config.predecessor.recertification.run,
    predecessorRecertJob: config.predecessor.recertification.job,
    predecessorRecertSuccess: config.predecessor.recertification.status === 'success',
    caseIds: config.implementation.caseIds,
    policySnapshotColumns: config.implementation.policySnapshotColumns,
    snapshotPhases: config.implementation.snapshotPhases,
    snapshotSql: config.implementation.snapshotSql,
    ...config.controls,
    ...config.executionIntent
  });
  check(readiness.decision === 'repository_case_time_snapshot_diagnostic_implementation_ready', 'readiness decision');
  check(readiness.stagingReadAuthority === false, 'staging read false');
  check(readiness.stagingMutationAuthority === false, 'staging mutation false');
  check(readiness.exactRootCauseProven === false, 'root cause remains false');
  check(readiness.runtimeChangeAuthorized === false, 'runtime change false');
  check(r3f.SNAPSHOT_SQL.includes('policyname, permissive, roles, cmd, qual, with_check'), 'complete snapshot columns');
  check(JSON.stringify(r3f.CASE_IDS) === JSON.stringify(r3e.CASE_IDS), 'case matrix inherited');

  const report = await executor.repositorySelfTest();
  const verification = verifier.verifyReport(report);
  check(verification.verified === true, 'synthetic report verifies');
  check(report.caseCount === r3f.CASE_IDS.length, 'all cases executed');
  for (const item of report.caseResults) {
    check(item.structuralEvidence.evidenceComplete === true, `${item.caseId} structural evidence complete`);
    check(item.trace.indexOf('snapshot:after_install_before_subscribe') < item.trace.indexOf('realtime:create_client'), `${item.caseId} snapshot before client`);
    check(item.snapshots.after_cleanup.length === item.snapshots.before_case.length, `${item.caseId} cleanup baseline cardinality`);
    check(item.rawRemoteErrorExposed === false, `${item.caseId} raw error hidden`);
  }

  let hardBlocked = false;
  try { r3f.assertRemoteExecutionBlocked(); } catch (error) { hardBlocked = error.code === r3f.REMOTE_EXECUTION_BLOCK_CODE; }
  check(hardBlocked, 'remote CLI hard-blocked');

  const defs = r3f.buildPolicyDefinitions('full_current_direct', { userId: '11111111-1111-4111-8111-111111111111', topic: 'room:test', nonce: 'abcdef123456' });
  check(defs.length === 2, 'two policies');
  check(defs.some((item) => item.cmd === 'SELECT'), 'select policy present');
  check(defs.some((item) => item.cmd === 'INSERT'), 'insert policy present');
  check(r3f.buildInstallStatements(defs).length === 2, 'install statements built');
  check(r3f.buildDropStatements(defs).length === 2, 'drop statements built');

  const baseline = [{ policyname: 'baseline', permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: 'true', with_check: null }];
  const select = defs.find((item) => item.cmd === 'SELECT');
  const insert = defs.find((item) => item.cmd === 'INSERT');
  const installed = baseline.concat([
    { policyname: select.policyname, permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: select.expression, with_check: null },
    { policyname: insert.policyname, permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'INSERT', qual: null, with_check: 'true' },
    { policyname: 'unexpected_concurrent_policy', permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: 'true', with_check: null }
  ]);
  const unexpected = r3e.evaluateCaseEvidence({ caseId: 'full_current_direct', beforeCase: baseline, afterInstallBeforeSubscribe: installed, afterCleanup: baseline,
    expectedPolicies: { selectPolicyName: select.policyname, insertPolicyName: insert.policyname, selectPredicate: select.expression } });
  check(unexpected.evidenceComplete === false, 'unexpected concurrent policy fails closed');
  check(unexpected.blockers.includes('UNEXPECTED_POLICY_DELTA'), 'unexpected delta blocker');

  const changedBaseline = [{ ...baseline[0], qual: 'false' }];
  const mutated = r3e.evaluateCaseEvidence({ caseId: 'full_current_direct', beforeCase: baseline, afterInstallBeforeSubscribe: baseline.concat([
    { policyname: select.policyname, permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: select.expression, with_check: null },
    { policyname: insert.policyname, permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'INSERT', qual: null, with_check: 'true' }
  ]), afterCleanup: changedBaseline,
    expectedPolicies: { selectPolicyName: select.policyname, insertPolicyName: insert.policyname, selectPredicate: select.expression } });
  check(mutated.evidenceComplete === false, 'baseline mutation fails closed');
  check(mutated.blockers.includes('BASELINE_NOT_RESTORED_AFTER_CLEANUP'), 'cleanup mismatch blocker');

  const blocked = r3f.evaluateRepositoryImplementationReadiness({});
  check(blocked.decision === 'blocked_repository_only', 'missing predecessor blocked');
  check(blocked.stagingReadAuthority === false, 'blocked authority remains false');

  process.stdout.write(`COM-B03C-R3F repository diagnostic implementation readiness: ${checks}/${checks} PASS\n`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
