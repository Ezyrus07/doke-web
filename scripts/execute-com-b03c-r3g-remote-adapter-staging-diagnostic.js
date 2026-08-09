#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const r3f = require('../backend/modules/communities/community-realtime-private-auth-r3f');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3fExecutor = require('./execute-com-b03c-r3f-case-time-policy-snapshot-diagnostic');

function safeRemoteFailure(error) {
  const raw = String(error?.code || error?.message || 'DOKE_COM_B03C_R3G_REMOTE_FAILURE');
  const code = /^DOKE_COM_B03C_R3G_[A-Z0-9_]+$/.test(raw) ? raw : 'DOKE_COM_B03C_R3G_REMOTE_FAILURE';
  return { code, rawRemoteErrorExposed: false };
}

function assertFunction(value, code) {
  if (typeof value !== 'function') {
    const error = new Error(code);
    error.code = code;
    throw error;
  }
}

function buildPgDbAdapter(client) {
  if (!client || typeof client.query !== 'function') throw new Error('DOKE_COM_B03C_R3G_PG_CLIENT_REQUIRED');
  async function transaction(statements) {
    await client.query('begin');
    try {
      for (const sql of statements) await client.query(sql);
      await client.query('commit');
    } catch (error) {
      await client.query('rollback').catch(() => {});
      throw error;
    }
  }
  return {
    async snapshot({ sql }) {
      if (sql !== r3f.SNAPSHOT_SQL) throw new Error('DOKE_COM_B03C_R3G_SNAPSHOT_SQL_MISMATCH');
      const result = await client.query(sql);
      return Array.isArray(result?.rows) ? result.rows : [];
    },
    async install({ statements }) { await transaction(statements || []); },
    async drop({ statements }) { await transaction(statements || []); }
  };
}

function sanitizeJoinFailure(status, error) {
  const raw = String(error?.message || error?.error || error || '');
  let classification = 'unknown_channel_join_failure';
  if (status === 'TIMED_OUT') classification = 'channel_join_timeout';
  else if (status === 'CLOSED') classification = 'channel_closed_during_join';
  else if (/jwt|token|authenticat|claim/i.test(raw)) classification = 'jwt_or_auth_context_rejected';
  else if (/permission|policy|rls|authori[sz]|access denied|not allowed/i.test(raw)) classification = 'realtime_rls_authorization_rejected';
  return { subscribed: false, classification, rawRemoteErrorExposed: false };
}

function subscribeChannel(channel, timeoutMs = 12000) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(sanitizeJoinFailure('TIMED_OUT', null)), timeoutMs);
    channel.subscribe((status, error) => {
      if (status === 'SUBSCRIBED') finish({ subscribed: true, classification: 'subscribed', rawRemoteErrorExposed: false });
      else if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) finish(sanitizeJoinFailure(status, error));
    });
  });
}

function buildSupabaseRealtimeAdapter({ createClient, url, publishableKey }) {
  assertFunction(createClient, 'DOKE_COM_B03C_R3G_CREATE_CLIENT_REQUIRED');
  if (!url || !publishableKey) throw new Error('DOKE_COM_B03C_R3G_REALTIME_CONFIG_REQUIRED');
  return {
    async createClient({ userId, accessToken, topic }) {
      const client = createClient(url, publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        realtime: { params: { eventsPerSecond: 10 } }
      });
      if (!client?.realtime || typeof client.realtime.setAuth !== 'function') throw new Error('DOKE_COM_B03C_R3G_REALTIME_CLIENT_INVALID');
      await client.realtime.setAuth(accessToken);
      let channel = null;
      return {
        async subscribePresenceReadJoin() {
          channel = client.channel(topic, { config: { private: true, presence: { enabled: true, key: crypto.createHash('sha256').update(String(userId)).digest('hex').slice(0, 16) } } });
          channel.on('presence', { event: 'sync' }, () => channel.presenceState());
          return subscribeChannel(channel);
        },
        async remove() {
          if (channel && typeof client.removeChannel === 'function') await client.removeChannel(channel);
        }
      };
    }
  };
}

