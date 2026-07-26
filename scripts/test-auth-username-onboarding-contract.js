const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
    },
    dispatchEvent(event) {
      (listeners.get(event.type) || []).forEach((listener) => listener(event));
      return true;
    }
  };
}

function CustomEventStub(type, init = {}) {
  this.type = type;
  this.detail = init.detail;
  this.bubbles = Boolean(init.bubbles);
}

async function validateRegistrationAuthority() {
  const rpcCalls = [];
  const registerCalls = [];
  const document = createEventTarget();
  const window = {
    DokeAuth: {
      async register(payload) {
        registerCalls.push({ ...payload });
        return { id: 'registered-user', ...payload };
      }
    },
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    DokeSupabase: {
      getClient() {
        return {
          async rpc(name, params) {
            rpcCalls.push({ name, params: { ...params } });
            const username = params.p_username;
            return {
              data: {
                username,
                valid: true,
                available: username !== 'taken.user',
                reason: username === 'taken.user' ? 'taken' : 'available'
              },
              error: null
            };
          }
        };
      }
    }
  };
  window.window = window;
  const context = { window, document, CustomEvent: CustomEventStub, console, Promise, Object, Array, String, RegExp, Error };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/js/services/auth-registration-authority.js', 'utf8'), context, {
    filename: 'auth-registration-authority.js'
  });

  const authority = window.DokeAuth.registrationAuthority;
  assert.strictEqual(authority.normalizeUsername('@Gabriel.Ántonio'), 'gabriel.antonio');
  assert.strictEqual(authority.isValidUsername('gabriel.antonio'), true);
  assert.strictEqual(authority.isReservedUsername('admin'), true);

  const availability = await authority.checkUsernameAvailability('Gabriel.Antonio');
  assert.strictEqual(availability.available, true);
  assert.strictEqual(availability.authority, 'supabase');
  assert.strictEqual(rpcCalls[0].name, 'check_username_availability');
  assert.strictEqual(rpcCalls[0].params.p_username, 'gabriel.antonio');

  const registered = await window.DokeAuth.register({
    name: 'Gabriel Antonio',
    handle: 'Gabriel.Antonio',
    email: 'gabriel@example.com',
    password: 'provider-owned-secret',
    role: 'professional'
  });
  assert.strictEqual(registered.handle, 'gabriel.antonio');
  assert.strictEqual(registerCalls[0].role, 'client');

  await assert.rejects(
    window.DokeAuth.register({ name: 'Outra Pessoa', handle: 'taken.user', email: 'outra@example.com', password: 'provider-owned-secret' }),
    /já está em uso/
  );

  return { rpcCalls, registerCalls };
}

async function validateOnboardingAuthority() {
  const user = {
    id: '00000000-0000-4000-8000-000000000013',
    name: 'Gabriel Antonio',
    handle: 'gabriel.antonio',
    role: 'client',
    type: 'client',
    onboardingStatus: 'in_progress',
    onboardingCompletedAt: ''
  };
  let remoteState = {
    userId: user.id,
    onboardingStatus: 'in_progress',
    onboardingCompletedAt: '',
    profile: {
      profileId: user.id,
      userId: user.id,
      displayName: user.name,
      username: user.handle,
      city: '',
      state: '',
      bio: '',
      interests: [],
      avatarUrl: '',
      coverUrl: '',
      updatedAt: '2026-07-26T00:00:00.000Z'
    }
  };
  let sessionMutationCalls = 0;
  const actions = [];
  const events = [];
  const document = createEventTarget();
  const windowEvents = createEventTarget();
  const window = {
    ...windowEvents,
    Doke: {
      services: {
        profile: {
          async getCurrentProfile() {
            return remoteState.profile;
          }
        }
      },
      session: {
        getCurrentUser: () => user,
        getSession: () => ({ provider: 'supabase', user, sessionStatus: 'active' }),
        setCurrentUser() {
          sessionMutationCalls += 1;
          throw new Error('Unexpected session mutation');
        }
      }
    },
    DokeAuth: { repositories: {} },
    DokeSupabase: {
      getClient: () => ({}),
      async invokeSelfService(action, params) {
        actions.push({ action, params: { ...(params || {}) } });
        if (action === 'get_account_identity_state') return { ...remoteState, profile: { ...remoteState.profile } };
        if (action !== 'complete_account_onboarding_reconciled') throw new Error(`Unexpected action: ${action}`);
        remoteState = {
          ...remoteState,
          onboardingStatus: 'completed',
          onboardingCompletedAt: '2026-07-26T02:00:00.000Z',
          profile: {
            ...remoteState.profile,
            city: params.p_city,
            state: params.p_state,
            bio: params.p_bio,
            interests: Array.from(params.p_interests || []),
            updatedAt: '2026-07-26T02:00:00.000Z'
          }
        };
        return { ...remoteState, profile: { ...remoteState.profile } };
      }
    },
    dispatchEvent(event) {
      events.push(event);
      return windowEvents.dispatchEvent(event);
    }
  };
  window.window = window;
  const context = {
    window,
    document,
    CustomEvent: CustomEventStub,
    console,
    Promise,
    Object,
    Array,
    String,
    Set,
    Error,
    Date
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('assets/js/services/onboarding-service.js', 'utf8'), context, {
    filename: 'onboarding-service.js'
  });

  const onboarding = window.Doke.services.onboarding;
  const before = await onboarding.resolveState();
  assert.strictEqual(before.shouldShow, true);
  assert.strictEqual(before.status, 'in_progress');

  const completed = await onboarding.complete({
    city: ' Salvador ',
    state: 'ba',
    bio: ' Perfil real ',
    interests: 'Tecnologia, Casa, Tecnologia'
  });
  assert.strictEqual(completed.user.onboardingStatus, 'completed');
  assert.strictEqual(completed.profile.city, 'Salvador');
  assert.strictEqual(completed.profile.state, 'BA');
  assert.deepStrictEqual(Array.from(completed.profile.interests), ['Tecnologia', 'Casa']);
  assert.strictEqual(sessionMutationCalls, 0, 'Onboarding remoto não pode reescrever a sessão pública.');
  assert(actions.some((item) => item.action === 'complete_account_onboarding_reconciled'));

  const successEvent = events.find((event) => event.type === 'doke:onboarding-completed');
  assert(successEvent);
  assert.strictEqual(successEvent.detail.source, 'server');
  assert.strictEqual(successEvent.detail.reconciled, true);

  const after = await onboarding.resolveState();
  assert.strictEqual(after.shouldShow, false);
  assert.strictEqual(after.status, 'completed');
  assert.strictEqual(sessionMutationCalls, 0);

  return { actions, events };
}

