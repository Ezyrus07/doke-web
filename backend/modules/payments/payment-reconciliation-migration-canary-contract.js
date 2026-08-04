'use strict';

const crypto = require('node:crypto');

const CONTRACT_VERSION = 'pay-a08-immutable-migrations-read-only-canary-v1';
const MANIFEST_VERSION = 'pay-reconciliation-migration-manifest-v1';
const CANARY_VERSION = 'pay-reconciliation-schema-read-only-canary-v1';
const STAGING_PHRASE = 'I_EXPLICITLY_AUTHORIZE_PAY_A08_READ_ONLY_RECONCILIATION_CANARY_ON_DOKE_STAGING';
const STAGING_SCOPE = 'reconciliation_schema_read_only_canary_only';
const MAX_AUTHORIZATION_AGE_SECONDS = 15 * 60;

const ALLOWED_INTROSPECTION_RELATIONS = Object.freeze([
  'pg_catalog.pg_class',
  'pg_catalog.pg_namespace',
  'pg_catalog.pg_attribute',
  'pg_catalog.pg_index',
  'pg_catalog.pg_constraint',
  'pg_catalog.pg_proc',
  'information_schema.columns',
  'information_schema.table_constraints',
  'information_schema.key_column_usage',
  'supabase_migrations.schema_migrations'
]);

const PROHIBITED_SQL = /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|vacuum|analyze|cluster|reindex|refresh|call|do|copy|execute|prepare|deallocate|set\s+role|reset\s+role|notify|listen|unlisten|security\s+definer|pg_advisory|cron\.|net\.|http|dblink|lo_import|lo_export)\b/i;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + canonicalJson(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}

function assert(condition, code, message) {
  if (!condition) {
    const error = new Error(message);
    error.code = code;
    throw error;
  }
}

function validateMigrationManifest(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A08_MANIFEST_REQUIRED', 'Migration manifest is required.');
  assert(input.contractVersion === CONTRACT_VERSION, 'DOKE_PAY_A08_CONTRACT_VERSION_INVALID', 'PAY-A08 contract version mismatch.');
  assert(input.manifestVersion === MANIFEST_VERSION, 'DOKE_PAY_A08_MANIFEST_VERSION_INVALID', 'Migration manifest version mismatch.');
  assert(input.providerNeutral === true, 'DOKE_PAY_A08_PROVIDER_NEUTRAL_REQUIRED', 'Manifest must remain provider-neutral.');
  assert(input.remoteApplicationAllowed === false, 'DOKE_PAY_A08_REMOTE_APPLICATION_DENIED', 'Repository manifest cannot allow remote application.');
  assert(Array.isArray(input.migrations) && input.migrations.length === 4, 'DOKE_PAY_A08_MIGRATION_COUNT_INVALID', 'Exactly four migration sources are required.');

  const seenIds = new Set();
  const seenPaths = new Set();
  const normalized = input.migrations.map((entry, index) => {
    assert(entry && typeof entry === 'object', 'DOKE_PAY_A08_MIGRATION_ENTRY_INVALID', 'Migration entry is invalid.');
    assert(/^[a-z0-9_]+$/.test(entry.id), 'DOKE_PAY_A08_MIGRATION_ID_INVALID', 'Migration id is invalid.');
    assert(/^supabase\/migrations\/\d{14}_pay_a08_[a-z0-9_]+\.sql$/.test(entry.path), 'DOKE_PAY_A08_MIGRATION_PATH_INVALID', 'Migration path is invalid.');
    assert(/^[a-f0-9]{64}$/.test(entry.sha256), 'DOKE_PAY_A08_MIGRATION_HASH_INVALID', 'Migration SHA-256 is invalid.');
    assert(entry.order === index + 1, 'DOKE_PAY_A08_MIGRATION_ORDER_INVALID', 'Migration order is invalid.');
    assert(entry.applied === false, 'DOKE_PAY_A08_MIGRATION_APPLICATION_FALSE_REQUIRED', 'Migration must remain unapplied.');
    assert(entry.rollbackMode === 'forward_only_reviewed_migration', 'DOKE_PAY_A08_ROLLBACK_MODE_INVALID', 'Rollback must be forward-only.');
    assert(!seenIds.has(entry.id) && !seenPaths.has(entry.path), 'DOKE_PAY_A08_MIGRATION_DUPLICATE', 'Migration id/path must be unique.');
    seenIds.add(entry.id);
    seenPaths.add(entry.path);
    return Object.freeze({
      id: entry.id,
      path: entry.path,
      sha256: entry.sha256,
      order: entry.order,
      applied: false,
      rollbackMode: entry.rollbackMode
    });
  });

  const manifestBody = {
    contractVersion: CONTRACT_VERSION,
    manifestVersion: MANIFEST_VERSION,
    providerNeutral: true,
    remoteApplicationAllowed: false,
    migrations: normalized
  };
  return Object.freeze({
    ...manifestBody,
    manifestHash: sha256(canonicalJson(manifestBody))
  });
}

