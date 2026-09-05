'use strict';

const crypto = require('node:crypto');
const r3i = require('./community-realtime-private-auth-r3i');
const r3e = require('./community-realtime-private-auth-r3e');

const CONTRACT_ID = 'com-b03c-r3j-evaluation-context-differential-harness-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3I-REALTIME-AUTHORIZATION-EVALUATION-CONTEXT-READINESS';
const PREDECESSOR_STATUS = 'repository_realtime_authorization_evaluation_context_differential_certified_no_remote_authority';
const PREDECESSOR_HEAD = '01e007a1915d6407892952319dcd2890a64ac622';
const PREDECESSOR_RECERT_RUN = 31344619358;
const PREDECESSOR_RECERT_JOB = 93324142244;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3J_REMOTE_EXECUTION_NOT_AUTHORIZED';
const POLICY_PREFIX = 'com_b03c_r3j_';
const SNAPSHOT_SQL = "select policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname='realtime' and tablename='messages' order by policyname";
const SNAPSHOT_PHASES = Object.freeze(['before_case', 'after_install_before_probe', 'after_cleanup']);
const REQUIRED_POLICY_COLUMNS = r3e.REQUIRED_POLICY_COLUMNS;
const CASES = r3i.CASES;
const CASE_IDS = Object.freeze(CASES.map(([id]) => id));
const NEGATIVE_CONTROL_ID = 'negative_control';
const EXECUTION_CASE_IDS = Object.freeze([NEGATIVE_CONTROL_ID, ...CASE_IDS]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'blocked_repository_only',
    reason,
    repositoryHarnessAuthority: false,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function safeIdentifier(value, label = 'IDENTIFIER') {
  const text = String(value || '');
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(text)) {
    const error = new Error(`DOKE_COM_B03C_R3J_${label}_INVALID`);
    error.code = error.message;
    throw error;
  }
  return text;
}

function sqlLiteral(value, label) {
  const text = String(value || '');
  if (!text || text.length > 512 || /[\u0000-\u001f\u007f]/.test(text)) {
    const error = new Error(`DOKE_COM_B03C_R3J_${label}_INVALID`);
    error.code = error.message;
    throw error;
  }
  return `'${text.replace(/'/g, "''")}'`;
}

function validateUuid(value) {
  const text = String(value || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)) {
    const error = new Error('DOKE_COM_B03C_R3J_USER_ID_INVALID');
    error.code = error.message;
    throw error;
  }
  return text;
}

function caseDefinition(caseId) {
  if (caseId === NEGATIVE_CONTROL_ID) {
    return { id: NEGATIVE_CONTROL_ID, surface: 'negative_control', predicateTemplate: 'false' };
  }
  const found = CASES.find(([id]) => id === caseId);
  if (!found) {
    const error = new Error('DOKE_COM_B03C_R3J_CASE_NOT_ALLOWED');
    error.code = error.message;
    throw error;
  }
  return { id: found[0], surface: found[1], predicateTemplate: found[2] };
}

function renderPredicate(caseId, context = {}) {
  const def = caseDefinition(caseId);
  if (caseId === NEGATIVE_CONTROL_ID) return 'false';
  const userId = validateUuid(context.userId);
  const topic = String(context.topic || '');
  const uidLiteral = sqlLiteral(userId, 'USER_ID_LITERAL');
  const topicLiteral = sqlLiteral(topic, 'TOPIC_LITERAL');
  return def.predicateTemplate
    .replaceAll("'<uid>'", uidLiteral)
    .replaceAll("'<topic>'", topicLiteral);
}

function policyName(caseId, kind, nonce) {
  const compactCase = String(caseId).replace(/[^a-z0-9_]/g, '').slice(0, 22);
  const compactNonce = String(nonce || '').replace(/[^a-f0-9]/g, '').slice(0, 12);
  if (!compactNonce) {
    const error = new Error('DOKE_COM_B03C_R3J_NONCE_REQUIRED');
    error.code = error.message;
    throw error;
  }
  return safeIdentifier(`${POLICY_PREFIX}${compactCase}_${kind}_${compactNonce}`.slice(0, 63), 'POLICY_NAME');
}

function buildPolicyDefinitions(caseId, context = {}) {
  const expression = renderPredicate(caseId, context);
  return freeze([
    {
      policyname: policyName(caseId, 'sel', context.nonce),
      cmd: 'SELECT',
      roles: ['authenticated'],
      permissive: true,
      expression
    },
    {
      policyname: policyName(caseId, 'ins', context.nonce),
      cmd: 'INSERT',
      roles: ['authenticated'],
      permissive: true,
      expression: 'true'
    }
  ]);
}

