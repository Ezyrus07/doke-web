#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const r3i = require('../backend/modules/communities/community-realtime-private-auth-r3i');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const executor = require('./execute-com-b03c-r3j-evaluation-context-differential-harness');
const verifier = require('./verify-com-b03c-r3j-evaluation-context-differential-report');

const ROOT = path.resolve(__dirname, '..');
const config = require('../config/com-b03c-r3j-evaluation-context-differential-harness-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-HARNESS-READINESS.json');

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function expectFailure(fn, code) {
  let observed = null;
  try { await fn(); } catch (error) { observed = error?.code || error?.message; }
  assert(observed === code, `EXPECTED_${code}_GOT_${observed || 'NO_FAILURE'}`);
}

(async () => {
  assert(r3j.CASE_IDS.length === 16, 'R3J_DIFFERENTIAL_PROBE_COUNT_INVALID');
  assert(r3j.EXECUTION_CASE_IDS.length === 17 && r3j.EXECUTION_CASE_IDS[0] === 'negative_control', 'R3J_EXECUTION_CASE_COUNT_INVALID');
  assert(JSON.stringify(r3j.CASE_IDS) === JSON.stringify(r3i.CASES.map(([id]) => id)), 'R3J_CASE_SOURCE_DRIFT');
  assert(new Set(r3j.EXECUTION_CASE_IDS).size === 17, 'R3J_CASE_IDS_NOT_UNIQUE');

  const decision = r3j.evaluateRepositoryHarnessReadiness(config.readinessInput);
  assert(decision.decision === 'repository_evaluation_context_differential_harness_ready_no_remote_authority', 'R3J_READINESS_NOT_READY');
  assert(decision.remoteExecutionAuthority === false && decision.stagingReadAuthority === false && decision.stagingMutationAuthority === false, 'R3J_REMOTE_AUTHORITY_OPEN');
  assert(decision.causalPromotionAllowed === false && decision.exactRootCauseProven === false, 'R3J_CAUSAL_PROMOTION_OPEN');

  const predicate = r3j.renderPredicate('upstream_exact_full', {
    userId: '11111111-1111-4111-8111-111111111111',
    topic: "room:r3j-'quoted'"
  });
  assert(!predicate.includes('<uid>') && !predicate.includes('<topic>'), 'R3J_TEMPLATE_NOT_RENDERED');
  assert(predicate.includes("room:r3j-''quoted''"), 'R3J_TOPIC_NOT_SQL_ESCAPED');

  const report = await executor.repositorySelfTest();
  const verified = verifier.verifyReport(report);
  assert(verified.evidenceComplete === true && verified.differentialProbeCount === 16 && verified.totalExecutionCaseCount === 17, 'R3J_SELF_TEST_VERIFY_FAILED');

  const badOrder = JSON.parse(JSON.stringify(report));
  [badOrder.caseResults[0], badOrder.caseResults[1]] = [badOrder.caseResults[1], badOrder.caseResults[0]];
  await expectFailure(() => Promise.resolve(verifier.verifyReport(badOrder)), 'DOKE_COM_B03C_R3J_REPORT_CASE_DESCRIPTOR_INVALID');

  const badCleanup = JSON.parse(JSON.stringify(report));
  badCleanup.caseResults[0].structuralEvidence.cleanupDelta.added.push('residue');
  await expectFailure(() => Promise.resolve(verifier.verifyReport(badCleanup)), 'DOKE_COM_B03C_R3J_REPORT_CLEANUP_INVALID');

  const badDelta = JSON.parse(JSON.stringify(report));
  badDelta.caseResults[0].structuralEvidence.installDelta.added.push('unexpected');
  await expectFailure(() => Promise.resolve(verifier.verifyReport(badDelta)), 'DOKE_COM_B03C_R3J_REPORT_POLICY_DELTA_INVALID');

  await expectFailure(
    () => Promise.resolve().then(() => r3j.assertRemoteExecutionBlocked()),
    r3j.REMOTE_EXECUTION_BLOCK_CODE
  );

  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/com-b03c-r3j-evaluation-context-differential-harness-readiness.yml'), 'utf8');
  const forbiddenWorkflowTokens = [
    ['environment:', ' doke-staging'].join(''),
    ['SUPABASE_', 'ACCESS_TOKEN'].join(''),
    ['SUPABASE_', 'DB_PASSWORD'].join(''),
    ['I_EXPLICITLY_', 'AUTHORIZE_COM_B03C_R3J'].join('')
  ];
  for (const token of forbiddenWorkflowTokens) {
    assert(!workflow.includes(token), `R3J_WORKFLOW_FORBIDDEN_TOKEN_${token.replace(/[^A-Z0-9]+/gi, '_')}`);
  }
  assert(!fs.existsSync(path.join(ROOT, 'config/com-b03c-r3j-evaluation-context-differential-staging-trigger.json')), 'R3J_TRIGGER_PRESENT');

  assert(evidence.remoteBoundary.remoteExecutorPrepared === false, 'R3J_EVIDENCE_REMOTE_EXECUTOR_PREPARED');
  assert(evidence.remoteBoundary.triggerPrepared === false, 'R3J_EVIDENCE_TRIGGER_PREPARED');
  assert(evidence.remoteBoundary.authorizationPhraseDefined === false, 'R3J_EVIDENCE_AUTH_PHRASE_PREPARED');
  assert(evidence.effects.stagingAccessExecuted === false, 'R3J_EVIDENCE_STAGING_EFFECT');

  process.stdout.write(JSON.stringify({
    contractId: r3j.CONTRACT_ID,
    checks: 27,
    differentialProbeCount: r3j.CASE_IDS.length,
    totalExecutionCaseCount: r3j.EXECUTION_CASE_IDS.length,
    repositoryHarness: 'success',
    remoteAuthority: false,
    stagingAccess: false,
    exactRootCauseProven: false
  }) + '\n');
})().catch((error) => {
  process.stderr.write(`${String(error?.code || error?.message || error)}\n`);
  process.exitCode = 1;
});