(async () => {
  const registration = await validateRegistrationAuthority();
  const onboarding = await validateOnboardingAuthority();

  const signupHtml = fs.readFileSync('auth/cadastro.html', 'utf8');
  const indexHtml = fs.readFileSync('index.html', 'utf8');
  const authPage = fs.readFileSync('assets/js/pages/auth.js', 'utf8');
  const homePage = fs.readFileSync('assets/js/pages/home.js', 'utf8');
  const authService = fs.readFileSync('assets/js/services/auth-service.js', 'utf8');
  const onboardingService = fs.readFileSync('assets/js/services/onboarding-service.js', 'utf8');
  const identityContract = fs.readFileSync('assets/js/contracts/identity-profile-contract.js', 'utf8');
  const registrationMigration = fs.readFileSync('supabase/migrations/146_auth_registration_username_authority.sql', 'utf8');
  const reconciliationMigration = fs.readFileSync('supabase/migrations/147_identity_profile_reconciliation_authority.sql', 'utf8');
  const reconciliationValidation = fs.readFileSync('supabase/tests/016_identity_profile_reconciliation_authority_validation.sql', 'utf8');

  assert(!signupHtml.includes('data-account-onboarding'));
  assert(!signupHtml.includes('data-auth-onboarding'));
  assert(indexHtml.includes('data-account-onboarding-form'));
  assert(indexHtml.includes('textarea class="doke-textarea"'));
  assert(!authPage.includes('openOnboarding'));
  assert(authPage.includes('redirectAfterAuth();'));
  assert(homePage.includes("document.addEventListener('doke:auth-surface-ready', refresh"));

  assert(registrationMigration.includes('check_username_availability'));
  assert(registrationMigration.includes('private.materialize_auth_account'));
  assert(reconciliationMigration.includes('get_account_identity_state'));
  assert(reconciliationMigration.includes('complete_account_onboarding_reconciled'));
  assert(reconciliationValidation.includes('begin;'));
  assert(reconciliationValidation.includes('rollback;'));

  assert(!authService.includes('updateCurrentUser'));
  assert(!authService.includes('updateCurrentProfile'));
  assert(onboardingService.includes('complete_account_onboarding_reconciled'));
  assert(!onboardingService.includes('auth.updateCurrentUser'));
  assert(!onboardingService.includes('supabaseClient.auth.updateUser'));
  assert(identityContract.includes("browserProvider: 'supabase'"));
  assert(identityContract.includes("provider: 'supabase'"));
  assert(!identityContract.includes("provider: 'mock'"));
  assert(!identityContract.includes("currentUser: '/users/me'"));
  assert(!identityContract.includes("currentProfile: '/profiles/me'"));

  console.log(JSON.stringify({
    uniqueUsernameAuthority: registration.rpcCalls.length > 0,
    clientFirstRegistration: registration.registerCalls[0].role === 'client',
    onboardingOnIndex: true,
    reconciledOnboardingAuthority: onboarding.actions.some((item) => item.action === 'complete_account_onboarding_reconciled'),
    manualSessionMutationCalls: 0,
    authMutationFacadeRetired: true,
    browserIdentityAuthority: 'supabase'
  }));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