function buildSupabaseAdminAdapter({ createClient, url, secretKey }) {
  assertFunction(createClient, 'DOKE_COM_B03C_R3G_CREATE_CLIENT_REQUIRED');
  if (!url || !secretKey) throw new Error('DOKE_COM_B03C_R3G_ADMIN_CONFIG_REQUIRED');
  const admin = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  if (!admin?.auth?.admin) throw new Error('DOKE_COM_B03C_R3G_ADMIN_CLIENT_INVALID');
  return {
    async createUser({ email, password, purpose }) {
      const result = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { purpose } });
      if (result?.error || !result?.data?.user?.id) throw new Error('DOKE_COM_B03C_R3G_EPHEMERAL_AUTH_CREATE_FAILED');
      return { id: result.data.user.id, email };
    },
    async deleteUser(userId) {
      const result = await admin.auth.admin.deleteUser(userId, false);
      if (result?.error) throw new Error('DOKE_COM_B03C_R3G_EPHEMERAL_AUTH_CLEANUP_FAILED');
    }
  };
}

function buildManagementAdapter({ fetchImpl, accessToken }) {
  assertFunction(fetchImpl, 'DOKE_COM_B03C_R3G_FETCH_REQUIRED');
  if (!accessToken) throw new Error('DOKE_COM_B03C_R3G_MANAGEMENT_TOKEN_REQUIRED');
  return {
    async inspectProject() {
      const response = await fetchImpl(`https://api.supabase.com/v1/projects/${r3g.REQUIRED_PROJECT_ID}`, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' }
      });
      if (!response?.ok) throw new Error('DOKE_COM_B03C_R3G_PROJECT_PREFLIGHT_FAILED');
      const project = await response.json();
      if (project?.id !== r3g.REQUIRED_PROJECT_ID || project?.name !== r3g.REQUIRED_PROJECT_NAME || project?.status !== 'ACTIVE_HEALTHY') {
        throw new Error('DOKE_COM_B03C_R3G_PROJECT_IDENTITY_MISMATCH');
      }
      return { id: project.id, name: project.name, status: project.status, region: String(project.region || ''), directHost: project.database?.host || null };
    }
  };
}

function prepareRemoteRuntime({ readCredential, loadDependency }) {
  r3g.assertRemoteBoundaryAbsent();
  assertFunction(readCredential, 'DOKE_COM_B03C_R3G_CREDENTIAL_READER_REQUIRED');
  assertFunction(loadDependency, 'DOKE_COM_B03C_R3G_DEPENDENCY_LOADER_REQUIRED');
  const credentials = Object.fromEntries(r3g.CREDENTIAL_NAMES.map((name) => [name, readCredential(name)]));
  const dependencies = Object.fromEntries(r3g.REMOTE_DEPENDENCIES.map((name) => [name, loadDependency(name)]));
  return { credentials, dependencies };
}