function validateReadOnlyIntrospectionQuery(sql) {
  assert(typeof sql === 'string' && sql.trim(), 'DOKE_PAY_A08_QUERY_REQUIRED', 'Introspection query is required.');
  const normalized = sql.replace(/--.*$/gm, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim();
  assert(!normalized.includes(';'), 'DOKE_PAY_A08_MULTI_STATEMENT_DENIED', 'Semicolons and multi-statement SQL are denied.');
  assert(/^select\b/i.test(normalized), 'DOKE_PAY_A08_SELECT_ONLY', 'Only SELECT introspection is allowed.');
  assert(!PROHIBITED_SQL.test(normalized), 'DOKE_PAY_A08_MUTATION_SQL_DENIED', 'DDL, DML and operational SQL are denied.');

  const relations = [...normalized.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*)/ig)]
    .map((match) => match[1].toLowerCase());
  assert(relations.length > 0, 'DOKE_PAY_A08_INTROSPECTION_RELATION_REQUIRED', 'An allowlisted introspection relation is required.');
  relations.forEach((relation) => {
    assert(ALLOWED_INTROSPECTION_RELATIONS.includes(relation), 'DOKE_PAY_A08_RELATION_NOT_ALLOWLISTED', 'Query relation is not allowlisted: ' + relation);
  });
  return Object.freeze({
    canaryVersion: CANARY_VERSION,
    normalizedSql: normalized,
    relations: Object.freeze(relations),
    readOnly: true,
    ddlAllowed: false,
    dmlAllowed: false,
    rpcAllowed: false,
    schedulerMutationAllowed: false,
    migrationApplicationAllowed: false
  });
}

function buildReadOnlyCanaryPlan(input, replayLedger = new Set()) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A08_AUTHORIZATION_REQUIRED', 'Canary authorization is required.');
  assert(input.phrase === STAGING_PHRASE, 'DOKE_PAY_A08_AUTHORIZATION_PHRASE_INVALID', 'Authorization phrase is invalid.');
  assert(input.scope === STAGING_SCOPE, 'DOKE_PAY_A08_AUTHORIZATION_SCOPE_INVALID', 'Authorization scope is invalid.');
  assert(/^[a-f0-9]{40}$/.test(input.exactGitHead), 'DOKE_PAY_A08_GIT_HEAD_INVALID', 'Exact git head is invalid.');
  assert(/^[a-f0-9]{64}$/.test(input.manifestHash), 'DOKE_PAY_A08_MANIFEST_HASH_INVALID', 'Manifest hash is invalid.');
  assert(/^[a-f0-9]{64}$/.test(input.evidenceHash), 'DOKE_PAY_A08_EVIDENCE_HASH_INVALID', 'Evidence hash is invalid.');
  assert(/^[a-z0-9]{20}$/.test(input.stagingProjectRef), 'DOKE_PAY_A08_STAGING_PROJECT_INVALID', 'Staging project identity is invalid.');
  assert(input.environment === 'staging' && input.production === false, 'DOKE_PAY_A08_ENVIRONMENT_INVALID', 'Only non-production staging is allowed.');
  assert(typeof input.nonce === 'string' && /^[A-Za-z0-9_-]{24,128}$/.test(input.nonce), 'DOKE_PAY_A08_NONCE_INVALID', 'Authorization nonce is invalid.');

  const issued = Date.parse(input.issuedAt);
  const now = Date.parse(input.now);
  assert(Number.isFinite(issued) && Number.isFinite(now), 'DOKE_PAY_A08_TIMESTAMP_INVALID', 'Authorization timestamps are invalid.');
  assert(now >= issued && (now - issued) / 1000 <= MAX_AUTHORIZATION_AGE_SECONDS, 'DOKE_PAY_A08_AUTHORIZATION_EXPIRED', 'Authorization is expired.');
  const replayKey = sha256([input.exactGitHead, input.manifestHash, input.stagingProjectRef, input.nonce].join(':'));
  assert(!replayLedger.has(replayKey), 'DOKE_PAY_A08_AUTHORIZATION_REPLAYED', 'Authorization replay is denied.');
  replayLedger.add(replayKey);

  const queries = (input.queries || []).map(validateReadOnlyIntrospectionQuery);
  assert(queries.length > 0, 'DOKE_PAY_A08_QUERY_PLAN_EMPTY', 'At least one read-only query is required.');
  return Object.freeze({
    contractVersion: CONTRACT_VERSION,
    canaryVersion: CANARY_VERSION,
    scope: STAGING_SCOPE,
    exactGitHead: input.exactGitHead,
    manifestHash: input.manifestHash,
    evidenceHash: input.evidenceHash,
    stagingProjectRefHash: sha256(input.stagingProjectRef),
    authorizationReplayKey: replayKey,
    queries: Object.freeze(queries),
    readOnly: true,
    remoteExecutionAllowedByThisContract: false,
    repositoryExecutionPerformed: false,
    ddlAllowed: false,
    dmlAllowed: false,
    migrationApplicationAllowed: false,
    automaticDriftRepairAllowed: false,
    productionAllowed: false
  });
}

