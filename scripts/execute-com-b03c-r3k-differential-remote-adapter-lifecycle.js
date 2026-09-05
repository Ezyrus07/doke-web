#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');
const r3jExecutor = require('./execute-com-b03c-r3j-evaluation-context-differential-harness');

const FUTURE_LIFECYCLE_STEPS = Object.freeze([
  'authorization_gate_before_credentials',
  'single_use_envelope_validation',
  'credential_read_after_authorization_only',
  'dependency_load_after_authorization_only',
  'pull_request_checkpoint_preflight',
  'supabase_project_identity_preflight',
  'api_key_discovery_after_authorization_only',
  'database_connection',
  'realtime_foundation_preflight',
  'single_synthetic_identity_create',
  'canonical_account_materialization_verify',
  'single_synthetic_identity_login_and_server_verify',
  'execute_17_cases_same_identity_token_topic',
  'fresh_realtime_client_per_case',
  'two_temporary_policies_per_case',
  'structural_gate_before_each_probe',
  'cleanup_after_each_case',
  'independent_report_verification',
  'synthetic_identity_cleanup_finally',
  'zero_residue_verification'
]);

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function safeRemoteFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3K_REMOTE_FAILURE');
  const code = /^DOKE_COM_B03C_R3K_[A-Z0-9_]+$/.test(raw)
    ? raw
    : 'DOKE_COM_B03C_R3K_REMOTE_FAILURE';
  return { code, rawRemoteErrorExposed: false };
}

function assertFunction(value, code) {
  if (typeof value !== 'function') fail(code);
}

function prepareRemoteRuntime({ readCredential, loadDependency }) {
  r3k.assertRemoteBoundaryAbsent();
  assertFunction(readCredential, 'DOKE_COM_B03C_R3K_CREDENTIAL_READER_REQUIRED');
  assertFunction(loadDependency, 'DOKE_COM_B03C_R3K_DEPENDENCY_LOADER_REQUIRED');
  const credentials = Object.fromEntries(
    r3k.CREDENTIAL_NAMES.map((name) => [name, readCredential(name)])
  );
  const dependencies = Object.fromEntries(
    r3k.REMOTE_DEPENDENCIES.map((name) => [name, loadDependency(name)])
  );
  return { credentials, dependencies };
}

function buildFutureLifecyclePlan() {
  return {
    contractId: r3k.CONTRACT_ID,
    steps: [...FUTURE_LIFECYCLE_STEPS],
    executionCaseIds: [...r3k.EXECUTION_CASE_IDS],
    negativeControlId: r3j.NEGATIVE_CONTROL_ID,
    differentialProbeCount: r3j.CASE_IDS.length,
    totalExecutionCaseCount: r3k.EXECUTION_CASE_IDS.length,
    sameIdentityAcrossCases: true,
    sameAccessTokenAcrossCases: true,
    sameTopicAcrossCases: true,
    freshRealtimeClientPerCase: true,
    exactlyTwoTemporaryPoliciesPerCase: true,
    zeroResidueRequired: true,
    causalPromotionAllowed: false,
    exactRootCauseProven: false
  };
}

function createRepositoryPgClient() {
  const baseline = [{
    policyname: 'existing_safe_policy',
    permissive: 'PERMISSIVE',
    roles: ['authenticated'],
    cmd: 'SELECT',
    qual: 'true',
    with_check: null
  }];
  let rows = baseline.map((row) => ({ ...row, roles: [...row.roles] }));

  return {
    async query(sql) {
      const text = String(sql).trim();
      const lower = text.toLowerCase();
      if (text === r3j.SNAPSHOT_SQL) {
        return { rows: rows.map((row) => ({ ...row, roles: [...row.roles] })) };
      }
      if (['begin', 'commit', 'rollback'].includes(lower)) return { rows: [] };

      let match = text.match(
        /^create policy ([a-z0-9_]+) on realtime\.messages for (select|insert) to authenticated (using|with check) \((.*)\)$/i
      );
      if (match) {
        const [, policyname, command, clause, expression] = match;
        if (rows.some((row) => row.policyname === policyname)) {
          fail('DOKE_COM_B03C_R3K_REPOSITORY_DUPLICATE_POLICY');
        }
        rows.push({
          policyname,
          permissive: 'PERMISSIVE',
          roles: ['authenticated'],
          cmd: command.toUpperCase(),
          qual: clause.toLowerCase() === 'using' ? expression : null,
          with_check: clause.toLowerCase() === 'with check' ? expression : null
        });
        return { rows: [] };
      }

      match = text.match(/^drop policy if exists ([a-z0-9_]+) on realtime\.messages$/i);
      if (match) {
        rows = rows.filter((row) => row.policyname !== match[1]);
        return { rows: [] };
      }
      fail('DOKE_COM_B03C_R3K_REPOSITORY_PG_SQL_UNEXPECTED');
    },
    baselineFingerprint() {
      return JSON.stringify(baseline);
    }
  };
}

