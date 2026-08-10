#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r3u = require('../backend/modules/communities/community-realtime-private-auth-r3u');
const r3t = require('../backend/modules/communities/community-realtime-private-auth-r3t');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const config = require('../config/com-b03c-r3u-instrumentation-sql-materialization-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3U-INSTRUMENTATION-SQL-MATERIALIZATION-READINESS.json');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRecertRun: config.predecessor.matrixRecertRun,
    predecessorMatrixRecertJob: config.predecessor.matrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessor.matrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3tContractId: config.continuity.r3tContractId,
    r3sContractId: config.continuity.r3sContractId,
    r3qContractId: config.continuity.r3qContractId,
    statementGroups: [...config.continuity.statementGroups],
    counterIds: [...config.continuity.counterIds],
    residueCountFields: [...config.continuity.residueCountFields],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

function assertAllIdentifiersSafe(names) {
  for (const [key, value] of Object.entries(names)) {
    if (key === 'ownershipDigest') continue;
    assert.match(value, /^[a-z_][a-z0-9_]{0,62}$/);
  }
}

async function main() {
  const decision = r3u.evaluateRepositoryReadiness(readinessInput());
  assert.equal(
    decision.decision,
    'repository_instrumentation_sql_materialized_and_certifiable_no_remote_authority'
  );
  assert.equal(decision.repositorySqlMaterializationAuthority, true);
  assert.equal(decision.remoteSqlExecutionAuthority, false);
  assert.equal(decision.remoteAdapterActivationAuthority, false);
  assert.equal(decision.stagingReadAuthority, false);
  assert.equal(decision.stagingMutationAuthority, false);
  assert.equal(decision.productionAuthority, false);
  assert.equal(decision.pullRequestMergeAuthority, false);
  assert.equal(decision.exactRootCauseProven, false);
  assert.equal(decision.causalPromotionAllowed, false);

  for (const field of Object.keys(config.controls)) {
    const blocked = r3u.evaluateRepositoryReadiness(readinessInput({ [field]: false }));
    assert.equal(blocked.decision, 'blocked_repository_only', field);
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    const blocked = r3u.evaluateRepositoryReadiness(readinessInput({ [field]: true }));
    assert.equal(blocked.decision, 'blocked_repository_only', field);
  }

  assert.deepEqual([...r3u.REQUIRED_STATEMENT_GROUPS], [...config.continuity.statementGroups]);
  assert.deepEqual([...r3s.COUNTER_IDS], [...config.continuity.counterIds]);
  assert.deepEqual([...r3s.RESIDUE_COUNT_FIELDS], [...config.continuity.residueCountFields]);
  assert.equal(r3t.inspectCompleteComposition().fullyBound, true);
  assert.equal(r3t.inspectCompleteComposition().boundMethodCount, r3q.ADAPTER_METHODS.length);

  const token = 'r3u_owner_001';
  const first = r3u.buildSqlMaterialization(token);
  const second = r3u.buildSqlMaterialization(token);
  const other = r3u.buildSqlMaterialization('r3u_owner_002');
  const inspection = r3u.inspectSqlMaterialization(first);

  assert.equal(first.executableSqlMaterialized, true);
  assert.equal(first.remoteExecutionAuthority, false);
  assert.equal(first.statementCount, 21);
  assert.equal(inspection.valid, true);
  assert.equal(inspection.statementCount, 21);
  assert.match(first.statementFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(first.statementFingerprint, second.statementFingerprint);
  assert.notEqual(first.statementFingerprint, other.statementFingerprint);
  assert.notEqual(first.ownershipDigest, other.ownershipDigest);
  assertAllIdentifiersSafe(first.names);
  assert.equal(JSON.stringify(first).includes(token), false);

  const core = first.statementGroups.installCore.join('\n');
  assert.match(core, /security definer/i);
  assert.match(core, /set search_path = pg_catalog/i);
  assert.match(core, /language plpgsql volatile/i);
  assert.equal((core.match(/pg_catalog\.nextval/g) || []).length, 2);
  assert.equal((core.match(/cache 1/g) || []).length, 2);
  assert.match(core, /revoke all on function .* from public, anon, authenticated, service_role/i);
  assert.match(core, /grant execute on function .* to authenticated/i);
  assert.doesNotMatch(core, /grant\s+(usage|select|update).*sequence/i);

  const anchor = first.statementGroups.installAnchorPolicies.join('\n');
  assert.match(anchor, /case when private\.[a-z0-9_]+_observe\(realtime\.messages\.extension::text\) then/i);
  assert.match(anchor, /realtime\.messages\.topic = realtime\.topic\(\)/i);
  assert.match(anchor, /extension in \('broadcast', 'presence'\)/i);
  assert.match(anchor, /for insert to authenticated with check \(true\)/i);

  const presenceOnly = first.statementGroups.switchToPresenceOnlyPolicy.join('\n');
  assert.match(presenceOnly, /drop policy if exists .*_anchor_sel on realtime\.messages/i);
  assert.match(presenceOnly, /drop policy if exists .*_anchor_ins on realtime\.messages/i);
  assert.match(presenceOnly, /case when private\.[a-z0-9_]+_observe\(realtime\.messages\.extension::text\) then/i);
  assert.match(presenceOnly, /realtime\.messages\.topic = realtime\.topic\(\)/i);
  assert.match(presenceOnly, /extension = 'presence'/i);

  const counterRead = first.statementGroups.counterRead[0];
  assert.match(counterRead, /from pg_catalog\.pg_sequences/i);
  assert.equal((counterRead.match(/coalesce\(/g) || []).length, 2);
  assert.match(counterRead, /broadcast_rls_evaluations/);
  assert.match(counterRead, /presence_rls_evaluations/);

  const residue = first.statementGroups.residueInspection[0];
  assert.match(residue, /pg_catalog\.pg_policies/);
  assert.match(residue, /pg_catalog\.pg_proc/);
  assert.match(residue, /pg_catalog\.pg_class/);
  assert.match(residue, /as "policyCount"/);
  assert.match(residue, /as "functionCount"/);
  assert.match(residue, /as "sequenceCount"/);

  const cleanup = first.statementGroups.cleanup.join('\n');
  assert.ok(cleanup.indexOf('drop policy') < cleanup.indexOf('drop function'));
  assert.ok(cleanup.indexOf('drop function') < cleanup.indexOf('drop sequence'));
  assert.equal(first.statementGroups.cleanup.length, 8);

  assert.throws(() => r3u.buildSqlMaterialization('short'), /R3S_INSTRUMENTATION_OWNERSHIP_TOKEN_REQUIRED/);

  let sideEffects = 0;
  assert.throws(() => {
    r3u.assertRemoteExecutionBoundaryAbsent();
    sideEffects += 1;
  }, (error) => error?.code === r3u.REMOTE_EXECUTION_BLOCK_CODE);
  assert.equal(sideEffects, 0);

  const moduleSource = fs.readFileSync(
    path.resolve(__dirname, '../backend/modules/communities/community-realtime-private-auth-r3u.js'),
    'utf8'
  );
  assert.doesNotMatch(moduleSource, /require\(['"]pg['"]\)/);
  assert.doesNotMatch(moduleSource, /@supabase\/supabase-js/);
  assert.doesNotMatch(moduleSource, /process\.env/);

  assert.equal(evidence.contractId, r3u.CONTRACT_ID);
  assert.equal(
    evidence.status,
    'repository_instrumentation_sql_materialization_prepared_no_remote_authority'
  );
  assert.equal(evidence.sqlMaterialization.executableSqlMaterialized, true);
  assert.equal(evidence.sqlMaterialization.remoteSqlExecutionPrepared, false);
  assert.equal(evidence.authority.remoteSqlExecution, false);
  assert.equal(evidence.effects.databaseQueryExecuted, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);

  process.stdout.write(`${JSON.stringify({
    contractId: r3u.CONTRACT_ID,
    decision: decision.decision,
    evidenceStatus: evidence.status,
    statementGroupCount: r3u.REQUIRED_STATEMENT_GROUPS.length,
    statementCount: first.statementCount,
    statementFingerprint: first.statementFingerprint,
    remoteSqlExecutionAuthority: decision.remoteSqlExecutionAuthority,
    exactRootCauseProven: decision.exactRootCauseProven
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
