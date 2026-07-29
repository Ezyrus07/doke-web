'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/services/account-access-service.js', 'utf8');
let currentUser = null;
let refreshCount = 0;
let redirectCount = 0;

const document = {
  documentElement: { dataset: {} },
  body: { dataset: {} }
};

const windowObject = {
  Doke: {
    services: {},
    session: {
      getCurrentUser() {
        return currentUser;
      }
    }
  },
  DokeAuth: {
    service: {
      refreshSession() {
        refreshCount += 1;
        currentUser = { id: 'user_profile_refresh_test' };
        return Promise.resolve({ user: currentUser });
      }
    }
  },
  localStorage: {
    getItem() {
      return null;
    }
  },
  location: {
    pathname: '/meu-perfil.html',
    search: '',
    replace() {
      redirectCount += 1;
    }
  },
  setTimeout,
  clearTimeout
};
windowObject.window = windowObject;

const sandbox = {
  window: windowObject,
  document,
  Promise,
  Object,
  Boolean,
  JSON,
  String,
  Number,
  setTimeout,
  clearTimeout
};

vm.runInNewContext(source, sandbox, { filename: 'account-access-service.js' });

(async () => {
  const access = await windowObject.Doke.services.accountAccess.resolveAccess();
  assert.strictEqual(refreshCount, 1, 'The guard must refresh the canonical session when the first snapshot is empty.');
  assert.strictEqual(access.allowed, true, 'The refreshed authenticated user must be allowed.');
  assert.strictEqual(access.user.id, 'user_profile_refresh_test');

  const guarded = await windowObject.Doke.services.accountAccess.guardPage({
    source: 'runtime-test',
    loginRedirect: 'auth/login.html'
  });
  assert.strictEqual(guarded.allowed, true);
  assert.strictEqual(redirectCount, 0, 'An authenticated profile must not redirect to login.');
  assert.strictEqual(document.documentElement.dataset.authGuard, 'allowed');
  assert.strictEqual(document.body.dataset.authGuard, 'allowed');

  console.log('Profile access canonical refresh runtime passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});