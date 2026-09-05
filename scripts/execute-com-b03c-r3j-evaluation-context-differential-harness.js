#!/usr/bin/env node
'use strict';

const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3J_DIAGNOSTIC_FAILURE');
  const code = /^DOKE_COM_B03C_R3J_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3J_DIAGNOSTIC_FAILURE';
  return { code, rawRemoteErrorExposed: false };
}

async function snapshot(db, phase, trace) {
  trace.push(`snapshot:${phase}`);
  return r3e.normalizeInventory(await db.snapshot({ sql: r3j.SNAPSHOT_SQL, phase }));
}

function evaluateStructuralEvidence({ caseId, beforeCase, afterInstallBeforeProbe, afterCleanup, expectedPolicies }) {
  const before = r3e.normalizeInventory(beforeCase);
  const installed = r3e.normalizeInventory(afterInstallBeforeProbe);
  const cleanup = r3e.normalizeInventory(afterCleanup);
  const expectedAdded = [expectedPolicies.insertPolicyName, expectedPolicies.selectPolicyName].sort();
  const installDelta = r3e.diffInventories(before, installed);
  const cleanupDelta = r3e.diffInventories(before, cleanup);
  const select = installed.find((row) => row.policyname === expectedPolicies.selectPolicyName) || null;
  const insert = installed.find((row) => row.policyname === expectedPolicies.insertPolicyName) || null;
  const blockers = [];

  if (JSON.stringify(installDelta.added) !== JSON.stringify(expectedAdded) || installDelta.removed.length || installDelta.changed.length) {
    blockers.push('UNEXPECTED_POLICY_DELTA');
  }
  if (cleanupDelta.added.length || cleanupDelta.removed.length || cleanupDelta.changed.length) {
    blockers.push('BASELINE_NOT_RESTORED_AFTER_CLEANUP');
  }
  if (!select || select.cmd !== 'SELECT' || select.permissive !== true || !select.roles.includes('authenticated') || select.qual == null) {
    blockers.push('SELECT_POLICY_MATERIALIZATION_INCOMPLETE');
  }
  if (!insert || insert.cmd !== 'INSERT' || insert.permissive !== true || !insert.roles.includes('authenticated') || insert.with_check == null) {
    blockers.push('INSERT_POLICY_MATERIALIZATION_INCOMPLETE');
  }

  return {
    caseId,
    evidenceComplete: blockers.length === 0,
    blockers,
    beforeFingerprint: r3e.inventoryFingerprint(before),
    installedFingerprint: r3e.inventoryFingerprint(installed),
    cleanupFingerprint: r3e.inventoryFingerprint(cleanup),
    installDelta,
    cleanupDelta,
    expectedSelectPredicate: expectedPolicies.selectPredicate,
    storedSelectPredicate: select?.qual ?? null,
    storedInsertPredicate: insert?.with_check ?? null,
    predicateSemanticsProvenByTextComparison: false,
    probeOutcomeCanPromoteCausalityAlone: false,
    exactRootCauseProven: false
  };
}

