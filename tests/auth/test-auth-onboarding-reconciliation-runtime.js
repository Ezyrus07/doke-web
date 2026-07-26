#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'assets/js/services/onboarding-service.js'), 'utf8');

function createRuntime() {
  const user = {
    id: '00000000-0000-4000-8000-000000000021',
    name: 'Gabriel Antonio',
    handle: 'gabrielantonio',
    role: 'client',
    type: 'client',
    onboardingStatus: 'in_progress',
    profile: {
      userId: '00000000-0000-4000-8000-000000000021',
      city: '',
      state: '',
      bio: '',
      interests: []
    }
  };
  const session = { provider: 'supabase', user };
  const calls = [];
  const events = [];
  let setCurrentUserCalls = 0;
  let handler = async (action) => {
    if (action === 'complete_account_onboarding_reconciled') {
      return {
        userId: user.id,
        onboardingStatus: 'completed',
        onboardingCompletedAt: '2026-07-26T03:00:00.000Z',
        settings: { postalCode: '40100000' },
        profile: {
          profileId: user.id,
          userId: user.id,
          displayName: 'Gabriel Antonio',
          username: 'gabrielantonio',
          city: 'Salvador',
          state: 'BA',
          bio: 'Perfil reconciliado',
          interests: ['Tecnologia', 'Casa'],
          avatarUrl: '',
          coverUrl: '',
          updatedAt: '2026-07-26T03:00:00.000Z'
        }
      };
    }
    if (action === 'get_account_identity_state') {
      return {
        userId: user.id,
        onboardingStatus: 'completed',
        onboardingCompletedAt: '2026-07-26T03:00:00.000Z',
        settings: {},
        profile: {
          profileId: user.id,
          userId: user.id,
          displayName: 'Gabriel Antonio',
          username: 'gabrielantonio',
          city: 'Salvador',
          state: 'BA',
          bio: 'Perfil do servidor',
          interests: ['Tecnologia'],
          avatarUrl: '',
          coverUrl: ''
        }
      };
    }
    throw new Error('Unexpected action: ' + action);
  };

  const window = {
    Doke: {
      services: {
        profile: {
          getCurrentProfile() { return Promise.resolve(user.profile); },
          updateCurrentProfile() { throw new Error('Supabase onboarding must not use the local profile writer.'); }
        }
      },
      session: {
        getCurrentUser() { return user; },
        getSession() { return session; },
        setCurrentUser() {
          setCurrentUserCalls += 1;
          throw new Error('Supabase onboarding must not rewrite the public session snapshot.');
        }
      }
    },
    DokeAuth: { repositories: { users: {} } },
    DokeSupabase: {
      getClient() { return {}; },
      invokeSelfService(action, params) {
        calls.push({ action, params });
        return Promise.resolve().then(() => handler(action, params));
      }
    },
    dispatchEvent(event) { events.push(event); return true; }
  };
  window.window = window;

  const sandbox = {
    window,
    CustomEvent: function CustomEvent(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
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
    getSetCurrentUserCalls: () => setCurrentUserCalls,
    setHandler(next) { handler = next; }
  };
}

async function main() {
  assert(source.includes("invokeSelfService('complete_account_onboarding_reconciled'"), 'Onboarding does not use the reconciled self-service operation.');
  assert(source.includes("invokeSelfService('get_account_identity_state'"), 'Onboarding state does not use the canonical identity snapshot.');
  assert(!source.includes('supabaseClient.auth.updateUser'), 'Onboarding still duplicates profile data through auth.updateUser.');
  assert(!source.includes('.catch(function () { return null; })'), 'Onboarding still swallows a provider mutation error.');
  assert(!source.includes('function authService()'), 'Onboarding still depends on the auth mutation facade.');
  assert(!source.includes('auth.updateCurrentUser'), 'Onboarding still calls the retired auth mutation facade.');

  const runtime = createRuntime();
  const before = JSON.stringify(runtime.session);
  const result = await runtime.service.complete({
    city: ' Salvador ',
    state: 'ba',
    postalCode: '40100-000',
    bio: ' Perfil reconciliado ',
    interests: 'Tecnologia, Casa, Tecnologia'
  });

  assert.strictEqual(runtime.calls[0].action, 'complete_account_onboarding_reconciled');
  assert.strictEqual(runtime.calls[0].params.p_city, 'Salvador');
  assert.strictEqual(runtime.calls[0].params.p_state, 'BA');
  assert.strictEqual(runtime.calls[0].params.p_postal_code, '40100000');
  assert.deepStrictEqual(Array.from(runtime.calls[0].params.p_interests), ['Tecnologia', 'Casa']);
  assert.strictEqual(result.user.onboardingStatus, 'completed');
  assert.strictEqual(result.profile.city, 'Salvador');
  assert.strictEqual(result.profile.state, 'BA');
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Successful Supabase onboarding rewrote the public session.');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);
  assert.strictEqual(runtime.events.at(-1).type, 'doke:onboarding-completed');
  assert.strictEqual(runtime.events.at(-1).detail.source, 'server');
  assert.strictEqual(runtime.events.at(-1).detail.reconciled, true);

  const successEventCount = runtime.events.length;
  runtime.setHandler(async () => {
    const error = new Error('DOKE_ONBOARDING_CITY_INVALID');
    error.code = 'DOKE_ONBOARDING_CITY_INVALID';
    throw error;
  });
  await assert.rejects(
    runtime.service.complete({ city: '', state: 'BA' }),
    (error) => error && error.code === 'DOKE_ONBOARDING_CITY_INVALID'
  );
  assert.strictEqual(JSON.stringify(runtime.session), before, 'Failed onboarding changed the public session.');
  assert.strictEqual(runtime.events.length, successEventCount, 'Failed onboarding emitted a completion event.');

  runtime.setHandler(async () => ({
    userId: '00000000-0000-4000-8000-000000000099',
    onboardingStatus: 'completed',
    profile: {
      profileId: '00000000-0000-4000-8000-000000000099',
      userId: '00000000-0000-4000-8000-000000000099',
      displayName: 'Outra pessoa',
      username: 'outra.pessoa',
      city: 'Salvador',
      state: 'BA',
      interests: []
    }
  }));
  await assert.rejects(
    runtime.service.complete({ city: 'Salvador', state: 'BA' }),
    (error) => error && error.code === 'DOKE_ONBOARDING_RECONCILIATION_SUBJECT_MISMATCH'
  );
  assert.strictEqual(runtime.events.length, successEventCount, 'Subject mismatch emitted a completion event.');

  runtime.setHandler(async (action) => {
    assert.strictEqual(action, 'get_account_identity_state');
    return {
      userId: runtime.user.id,
      onboardingStatus: 'completed',
      onboardingCompletedAt: '2026-07-26T03:00:00.000Z',
      settings: {},
      profile: {
        profileId: runtime.user.id,
        userId: runtime.user.id,
        displayName: 'Gabriel Antonio',
        username: 'gabrielantonio',
        city: 'Salvador',
        state: 'BA',
        bio: 'Perfil canônico',
        interests: ['Tecnologia'],
        avatarUrl: '',
        coverUrl: ''
      }
    };
  });
  const state = await runtime.service.resolveState();
  assert.strictEqual(state.status, 'completed');
  assert.strictEqual(state.shouldShow, false);
  assert.strictEqual(state.profile.bio, 'Perfil canônico');
  assert.strictEqual(state.user.onboardingStatus, 'completed');
  assert.strictEqual(runtime.getSetCurrentUserCalls(), 0);
  assert.strictEqual(JSON.stringify(runtime.session), before, 'State reconciliation rewrote the public session.');

  console.log('AUTH-A11 onboarding reconciliation runtime passed.');
  console.log('- completion uses one server-authoritative operation and canonical identity response');
  console.log('- provider failures and subject mismatches preserve the public session');
  console.log('- resolving onboarding state does not rewrite the Supabase session snapshot');
}

main().catch((error) => {
  console.error('AUTH-A11 onboarding reconciliation runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
