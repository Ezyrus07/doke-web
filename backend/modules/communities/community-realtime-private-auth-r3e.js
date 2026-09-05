'use strict';

const crypto = require('node:crypto');

const CONTRACT_ID = 'com-b03c-r3e-case-time-policy-snapshot-contract-v1';
const PREDECESSOR_VALIDATION_ID = 'COM-B03C-R3D-R3A-POLICY-MATERIALIZATION-EVIDENCE-READINESS';
const PREDECESSOR_STATUS = 'repository_r3a_policy_materialization_evidence_gap_isolated_and_certified_no_staging_authority';
const REQUIRED_BRANCH = 'com/com-001-baseline-audit';
const REQUIRED_PULL_REQUEST = 61;
const HISTORICAL_EXECUTOR_PATH = 'scripts/execute-com-b03c-r3a-presence-full-conjunction-isolation-staging-canary.js';
const REQUIRED_POLICY_COLUMNS = Object.freeze(['policyname', 'permissive', 'roles', 'cmd', 'qual', 'with_check']);
const SNAPSHOT_PHASES = Object.freeze(['before_case', 'after_install_before_subscribe', 'after_cleanup']);
const CASE_IDS = Object.freeze([
  'negative_control',
  'control_true',
  'uid_topic_direct',
  'uid_extension_eq',
  'topic_extension_direct',
  'full_current_direct',
  'full_topic_select_wrapper',
  'full_topic_select_extension_in',
  'full_docs_canonical_exists'
]);

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
    repositoryReadinessAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    ...extra
  });
}

function exactArray(value, expected) {
  return Array.isArray(value) && JSON.stringify(value.map(String)) === JSON.stringify(expected);
}

function normalizePermissive(value) {
  if (value === true || String(value).toUpperCase() === 'PERMISSIVE') return true;
  if (value === false || String(value).toUpperCase() === 'RESTRICTIVE') return false;
  const error = new Error('DOKE_COM_B03C_R3E_POLICY_PERMISSIVE_INVALID');
  error.code = error.message;
  throw error;
}

function normalizeRoles(value) {
  if (Array.isArray(value)) return value.map(String).map((x) => x.trim()).filter(Boolean).sort();
  const text = String(value || '').trim();
  if (!text) return [];
  return text.replace(/^\{|\}$/g, '').split(',').map((x) => x.replace(/^"|"$/g, '').trim()).filter(Boolean).sort();
}

function normalizePolicyRow(row = {}) {
  for (const key of REQUIRED_POLICY_COLUMNS) {
    if (!Object.prototype.hasOwnProperty.call(row, key)) {
      const error = new Error(`DOKE_COM_B03C_R3E_POLICY_COLUMN_MISSING_${key.toUpperCase()}`);
      error.code = error.message;
      throw error;
    }
  }
  return freeze({
    policyname: String(row.policyname),
    permissive: normalizePermissive(row.permissive),
    roles: normalizeRoles(row.roles),
    cmd: String(row.cmd || '').toUpperCase(),
    qual: row.qual == null ? null : String(row.qual),
    with_check: row.with_check == null ? null : String(row.with_check)
  });
}

function normalizeInventory(rows) {
  if (!Array.isArray(rows)) {
    const error = new Error('DOKE_COM_B03C_R3E_POLICY_INVENTORY_ARRAY_REQUIRED');
    error.code = error.message;
    throw error;
  }
  const normalized = rows.map(normalizePolicyRow).sort((a, b) => a.policyname.localeCompare(b.policyname));
  const names = normalized.map((x) => x.policyname);
  if (new Set(names).size !== names.length) {
    const error = new Error('DOKE_COM_B03C_R3E_DUPLICATE_POLICY_NAME');
    error.code = error.message;
    throw error;
  }
  return normalized;
}

function inventoryFingerprint(rows) {
  return crypto.createHash('sha256').update(JSON.stringify(normalizeInventory(rows))).digest('hex');
}

