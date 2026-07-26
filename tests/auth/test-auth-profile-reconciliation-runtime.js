#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '../..');
const profileSource = fs.readFileSync(path.join(root, 'assets/js/services/profile-service.js'), 'utf8');

function createIdentity(userId, overrides = {}) {
  return {
    userId,
    settings: {},
    profile: {
      profileId: userId,
      userId,
      displayName: 'Gabriel Antonio',
      username: 'gabrielantonio',
      city: 'Salvador',
      state: 'BA',
      bio: 'Perfil reconciliado',
      interests: ['Tecnologia', 'Empreendedorismo'],
      avatarUrl: 'https://example.test/avatar.png',
      coverUrl: 'https://example.test/cover.png',
      updatedAt: '2026-07-26T01:00:00.000Z',
      ...(overrides.profile || {})
    },
    ...overrides
  };
}

function createRuntime() {
  const user = {
    id: '00000000-0000-4000-8000-000000000011',
    name: 'Gabriel Antigo',
    handle: 'gabriel.antigo',
    role: 'client',
    type: 'client',
    profile: {
      id: '00000000-0000-4000-8000-000000000011',
      userId: '00000000-0000-4000-8000-000000000011',
      name: 'Gabriel Antigo',
      handle: 'gabriel.antigo',
      city: 'Salvador',
      state: 'BA',
      bio: 'Snapshot anterior',
      interests: []
    }
  };
  const session = { provider: 'supabase', user };
  const calls = [];
  const events = [];
  let setCurrentUserCalls = 0;
  let handler = async (action) => {
    if (action === 'update_account_profile_reconciled') return createIdentity(user.id);
    if (action === 'get_account_identity_state') return createIdentity(user.id, { profile: { bio: 'Perfil atualizado pelo servidor' } });
    throw new Error(`Unexpected action: ${action}`);
  };

  const window = {
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return user; },
        getSession() { return session; },
        setCurrentUser() {
          setCurrentUserCalls += 1;
          throw new Error('Supabase profile reconciliation must not rewrite the session manually.');
        }
      }
    },
    DokeAuth: {
      repositories: {
        users: {
          findById: async () => ({ ...user }),
          list: async () => []
        }
      },
      service: {
        updateCurrentUser() { throw new Error('Profile mutation must not use the auth facade.'); }
      }
    },
    DokeSupabase: {
      getClient() {
        return {
          auth: {
            getUser: async () => ({ data: { user }, error: null }),
            updateUser() { throw new Error('client.auth.updateUser must not be called.'); }
          }
        };
      },
      invokeSelfService(action, params) {
        calls.push({ action, params });
        return Promise.resolve().then(() => handler(action, params));
      }
    },
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    dispatchEvent(event) { events.push(event); return true; }
  };
  window.window = window;

  const sandbox = {
    window,
    document: { documentElement: { setAttribute() {} } },
    CustomEvent: function CustomEvent(type, options = {}) { this.type = type; this.detail = options.detail; },
    FileReader: function FileReader() {},
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    Math,
    Date,
    RegExp,
    Error,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(profileSource, sandbox, { filename: 'profile-service.js' });

  return {
    service: window.Doke.services.profile,
    user,
    session,
    calls,
    events,
    getSetCurrentUserCalls: () => setCurrentUserCalls,
    setHandler(next) { handler = next; }
  };
}

async function main() {
  assert(!profileSource.includes('client.auth.updateUser'), 'Profile service still writes auth metadata from the browser.');
  assert(!profileSource.includes("setCurrentUser(nextUser, { provider: 'supabase'"), 'Profile service still rewrites Supabase session state manually.');
  assert(profileSource.includes("invokeSelfService('update_account_profile_reconciled'"));

  const runtime = createRuntime();
  const before = JSON.stringify(runtime.session);
  const profile = await runtime.service.updateCurrentProfile({
    name: 'Gabriel Antonio',
    handle: 'Gabriel Antonio',
    city: 'Salvador',
    state: 'ba',
    bio: 'Perfil reconciliado',
    interests: 'Tecnologia, Empreendedorismo'
  });

  assert.strictEqual(runtime.calls[0].action, 'update_account_profile_reconciled');
  assert.strictEqual(profile.name, 'Gabriel Antonio');
  assert.strictEqual(profile.handle, 'gabrielantonio');
  assert.strictEqual(profile.bio, 'Perfil reconciliado');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Public session snapshot changed after remote profile success.');
  assert.strictEqual(runtime.events.filter((event) => event.type === 'doke:profile-updated').length, 1);
  assert.strictEqual(runtime.events.at(-1).detail.source, 'server');
  assert.strictEqual(runtime.events.at(-1).detail.reconciled, true);
  assert.strictEqual((await runtime.service.getCurrentProfile()).handle, 'gabrielantonio', 'Canonical profile cache was not used.');

  const eventCount = runtime.events.length;
  runtime.setHandler(async (action) => {
    if (action === 'update_account_profile_reconciled') {
      const error = new Error('DOKE_IDENTITY_USERNAME_TAKEN');
      error.code = 'DOKE_IDENTITY_USERNAME_TAKEN';
      throw error;
    }
    return createIdentity(runtime.user.id);
  });
  await assert.rejects(
    runtime.service.updateCurrentProfile({ handle: 'ocupado', name: 'Gabriel Antonio' }),
    (error) => error && error.code === 'DOKE_IDENTITY_USERNAME_TAKEN'
  );
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Failed remote mutation changed the public session.');
  assert.strictEqual(runtime.events.length, eventCount, 'Failed remote mutation emitted a success event.');
  assert.strictEqual((await runtime.service.getCurrentProfile()).handle, 'gabrielantonio', 'Failed mutation replaced the canonical cache.');

  runtime.setHandler(async (action) => {
    if (action === 'update_account_profile_reconciled') return createIdentity('00000000-0000-4000-8000-000000000099');
    return createIdentity(runtime.user.id);
  });
  await assert.rejects(
    runtime.service.updateCurrentProfile({ handle: 'outro', name: 'Gabriel Antonio' }),
    (error) => error && error.code === 'DOKE_PROFILE_RECONCILIATION_SUBJECT_MISMATCH'
  );
  assert.strictEqual(runtime.events.length, eventCount, 'Subject mismatch emitted a success event.');

  runtime.setHandler(async (action) => {
    assert.strictEqual(action, 'get_account_identity_state');
    return createIdentity(runtime.user.id, { profile: { bio: 'Perfil atualizado pelo servidor' } });
  });
  const refreshed = await runtime.service.refreshCurrentProfile();
  assert.strictEqual(refreshed.bio, 'Perfil atualizado pelo servidor');
  assert.strictEqual(runtime.events.at(-1).type, 'doke:profile-reconciled');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);

  console.log('AUTH-A11 profile reconciliation runtime passed.');
  console.log('- remote profile success returns the server snapshot without rewriting session state');
  console.log('- remote failure and subject mismatch preserve the prior canonical profile');
  console.log('- explicit identity refresh uses get_account_identity_state');
}

main().catch((error) => {
  console.error('AUTH-A11 profile reconciliation runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
