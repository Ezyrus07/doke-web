#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '../..');
const profileSource = fs.readFileSync(path.join(root, 'assets/js/services/profile-service.js'), 'utf8');
const authSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');
const sessionAuthoritySource = fs.readFileSync(path.join(root, 'assets/js/services/auth-session-authority.js'), 'utf8');

function createRuntime() {
  const user = {
    id: '00000000-0000-4000-8000-000000000012',
    name: 'Gabriel Antonio',
    handle: 'gabrielantonio',
    role: 'client',
    type: 'client',
    settings: { notifications: { messages: true }, privacy: { publicProfile: true } }
  };
  const session = { provider: 'supabase', user };
  const calls = [];
  const events = [];
  let setCurrentUserCalls = 0;
  let handler = async (action) => {
    if (action === 'update_account_settings') {
      return {
        userId: user.id,
        settings: { notifications: { messages: false }, privacy: { publicProfile: false } },
        updatedAt: '2026-07-26T02:00:00.000Z'
      };
    }
    if (action === 'get_account_identity_state') {
      return { userId: user.id, settings: { notifications: { messages: true }, privacy: { publicProfile: false } }, profile: {} };
    }
    throw new Error('Unexpected action: ' + action);
  };

  const window = {
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return user; },
        getSession() { return session; },
        setCurrentUser() {
          setCurrentUserCalls += 1;
          throw new Error('Supabase settings reconciliation must not rewrite the session manually.');
        }
      }
    },
    DokeAuth: { repositories: { users: {} }, service: {} },
    DokeSupabase: {
      getClient() { return null; },
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
    Promise, Object, Array, String, Number, Boolean, Math, Date, RegExp, Error, console
  };
  vm.createContext(sandbox);
  vm.runInContext(profileSource, sandbox, { filename: 'profile-service.js' });
  return {
    service: window.Doke.services.profile,
    user, session, calls, events,
    getSetCurrentUserCalls: () => setCurrentUserCalls,
    setHandler(next) { handler = next; }
  };
}

async function main() {
  assert(!profileSource.includes('authService()'), 'Profile settings still depend on the auth facade.');
  assert(!profileSource.includes('auth.updateCurrentUser'), 'Profile settings still call the auth mutation facade.');
  assert(!authSource.includes('updateCurrentUser'), 'Canonical auth service still exposes updateCurrentUser.');
  assert(!sessionAuthoritySource.includes('const updateCurrentUser'), 'Session authority still implements updateCurrentUser.');
  assert(sessionAuthoritySource.includes('delete ns.updateCurrentUser;'), 'Session authority does not actively retire updateCurrentUser.');

  const runtime = createRuntime();
  const before = JSON.stringify(runtime.session);
  const settings = await runtime.service.updateCurrentSettings({
    notifications: { messages: false },
    privacy: { publicProfile: false },
    account: { email: 'forbidden@example.test' },
    role: 'admin'
  });

  assert.strictEqual(runtime.calls[0].action, 'update_account_settings');
  assert.deepStrictEqual(runtime.calls[0].params.p_settings.account, { email: 'forbidden@example.test' });
  assert.strictEqual(settings.notifications.messages, false);
  assert.strictEqual(settings.privacy.publicProfile, false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'account'), false, 'Server-filtered protected settings were restored by the browser.');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(settings, 'role'), false, 'Server-filtered role was restored by the browser.');
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Settings success rewrote the public session snapshot.');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);
  assert.strictEqual(runtime.events.at(-1).type, 'doke:settings-updated');
  assert.strictEqual(runtime.events.at(-1).detail.source, 'server');
  assert.strictEqual((await runtime.service.getCurrentSettings()).notifications.messages, false);

  const eventCount = runtime.events.length;
  runtime.setHandler(async () => {
    const error = new Error('DOKE_SETTINGS_SECTION_INVALID');
    error.code = 'DOKE_SETTINGS_SECTION_INVALID';
    throw error;
  });
  await assert.rejects(
    runtime.service.updateCurrentSettings({ privacy: 'invalid' }),
    (error) => error && error.code === 'DOKE_SETTINGS_SECTION_INVALID'
  );
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Failed settings mutation changed the public session.');
  assert.strictEqual(runtime.events.length, eventCount, 'Failed settings mutation emitted a success event.');
  assert.strictEqual((await runtime.service.getCurrentSettings()).notifications.messages, false, 'Failed settings mutation replaced the canonical cache.');

  runtime.setHandler(async () => ({ userId: '00000000-0000-4000-8000-000000000099', settings: { privacy: {} } }));
  await assert.rejects(
    runtime.service.updateCurrentSettings({ privacy: {} }),
    (error) => error && error.code === 'DOKE_SETTINGS_RECONCILIATION_SUBJECT_MISMATCH'
  );
  assert.strictEqual(runtime.events.length, eventCount, 'Settings subject mismatch emitted a success event.');

  runtime.setHandler(async (action) => {
    assert.strictEqual(action, 'get_account_identity_state');
    return { userId: runtime.user.id, settings: { notifications: { messages: true }, privacy: { publicProfile: false } }, profile: {} };
  });
  const refreshed = await runtime.service.refreshCurrentSettings();
  assert.strictEqual(refreshed.notifications.messages, true);
  assert.strictEqual(runtime.events.at(-1).type, 'doke:settings-reconciled');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);

  console.log('AUTH-A11 settings reconciliation runtime passed.');
  console.log('- settings mutation uses the narrow self-service authority');
  console.log('- server filtering is authoritative and session snapshots are not rewritten');
  console.log('- remote failure and subject mismatch preserve prior canonical settings');
}

main().catch((error) => {
  console.error('AUTH-A11 settings reconciliation runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
