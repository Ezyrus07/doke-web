#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3u = require('../backend/modules/communities/community-realtime-private-auth-r3u');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const r3j = require('../backend/modules/communities/community-realtime-private-auth-r3j');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const r3gExecutor = require('./execute-com-b03c-r3g-remote-adapter-staging-diagnostic');
const r3kExecutor = require('./execute-com-b03c-r3k-differential-remote-adapter-lifecycle');

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function assertFunction(value, code) {
  if (typeof value !== 'function') fail(code);
}

function prepareRemoteRuntime({ readCredential, loadDependency }) {
  r3v.assertRemoteExecutionBoundaryAbsent();
  assertFunction(readCredential, 'DOKE_COM_B03C_R3V_CREDENTIAL_READER_REQUIRED');
  assertFunction(loadDependency, 'DOKE_COM_B03C_R3V_DEPENDENCY_LOADER_REQUIRED');
  const credentials = Object.fromEntries(r3k.CREDENTIAL_NAMES.map((name) => [name, readCredential(name)]));
  const dependencies = Object.fromEntries(r3k.REMOTE_DEPENDENCIES.map((name) => [name, loadDependency(name)]));
  return { credentials, dependencies };
}

function assertPlan(plan) {
  if (!plan || plan.contractId !== r3v.CONTRACT_ID) fail('DOKE_COM_B03C_R3V_EXECUTION_PLAN_REQUIRED');
  const inspection = r3u.inspectSqlMaterialization(plan.sqlMaterialization);
  if (inspection.valid !== true || inspection.statementFingerprint !== plan.statementFingerprint) {
    fail('DOKE_COM_B03C_R3V_SQL_PLAN_INVALID');
  }
  if (plan.statementCount !== 21 || plan.rawOwnershipTokenPersisted !== false) {
    fail('DOKE_COM_B03C_R3V_SQL_PLAN_SHAPE_INVALID');
  }
  return plan;
}

function buildRestrictedDbExecutionAdapter(client, planInput) {
  if (!client || typeof client.query !== 'function') fail('DOKE_COM_B03C_R3V_PG_CLIENT_REQUIRED');
  const plan = assertPlan(planInput);
  const groups = plan.sqlMaterialization.statementGroups;
  let lastCounterSnapshot = null;
  let terminalCounterSnapshot = null;

  async function transaction(statements) {
    await client.query('begin');
    try {
      for (const statement of statements) await client.query(statement);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  }

  return Object.freeze({
    kind: 'r3v_restricted_db_execution',
    async snapshotPolicies() {
      const result = await client.query(r3j.SNAPSHOT_SQL);
      const rows = Array.isArray(result?.rows) ? result.rows.map((row) => ({ ...row })) : [];
      return Object.freeze({ complete: true, immutable: true, rows: Object.freeze(rows) });
    },
    async installInstrumentation() {
      await transaction([...groups.installCore, ...groups.installAnchorPolicies]);
    },
    async readCounters(phase) {
      if (phase === 'after_cleanup') {
        const carryForward = terminalCounterSnapshot || lastCounterSnapshot;
        if (!carryForward) fail('DOKE_COM_B03C_R3V_COUNTER_CARRY_FORWARD_REQUIRED');
        return carryForward;
      }
      const result = await client.query(groups.counterRead[0]);
      const row = Array.isArray(result?.rows) && result.rows[0] ? result.rows[0] : {};
      const normalized = r3s.normalizeCounterSnapshot(phase, row);
      lastCounterSnapshot = normalized;
      if (phase === 'after_presence_only_join') terminalCounterSnapshot = normalized;
      return normalized;
    },
    async switchToPresenceOnlyPolicy() {
      await transaction(groups.switchToPresenceOnlyPolicy);
    },
    async cleanup() {
      await transaction(groups.cleanup);
    },
    async inspectResidue() {
      const result = await client.query(groups.residueInspection[0]);
      const row = Array.isArray(result?.rows) && result.rows[0] ? result.rows[0] : {};
      return r3s.normalizeResidueCounts(row);
    },
    async assertZeroResidue() {
      const counts = await this.inspectResidue();
      return r3s.RESIDUE_COUNT_FIELDS.every((field) => counts[field] === 0);
    }
  });
}

function waitForPresenceSignal(signalPromise, timeoutMs) {
  return Promise.race([
    signalPromise,
    new Promise((resolve) => setTimeout(() => resolve(false), timeoutMs))
  ]);
}

function buildPresenceAwareRealtimeBridge({ createClient, url, publishableKey, presenceTimeoutMs = 250 } = {}) {
  assertFunction(createClient, 'DOKE_COM_B03C_R3V_CREATE_CLIENT_REQUIRED');
  if (!url || !publishableKey) fail('DOKE_COM_B03C_R3V_REALTIME_CONFIG_REQUIRED');

  return Object.freeze({
    kind: 'r3v_presence_aware_realtime_bridge',
    async runProbe({ userId, accessToken, topic, requirePresenceState }) {
      const client = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      if (!client?.realtime || typeof client.realtime.setAuth !== 'function') {
        fail('DOKE_COM_B03C_R3V_REALTIME_CLIENT_INVALID');
      }
      await client.realtime.setAuth(accessToken);
      let channel = null;
      let presenceStateObserved = false;
      let resolvePresence;
      const presenceSignal = new Promise((resolve) => { resolvePresence = resolve; });
      try {
        channel = client.channel(topic, {
          config: {
            private: true,
            presence: {
              enabled: true,
              key: crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 16)
            }
          }
        });
        channel.on('presence', { event: 'sync' }, () => {
          presenceStateObserved = true;
          channel.presenceState();
          resolvePresence(true);
        });
        const join = await r3gExecutor.subscribeChannel(channel);
        if (join.subscribed === true && requirePresenceState === true && presenceStateObserved !== true) {
          presenceStateObserved = await waitForPresenceSignal(presenceSignal, presenceTimeoutMs);
        }
        return Object.freeze({
          joinSubscribed: join.subscribed === true,
          presenceStateObserved: presenceStateObserved === true,
          classification: String(join.classification || 'unspecified'),
          rawRemoteErrorExposed: false
        });
      } finally {
        if (channel && typeof client.removeChannel === 'function') {
          await client.removeChannel(channel).catch(() => {});
        }
      }
    }
  });
}

