#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const r4e = require('../backend/modules/communities/community-realtime-private-auth-r4e');
const r4c = require('../backend/modules/communities/community-realtime-private-auth-r4c');
const r4d = require('../backend/modules/communities/community-realtime-private-auth-r4d');
const r3z = require('../backend/modules/communities/community-realtime-private-auth-r3z');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3yExecutor = require('./execute-com-b03c-r3y-single-use-hosted-runtime-observation');
const r3zExecutor = require('./execute-com-b03c-r3z-preinstall-phase-attribution');
const r3vExecutor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const REPORT_PATH = path.resolve(process.env.COM_B03C_R4E_REPORT_PATH || 'reports/generated/COM-B03C-R4E-SINGLE-USE-R4C-BRIDGED-RETRY.json');
function fail(code) { const e = new Error(code); e.code = code; throw e; }
function safeFailure(error) {
  const code = typeof error?.code === 'string' && /^DOKE_COM_B03C_(?:R3Y|R4E)_[A-Z0-9_]+$/.test(error.code) ? error.code : 'DOKE_COM_B03C_R4E_REMOTE_FAILURE';
  const failurePhase = r3z.isValidFailureAttribution({ code, failurePhase: error?.failurePhase }) ? error.failurePhase : null;
  return Object.freeze({ code, failurePhase, rawRemoteErrorExposed: false });
}
function writeReport(report, reportPath = REPORT_PATH) { fs.mkdirSync(path.dirname(reportPath), { recursive: true }); fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`); }
function gitState() { const parentHead = cp.execFileSync('git', ['rev-parse','HEAD^'], { encoding: 'utf8' }).trim(); const changedFiles = cp.execFileSync('git', ['diff','--name-only','HEAD^','HEAD'], { encoding: 'utf8' }).trim().split(/\n/).filter(Boolean); return { parentHead, changedFiles }; }
function readTrigger() { if (!fs.existsSync(r4e.FUTURE_TRIGGER_PATH)) fail(r4e.REMOTE_EXECUTION_BLOCK_CODE); try { return JSON.parse(fs.readFileSync(r4e.FUTURE_TRIGGER_PATH, 'utf8')); } catch { fail('DOKE_COM_B03C_R4E_EXECUTION_TRIGGER_JSON_INVALID'); } }
function assertAuthorizedExecution(trigger, runAttempt) {
  const state = gitState(); const receipt = r4e.buildExpectedConsumedReceipt(trigger?.authorizationEvidenceHead);
  const result = r4e.authorizeExecution({ trigger, parentHead: state.parentHead, changedFiles: state.changedFiles, runAttempt, authorizationReceipt: receipt });
  if (result.decision !== r4e.AUTHORIZED_DECISION) fail(typeof result.reason === 'string' ? `DOKE_COM_B03C_R4E_${result.reason}` : r4e.REMOTE_EXECUTION_BLOCK_CODE);
  return result;
}
function prepareRemoteRuntime(authorization, env, loader = require) {
  if (!authorization || authorization.decision !== r4e.AUTHORIZED_DECISION || authorization.executionAttempted !== true || authorization.runAttempt !== 1) fail(r4e.REMOTE_EXECUTION_BLOCK_CODE);
  const credentials = Object.fromEntries(r3k.CREDENTIAL_NAMES.map((name) => { const value = env[name]; if (!value) fail(`DOKE_COM_B03C_R4E_CREDENTIAL_MISSING_${name}`); return [name, value]; }));
  if (credentials.SUPABASE_PROJECT_REF !== r4e.REQUIRED_PROJECT_ID) fail('DOKE_COM_B03C_R4E_PROJECT_REF_MISMATCH');
  const dependencies = Object.fromEntries(r3k.REMOTE_DEPENDENCIES.map((name) => { const value = loader(name); if (!value) fail(`DOKE_COM_B03C_R4E_DEPENDENCY_MISSING_${name}`); return [name, value]; }));
  return { credentials, dependencies };
}
function baseReport(trigger, plan) { return {
  reportSchema: r4e.REPORT_SCHEMA, validationId: 'COM-B03C-R4E-SINGLE-USE-R4C-BRIDGED-RETRY', contractId: r4e.CONTRACT_ID,
  target: { environment: 'staging', projectId: r4e.REQUIRED_PROJECT_ID, projectName: r4e.REQUIRED_PROJECT_NAME, branch: r4e.REQUIRED_BRANCH, pullRequest: r4e.REQUIRED_PULL_REQUEST },
  singleUse: true, reusableAfterFailure: false, runAttempt: 1, authorizationEvidenceHead: trigger?.authorizationEvidenceHead || null,
  authorizationReceiptId: trigger?.authorizationReceiptId || null, r4dEvidenceHead: r4e.R4D_EVIDENCE_HEAD,
  r4dTriggerCommit: r4e.R4D_TRIGGER_COMMIT, r4dAuthorizationReceiptId: r4e.R4D_AUTHORIZATION_RECEIPT_ID,
  r4dAuthorizationReusable: false, previousR4bAuthorizationReusable: false, predecessorR4cEvidenceHead: r4d.PREDECESSOR_HEAD,
  r4cContractId: r4c.CONTRACT_ID, codecSemanticsFingerprint: r4d.CODEC_SEMANTICS_FINGERPRINT, codecBridgeApplied: true,
  codecBridgeScope: 'exact_r3u_counter_read_result_only', historicalR4bFailurePhase: r4c.PREDECESSOR_R4B_FAILURE_PHASE,
  historicalR4bFailureReclassified: false, historicalR3vModified: false, historicalR3sModified: false,
  r3zContractId: r3z.CONTRACT_ID, r3vContractId: r3v.CONTRACT_ID, statementFingerprint: plan?.statementFingerprint || trigger?.statementFingerprint || null,
  statementCount: plan?.statementCount || trigger?.statementCount || null, ownershipDigest: plan?.ownershipDigest || trigger?.ownershipDigest || null,
  rawOwnershipTokenPersisted: false, authorizationPlaintextPersisted: false, credentialValuesPersisted: false, rawAccessTokenPersisted: false,
  rawRemoteErrorExposed: false, exactRootCauseProven: false, causalPromotionAllowed: false, runtimePolicyChangeExecuted: false, productionExecuted: false, mergeExecuted: false
}; }
async function executeAuthorizedStaging(env = process.env) {
  let trigger = null, plan = null, projectSummary = null, connection = null, identity = null, observation = null, outerFailure = null;
  let identityCleanupAttempted = false, identityCleanupSucceeded = false;
  try {
    trigger = readTrigger(); const authorization = assertAuthorizedExecution(trigger, Number(env.GITHUB_RUN_ATTEMPT));
    const runtime = prepareRemoteRuntime(authorization, env); const Pool = runtime.dependencies.pg.Pool; const createClient = runtime.dependencies['@supabase/supabase-js'].createClient;
    if (typeof Pool !== 'function' || typeof createClient !== 'function') fail('DOKE_COM_B03C_R4E_REMOTE_DEPENDENCY_SHAPE_INVALID');
    const project = await r3yExecutor.inspectProject(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    projectSummary = { id: project.id, name: project.name, status: project.status, region: project.region };
    const apiKeys = await r3yExecutor.fetchApiKeys(runtime.credentials.SUPABASE_ACCESS_TOKEN);
    connection = await r3yExecutor.connectDatabase(Pool, project, runtime.credentials.SUPABASE_DB_PASSWORD);
    plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: r4e.ownershipTokenForReceipt(trigger.authorizationReceiptId) });
    if (plan.statementFingerprint !== trigger.statementFingerprint || plan.statementCount !== trigger.statementCount || plan.ownershipDigest !== trigger.ownershipDigest) fail('DOKE_COM_B03C_R4E_TRIGGER_SQL_BINDING_MISMATCH');
    const codecClient = r4c.buildPgInt8CounterCodecClient(connection.client, plan);
    const db = r3vExecutor.buildRestrictedDbExecutionAdapter(codecClient, plan);
    const realtime = r3vExecutor.buildPresenceAwareRealtimeBridge({ createClient, url: `https://${r4e.REQUIRED_PROJECT_ID}.supabase.co`, publishableKey: apiKeys.publishableKey, presenceTimeoutMs: 3000 });
    identity = await r3yExecutor.createSyntheticIdentity({ createClient, secretKey: apiKeys.secretKey });
    const accessToken = await r3zExecutor.loginSyntheticIdentityPhaseAttributed({ createClient, publishableKey: apiKeys.publishableKey, identity });
    observation = await r3zExecutor.executeTwoProbeObservationPhaseAttributed({ db, realtime, identityId: identity.userId, accessToken, nonce: identity.nonce });
  } catch (error) { outerFailure = safeFailure(error); }
  finally {
    if (identity?.admin && identity?.userId) { identityCleanupAttempted = true; try { await identity.admin.deleteUser(identity.userId); identityCleanupSucceeded = true; } catch (error) { if (!outerFailure) outerFailure = safeFailure(error); } }
    if (connection?.client) { try { connection.client.release(); } catch {} } if (connection?.pool) await connection.pool.end().catch(() => {});
  }
  const executionFailure = outerFailure || observation?.executionFailure || null;
  return { ...baseReport(trigger, plan), projectPreflight: projectSummary, identityCreated: Boolean(identity?.userId), identityCleanupAttempted, identityCleanupSucceeded,
    instrumentationInstalled: observation?.instrumentationInstalled === true, cleanupAttempted: observation?.cleanupAttempted === true,
    cleanupFailure: observation?.cleanupFailure || null, residueCounts: observation?.residueCounts || null, zeroResidueProven: observation?.zeroResidueProven === true,
    baselinePolicySnapshotComplete: observation?.baselinePolicySnapshotComplete === true, baselineRestored: observation?.baselineRestored === true,
    classification: observation?.result?.classification || null, observation: observation?.result?.observation || null, deltas: observation?.result?.deltas || null,
    executionFailure, failurePhase: executionFailure?.failurePhase || null, hostedRuntimeObservationExecuted: Boolean(observation?.result) && !outerFailure,
    rawRemoteErrorExposed: false, exactRootCauseProven: false, causalPromotionAllowed: false, runtimePolicyChangeExecuted: false, productionExecuted: false, mergeExecuted: false };
}
async function repositorySelfTest() {
  let reads = 0, loads = 0; try { prepareRemoteRuntime(null, new Proxy({}, { get() { reads += 1; return 'forbidden'; } }), () => { loads += 1; return {}; }); } catch (e) { if (e.code !== r4e.REMOTE_EXECUTION_BLOCK_CODE) throw e; }
  if (reads !== 0 || loads !== 0) fail('DOKE_COM_B03C_R4E_PREAUTH_SIDE_EFFECT_DETECTED');
  const head = '3333333333333333333333333333333333333333'; const receipt = r4e.buildExpectedConsumedReceipt(head);
  const trigger = r4e.buildFutureExecutionTriggerDescriptor({ certifiedLifecycleHead: head, authorizationReceiptId: receipt.authorizationReceiptId });
  const authorization = r4e.authorizeExecution({ trigger, parentHead: head, changedFiles: [r4e.FUTURE_TRIGGER_PATH], runAttempt: 1, authorizationReceipt: receipt });
  if (authorization.decision !== r4e.AUTHORIZED_DECISION) fail('DOKE_COM_B03C_R4E_REPOSITORY_AUTHORIZATION_PATH_INVALID');
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: r4e.ownershipTokenForReceipt(receipt.authorizationReceiptId) });
  const counterSql = plan.sqlMaterialization.statementGroups.counterRead[0]; const fakePg = { async query(sql) { return String(sql) === counterSql ? { rows: [{ broadcast_rls_evaluations: '0', presence_rls_evaluations: '0' }] } : { rows: [] }; } };
  const result = await r4c.buildPgInt8CounterCodecClient(fakePg, plan).query(counterSql);
  if (result.rows[0].broadcast_rls_evaluations !== 0 || result.rows[0].presence_rls_evaluations !== 0) fail('DOKE_COM_B03C_R4E_CODEC_BRIDGE_REPOSITORY_SELF_TEST_FAILED');
  return Object.freeze({ validationId: 'COM-B03C-R4E-REPOSITORY-SELF-TEST', contractId: r4e.CONTRACT_ID, freshExecutionAuthorizationLifecycleVerified: true,
    r4dAuthorizationReusable: false, previousR4bAuthorizationReusable: false, r4cCodecBridgeRepositoryVerified: true, r4cCodecBridgeScope: 'exact_r3u_counter_read_result_only',
    credentialReadsBeforeAuthorization: 0, dependencyLoadsBeforeAuthorization: 0, stagingAccess: false, networkAccess: false, databaseQueryAgainstRemote: false,
    authorizationPlaintextPersisted: false, exactRootCauseProven: false, causalPromotionAllowed: false });
}
if (require.main === module) (async () => {
  if (process.argv.includes('--repository-self-test')) { process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`); return; }
  if (!fs.existsSync(r4e.FUTURE_TRIGGER_PATH)) fail(r4e.REMOTE_EXECUTION_BLOCK_CODE);
  const report = await executeAuthorizedStaging(process.env); writeReport(report);
  process.stdout.write(`${JSON.stringify({ reportSchema: report.reportSchema, codecBridgeApplied: report.codecBridgeApplied, classification: report.classification, failurePhase: report.failurePhase, zeroResidueProven: report.zeroResidueProven, identityCleanupSucceeded: report.identityCleanupSucceeded, executionFailure: report.executionFailure?.code || null, rawRemoteErrorExposed: false })}\n`);
  if (report.executionFailure) process.exitCode = 1;
})().catch((error) => { process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R4E_FAILURE')}\n`); process.exitCode = 2; });
module.exports = { safeFailure, writeReport, gitState, readTrigger, assertAuthorizedExecution, prepareRemoteRuntime, baseReport, executeAuthorizedStaging, repositorySelfTest };
