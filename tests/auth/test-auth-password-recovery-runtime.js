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
  let recoveryError = null;
  let updateConfirmed = true;
  let revokeError = null;

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
        return { data: recoveryError ? null : {}, error: recoveryError };
      },
      async getSession() {
        return { data: { session }, error: null };
      },
      async getUser() {
        return { data: { user: session.user }, error: null };
      },
      async updateUser(payload) {
        updateCalls.push(payload);
        if ('currentPassword' in payload) return { data: null, error: new Error('Unsupported current-password field') };
        return { data: { user: updateConfirmed ? session.user : null }, error: null };
      },
      async signInWithPassword(payload) {
        if (payload.password !== 'Current@123') {
          return { data: {}, error: new Error('Invalid login credentials') };
        }
        return { data: { session, user: session.user }, error: null };
      },
      async signOut(options) {
        signOutCalls.push(options || {});
        return { error: revokeError };
      }
    }
  };

  const historyCalls = [];
  const window = {
    crypto: require('crypto').webcrypto,
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
      refreshSession: async () => { refreshCalls += 1; return session; }
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
    TextEncoder,
    setTimeout: (fn, ms) => setTimeout(fn, ms === 10000 ? 250 : ms),
    clearTimeout,
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
  const forgedWithMarker = await authority.initializePasswordRecovery();
  assert.strictEqual(forgedWithMarker.active, false, 'An unverified URL marker must never replace the SDK recovery event.');
  authStateListener('PASSWORD_RECOVERY', session);
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
  assert.strictEqual(updateCalls[1]?.current_password, 'Current@123');
  assert(!('currentPassword' in updateCalls[1]), 'The SDK forwards attributes verbatim: camelCase must not reach the provider.');
  assert.strictEqual(changeResult.otherSessionsRevoked, true);
  assert.strictEqual(changeResult.sessionRefreshConfirmed, true);
  assert(signOutCalls.some((call) => call.scope === 'others'), 'Other sessions must be revoked after an authenticated password change.');
  assert.strictEqual(refreshCalls, 1);

  recoveryError = { code: 'request_timeout', status: 504, message: 'private provider detail' };
  await assert.rejects(authority.requestPasswordRecovery({ email: 'fixture@example.invalid' }), (error) =>
    error.code === 'request_timeout' && error.status === 504 && !error.message.includes('private provider detail'));
  recoveryError = null;
  updateConfirmed = false;
  await assert.rejects(authority.changePassword({ currentPassword: 'Current@123', newPassword: 'Unconfirmed@123' }), /não foi confirmada/);
  updateConfirmed = true;
  revokeError = { code: 'request_timeout', status: 504 };
  const partialChange = await authority.changePassword({ currentPassword: 'Current@123', newPassword: 'RevocationPending@123' });
  assert.strictEqual(partialChange.changed, true);
  assert.strictEqual(partialChange.otherSessionsRevoked, false, 'A failed signOut cannot be represented as confirmed revocation.');
  authStateListener('SIGNED_IN', session);
  assert.strictEqual((await authority.initializePasswordRecovery()).active, false);

  const pendingRecovery = authority.initializePasswordRecovery();
  assert.strictEqual(authority.getRecoveryState().status, 'checking');
  assert.strictEqual(authority.getRecoveryState().active, false, 'Checking must not authorize password replacement.');
  authStateListener('PASSWORD_RECOVERY', session);
  assert.strictEqual((await pendingRecovery).active, true, 'A delayed SDK recovery event must resolve checking, not be rejected prematurely.');
  authStateListener('SIGNED_IN', session);
  await new Promise(setImmediate);
  assert.strictEqual(authority.getRecoveryState().active, true, 'A duplicate SDK notification for the same session must preserve legitimate recovery.');

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