function buildRepositorySimulationAdapter({ db, realtime, probeContexts, failPresenceOnly = false } = {}) {
  if (!db || !realtime || !probeContexts) fail('DOKE_COM_B03C_R3V_SIMULATION_DEPENDENCIES_REQUIRED');
  return Object.freeze({
    kind: 'synthetic_repository',
    remoteCapable: false,
    async preflight() { return { ok: true }; },
    async snapshotPolicies() { return db.snapshotPolicies(); },
    async installInstrumentation(spec) {
      if (spec !== r3q.INSTRUMENTATION_SPEC) fail('DOKE_COM_B03C_R3V_PINNED_INSTRUMENTATION_SPEC_REQUIRED');
      return db.installInstrumentation();
    },
    async runPresenceReadEffectiveGate() {
      return realtime.runProbe({ ...probeContexts.anchor, requirePresenceState: true });
    },
    async readCounters(phase) { return db.readCounters(phase); },
    async switchToPresenceOnlyPolicy(policy) {
      if (policy !== r3q.INSTRUMENTATION_SPEC.presenceOnlyPolicy) {
        fail('DOKE_COM_B03C_R3V_PINNED_PRESENCE_ONLY_POLICY_REQUIRED');
      }
      return db.switchToPresenceOnlyPolicy();
    },
    async runPresenceOnlyJoin() {
      if (failPresenceOnly) fail('DOKE_COM_B03C_R3V_SYNTHETIC_PRESENCE_ONLY_FAILURE');
      return realtime.runProbe({ ...probeContexts.presenceOnly, requirePresenceState: false });
    },
    async cleanup() { return db.cleanup(); },
    async assertZeroResidue() { return db.assertZeroResidue(); }
  });
}