function createRepositoryRealtimeFactory() {
  let createCount = 0;
  return function createClient() {
    const caseIndex = createCount++;
    let activeChannel = null;
    return {
      realtime: { async setAuth() {} },
      channel() {
        activeChannel = {
          on() { return activeChannel; },
          presenceState() { return {}; },
          subscribe(callback) {
            queueMicrotask(() => {
              if (caseIndex === 0) {
                callback('CHANNEL_ERROR', { message: 'RLS policy rejected' });
              } else {
                callback('SUBSCRIBED');
              }
            });
            return activeChannel;
          }
        };
        return activeChannel;
      },
      async removeChannel() {}
    };
  };
}

function createRepositoryAdminFactory(state) {
  return function createClient() {
    return {
      auth: {
        admin: {
          async createUser({ email }) {
            state.created += 1;
            return {
              data: {
                user: {
                  id: '11111111-1111-4111-8111-111111111111',
                  email
                }
              },
              error: null
            };
          },
          async deleteUser(userId) {
            if (userId !== '11111111-1111-4111-8111-111111111111') {
              return { error: new Error('unexpected user') };
            }
            state.deleted += 1;
            return { error: null };
          }
        }
      }
    };
  };
}

function buildRepositoryAdapters() {
  const pgClient = createRepositoryPgClient();
  const db = r3gExecutor.buildPgDbAdapter(pgClient);
  const realtime = r3gExecutor.buildSupabaseRealtimeAdapter({
    createClient: createRepositoryRealtimeFactory(),
    url: 'https://repository-only.invalid',
    publishableKey: 'repository-only-publishable'
  });

  const identityState = { created: 0, deleted: 0 };
  const admin = r3gExecutor.buildSupabaseAdminAdapter({
    createClient: createRepositoryAdminFactory(identityState),
    url: 'https://repository-only.invalid',
    secretKey: 'repository-only-secret'
  });

  const management = r3gExecutor.buildManagementAdapter({
    accessToken: 'repository-only-management-token',
    fetchImpl: async () => ({
      ok: true,
      async json() {
        return {
          id: r3k.REQUIRED_PROJECT_ID,
          name: r3k.REQUIRED_PROJECT_NAME,
          status: 'ACTIVE_HEALTHY',
          region: 'sa-east-1',
          database: { host: 'repository-only.invalid' }
        };
      }
    })
  });

  return { db, realtime, admin, management, identityState };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      readCredential() {
        credentialReads += 1;
        return 'forbidden';
      },
      loadDependency() {
        dependencyLoads += 1;
        return {};
      }
    });
    fail('DOKE_COM_B03C_R3K_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3k.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) {
    fail('DOKE_COM_B03C_R3K_PREAUTH_SIDE_EFFECT_DETECTED');
  }

  const lifecycle = buildFutureLifecyclePlan();
  if (
    lifecycle.differentialProbeCount !== 16 ||
    lifecycle.totalExecutionCaseCount !== 17 ||
    lifecycle.negativeControlId !== r3j.NEGATIVE_CONTROL_ID ||
    JSON.stringify(lifecycle.executionCaseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)
  ) {
    fail('DOKE_COM_B03C_R3K_LIFECYCLE_CASE_MATRIX_INVALID');
  }

  const { db, realtime, admin, management, identityState } = buildRepositoryAdapters();
  const identity = await admin.createUser({
    email: 'r3k-repository@doke.local',
    password: 'repository-only-password',
    purpose: 'repository-self-test'
  });

  let report;
  try {
    report = await r3jExecutor.executePlan({
      db,
      realtime,
      context: {
        userId: identity.id,
        accessToken: 'repository-only-same-access-token',
        topic: 'room:repository-only-r3k',
        nonceSeed: crypto.createHash('sha256').update('r3k-repository-self-test').digest('hex')
      }
    });
  } finally {
    await admin.deleteUser(identity.id);
  }

  const project = await management.inspectProject();
  const negative = report.caseResults.find(
    (item) => item.caseId === r3j.NEGATIVE_CONTROL_ID
  );

  if (
    report.differentialProbeCount !== 16 ||
    report.totalExecutionCaseCount !== 17 ||
    JSON.stringify(report.caseIds) !== JSON.stringify(r3j.EXECUTION_CASE_IDS)
  ) {
    fail('DOKE_COM_B03C_R3K_BRIDGE_CASE_MATRIX_INVALID');
  }
  if (!negative || negative.probe.subscribed !== false) {
    fail('DOKE_COM_B03C_R3K_NEGATIVE_CONTROL_INVALID');
  }
  if (report.caseResults.some((item) => item.structuralEvidence.evidenceComplete !== true)) {
    fail('DOKE_COM_B03C_R3K_STRUCTURAL_EVIDENCE_INCOMPLETE');
  }
  if (identityState.created !== 1 || identityState.deleted !== 1) {
    fail('DOKE_COM_B03C_R3K_SYNTHETIC_IDENTITY_LIFECYCLE_INVALID');
  }

  return {
    validationId: 'COM-B03C-R3K-DIFFERENTIAL-REMOTE-ADAPTER-LIFECYCLE-REPOSITORY-SELF-TEST',
    contractId: r3k.CONTRACT_ID,
    lifecycleStepCount: lifecycle.steps.length,
    differentialProbeCount: report.differentialProbeCount,
    totalExecutionCaseCount: report.totalExecutionCaseCount,
    executionCaseIds: report.caseIds,
    negativeControlRejected: negative.probe.subscribed === false,
    allStructuralEvidenceComplete: report.caseResults.every(
      (item) => item.structuralEvidence.evidenceComplete === true
    ),
    sameIdentityAcrossCases: report.sameIdentityAcrossCases === true,
    sameAccessTokenAcrossCases: report.sameAccessTokenAcrossCases === true,
    sameTopicAcrossCases: report.sameTopicAcrossCases === true,
    freshRealtimeClientPerCase: report.freshRealtimeClientPerCase === true,
    syntheticIdentityCreatedExactlyOnce: identityState.created === 1,
    syntheticIdentityDeletedExactlyOnce: identityState.deleted === 1,
    projectIdentityVerified: project.id === r3k.REQUIRED_PROJECT_ID,
    credentialReadsBeforeAuthorization: credentialReads,
    dependencyLoadsBeforeAuthorization: dependencyLoads,
    stagingAccess: false,
    networkAccess: false,
    causalPromotionAllowed: false,
    exactRootCauseProven: false,
    rawRemoteErrorExposed: false
  };
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      const report = await repositorySelfTest();
      process.stdout.write(`${JSON.stringify(report)}\n`);
      return;
    }
    prepareRemoteRuntime({
      readCredential: () => null,
      loadDependency: () => null
    });
  })().catch((error) => {
    process.stderr.write(
      `${String(error?.code || error?.message || 'DOKE_COM_B03C_R3K_FAILURE')}\n`
    );
    process.exitCode = 2;
  });
}

module.exports = {
  FUTURE_LIFECYCLE_STEPS,
  safeRemoteFailure,
  prepareRemoteRuntime,
  buildFutureLifecyclePlan,
  buildRepositoryAdapters,
  repositorySelfTest
};