function buildInstallStatements(definitions) {
  if (!Array.isArray(definitions) || definitions.length !== 2) {
    throw new Error('DOKE_COM_B03C_R3J_TWO_POLICY_DEFINITIONS_REQUIRED');
  }
  return definitions.map((item) => {
    const name = safeIdentifier(item.policyname, 'POLICY_NAME');
    const cmd = String(item.cmd || '').toUpperCase();
    if (!['SELECT', 'INSERT'].includes(cmd)) throw new Error('DOKE_COM_B03C_R3J_POLICY_COMMAND_INVALID');
    if (item.permissive !== true || JSON.stringify(item.roles) !== JSON.stringify(['authenticated'])) {
      throw new Error('DOKE_COM_B03C_R3J_POLICY_SHAPE_INVALID');
    }
    const clause = cmd === 'SELECT' ? `using (${item.expression})` : `with check (${item.expression})`;
    return `create policy ${name} on realtime.messages for ${cmd.toLowerCase()} to authenticated ${clause}`;
  });
}

function buildDropStatements(definitions) {
  return (definitions || []).map((item) =>
    `drop policy if exists ${safeIdentifier(item.policyname, 'POLICY_NAME')} on realtime.messages`
  );
}

function nonceForCase(seed, caseId) {
  return crypto.createHash('sha256').update(`${String(seed)}:${String(caseId)}`).digest('hex').slice(0, 12);
}

function assertRemoteExecutionBlocked() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function evaluateRepositoryHarnessReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3I_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3I_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3I_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) {
    return blocked('R3I_FINAL_RECERT_REQUIRED');
  }
  if (!exactArray(input.caseIds, CASE_IDS)) return blocked('EXACT_16_CASE_MATRIX_REQUIRED');
  if (!exactArray(input.snapshotPhases, SNAPSHOT_PHASES)) return blocked('EXACT_SNAPSHOT_PHASES_REQUIRED');
  if (!exactArray(input.policySnapshotColumns, REQUIRED_POLICY_COLUMNS)) return blocked('COMPLETE_POLICY_COLUMNS_REQUIRED');
  if (input.snapshotSql !== SNAPSHOT_SQL) return blocked('EXACT_SNAPSHOT_SQL_REQUIRED');

  const required = [
    'caseDefinitionsImportedFromR3I',
    'negativeControlRequired',
    'negativeControlFixedFalse',
    'predicateTemplatesRenderedWithoutChangingSemantics',
    'sameIdentityTokenTopicPlanPreserved',
    'freshRealtimeClientPerCaseRequired',
    'completeCatalogBeforeEachCaseRequired',
    'completeCatalogAfterInstallBeforeProbeRequired',
    'completeCatalogAfterCleanupRequired',
    'expectedTwoPolicyDeltaOnlyRequired',
    'preexistingPolicyImmutabilityRequired',
    'baselineRestorationRequired',
    'materializedPredicatePreserved',
    'surfaceClassificationPreserved',
    'sanitizedProbeOutcomeRequired',
    'independentReportVerifierCreated',
    'syntheticRepositorySelfTestCreated',
    'unexpectedPolicyDeltaFailsClosed',
    'cleanupMismatchFailsClosed',
    'caseOrderOrCountMismatchFailsClosed',
    'causalPromotionBlocked',
    'cliRemoteExecutionHardBlocked'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3J_HARNESS_CONTROL_REQUIRED', { flag });

  const prohibited = [
    'remoteExecutorPrepared',
    'triggerPrepared',
    'authorizationPhraseDefined',
    'stagingEnvironmentJobPrepared',
    'remoteCredentialLoadingPrepared',
    'remoteDependencyLoadingPrepared',
    'runtimePolicyChangePrepared',
    'runtimeDeployPrepared',
    'productionPrepared',
    'mergePrepared'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('R3J_REMOTE_SCOPE_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_evaluation_context_differential_harness_ready_no_remote_authority',
    reason: null,
    differentialProbeCount: CASE_IDS.length,
    totalExecutionCaseCount: EXECUTION_CASE_IDS.length,
    caseIds: CASE_IDS,
    executionCaseIds: EXECUTION_CASE_IDS,
    surfaces: [{ id: NEGATIVE_CONTROL_ID, surface: 'negative_control' }, ...CASES.map(([id, surface]) => ({ id, surface }))],
    snapshotSql: SNAPSHOT_SQL,
    snapshotPhases: SNAPSHOT_PHASES,
    policySnapshotColumns: REQUIRED_POLICY_COLUMNS,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    runtimeChangeAuthorized: false,
    repositoryHarnessAuthority: true,
    remoteExecutionAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_VALIDATION_ID,
  PREDECESSOR_STATUS,
  PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN,
  PREDECESSOR_RECERT_JOB,
  REQUIRED_BRANCH,
  REQUIRED_PULL_REQUEST,
  REMOTE_EXECUTION_BLOCK_CODE,
  POLICY_PREFIX,
  SNAPSHOT_SQL,
  SNAPSHOT_PHASES,
  REQUIRED_POLICY_COLUMNS,
  CASES,
  CASE_IDS,
  NEGATIVE_CONTROL_ID,
  EXECUTION_CASE_IDS,
  safeIdentifier,
  sqlLiteral,
  renderPredicate,
  policyName,
  buildPolicyDefinitions,
  buildInstallStatements,
  buildDropStatements,
  nonceForCase,
  assertRemoteExecutionBlocked,
  evaluateRepositoryHarnessReadiness
});
