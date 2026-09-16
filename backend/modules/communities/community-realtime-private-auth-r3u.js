'use strict';

const crypto = require('node:crypto');
const r3t = require('./community-realtime-private-auth-r3t');
const r3s = require('./community-realtime-private-auth-r3s');
const r3q = require('./community-realtime-private-auth-r3q');

const CONTRACT_ID = 'com-b03c-r3u-instrumentation-sql-materialization-readiness-v1';
const VALIDATION_ID = 'COM-B03C-R3U-INSTRUMENTATION-SQL-MATERIALIZATION-READINESS';
const PREDECESSOR_VALIDATION_ID = r3t.VALIDATION_ID;
const PREDECESSOR_STATUS =
  'repository_complete_r3q_adapter_composition_certified_nine_of_nine_no_remote_authority';
const PREDECESSOR_HEAD = '6a1ba255e751c1f46a661f8ce3052164036994b9';
const PREDECESSOR_RECERT_RUN = 31413079280;
const PREDECESSOR_RECERT_JOB = 93535537979;
const PREDECESSOR_MATRIX_RECERT_RUN = 31413079265;
const PREDECESSOR_MATRIX_RECERT_JOB = 93535536354;
const MATRIX_VERSION = '1.3.113';
const REQUIRED_MATURITY = 3;
const REQUIRED_PRODUCTION_GATE = 'blocked';

const REMOTE_EXECUTION_BLOCK_CODE =
  'DOKE_COM_B03C_R3U_REMOTE_SQL_EXECUTION_BOUNDARY_REQUIRED';

const OBJECT_PREFIX = 'com_b03c_r3u';
const OBJECT_SCHEMA = 'private';
const POLICY_SCHEMA = 'realtime';
const POLICY_TABLE = 'messages';

const REQUIRED_STATEMENT_GROUPS = Object.freeze([
  'installCore',
  'installAnchorPolicies',
  'switchToPresenceOnlyPolicy',
  'counterRead',
  'residueInspection',
  'cleanup'
]);

const FORBIDDEN_SQL_PATTERNS = Object.freeze([
  /^\s*(begin|commit|rollback)\b/i,
  /\bcreate\s+table\b/i,
  /\balter\s+table\b/i,
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\binsert\s+into\b/i,
  /^\s*update\s+/i,
  /\bdelete\s+from\b/i,
  /\bcreate\s+extension\b/i,
  /\bexecute\s+format\b/i,
  /\bdblink\b/i,
  /\bhttp_/i,
  /\bnet\./i
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) &&
    JSON.stringify(actual.map(String)) === JSON.stringify(expected.map(String));
}

function blocked(reason, extra = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'blocked_repository_only',
    reason,
    repositorySqlMaterializationAuthority: false,
    remoteSqlExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    ...extra
  });
}

function assertRemoteExecutionBoundaryAbsent() {
  const error = new Error(REMOTE_EXECUTION_BLOCK_CODE);
  error.code = REMOTE_EXECUTION_BLOCK_CODE;
  throw error;
}

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function assertSafeIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(String(value || ''))) {
    throw new Error('R3U_SQL_IDENTIFIER_INVALID');
  }
  return String(value);
}

function deriveObjectNames(ownershipToken) {
  const token = r3s.assertOwnershipToken(ownershipToken);
  const digest = crypto.createHash('sha256').update(token).digest('hex').slice(0, 16);
  const prefix = `${OBJECT_PREFIX}_${digest}`;
  const names = {
    ownershipDigest: digest,
    broadcastSequence: `${prefix}_broadcast_seq`,
    presenceSequence: `${prefix}_presence_seq`,
    observerFunction: `${prefix}_observe`,
    anchorSelectPolicy: `${prefix}_anchor_sel`,
    anchorInsertPolicy: `${prefix}_anchor_ins`,
    presenceSelectPolicy: `${prefix}_presence_sel`,
    presenceInsertPolicy: `${prefix}_presence_ins`
  };
  Object.entries(names)
    .filter(([key]) => key !== 'ownershipDigest')
    .forEach(([, value]) => assertSafeIdentifier(value));
  return freeze(names);
}