async function executeCase({ db, realtime, caseId, context }) {
  const trace = [];
  const def = caseId === r3j.NEGATIVE_CONTROL_ID
    ? [r3j.NEGATIVE_CONTROL_ID, 'negative_control', 'false']
    : r3j.CASES.find(([id]) => id === caseId);
  if (!def) throw new Error('DOKE_COM_B03C_R3J_CASE_NOT_ALLOWED');
  const nonce = r3j.nonceForCase(context.nonceSeed, caseId);
  const definitions = r3j.buildPolicyDefinitions(caseId, { userId: context.userId, topic: context.topic, nonce });
  const selectDef = definitions.find((item) => item.cmd === 'SELECT');
  const insertDef = definitions.find((item) => item.cmd === 'INSERT');
  const beforeCase = await snapshot(db, 'before_case', trace);
  let afterInstallBeforeProbe = [];
  let afterCleanup = [];
  let probe = { subscribed: false, classification: 'not_attempted', rawRemoteErrorExposed: false };
  let client = null;
  let executionFailure = null;

  try {
    trace.push('install:begin');
    await db.install({ definitions, statements: r3j.buildInstallStatements(definitions) });
    trace.push('install:complete');
    afterInstallBeforeProbe = await snapshot(db, 'after_install_before_probe', trace);
    trace.push('realtime:create_fresh_client');
    client = await realtime.createClient({
      caseId,
      surface: def[1],
      userId: context.userId,
      accessToken: context.accessToken,
      topic: context.topic
    });
    trace.push('realtime:probe_presence_read_join');
    const result = await client.subscribePresenceReadJoin();
    probe = {
      subscribed: result?.subscribed === true,
      classification: String(result?.classification || (result?.subscribed ? 'subscribed' : 'unspecified_probe_failure')),
      rawRemoteErrorExposed: false
    };
  } catch (error) {
    executionFailure = safeFailure(error);
  } finally {
    if (client && typeof client.remove === 'function') {
      trace.push('realtime:remove');
      await client.remove().catch(() => {});
    }
    trace.push('cleanup:drop');
    await db.drop({ definitions, statements: r3j.buildDropStatements(definitions) }).catch(() => {});
    afterCleanup = await snapshot(db, 'after_cleanup', trace);
  }

  const expectedPolicies = {
    selectPolicyName: selectDef.policyname,
    insertPolicyName: insertDef.policyname,
    selectPredicate: selectDef.expression,
    insertPredicate: insertDef.expression
  };
  const structuralEvidence = evaluateStructuralEvidence({
    caseId,
    beforeCase,
    afterInstallBeforeProbe,
    afterCleanup,
    expectedPolicies
  });

  return {
    caseId,
    surface: def[1],
    predicateTemplate: def[2],
    expectedPolicies,
    snapshots: {
      before_case: beforeCase,
      after_install_before_probe: afterInstallBeforeProbe,
      after_cleanup: afterCleanup
    },
    structuralEvidence,
    probe,
    executionFailure,
    trace,
    sameIdentityTokenTopicRequired: true,
    freshRealtimeClientPerCaseRequired: true,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
}

async function executePlan({ db, realtime, context }) {
  if (!context?.userId || !context?.accessToken || !context?.topic || !context?.nonceSeed) {
    throw new Error('DOKE_COM_B03C_R3J_PLAN_CONTEXT_REQUIRED');
  }
  const results = [];
  for (const caseId of r3j.EXECUTION_CASE_IDS) {
    results.push(await executeCase({ db, realtime, caseId, context }));
  }
  return {
    validationId: 'COM-B03C-R3J-EVALUATION-CONTEXT-DIFFERENTIAL-REPORT',
    contractId: r3j.CONTRACT_ID,
    differentialProbeCount: r3j.CASE_IDS.length,
    totalExecutionCaseCount: results.length,
    caseIds: results.map((item) => item.caseId),
    caseResults: results,
    sameIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    freshRealtimeClientPerCase: true,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    rawRemoteErrorExposed: false
  };
}

function createSyntheticAdapters(options = {}) {
  const baseline = [{
    policyname: 'existing_safe_policy',
    permissive: 'PERMISSIVE',
    roles: ['authenticated'],
    cmd: 'SELECT',
    qual: 'true',
    with_check: null
  }];
  let rows = baseline.map((row) => ({ ...row }));
  const corruptCaseId = options.corruptCaseId || null;
  const leaveResidueCaseId = options.leaveResidueCaseId || null;

  const db = {
    async snapshot() {
      return rows.map((row) => ({ ...row, roles: Array.isArray(row.roles) ? [...row.roles] : row.roles }));
    },
    async install({ definitions }) {
      for (const item of definitions) {
        rows.push({
          policyname: item.policyname,
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          cmd: item.cmd,
          qual: item.cmd === 'SELECT' ? item.expression : null,
          with_check: item.cmd === 'INSERT' ? item.expression : null
        });
      }
      if (corruptCaseId && definitions.some((item) => item.policyname.includes(corruptCaseId.slice(0, 10)))) {
        rows.push({
          policyname: `unexpected_${corruptCaseId}`.slice(0, 63),
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          cmd: 'SELECT',
          qual: 'true',
          with_check: null
        });
      }
    },
    async drop({ definitions }) {
      const names = new Set(definitions.map((item) => item.policyname));
      if (leaveResidueCaseId && definitions.some((item) => item.policyname.includes(leaveResidueCaseId.slice(0, 10)))) return;
      rows = rows.filter((row) => !names.has(row.policyname) && !String(row.policyname).startsWith('unexpected_'));
    }
  };

  const syntheticPasses = new Set([
    'control_true',
    'extension_direct',
    'uid_helper_direct',
    'topic_helper_direct',
    'row_topic_direct',
    'row_topic_extension',
    'raw_topic_setting_extension',
    'raw_sub_setting_extension',
    'claims_json_sub_extension',
    'raw_settings_full'
  ]);
  const realtime = {
    async createClient({ caseId }) {
      let removed = false;
      return {
        async subscribePresenceReadJoin() {
          return {
            subscribed: syntheticPasses.has(caseId),
            classification: syntheticPasses.has(caseId) ? 'synthetic_subscribed' : 'synthetic_rls_rejection'
          };
        },
        async remove() { removed = true; return removed; }
      };
    }
  };
  return { db, realtime };
}

async function repositorySelfTest() {
  const { db, realtime } = createSyntheticAdapters();
  const report = await executePlan({
    db,
    realtime,
    context: {
      userId: '11111111-1111-4111-8111-111111111111',
      accessToken: 'repository-only-synthetic-token',
      topic: 'room:repository-only-r3j',
      nonceSeed: 'r3j-repository-self-test'
    }
  });
  if (report.differentialProbeCount !== 16 || report.totalExecutionCaseCount !== 17 || JSON.stringify(report.caseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)) {
    throw new Error('DOKE_COM_B03C_R3J_SELF_TEST_CASE_MATRIX_INVALID');
  }
  const negative = report.caseResults.find((item) => item.caseId === r3j.NEGATIVE_CONTROL_ID);
  if (!negative || negative.probe.subscribed !== false) {
    throw new Error('DOKE_COM_B03C_R3J_SELF_TEST_NEGATIVE_CONTROL_INVALID');
  }
  if (report.caseResults.some((item) => item.structuralEvidence.evidenceComplete !== true)) {
    throw new Error('DOKE_COM_B03C_R3J_SELF_TEST_EVIDENCE_INCOMPLETE');
  }
  return report;
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      const report = await repositorySelfTest();
      process.stdout.write(`${JSON.stringify({
        contractId: report.contractId,
        differentialProbeCount: report.differentialProbeCount,
        totalExecutionCaseCount: report.totalExecutionCaseCount,
        repositorySelfTest: 'success',
        stagingAccess: false,
        causalPromotionAllowed: false
      })}\n`);
      return;
    }
    r3j.assertRemoteExecutionBlocked();
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3J_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeFailure,
  evaluateStructuralEvidence,
  executeCase,
  executePlan,
  createSyntheticAdapters,
  repositorySelfTest
};
