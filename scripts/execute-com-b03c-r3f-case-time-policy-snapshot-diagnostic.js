#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const r3e = require('../backend/modules/communities/community-realtime-private-auth-r3e');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');

function safeFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3F_DIAGNOSTIC_FAILURE');
  const code = /^DOKE_COM_B03C_R3F_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3F_DIAGNOSTIC_FAILURE';
  return { code, rawRemoteErrorExposed: false };
}

async function snapshot(db, phase, trace) {
  trace.push(`snapshot:${phase}`);
  const rows = await db.snapshot({ sql: r3f.SNAPSHOT_SQL, phase });
  return r3e.normalizeInventory(rows);
}

async function executeCase({ db, realtime, caseId, context }) {
  const trace = [];
  const nonce = context.nonceForCase(caseId);
  const definitions = r3f.buildPolicyDefinitions(caseId, { userId: context.userId, topic: context.topic, nonce });
  const selectDef = definitions.find((item) => item.cmd === 'SELECT');
  const insertDef = definitions.find((item) => item.cmd === 'INSERT');
  const beforeCase = await snapshot(db, 'before_case', trace);
  let afterInstallBeforeSubscribe = [];
  let afterCleanup = [];
  let join = { subscribed: false, classification: 'not_attempted', rawRemoteErrorExposed: false };
  let client = null;
  let executionFailure = null;

  try {
    trace.push('install:begin');
    await db.install({ definitions, statements: r3f.buildInstallStatements(definitions) });
    trace.push('install:complete');
    afterInstallBeforeSubscribe = await snapshot(db, 'after_install_before_subscribe', trace);
    trace.push('realtime:create_client');
    client = await realtime.createClient({ caseId, userId: context.userId, accessToken: context.accessToken, topic: context.topic });
    trace.push('realtime:subscribe');
    const result = await client.subscribePresenceReadJoin();
    join = {
      subscribed: result?.subscribed === true,
      classification: String(result?.classification || (result?.subscribed ? 'subscribed' : 'unspecified_join_failure')),
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
    await db.drop({ definitions, statements: r3f.buildDropStatements(definitions) }).catch(() => {});
    afterCleanup = await snapshot(db, 'after_cleanup', trace);
  }

  const structuralEvidence = r3e.evaluateCaseEvidence({
    caseId,
    beforeCase,
    afterInstallBeforeSubscribe,
    afterCleanup,
    expectedPolicies: {
      selectPolicyName: selectDef.policyname,
      insertPolicyName: insertDef.policyname,
      selectPredicate: selectDef.expression
    }
  });

  return {
    caseId,
    expectedPolicies: {
      selectPolicyName: selectDef.policyname,
      insertPolicyName: insertDef.policyname,
      selectPredicate: selectDef.expression,
      insertPredicate: insertDef.expression
    },
    snapshots: { before_case: beforeCase, after_install_before_subscribe: afterInstallBeforeSubscribe, after_cleanup: afterCleanup },
    structuralEvidence,
    join,
    executionFailure,
    trace,
    predicateSemanticsProvenByTextComparison: false,
    joinOutcomeCanPromoteCausality: false,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
}

async function executePlan({ db, realtime, context }) {
  if (!context?.userId || !context?.accessToken || !context?.topic || typeof context.nonceForCase !== 'function') {
    throw new Error('DOKE_COM_B03C_R3F_PLAN_CONTEXT_REQUIRED');
  }
  const results = [];
  for (const caseId of r3f.CASE_IDS) results.push(await executeCase({ db, realtime, caseId, context }));
  return {
    validationId: 'COM-B03C-R3F-CASE-TIME-POLICY-SNAPSHOT-DIAGNOSTIC-REPORT',
    contractId: r3f.CONTRACT_ID,
    caseCount: results.length,
    caseIds: results.map((item) => item.caseId),
    caseResults: results,
    sameIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    rawRemoteErrorExposed: false
  };
}

function createSyntheticAdapters() {
  const baseline = [{ policyname: 'existing_safe_policy', permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: 'SELECT', qual: 'true', with_check: null }];
  let rows = baseline.map((row) => ({ ...row }));
  const db = {
    async snapshot() { return rows.map((row) => ({ ...row, roles: Array.isArray(row.roles) ? [...row.roles] : row.roles })); },
    async install({ definitions }) {
      for (const item of definitions) rows.push({
        policyname: item.policyname, permissive: 'PERMISSIVE', roles: ['authenticated'], cmd: item.cmd,
        qual: item.cmd === 'SELECT' ? item.expression : null,
        with_check: item.cmd === 'INSERT' ? item.expression : null
      });
    },
    async drop({ definitions }) { const names = new Set(definitions.map((item) => item.policyname)); rows = rows.filter((row) => !names.has(row.policyname)); }
  };
  const realtime = {
    async createClient({ caseId }) {
      return {
        async subscribePresenceReadJoin() { return { subscribed: caseId === 'control_true' || caseId === 'uid_topic_direct', classification: caseId === 'control_true' || caseId === 'uid_topic_direct' ? 'subscribed' : 'synthetic_rls_rejection' }; },
        async remove() {}
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
      topic: 'room:repository-only-r3f',
      nonceForCase: (caseId) => crypto.createHash('sha256').update(caseId).digest('hex').slice(0, 12)
    }
  });
  if (report.caseResults.some((item) => item.structuralEvidence.evidenceComplete !== true)) throw new Error('DOKE_COM_B03C_R3F_SELF_TEST_EVIDENCE_INCOMPLETE');
  return report;
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      const report = await repositorySelfTest();
      process.stdout.write(`${JSON.stringify({ contractId: report.contractId, caseCount: report.caseCount, repositorySelfTest: 'success', stagingAccess: false })}\n`);
      return;
    }
    r3f.assertRemoteExecutionBlocked();
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3F_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = { safeFailure, executeCase, executePlan, createSyntheticAdapters, repositorySelfTest };