function sanitizeCanaryEvidence(input) {
  assert(input && typeof input === 'object' && !Array.isArray(input), 'DOKE_PAY_A08_EVIDENCE_REQUIRED', 'Canary evidence is required.');
  const allowed = [
    'schemaCompatible', 'migrationHistoryCompatible', 'objectsExpected', 'objectsObserved',
    'constraintsExpected', 'constraintsObserved', 'indexesExpected', 'indexesObserved',
    'manifestHash', 'exactGitHead', 'observedAt'
  ];
  Object.keys(input).forEach((key) => {
    assert(allowed.includes(key), 'DOKE_PAY_A08_EVIDENCE_FIELD_DENIED', 'Evidence field is not allowlisted: ' + key);
  });
  ['objectsExpected', 'objectsObserved', 'constraintsExpected', 'constraintsObserved', 'indexesExpected', 'indexesObserved']
    .forEach((key) => assert(Number.isInteger(input[key]) && input[key] >= 0, 'DOKE_PAY_A08_EVIDENCE_COUNT_INVALID', key + ' must be a non-negative integer.'));
  assert(typeof input.schemaCompatible === 'boolean' && typeof input.migrationHistoryCompatible === 'boolean', 'DOKE_PAY_A08_EVIDENCE_BOOLEAN_INVALID', 'Compatibility evidence must be boolean.');
  assert(/^[a-f0-9]{64}$/.test(input.manifestHash), 'DOKE_PAY_A08_EVIDENCE_MANIFEST_INVALID', 'Evidence manifest hash is invalid.');
  assert(/^[a-f0-9]{40}$/.test(input.exactGitHead), 'DOKE_PAY_A08_EVIDENCE_HEAD_INVALID', 'Evidence head is invalid.');
  assert(Number.isFinite(Date.parse(input.observedAt)), 'DOKE_PAY_A08_EVIDENCE_TIME_INVALID', 'Evidence timestamp is invalid.');
  return Object.freeze({
    ...input,
    sanitized: true,
    containsUserIdentifiers: false,
    containsFinancialIdentifiers: false,
    containsProviderPayload: false,
    automaticDriftRepairAllowed: false
  });
}

module.exports = Object.freeze({
  CONTRACT_VERSION,
  MANIFEST_VERSION,
  CANARY_VERSION,
  STAGING_PHRASE,
  STAGING_SCOPE,
  MAX_AUTHORIZATION_AGE_SECONDS,
  ALLOWED_INTROSPECTION_RELATIONS,
  validateMigrationManifest,
  validateReadOnlyIntrospectionQuery,
  buildReadOnlyCanaryPlan,
  sanitizeCanaryEvidence,
  sha256,
  canonicalJson
});