function buildPolicyStatement(policyName, command, expression) {
  const name = assertSafeIdentifier(policyName);
  const normalizedCommand = String(command).toLowerCase();
  if (normalizedCommand === 'select') {
    return `create policy ${name} on ${POLICY_SCHEMA}.${POLICY_TABLE} for select to authenticated using (${expression})`;
  }
  if (normalizedCommand === 'insert') {
    return `create policy ${name} on ${POLICY_SCHEMA}.${POLICY_TABLE} for insert to authenticated with check (${expression})`;
  }
  throw new Error('R3U_POLICY_COMMAND_INVALID');
}

function buildSqlMaterialization(ownershipToken) {
  const names = deriveObjectNames(ownershipToken);
  const broadcastRegclass = `${OBJECT_SCHEMA}.${names.broadcastSequence}`;
  const presenceRegclass = `${OBJECT_SCHEMA}.${names.presenceSequence}`;
  const observerQualified = `${OBJECT_SCHEMA}.${names.observerFunction}`;
  const observerCall = `${observerQualified}(realtime.messages.extension::text)`;
  const topicGate = 'realtime.messages.topic = realtime.topic()';

  const anchorSelectExpression =
    `case when ${observerCall} then (` +
    `${topicGate} and realtime.messages.extension in ('broadcast', 'presence')` +
    `) else false end`;
  const presenceSelectExpression =
    `case when ${observerCall} then (` +
    `${topicGate} and realtime.messages.extension = 'presence'` +
    `) else false end`;

  const installCore = [
    `create sequence ${broadcastRegclass} as bigint increment by 1 minvalue 1 start with 1 cache 1`,
    `create sequence ${presenceRegclass} as bigint increment by 1 minvalue 1 start with 1 cache 1`,
    `create function ${observerQualified}(p_extension text) returns boolean language plpgsql volatile security definer set search_path = pg_catalog as $r3u$ begin if p_extension = 'broadcast' then perform pg_catalog.nextval(${quoteLiteral(broadcastRegclass)}::pg_catalog.regclass); elsif p_extension = 'presence' then perform pg_catalog.nextval(${quoteLiteral(presenceRegclass)}::pg_catalog.regclass); end if; return true; end; $r3u$`,
    `revoke all on function ${observerQualified}(text) from public, anon, authenticated, service_role`,
    `grant execute on function ${observerQualified}(text) to authenticated`
  ];

  const installAnchorPolicies = [
    buildPolicyStatement(names.anchorSelectPolicy, 'select', anchorSelectExpression),
    buildPolicyStatement(names.anchorInsertPolicy, 'insert', 'true')
  ];

  const switchToPresenceOnlyPolicy = [
    `drop policy if exists ${names.anchorSelectPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    `drop policy if exists ${names.anchorInsertPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    buildPolicyStatement(names.presenceSelectPolicy, 'select', presenceSelectExpression),
    buildPolicyStatement(names.presenceInsertPolicy, 'insert', 'true')
  ];

  const counterRead = [
    `select coalesce((select last_value from pg_catalog.pg_sequences where schemaname = ${quoteLiteral(OBJECT_SCHEMA)} and sequencename = ${quoteLiteral(names.broadcastSequence)}), 0)::bigint as broadcast_rls_evaluations, coalesce((select last_value from pg_catalog.pg_sequences where schemaname = ${quoteLiteral(OBJECT_SCHEMA)} and sequencename = ${quoteLiteral(names.presenceSequence)}), 0)::bigint as presence_rls_evaluations`
  ];

  const policyNames = [
    names.anchorSelectPolicy,
    names.anchorInsertPolicy,
    names.presenceSelectPolicy,
    names.presenceInsertPolicy
  ];

  const residueInspection = [
    `select (select count(*)::integer from pg_catalog.pg_policies where schemaname = ${quoteLiteral(POLICY_SCHEMA)} and tablename = ${quoteLiteral(POLICY_TABLE)} and policyname in (${policyNames.map(quoteLiteral).join(', ')})) as "policyCount", (select count(*)::integer from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace where n.nspname = ${quoteLiteral(OBJECT_SCHEMA)} and p.proname = ${quoteLiteral(names.observerFunction)} and p.pronargs = 1 and pg_catalog.oidvectortypes(p.proargtypes) = 'text') as "functionCount", (select count(*)::integer from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace where n.nspname = ${quoteLiteral(OBJECT_SCHEMA)} and c.relkind = 'S' and c.relname in (${quoteLiteral(names.broadcastSequence)}, ${quoteLiteral(names.presenceSequence)})) as "sequenceCount"`
  ];

  const cleanup = [
    `drop policy if exists ${names.anchorSelectPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    `drop policy if exists ${names.anchorInsertPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    `drop policy if exists ${names.presenceSelectPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    `drop policy if exists ${names.presenceInsertPolicy} on ${POLICY_SCHEMA}.${POLICY_TABLE}`,
    `revoke all on function ${observerQualified}(text) from public, anon, authenticated, service_role`,
    `drop function if exists ${observerQualified}(text)`,
    `drop sequence if exists ${broadcastRegclass}`,
    `drop sequence if exists ${presenceRegclass}`
  ];

  const statementGroups = freeze({
    installCore,
    installAnchorPolicies,
    switchToPresenceOnlyPolicy,
    counterRead,
    residueInspection,
    cleanup
  });
  const statementFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(statementGroups))
    .digest('hex');

  return freeze({
    contractId: CONTRACT_ID,
    ownershipDigest: names.ownershipDigest,
    names,
    statementGroups,
    statementFingerprint,
    statementCount: Object.values(statementGroups).flat().length,
    executableSqlMaterialized: true,
    remoteExecutionAuthority: false
  });
}

function inspectSqlMaterialization(materialization) {
  if (!materialization || materialization.contractId !== CONTRACT_ID) {
    throw new Error('R3U_SQL_MATERIALIZATION_REQUIRED');
  }
  if (!exactArray(Object.keys(materialization.statementGroups), REQUIRED_STATEMENT_GROUPS)) {
    throw new Error('R3U_EXACT_STATEMENT_GROUPS_REQUIRED');
  }
  const statements = Object.values(materialization.statementGroups).flat();
  if (!statements.length || statements.some((statement) => typeof statement !== 'string' || !statement.trim())) {
    throw new Error('R3U_NONEMPTY_SQL_STATEMENTS_REQUIRED');
  }
  for (const statement of statements) {
    for (const pattern of FORBIDDEN_SQL_PATTERNS) {
      if (pattern.test(statement)) throw new Error('R3U_FORBIDDEN_SQL_PATTERN');
    }
  }

  const core = materialization.statementGroups.installCore.join('\n');
  const anchor = materialization.statementGroups.installAnchorPolicies.join('\n');
  const presenceOnly = materialization.statementGroups.switchToPresenceOnlyPolicy.join('\n');
  const counters = materialization.statementGroups.counterRead.join('\n');
  const residue = materialization.statementGroups.residueInspection.join('\n');
  const cleanup = materialization.statementGroups.cleanup.join('\n');

  const checks = {
    securityDefinerObserver: /\bsecurity definer\b/i.test(core),
    fixedSearchPath: /\bset search_path = pg_catalog\b/i.test(core),
    volatileObserver: /\blanguage plpgsql volatile\b/i.test(core),
    rollbackResistantNextval: (core.match(/pg_catalog\.nextval/g) || []).length === 2,
    cacheOneSequences: (core.match(/\bcache 1\b/g) || []).length === 2,
    noSequenceGrantToAuthenticated: !/grant\s+(usage|select|update).*sequence/i.test(core),
    functionExecuteGrantOnly: /grant execute on function .* to authenticated/i.test(core),
    anchorCountsBeforeDecision: /case when private\.[a-z0-9_]+_observe\(realtime\.messages\.extension::text\) then/i.test(anchor),
    anchorAllowsBroadcastAndPresence: /extension in \('broadcast', 'presence'\)/i.test(anchor),
    presenceOnlyCountsBeforeDecision: /case when private\.[a-z0-9_]+_observe\(realtime\.messages\.extension::text\) then/i.test(presenceOnly),
    presenceOnlyAllowsPresenceOnly: /extension = 'presence'/i.test(presenceOnly),
    exactTopicGate: anchor.includes('realtime.messages.topic = realtime.topic()') &&
      presenceOnly.includes('realtime.messages.topic = realtime.topic()'),
    counterReadUsesPgSequences: /from pg_catalog\.pg_sequences/i.test(counters),
    counterReadNormalizesNeverUsedToZero: (counters.match(/coalesce\(/g) || []).length === 2,
    counterAliasesExact: counters.includes('broadcast_rls_evaluations') &&
      counters.includes('presence_rls_evaluations'),
    residueCountsOnly: residue.includes('as "policyCount"') &&
      residue.includes('as "functionCount"') && residue.includes('as "sequenceCount"'),
    cleanupPoliciesBeforeFunction: cleanup.indexOf('drop policy') < cleanup.indexOf('drop function'),
    cleanupFunctionBeforeSequences: cleanup.indexOf('drop function') < cleanup.indexOf('drop sequence'),
    noTransactionWrapper: !statements.some((statement) => /^\s*(begin|commit|rollback)\b/i.test(statement)),
    noPersistentTableDdl: !/\b(create|alter|drop)\s+table\b/i.test(statements.join('\n')),
    noDataMutation: !/\b(insert\s+into|delete\s+from|truncate)\b/i.test(statements.join('\n')) &&
      !statements.some((statement) => /^\s*update\s+/i.test(statement))
  };

  return freeze({
    valid: Object.values(checks).every(Boolean),
    checks,
    statementFingerprint: materialization.statementFingerprint,
    statementCount: materialization.statementCount
  });
}

function evaluateRepositoryReadiness(input = {}) {
  if (input.predecessorValidationId !== PREDECESSOR_VALIDATION_ID) return blocked('R3T_VALIDATION_REQUIRED');
  if (input.predecessorStatus !== PREDECESSOR_STATUS) return blocked('R3T_CERTIFIED_STATUS_REQUIRED');
  if (input.predecessorHead !== PREDECESSOR_HEAD) return blocked('R3T_EVIDENCE_HEAD_REQUIRED');
  if (input.predecessorRecertRun !== PREDECESSOR_RECERT_RUN ||
      input.predecessorRecertJob !== PREDECESSOR_RECERT_JOB ||
      input.predecessorRecertSuccess !== true) {
    return blocked('R3T_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.predecessorMatrixRecertRun !== PREDECESSOR_MATRIX_RECERT_RUN ||
      input.predecessorMatrixRecertJob !== PREDECESSOR_MATRIX_RECERT_JOB ||
      input.predecessorMatrixRecertSuccess !== true) {
    return blocked('R3T_MATRIX_EVIDENCE_HEAD_RECERT_REQUIRED');
  }
  if (input.matrixVersion !== MATRIX_VERSION || input.maturity !== REQUIRED_MATURITY ||
      input.productionGate !== REQUIRED_PRODUCTION_GATE) {
    return blocked('CANONICAL_MATRIX_STATE_REQUIRED');
  }
  if (input.r3tContractId !== r3t.CONTRACT_ID || input.r3sContractId !== r3s.CONTRACT_ID ||
      input.r3qContractId !== r3q.CONTRACT_ID) {
    return blocked('R3T_R3S_R3Q_CONTRACT_CONTINUITY_REQUIRED');
  }
  if (!exactArray(input.statementGroups, REQUIRED_STATEMENT_GROUPS) ||
      !exactArray(input.counterIds, r3s.COUNTER_IDS) ||
      !exactArray(input.residueCountFields, r3s.RESIDUE_COUNT_FIELDS)) {
    return blocked('R3U_SQL_OBSERVATION_CONTRACT_CONTINUITY_REQUIRED');
  }

  const required = [
    'deterministicOwnershipScopedSqlMaterializer', 'ownershipTokenHashedIntoSafeIdentifiers',
    'securityDefinerObserverFunctionPrepared', 'observerSearchPathPinnedToPgCatalog',
    'observerFunctionVolatile', 'observerFunctionExecuteRestrictedToAuthenticated',
    'sequencesRemainUnexposedToAuthenticated', 'broadcastAndPresenceCountersSeparated',
    'sequenceCacheOneRequired', 'sequenceNextvalRollbackResistanceRequired',
    'anchorSelectPolicyMaterialized', 'anchorInsertPolicyMaterialized',
    'anchorBroadcastAndPresenceReadAllowed', 'anchorObserverEvaluatedBeforeReadDecision',
    'presenceOnlySelectPolicyMaterialized', 'presenceOnlyInsertPolicyMaterialized',
    'presenceOnlyBroadcastDeniedPresenceAllowed', 'presenceOnlyObserverEvaluatedBeforeReadDecision',
    'exactTopicGatePreserved', 'counterReadSqlMaterialized',
    'counterReadNeverUsedNormalizesToZero', 'counterReadShapeMatchesR3s',
    'residueInspectionSqlMaterialized', 'residueInspectionShapeMatchesR3s',
    'residueInspectionOwnershipScoped', 'cleanupSqlMaterialized',
    'cleanupDropsPoliciesBeforeFunctionAndSequences', 'noPersistentTableDdl',
    'noDataMutationSql', 'noTransactionWrapperPrepared', 'statementFingerprintPrepared',
    'repositorySelfTestPrepared', 'hardBlockBeforeRemoteExecutionPrepared',
    'noCausalPromotionWithoutRemoteObservation'
  ];
  for (const flag of required) {
    if (input[flag] !== true) return blocked('R3U_SQL_MATERIALIZATION_CONTROL_REQUIRED', { flag });
  }

  const prohibited = [
    'authorizationPhraseDefined', 'triggerPrepared', 'stagingEnvironmentJobPrepared',
    'workflowSecretsReferenced', 'remoteCredentialLoadingPrepared', 'remoteDependencyLoadingPrepared',
    'supabaseClientPrepared', 'pgClientPrepared', 'remoteExecutorPrepared', 'databaseConnectionPrepared',
    'sqlExecutionPrepared', 'stagingReadPrepared', 'stagingMutationPrepared',
    'runtimePolicyChangeAuthorized', 'runtimeDeployPrepared', 'productionPrepared', 'mergePrepared'
  ];
  for (const flag of prohibited) {
    if (input[flag] !== false) return blocked('R3U_REMOTE_SCOPE_PROHIBITED', { flag });
  }

  const sample = buildSqlMaterialization('r3u_contract_sample');
  const inspection = inspectSqlMaterialization(sample);
  if (inspection.valid !== true) return blocked('R3U_SQL_MATERIALIZATION_SELF_INSPECTION_FAILED');

  return freeze({
    contractId: CONTRACT_ID,
    validationId: VALIDATION_ID,
    decision: 'repository_instrumentation_sql_materialized_and_certifiable_no_remote_authority',
    reason: null,
    statementGroups: REQUIRED_STATEMENT_GROUPS,
    counterIds: r3s.COUNTER_IDS,
    residueCountFields: r3s.RESIDUE_COUNT_FIELDS,
    sampleStatementFingerprint: sample.statementFingerprint,
    repositorySqlMaterializationAuthority: true,
    remoteSqlExecutionAuthority: false,
    remoteAdapterActivationAuthority: false,
    triggerCreationAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    remoteCredentialReadAuthority: false,
    remoteDependencyLoadAuthority: false,
    realtimeSubscriptionAuthority: false,
    runtimeChangeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false,
    nextBoundaryRequirement:
      'Certify a separate repository-only single-use remote execution envelope that binds this R3U SQL bundle to the R3T complete adapter. Do not execute staging or define reusable authorization in R3U.'
  });
}

module.exports = freeze({
  CONTRACT_ID, VALIDATION_ID, PREDECESSOR_VALIDATION_ID, PREDECESSOR_STATUS, PREDECESSOR_HEAD,
  PREDECESSOR_RECERT_RUN, PREDECESSOR_RECERT_JOB, PREDECESSOR_MATRIX_RECERT_RUN,
  PREDECESSOR_MATRIX_RECERT_JOB, MATRIX_VERSION, REQUIRED_MATURITY, REQUIRED_PRODUCTION_GATE,
  REMOTE_EXECUTION_BLOCK_CODE, OBJECT_PREFIX, OBJECT_SCHEMA, POLICY_SCHEMA, POLICY_TABLE,
  REQUIRED_STATEMENT_GROUPS, FORBIDDEN_SQL_PATTERNS, assertRemoteExecutionBoundaryAbsent,
  deriveObjectNames, buildSqlMaterialization, inspectSqlMaterialization, evaluateRepositoryReadiness
});