function createRepositoryDbRuntime(planInput) {
  const plan = assertPlan(planInput);
  const groups = plan.sqlMaterialization.statementGroups;
  const baseline = [{
    policyname: 'existing_safe_policy', permissive: 'PERMISSIVE', roles: ['authenticated'],
    cmd: 'SELECT', qual: 'true', with_check: null
  }];
  let policies = baseline.map((row) => ({ ...row, roles: [...row.roles] }));
  let broadcastSequence = false;
  let presenceSequence = false;
  let observerFunction = false;
  let broadcastCount = 0;
  let presenceCount = 0;

  function policyCreate(text) {
    const match = text.match(/^create policy ([a-z0-9_]+) on realtime\.messages for (select|insert) to authenticated (using|with check) \((.*)\)$/i);
    if (!match) return false;
    const [, policyname, command, clause, expression] = match;
    policies.push({
      policyname,
      permissive: 'PERMISSIVE',
      roles: ['authenticated'],
      cmd: command.toUpperCase(),
      qual: clause.toLowerCase() === 'using' ? expression : null,
      with_check: clause.toLowerCase() === 'with check' ? expression : null
    });
    return true;
  }

  const client = {
    async query(sql) {
      const text = String(sql).trim();
      if (['begin', 'commit', 'rollback'].includes(text.toLowerCase())) return { rows: [] };
      if (text === r3j.SNAPSHOT_SQL) return { rows: policies.map((row) => ({ ...row, roles: [...row.roles] })) };
      if (text === groups.counterRead[0]) {
        return { rows: [{
          broadcast_rls_evaluations: broadcastSequence ? broadcastCount : 0,
          presence_rls_evaluations: presenceSequence ? presenceCount : 0
        }] };
      }
      if (text === groups.residueInspection[0]) {
        const tempPolicies = policies.filter((row) => row.policyname.startsWith(`com_b03c_r3u_${plan.ownershipDigest}_`)).length;
        return { rows: [{
          policyCount: tempPolicies,
          functionCount: observerFunction ? 1 : 0,
          sequenceCount: Number(broadcastSequence) + Number(presenceSequence)
        }] };
      }
      if (text === groups.installCore[0]) { broadcastSequence = true; broadcastCount = 0; return { rows: [] }; }
      if (text === groups.installCore[1]) { presenceSequence = true; presenceCount = 0; return { rows: [] }; }
      if (text === groups.installCore[2]) { observerFunction = true; return { rows: [] }; }
      if (text === groups.installCore[3] || text === groups.installCore[4]) return { rows: [] };
      if (policyCreate(text)) return { rows: [] };
      let match = text.match(/^drop policy if exists ([a-z0-9_]+) on realtime\.messages$/i);
      if (match) { policies = policies.filter((row) => row.policyname !== match[1]); return { rows: [] }; }
      if (text === groups.cleanup[4]) return { rows: [] };
      if (text === groups.cleanup[5]) { observerFunction = false; return { rows: [] }; }
      if (text === groups.cleanup[6]) { broadcastSequence = false; return { rows: [] }; }
      if (text === groups.cleanup[7]) { presenceSequence = false; return { rows: [] }; }
      fail('DOKE_COM_B03C_R3V_REPOSITORY_SQL_UNEXPECTED');
    }
  };

  return {
    client,
    observe(extension) {
      if (extension === 'broadcast' && broadcastSequence) broadcastCount += 1;
      if (extension === 'presence' && presenceSequence) presenceCount += 1;
    },
    snapshotState() {
      return {
        temporaryPolicyCount: policies.filter((row) => row.policyname !== 'existing_safe_policy').length,
        observerFunction,
        sequenceCount: Number(broadcastSequence) + Number(presenceSequence),
        broadcastCount,
        presenceCount
      };
    }
  };
}

