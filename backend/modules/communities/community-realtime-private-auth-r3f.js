'use strict';

const r3a = require('./community-realtime-private-auth-r3a');
const r3e = require('./community-realtime-private-auth-r3e');

const CONTRACT_ID = 'com-b03c-r3f-case-time-policy-snapshot-diagnostic-implementation-readiness-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3E-CASE-TIME-POLICY-SNAPSHOT-READINESS';
const PREDECESSOR_STATUS = 'repository_case_time_policy_snapshot_contract_certified_no_staging_authority';
const PREDECESSOR_EVIDENCE_HEAD = '4c717d9b3b82c5a4f3962640498ea5e362519402';
const PREDECESSOR_RECERT_RUN = 31340520304;
const PREDECESSOR_RECERT_JOB = 93313410009;
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REMOTE_EXECUTION_BLOCK_CODE = 'DOKE_COM_B03C_R3F_STAGING_AUTHORIZATION_REQUIRED';
const POLICY_PREFIX = 'com_b03c_r3f_';
const SNAPSHOT_SQL = "select policyname, permissive, roles, cmd, qual, with_check from pg_policies where schemaname='realtime' and tablename='messages' order by policyname";
const CASE_IDS = r3e.CASE_IDS;
const REQUIRED_POLICY_COLUMNS = r3e.REQUIRED_POLICY_COLUMNS;
const SNAPSHOT_PHASES = r3e.SNAPSHOT_PHASES;

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
    repositoryImplementationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(value, expected) {
  return Array.isArray(value) && JSON.stringify(value.map(String)) === JSON.stringify(expected);
}

function safeIdentifier(value, label = 'IDENTIFIER') {
  const text = String(value || '');
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(text)) {
    const error = new Error(`DOKE_COM_B03C_R3F_${label}_INVALID`);
    error.code = error.message;
    throw error;
  }
  return text;
}

function policyName(caseId, kind, nonce) {
  const compactCase = String(caseId).replace(/[^a-z0-9_]/g, '').slice(0, 18);
  const compactNonce = String(nonce || '').replace(/[^a-f0-9]/g, '').slice(0, 12);
  return safeIdentifier(`${POLICY_PREFIX}${compactCase}_${kind}_${compactNonce}`.slice(0, 63), 'POLICY_NAME');
}

function buildPolicyDefinitions(caseId, context = {}) {
  if (!CASE_IDS.includes(caseId)) {
    const error = new Error('DOKE_COM_B03C_R3F_CASE_NOT_ALLOWED');
    error.code = error.message;
    throw error;
  }
  if (!context.userId || !context.topic || !context.nonce) {
    const error = new Error('DOKE_COM_B03C_R3F_CASE_CONTEXT_REQUIRED');
    error.code = error.message;
    throw error;
  }
  const selectPredicate = caseId === 'negative_control'
    ? 'false'
    : r3a.buildPredicate(caseId, { userId: context.userId, topic: context.topic });
  return freeze([
    { policyname: policyName(caseId, 'sel', context.nonce), cmd: 'SELECT', roles: ['authenticated'], permissive: true, expression: selectPredicate },
    { policyname: policyName(caseId, 'ins', context.nonce), cmd: 'INSERT', roles: ['authenticated'], permissive: true, expression: 'true' }
  ]);
}

function buildInstallStatements(definitions) {
  if (!Array.isArray(definitions) || definitions.length !== 2) throw new Error('DOKE_COM_B03C_R3F_TWO_POLICY_DEFINITIONS_REQUIRED');
  return definitions.map((item) => {
    const name = safeIdentifier(item.policyname, 'POLICY_NAME');
    const cmd = String(item.cmd || '').toUpperCase();
    if (!['SELECT', 'INSERT'].includes(cmd)) throw new Error('DOKE_COM_B03C_R3F_POLICY_COMMAND_INVALID');
    if (item.permissive !== true || JSON.stringify(item.roles) !== JSON.stringify(['authenticated'])) throw new Error('DOKE_COM_B03C_R3F_POLICY_SHAPE_INVALID');
    const clause = cmd === 'SELECT' ? `using (${item.expression})` : `with check (${item.expression})`;
    return `create policy ${name} on realtime.messages for ${cmd.toLowerCase()} to authenticated ${clause}`;
  });
}