function diffInventories(beforeRows, afterRows) {
  const before = normalizeInventory(beforeRows);
  const after = normalizeInventory(afterRows);
  const beforeByName = new Map(before.map((x) => [x.policyname, x]));
  const afterByName = new Map(after.map((x) => [x.policyname, x]));
  const added = [];
  const removed = [];
  const changed = [];
  for (const [name, row] of afterByName) {
    if (!beforeByName.has(name)) added.push(name);
    else if (JSON.stringify(beforeByName.get(name)) !== JSON.stringify(row)) changed.push(name);
  }
  for (const name of beforeByName.keys()) if (!afterByName.has(name)) removed.push(name);
  return freeze({ added: added.sort(), removed: removed.sort(), changed: changed.sort() });
}

function compactSql(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').replace(/\s*([()=,])\s*/g, '$1').trim().toLowerCase();
}

function findPolicy(rows, policyname) {
  return normalizeInventory(rows).find((x) => x.policyname === policyname) || null;
}

function evaluateCaseEvidence(input = {}) {
  if (!CASE_IDS.includes(input.caseId)) return freeze({ evidenceComplete: false, blockers: ['CASE_ID_NOT_ALLOWED'], exactRootCauseProven: false });
  const before = normalizeInventory(input.beforeCase || []);
  const installed = normalizeInventory(input.afterInstallBeforeSubscribe || []);
  const cleanup = normalizeInventory(input.afterCleanup || []);
  const expected = input.expectedPolicies || {};
  const selectName = String(expected.selectPolicyName || '');
  const insertName = String(expected.insertPolicyName || '');
  const expectedSelectPredicate = String(expected.selectPredicate || '');
  if (!selectName || !insertName || selectName === insertName || !expectedSelectPredicate) {
    return freeze({ evidenceComplete: false, blockers: ['EXPECTED_POLICY_DESCRIPTOR_INVALID'], exactRootCauseProven: false });
  }

  const installDelta = diffInventories(before, installed);
  const cleanupDelta = diffInventories(before, cleanup);
  const expectedAdded = [insertName, selectName].sort();
  const blockers = [];
  if (JSON.stringify(installDelta.added) !== JSON.stringify(expectedAdded) || installDelta.removed.length || installDelta.changed.length) blockers.push('UNEXPECTED_POLICY_DELTA');
  if (cleanupDelta.added.length || cleanupDelta.removed.length || cleanupDelta.changed.length) blockers.push('BASELINE_NOT_RESTORED_AFTER_CLEANUP');

  const selectPolicy = findPolicy(installed, selectName);
  const insertPolicy = findPolicy(installed, insertName);
  if (!selectPolicy || selectPolicy.cmd !== 'SELECT' || !selectPolicy.roles.includes('authenticated') || selectPolicy.permissive !== true || selectPolicy.qual == null) blockers.push('SELECT_POLICY_MATERIALIZATION_INCOMPLETE');
  if (!insertPolicy || insertPolicy.cmd !== 'INSERT' || !insertPolicy.roles.includes('authenticated') || insertPolicy.permissive !== true || insertPolicy.with_check == null) blockers.push('INSERT_POLICY_MATERIALIZATION_INCOMPLETE');

  const storedSelectPredicate = selectPolicy?.qual ?? null;
  const storedInsertPredicate = insertPolicy?.with_check ?? null;
  return freeze({
    caseId: input.caseId,
    evidenceComplete: blockers.length === 0,
    blockers,
    snapshotPhases: SNAPSHOT_PHASES,
    beforeFingerprint: inventoryFingerprint(before),
    installedFingerprint: inventoryFingerprint(installed),
    cleanupFingerprint: inventoryFingerprint(cleanup),
    installDelta,
    cleanupDelta,
    expectedSelectPredicate,
    storedSelectPredicate,
    storedInsertPredicate,
    selectExactTextMatch: storedSelectPredicate === expectedSelectPredicate,
    selectCompactTextMatch: storedSelectPredicate != null && compactSql(storedSelectPredicate) === compactSql(expectedSelectPredicate),
    insertControlTrueObserved: storedInsertPredicate != null && /\btrue\b/i.test(storedInsertPredicate),
    predicateSemanticsProvenByTextComparison: false,
    joinOutcomeCanPromoteCausality: false,
    exactRootCauseProven: false
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3D_EVIDENCE_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3D_STATUS_REQUIRED');
  if (input.r3dCertified !== true) return blocked('R3D_CERTIFICATION_REQUIRED');
  if (input.r3dExactRootCauseProven !== false) return blocked('R3D_ROOT_CAUSE_MUST_REMAIN_UNPROVEN');
  if (!exactArray(input.policySnapshotColumns, REQUIRED_POLICY_COLUMNS)) return blocked('COMPLETE_POLICY_COLUMNS_REQUIRED');
  if (!exactArray(input.snapshotPhases, SNAPSHOT_PHASES)) return blocked('EXACT_SNAPSHOT_PHASES_REQUIRED');
  if (!exactArray(input.caseIds, CASE_IDS)) return blocked('EXACT_CASE_MATRIX_REQUIRED');

  const requiredControls = [
    'fullCatalogBeforeEachCaseRequired', 'fullCatalogAfterInstallBeforeSubscribeRequired', 'fullCatalogAfterCleanupRequired',
    'expectedPolicyDeltaOnlyRequired', 'preexistingPolicyImmutabilityRequired', 'baselineRestorationRequired',
    'expectedAndStoredPredicatePreservationRequired', 'permissivePreservationRequired', 'rolesCommandQualWithCheckPreservationRequired',
    'snapshotBeforeRealtimeClientCreationRequired', 'freshRealtimeClientPerCaseRequired', 'sameAuthIdentityAcrossCasesRequired',
    'sameAccessTokenAcrossCasesRequired', 'sameTopicAcrossCasesRequired', 'negativeControlRequired',
    'arbitrarySleepProhibitedWithoutEvidence', 'textComparisonCannotProvePredicateSemantics', 'joinOutcomeCannotPromoteCausality',
    'causalPromotionBlockedUntilEvidenceComplete'
  ];
  for (const flag of requiredControls) if (input[flag] !== true) return blocked('R3E_DIAGNOSTIC_CONTROL_REQUIRED', { flag });

  const prohibitedExecution = [
    'stagingReadPlanned', 'stagingMutationPlanned', 'triggerCreationPlanned', 'authorizationPhraseDefined', 'remoteExecutorCreated',
    'realtimePolicyMutationPlanned', 'realtimeSubscriptionPlanned', 'authIdentityLifecyclePlanned', 'communityPostsExecutionPlanned',
    'channelMessagesExecutionPlanned', 'domainMutationPlanned', 'publicationMutationPlanned', 'runtimeDeployPlanned',
    'productionPlanned', 'mergePlanned', 'realUserMutationPlanned'
  ];
  for (const flag of prohibitedExecution) if (input[flag] !== false) return blocked('OUT_OF_SCOPE_EXECUTION_PROHIBITED', { flag });

  return freeze({
    contractId: CONTRACT_ID,
    decision: 'repository_case_time_policy_snapshot_contract_ready',
    reason: null,
    caseIds: CASE_IDS,
    policySnapshotColumns: REQUIRED_POLICY_COLUMNS,
    snapshotPhases: SNAPSHOT_PHASES,
    exactRootCauseProven: false,
    runtimeChangeAuthorized: false,
    repositoryReadinessAuthority: true,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    realtimePolicyLifecycleAuthority: false,
    realtimeSubscriptionAuthority: false,
    authIdentityLifecycleAuthority: false,
    domainMutationAuthority: false,
    publicationMutationAuthority: false,
    runtimeDeployAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({ CONTRACT_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, REQUIRED_BRANCH, REQUIRED_PULL_REQUEST,
  HISTORICAL_EXECUTOR_PATH, REQUIRED_POLICY_COLUMNS, SNAPSHOT_PHASES, CASE_IDS, normalizePermissive, normalizeRoles,
  normalizePolicyRow, normalizeInventory, inventoryFingerprint, diffInventories, compactSql, evaluateCaseEvidence, evaluateRepositoryReadiness });