function createRepositorySupabaseFactory(onEvaluation) {
  let clientIndex = 0;
  return function createClient() {
    const index = clientIndex++;
    let activeChannel = null;
    let presenceSyncHandler = null;
    return {
      realtime: { async setAuth() {} },
      channel(topic) {
        activeChannel = {
          on(event, filter, callback) {
            if (event === 'presence' && filter?.event === 'sync') presenceSyncHandler = callback;
            return activeChannel;
          },
          presenceState() { return {}; },
          subscribe(callback) {
            queueMicrotask(() => {
              onEvaluation(index, topic);
              callback('SUBSCRIBED');
              queueMicrotask(() => presenceSyncHandler?.());
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

function envelopeInput() {
  return {
    mode: 'synthetic_repository',
    identityId: '11111111-1111-4111-8111-111111111111',
    tokenFingerprint: 'r3v-same-token-fingerprint',
    anchorClientId: 'r3v-anchor-client',
    presenceOnlyClientId: 'r3v-presence-only-client',
    anchorTopic: 'room:r3v-anchor',
    presenceOnlyTopic: 'room:r3v-presence-only'
  };
}

async function buildRepositoryHarness({ failPresenceOnly = false } = {}) {
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: 'r3v_repository_owner' });
  const dbRuntime = createRepositoryDbRuntime(plan);
  const db = buildRestrictedDbExecutionAdapter(dbRuntime.client, plan);
  const realtime = buildPresenceAwareRealtimeBridge({
    createClient: createRepositorySupabaseFactory(() => {
      dbRuntime.observe('broadcast');
      dbRuntime.observe('presence');
    }),
    url: 'https://repository-only.invalid',
    publishableKey: 'repository-only-publishable',
    presenceTimeoutMs: 50
  });
  const input = envelopeInput();
  const probeContexts = {
    anchor: { userId: input.identityId, accessToken: 'repository-only-token', topic: input.anchorTopic },
    presenceOnly: { userId: input.identityId, accessToken: 'repository-only-token', topic: input.presenceOnlyTopic }
  };
  const adapter = buildRepositorySimulationAdapter({ db, realtime, probeContexts, failPresenceOnly });
  return { plan, dbRuntime, db, realtime, adapter, input };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  for (const prepare of [prepareRemoteRuntime, r3gExecutor.prepareRemoteRuntime, r3kExecutor.prepareRemoteRuntime]) {
    try {
      prepare({
        readCredential() { credentialReads += 1; return 'forbidden'; },
        loadDependency() { dependencyLoads += 1; return {}; }
      });
      fail('DOKE_COM_B03C_R3V_PREAUTH_HARD_BLOCK_DID_NOT_FIRE');
    } catch (error) {
      if (![r3v.REMOTE_EXECUTION_BLOCK_CODE, r3g.REMOTE_EXECUTION_BLOCK_CODE, r3k.REMOTE_EXECUTION_BLOCK_CODE].includes(error?.code)) {
        throw error;
      }
    }
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) fail('DOKE_COM_B03C_R3V_PREAUTH_SIDE_EFFECT_DETECTED');

  const harness = await buildRepositoryHarness();
  const result = await r3q.executeRepositoryObservationEnvelope(harness.input, harness.adapter);
  if (result.classification !== 'hosted_runtime_observation_matches_pinned_presence_path') {
    fail('DOKE_COM_B03C_R3V_PINNED_PATH_CLASSIFICATION_NOT_PROVEN');
  }
  if (result.zeroResidueProven !== true || result.cleanupAttempted !== true) {
    fail('DOKE_COM_B03C_R3V_ZERO_RESIDUE_NOT_PROVEN');
  }
  const finalState = harness.dbRuntime.snapshotState();
  if (finalState.temporaryPolicyCount !== 0 || finalState.observerFunction !== false || finalState.sequenceCount !== 0) {
    fail('DOKE_COM_B03C_R3V_REPOSITORY_RESIDUE_DETECTED');
  }

  const failing = await buildRepositoryHarness({ failPresenceOnly: true });
  let failureObserved = false;
  try {
    await r3q.executeRepositoryObservationEnvelope(failing.input, failing.adapter);
  } catch (error) {
    failureObserved = error?.code === 'DOKE_COM_B03C_R3V_SYNTHETIC_PRESENCE_ONLY_FAILURE' ||
      error?.message === 'DOKE_COM_B03C_R3V_SYNTHETIC_PRESENCE_ONLY_FAILURE';
  }
  if (!failureObserved) fail('DOKE_COM_B03C_R3V_FAILURE_PATH_NOT_OBSERVED');
  const failureState = failing.dbRuntime.snapshotState();
  if (failureState.temporaryPolicyCount !== 0 || failureState.observerFunction !== false || failureState.sequenceCount !== 0) {
    fail('DOKE_COM_B03C_R3V_FAILURE_CLEANUP_RESIDUE_DETECTED');
  }

  return {
    validationId: 'COM-B03C-R3V-REPOSITORY-SELF-TEST',
    contractId: r3v.CONTRACT_ID,
    statementFingerprint: harness.plan.statementFingerprint,
    statementCount: harness.plan.statementCount,
    adapterMethodCount: r3q.ADAPTER_METHODS.length,
    classification: result.classification,
    presenceStateObservationBridgeVerified: result.observation.anchorPresenceStateObserved === true,
    afterCleanupTerminalCounterCarryForwardVerified:
      result.envelopeTrace.includes('after_cleanup') && result.zeroResidueProven === true,
    failureCleanupVerified: failureObserved,
    zeroResidueProven: result.zeroResidueProven,
    credentialReadsBeforeAuthorization: credentialReads,
    dependencyLoadsBeforeAuthorization: dependencyLoads,
    stagingAccess: false,
    networkAccess: false,
    databaseQueryAgainstRemote: false,
    remoteClientInstantiated: false,
    exactRootCauseProven: false,
    causalPromotionAllowed: false
  };
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      process.stdout.write(`${JSON.stringify(await repositorySelfTest())}\n`);
      return;
    }
    prepareRemoteRuntime({ readCredential: () => null, loadDependency: () => null });
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3V_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  prepareRemoteRuntime,
  buildRestrictedDbExecutionAdapter,
  buildPresenceAwareRealtimeBridge,
  buildRepositorySimulationAdapter,
  createRepositoryDbRuntime,
  createRepositorySupabaseFactory,
  envelopeInput,
  buildRepositoryHarness,
  repositorySelfTest
};