function buildDropStatements(definitions) {
  return (definitions || []).map((item) => `drop policy if exists ${safeIdentifier(item.policyname, 'POLICY_NAME')} on realtime.messages`);
}

function assertRemoteExecutionBlocked() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function evaluateRepositoryImplementationReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3E_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3E_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorEvidenceHead !== PREDECESSOR_EVIDENCE_HEAD) return blocked('R3E_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN || input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB || input.predecessorRecertSuccess !== true) return blocked('R3E_EVIDENCE_HEAD_RECERT_REQUIRED');
  if (!exactArray(input.caseIds, CASE_IDS)) return blocked('EXACT_CASE_MATRIX_REQUIRED');
  if (!exactArray(input.policySnapshotColumns, REQUIRED_POLICY_COLUMNS)) return blocked('COMPLETE_POLICY_COLUMNS_REQUIRED');
  if (!exactArray(input.snapshotPhases, SNAPSHOT_PHASES)) return blocked('EXACT_SNAPSHOT_PHASES_REQUIRED');
  if (input.snapshotSql !== SNAPSHOT_SQL) return blocked('EXACT_SNAPSHOT_SQL_REQUIRED');
  const required = [
    'diagnosticHarnessCreated', 'adapterInjectionRequired', 'completeCatalogPreserved', 'expectedAndStoredPredicatePreserved',
    'unexpectedPolicyDeltaFailsClosed', 'preexistingPolicyMutationFailsClosed', 'cleanupMismatchFailsClosed',
    'freshRealtimeClientPerCaseEnforced', 'sameIdentityTokenTopicPlanPreserved', 'negativeControlPreserved',
    'sanitizedJoinEvidenceRequired', 'reportVerifierCreated', 'repositorySelfTestCreated', 'cliRemoteExecutionHardBlocked'
  ];
  for (const flag of required) if (input[flag] !== true) return blocked('R3F_IMPLEMENTATION_CONTROL_REQUIRED', { flag });
  const prohibited = [
    'stagingReadPlanned', 'stagingMutationPlanned', 'triggerCreationPlanned', 'authorizationPhraseDefined',
    'remoteCredentialLoadingPlanned', 'pgDependencyLoadingPlanned', 'supabaseDependencyLoadingPlanned',
    'runtimeDeployPlanned', 'productionPlanned', 'mergePlanned', 'realUserMutationPlanned'
  ];
  for (const flag of prohibited) if (input[flag] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag });
  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_case_time_snapshot_diagnostic_implementation_ready',
    reason: null,
    snapshotSql: SNAPSHOT_SQL,
    caseIds: CASE_IDS,
    policySnapshotColumns: REQUIRED_POLICY_COLUMNS,
    snapshotPhases: SNAPSHOT_PHASES,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryImplementationAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, PREDECESSOR_EVIDENCE_HEAD,
  PREDECESSOR_RECERT_RUN, PREDECESSOR_RECERT_JOB, REQUIRED_BRANCH, REQUIRED_PULL_REQUEST, REQUIRED_PROJECT_ID,
  REMOTE_EXECUTION_BLOCK_CODE, POLICY_PREFIX, SNAPSHOT_SQL, CASE_IDS, REQUIRED_POLICY_COLUMNS, SNAPSHOT_PHASES,
  safeIdentifier, policyName, buildPolicyDefinitions, buildInstallStatements, buildDropStatements,
  assertRemoteExecutionBlocked, evaluateRepositoryImplementationReadiness
});