function createRepositoryPgClient() {
  let rows = [];
  return {
    async query(sql) {
      const text = String(sql).trim();
      const lower = text.toLowerCase();
      if (text === r3f.SNAPSHOT_SQL) return { rows: rows.map((row) => ({ ...row, roles: [...row.roles] })) };
      if (['begin', 'commit', 'rollback'].includes(lower)) return { rows: [] };
      let match = text.match(/^create policy ([a-z0-9_]+) on realtime\.messages for (select|insert) to authenticated (using|with check) \((.*)\)$/i);
      if (match) {
        const [, policyname, command, clause, expression] = match;
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
      throw new Error('DOKE_COM_B03C_R3G_REPOSITORY_PG_SQL_UNEXPECTED');
    }
  };
}

function createRepositorySupabaseFactory() {
  return function createClient() {
    let activeChannel = null;
    return {
      realtime: { async setAuth() {} },
      channel() {
        activeChannel = {
          on() { return activeChannel; },
          presenceState() { return {}; },
          subscribe(callback) { queueMicrotask(() => callback('SUBSCRIBED')); return activeChannel; }
        };
        return activeChannel;
      },
      async removeChannel() {},
      auth: {
        admin: {
          async createUser({ email }) { return { data: { user: { id: '11111111-1111-4111-8111-111111111111', email } }, error: null }; },
          async deleteUser() { return { error: null }; }
        }
      }
    };
  };
}

async function repositorySelfTest() {
  let credentialReads = 0;
  let dependencyLoads = 0;
  try {
    prepareRemoteRuntime({
      readCredential() { credentialReads += 1; return 'forbidden'; },
      loadDependency() { dependencyLoads += 1; return {}; }
    });
    throw new Error('DOKE_COM_B03C_R3G_HARD_BLOCK_DID_NOT_FIRE');
  } catch (error) {
    if (error?.code !== r3g.REMOTE_EXECUTION_BLOCK_CODE) throw error;
  }
  if (credentialReads !== 0 || dependencyLoads !== 0) throw new Error('DOKE_COM_B03C_R3G_PREAUTH_SIDE_EFFECT_DETECTED');

  const db = buildPgDbAdapter(createRepositoryPgClient());
  const createClient = createRepositorySupabaseFactory();
  const realtime = buildSupabaseRealtimeAdapter({ createClient, url: 'https://repository-only.invalid', publishableKey: 'repository-only-key' });
  const report = await r3fExecutor.executePlan({
    db,
    realtime,
    context: {
      userId: '11111111-1111-4111-8111-111111111111',
      accessToken: 'repository-only-token',
      topic: 'room:repository-only-r3g',
      nonceForCase: (caseId) => crypto.createHash('sha256').update(`r3g:${caseId}`).digest('hex').slice(0, 12)
    }
  });
  if (report.caseResults.some((item) => item.structuralEvidence.evidenceComplete !== true)) throw new Error('DOKE_COM_B03C_R3G_ADAPTER_BRIDGE_EVIDENCE_INCOMPLETE');

  const admin = buildSupabaseAdminAdapter({ createClient, url: 'https://repository-only.invalid', secretKey: 'repository-only-secret' });
  const user = await admin.createUser({ email: 'r3g-repository@doke.local', password: 'repository-only-password', purpose: 'repository-self-test' });
  await admin.deleteUser(user.id);

  const management = buildManagementAdapter({
    accessToken: 'repository-only-management-token',
    fetchImpl: async () => ({
      ok: true,
      async json() { return { id: r3g.REQUIRED_PROJECT_ID, name: r3g.REQUIRED_PROJECT_NAME, status: 'ACTIVE_HEALTHY', region: 'sa-east-1', database: { host: 'repository-only.invalid' } }; }
    })
  });
  const project = await management.inspectProject();

  return {
    validationId: 'COM-B03C-R3G-REMOTE-ADAPTER-REPOSITORY-SELF-TEST',
    contractId: r3g.CONTRACT_ID,
    caseCount: report.caseCount,
    allStructuralEvidenceComplete: report.caseResults.every((item) => item.structuralEvidence.evidenceComplete === true),
    credentialReadsBeforeAuthorization: credentialReads,
    dependencyLoadsBeforeAuthorization: dependencyLoads,
    projectIdentityVerified: project.id === r3g.REQUIRED_PROJECT_ID,
    stagingAccess: false,
    networkAccess: false,
    exactRootCauseProven: false
  };
}

if (require.main === module) {
  (async () => {
    if (process.argv.includes('--repository-self-test')) {
      const report = await repositorySelfTest();
      process.stdout.write(`${JSON.stringify(report)}\n`);
      return;
    }
    prepareRemoteRuntime({ readCredential: () => null, loadDependency: () => null });
  })().catch((error) => {
    process.stderr.write(`${String(error?.code || error?.message || 'DOKE_COM_B03C_R3G_FAILURE')}\n`);
    process.exitCode = 2;
  });
}

module.exports = {
  safeRemoteFailure, buildPgDbAdapter, sanitizeJoinFailure, subscribeChannel, buildSupabaseRealtimeAdapter,
  buildSupabaseAdminAdapter, buildManagementAdapter, prepareRemoteRuntime, repositorySelfTest
};
