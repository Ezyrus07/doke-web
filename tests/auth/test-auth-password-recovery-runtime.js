#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

(async () => {
  const recoveryRequests = [];
  const updateCalls = [];
  const signOutCalls = [];
  const dispatched = [];
  let authStateListener = null;
  let logoutCalls = 0;
  let refreshCalls = 0;
  let sessionClears = 0;

  const session = {
    user: { id: 'auth-a05-user', email: 'gabriel@example.com' },
    access_token: 'not-exposed-by-authority'
  };

  const client = {
    auth: {
      onAuthStateChange(listener) {
        authStateListener = listener;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async resetPasswordForEmail(email, options) {
        recoveryRequests.push({ email, options });
        return { data: {}, error: null };
      },
      async getSession() {
        return { data: { session }, error: null };
      },
      async getUser() {
        return { data: { user: session.user }, error: null };
      },
      async updateUser(payload) {
        updateCalls.push(payload);
        return { data: { user: session.user }, error: null };
      },
      async signInWithPassword(payload) {
        if (payload.password !== 'Current@123') {
          return { data: {}, error: new Error('Invalid login credentials') };
        }
        return { data: { session, user: session.user }, error: null };
      },
      async signOut(options) {
        signOutCalls.push(options || {});
        return { error: null };
      }
    }
  };

  const historyCalls = [];
  const window = {
    location: {
      href: 'https://doke.example/auth/esqueci-senha.html?mode=reset#type=recovery&access_token=secret',
      search: '?mode=reset',
      hash: '#type=recovery&access_token=secret'
    },
    history: {
      replaceState(state, title, url) {
        historyCalls.push({ state, title, url });
      }
    },
    DOKE_AUTH_RECOVERY_BOOT: Object.freeze({ version: 'AUTH-A05', requested: false }),
    DokeSupabase: { getClient: () => client },
    Doke: { session: { clear: () => { sessionClears += 1; } } },
    DokeAuth: {
      session: { clear: () => { sessionClears += 1; } },
      logout: async () => { logoutCalls += 1; },
      refreshSession: async () => { refreshCalls += 1; }
    }
  };
  window.window = window;

  const document = {
    documentElement: { dataset: {} },
    dispatchEvent(event) {
      dispatched.push(event);
      return true;
    }
  };

  const source = fs.readFileSync('assets/js/services/auth-password-authority.js', 'utf8');
  const context = vm.createContext({
    window,
    document,
    console,
    URL,
    URLSearchParams,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  });

  vm.runInContext(source, context, { filename: 'assets/js/services/auth-password-authority.js' });

  const authority = window.DokeAuth.passwordAuthority;
  assert(authority, 'Password authority must be exposed.');
  assert.strictEqual(authority.version, 'AUTH-A05');
  assert.strictEqual(typeof authStateListener, 'function', 'PASSWORD_RECOVERY listener must be bound.');

  const requestResult = await authority.requestPasswordRecovery({ email: ' GABRIEL@example.com ' });
  assert.strictEqual(requestResult.accepted, true);
  assert.strictEqual(recoveryRequests.length, 1);
  assert.strictEqual(recoveryRequests[0].email, 'gabriel@example.com');
  assert.strictEqual(recoveryRequests[0].options.redirectTo, 'https://doke.example/auth/esqueci-senha.html?mode=reset');

  await assert.rejects(
    authority.requestPasswordRecovery({ method: 'phone', contact: '(71) 99999-9999' }),
    /telefone ainda não está disponível/,
    'Phone recovery must fail closed while no provider exists.'
  );

  const forged = await authority.initializePasswordRecovery();
  assert.strictEqual(forged.active, false, 'A normal session without a credential-bearing recovery URL must not authorize reset.');

  window.DOKE_AUTH_RECOVERY_BOOT = Object.freeze({ version: 'AUTH-A05', requested: true });
  const recoveryContext = await authority.initializePasswordRecovery();
  assert.strictEqual(recoveryContext.active, true);
  assert.strictEqual(historyCalls.length, 1, 'Recovery credentials must be scrubbed from browser history.');
  assert(!String(historyCalls[0].url).includes('access_token'));

  const recoveryResult = await authority.completePasswordRecovery({ newPassword: 'NewStrong@123' });
  assert.strictEqual(recoveryResult.changed, true);
  assert.strictEqual(updateCalls[0]?.password, 'NewStrong@123');
  assert.strictEqual(Object.keys(updateCalls[0] || {}).length, 1);
  assert.strictEqual(logoutCalls, 1, 'Recovery completion must end the recovery session.');
  assert(sessionClears >= 1, 'Public Doke session snapshots must be cleared after recovery.');

  await assert.rejects(
    authority.reauthenticateWithPassword({ currentPassword: 'wrong' }),
    /senha atual está incorreta/i
  );

  const changeResult = await authority.changePassword({
    currentPassword: 'Current@123',
    newPassword: 'Another@123'
  });
  assert.strictEqual(changeResult.changed, true);
  assert.strictEqual(updateCalls[1]?.password, 'Another@123');
  assert.strictEqual(updateCalls[1]?.currentPassword, 'Current@123');
  assert(signOutCalls.some((call) => call.scope === 'others'), 'Other sessions must be revoked after an authenticated password change.');
  assert.strictEqual(refreshCalls, 1);

  for (const forbidden of ['localStorage.setItem', 'sessionStorage.setItem', "'doke.auth.recovery.v1'", 'debugCode', 'generateRecoveryCode']) {
    assert(!source.includes(forbidden), `Password authority must not contain ${forbidden}.`);
  }

  assert(dispatched.some((event) => event.type === 'doke:auth-password-authority-ready'));

  console.log(JSON.stringify({
    authority: 'supabase',
    emailRecoveryOnly: true,
    recoveryRedirectSameOrigin: true,
    forgedRecoveryContextRejected: true,
    credentialUrlScrubbed: true,
    recoverySessionEndedAfterReset: true,
    currentPasswordReauthentication: true,
    otherSessionsRevoked: true,
    browserRecoveryPersistence: false
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
