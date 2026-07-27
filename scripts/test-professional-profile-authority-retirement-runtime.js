#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'assets/js/repositories/professional-profiles-repository.js'),
  'utf8'
);

const USER_ID = '123e4567-e89b-42d3-a456-426614174000';

function createStorageProbe() {
  const calls = [];
  return {
    calls,
    getItem(key) { calls.push(['getItem', key]); throw new Error('LOCAL_STORAGE_FORBIDDEN'); },
    setItem(key) { calls.push(['setItem', key]); throw new Error('LOCAL_STORAGE_FORBIDDEN'); },
    removeItem(key) { calls.push(['removeItem', key]); throw new Error('LOCAL_STORAGE_FORBIDDEN'); }
  };
}

function queryBuilder(row) {
  const filters = {};
  return {
    select() { return this; },
    eq(column, value) { filters[column] = value; return this; },
    maybeSingle() {
      const matches = !filters.user_id || String(filters.user_id) === String(row.user_id);
      return Promise.resolve({ data: matches ? row : null, error: null });
    },
    then(resolve, reject) {
      const matches = (!filters.user_id || String(filters.user_id) === String(row.user_id))
        && (!filters.setup_status || String(filters.setup_status) === String(row.setup_status));
      return Promise.resolve({ data: matches ? [row] : [], error: null }).then(resolve, reject);
    }
  };
}

function createRemoteContext() {
  const localStorage = createStorageProbe();
  const calls = [];
  const row = {
    user_id: USER_ID,
    setup_status: 'pending_verification',
    setup_current_step: 2,
    setup_payload: {
      mainCategory: 'Tecnologia',
      specialties: 'Desenvolvimento web',
      shortBio: 'Profissional de tecnologia com experiência em aplicações web.',
      serviceRegion: 'Remoto',
      experienceYears: '3+',
      truthConfirmed: true,
      termsAccepted: true
    },
    setup_completed_at: '2026-07-27T00:00:00.000Z',
    verification_status: 'not_started',
    document_status: 'unverified',
    created_at: '2026-07-27T00:00:00.000Z',
    updated_at: '2026-07-27T00:00:00.000Z'
  };
  const Doke = {
    repositories: {},
    session: {
      getSession: () => ({ provider: 'supabase' }),
      getCurrentUser: () => ({ id: USER_ID, role: 'client' })
    }
  };
  const context = {
    console,
    Date,
    Map,
    Object,
    Promise,
    Set,
    window: null,
    localStorage,
    Doke,
    DokeSupabase: {
      getClient: () => ({ from: () => queryBuilder(row) }),
      invokeSelfService(action, args) {
        calls.push({ action, args });
        return Promise.resolve({
          userId: USER_ID,
          status: args.p_complete ? 'pending_verification' : 'draft',
          currentStep: args.p_current_step,
          payload: args.p_payload,
          verificationStatus: 'not_started',
          updatedAt: '2026-07-27T01:00:00.000Z'
        });
      }
    }
  };
  context.window = context;
  return { context: vm.createContext(context), localStorage, calls };
}

function createFixtureContext() {
  const localStorage = createStorageProbe();
  const Doke = {
    repositories: {},
    session: {
      getSession: () => ({ provider: 'fixture' }),
      getCurrentUser: () => ({ id: 'fixture_client', role: 'client' })
    }
  };
  const context = { console, Date, Map, Object, Promise, Set, window: null, localStorage, Doke };
  context.window = context;
  return { context: vm.createContext(context), localStorage };
}

async function expectCode(promise, expectedCode) {
  let failure = null;
  try { await promise; }
  catch (error) { failure = error; }
  assert(failure, `expected rejection ${expectedCode}`);
  assert.strictEqual(failure.code, expectedCode);
}

async function run() {
  const remote = createRemoteContext();
  vm.runInContext(source, remote.context, { filename: 'professional-profiles-repository.js' });
  const repository = remote.context.Doke.repositories.professionalProfiles;

  assert(repository, 'professional profiles repository was not registered');
  assert.strictEqual(repository.authority, 'supabase-or-fixture-memory');
  assert.strictEqual(repository.storageKey, undefined, 'persistent browser storage key must not be exported');

  const profile = await repository.getByUserId(USER_ID);
  assert.strictEqual(profile.userId, USER_ID);
  assert.strictEqual(profile.status, 'pending_verification');
  assert.strictEqual(profile.payload.mainCategory, 'Tecnologia');

  const listed = await repository.list({ userId: USER_ID, status: 'pending_verification' });
  assert.strictEqual(listed.length, 1);
  assert.strictEqual(listed[0].userId, USER_ID);

  const draft = await repository.saveDraft(USER_ID, {
    currentStep: 1,
    payload: { mainCategory: 'Design', specialties: 'UX', shortBio: 'Uma apresentação profissional suficientemente longa.', serviceRegion: 'Remoto' }
  });
  assert.strictEqual(draft.status, 'draft');
  assert.strictEqual(remote.calls[0].action, 'save_professional_profile_setup');
  assert.strictEqual(remote.calls[0].args.p_complete, false);

  const completed = await repository.completeSetup(USER_ID, {
    payload: { mainCategory: 'Design', specialties: 'UX', shortBio: 'Uma apresentação profissional suficientemente longa.', serviceRegion: 'Remoto', truthConfirmed: true, termsAccepted: true }
  });
  assert.strictEqual(completed.status, 'pending_verification');
  assert.strictEqual(remote.calls[1].action, 'save_professional_profile_setup');
  assert.strictEqual(remote.calls[1].args.p_complete, true);

  await expectCode(
    repository.updateActiveProfile(USER_ID, { payload: { specialties: 'Alteração insegura' } }),
    'DOKE_PROFESSIONAL_PROFILE_EDIT_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    repository.setVerificationStatus(`professional_profile_${USER_ID}`, 'verified'),
    'DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED'
  );
  await expectCode(
    repository.transition(`professional_profile_${USER_ID}`, 'active'),
    'DOKE_PROFESSIONAL_PROFILE_SERVER_TRANSITION_REQUIRED'
  );
  assert.deepStrictEqual(remote.localStorage.calls, [], 'Supabase path touched localStorage');

  const fixture = createFixtureContext();
  vm.runInContext(source, fixture.context, { filename: 'professional-profiles-repository.js' });
  const fixtureRepository = fixture.context.Doke.repositories.professionalProfiles;
  const fixtureDraft = await fixtureRepository.saveDraft('fixture_client', {
    currentStep: 1,
    payload: { mainCategory: 'Aulas', specialties: 'Matemática', shortBio: 'Professor particular para reforço escolar.', serviceRegion: 'Salvador' }
  });
  assert.strictEqual(fixtureDraft.status, 'draft');
  const fixtureReload = await fixtureRepository.getByUserId('fixture_client');
  assert.strictEqual(fixtureReload.payload.mainCategory, 'Aulas');
  assert.deepStrictEqual(fixture.localStorage.calls, [], 'fixture path must be memory-only');

  console.log('[PROF-A02] Supabase professional profile authority is remote-only.');
  console.log('[PROF-A02] Fixture compatibility is in-memory and does not persist browser state.');
}

run().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
