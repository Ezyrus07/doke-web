#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/js/services/onboarding-service.js'), 'utf8');

function canonicalState(user, overrides = {}) {
  const profileOverrides = overrides.profile || {};
  return {
    userId: user.id,
    onboardingStatus: 'completed',
    onboardingCompletedAt: '2026-07-26T20:00:00.000Z',
    profile: {
      profileId: user.id,
      userId: user.id,
      displayName: user.name,
      username: user.handle,
      city: 'Salvador',
      state: 'BA',
      bio: 'Perfil reconciliado',
      interests: ['Tecnologia'],
      avatarUrl: '',
      coverUrl: '',
      updatedAt: '2026-07-26T20:00:00.000Z',
      ...profileOverrides
    },
    ...overrides,
    profile: {
      profileId: user.id,
      userId: user.id,
      displayName: user.name,
      username: user.handle,
      city: 'Salvador',
      state: 'BA',
      bio: 'Perfil reconciliado',
      interests: ['Tecnologia'],
      avatarUrl: '',
      coverUrl: '',
      updatedAt: '2026-07-26T20:00:00.000Z',
      ...profileOverrides
    }
  };
}

function createRuntime(options = {}) {
  const user = {
    id: '00000000-0000-4000-8000-000000000031',
    name: 'Gabriel Antonio',
    handle: 'gabrielantonio',
    onboardingStatus: 'in_progress',
    onboardingCompletedAt: '',
    city: 'Salvador',
    state: 'BA',
    profile: {
      userId: '00000000-0000-4000-8000-000000000031',
      city: 'Salvador',
      state: 'BA',
      bio: '',
      interests: []
    }
  };
  const session = {
    provider: options.provider || 'supabase',
    sessionStatus: 'active',
    user
  };
  const calls = [];
  const events = [];
  let setCurrentUserCalls = 0;
  let clientAvailable = options.clientAvailable !== false;
  let handler = options.handler || (async (action) => canonicalState(user, {
    onboardingStatus: action === 'get_account_identity_state' ? 'in_progress' : 'completed'
  }));

  const window = {
    Doke: {
      services: {
        profile: {
          getCurrentProfile() {
            return Promise.resolve(user.profile);
          }
        }
      },
      session: {
        getCurrentUser() {
          return user;
        },
        getSession() {
          return session;
        },
        setCurrentUser() {
          setCurrentUserCalls += 1;
          throw new Error('Onboarding must not rewrite the public session snapshot.');
        }
      }
    },
    DokeSupabase: {
      getClient() {
        return clientAvailable ? {} : null;
      },
      invokeSelfService(action, params) {
        calls.push({ action, params });
        return Promise.resolve().then(() => handler(action, params));
      }
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    }
  };
  window.window = window;

  const sandbox = {
    window,
    CustomEvent: function CustomEvent(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    },
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
    Set,
    console
  };
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'onboarding-service.js' });

  return {
    service: window.Doke.services.onboarding,
    user,
    session,
    calls,
    events,
    setProvider(provider) {
      session.provider = provider;
    },
    setClientAvailable(value) {
      clientAvailable = Boolean(value);
    },
    setHandler(nextHandler) {
      handler = nextHandler;
    },
    getSetCurrentUserCalls() {
      return setCurrentUserCalls;
    }
  };
}

async function main() {
  const retiredTerms = [
    'function usersRepository()',
    'repository.updateCurrentUser',
    'Doke.session.setCurrentUser',
    "source: 'local'",
    'reconciled: false',
    'hasCompleteBaseProfile'
  ];
  for (const term of retiredTerms) {
    assert(!source.includes(term), `Retired local onboarding authority remains: ${term}`);
  }
  assert(source.includes("invokeSelfService('complete_account_onboarding_reconciled'"));
  assert(source.includes("'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE'"));

  const success = createRuntime();
  const beforeSession = JSON.stringify(success.session);
  const completed = await success.service.complete({
    city: ' Salvador ',
    state: 'ba',
    postalCode: '40100-000',
    bio: ' Perfil reconciliado ',
    interests: 'Tecnologia, Tecnologia'
  });
  assert.strictEqual(success.calls[0].action, 'complete_account_onboarding_reconciled');
  assert.strictEqual(completed.user.onboardingStatus, 'completed');
  assert.strictEqual(success.events.length, 1);
  assert.strictEqual(success.events[0].detail.source, 'server');
  assert.strictEqual(success.events[0].detail.reconciled, true);
  assert.strictEqual(success.getSetCurrentUserCalls(), 0);
  assert.strictEqual(JSON.stringify(success.session), beforeSession);

  const remoteFailure = createRuntime();
  const remoteFailureBefore = JSON.stringify(remoteFailure.session);
  remoteFailure.setHandler(async () => {
    const error = new Error('provider unavailable');
    error.code = 'PROVIDER_UNAVAILABLE';
    throw error;
  });
  await assert.rejects(
    remoteFailure.service.complete({ city: 'Salvador', state: 'BA' }),
    (error) => error && error.code === 'PROVIDER_UNAVAILABLE'
  );
  assert.strictEqual(remoteFailure.events.length, 0);
  assert.strictEqual(remoteFailure.getSetCurrentUserCalls(), 0);
  assert.strictEqual(JSON.stringify(remoteFailure.session), remoteFailureBefore);

  await assert.rejects(
    remoteFailure.service.resolveState(),
    (error) => error && error.code === 'PROVIDER_UNAVAILABLE'
  );
  assert.strictEqual(remoteFailure.user.onboardingStatus, 'in_progress');
  assert.strictEqual(remoteFailure.events.length, 0);

  const localProvider = createRuntime({ provider: 'local' });
  await assert.rejects(
    localProvider.service.complete({ city: 'Salvador', state: 'BA' }),
    (error) => error && error.code === 'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE'
  );
  await assert.rejects(
    localProvider.service.resolveState(),
    (error) => error && error.code === 'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(localProvider.calls.length, 0);
  assert.strictEqual(localProvider.events.length, 0);
  assert.strictEqual(localProvider.getSetCurrentUserCalls(), 0);

  const missingClient = createRuntime({ clientAvailable: false });
  await assert.rejects(
    missingClient.service.resolveState(),
    (error) => error && error.code === 'DOKE_ONBOARDING_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(missingClient.calls.length, 0);
  assert.strictEqual(missingClient.user.onboardingStatus, 'in_progress');

  console.log('AUTH-A12B.3 onboarding local authority retirement runtime passed.');
  console.log('- completion is exclusively server-authoritative');
  console.log('- provider and client absence fail closed');
  console.log('- remote failures do not mutate session, user or completion events');
}

main().catch((error) => {
  console.error('AUTH-A12B.3 onboarding local authority retirement runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});