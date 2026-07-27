#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'assets/js/repositories/professional-identity-verifications-repository.js'),
  'utf8'
);

const REMOTE_USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const FIXTURE_USER_ID = 'fixture_professional_verification_user';
const FIXTURE_PROFILE_ID = 'professional_profile_fixture_professional_verification_user';

function createStorageProbe(label) {
  const calls = [];
  return {
    calls,
    getItem(key) {
      calls.push(['getItem', key]);
      throw new Error(`${label}_GET_FORBIDDEN`);
    },
    setItem(key) {
      calls.push(['setItem', key]);
      throw new Error(`${label}_SET_FORBIDDEN`);
    },
    removeItem(key) {
      calls.push(['removeItem', key]);
      throw new Error(`${label}_REMOVE_FORBIDDEN`);
    }
  };
}

function createContext(provider, options = {}) {
  const localStorage = createStorageProbe('LOCAL_STORAGE');
  const sessionStorage = createStorageProbe('SESSION_STORAGE');
  const evidenceCalls = [];
  const currentUserId = options.userId || (provider === 'supabase' ? REMOTE_USER_ID : FIXTURE_USER_ID);
  const Doke = {
    repositories: {
      professionalVerificationEvidence: {
        save(verificationId, userId, payload) {
          evidenceCalls.push({ verificationId, userId, payload });
          return Promise.resolve({ verificationId, userId });
        }
      }
    },
    session: {
      getSession: () => ({ provider }),
      getCurrentUser: () => ({ id: currentUserId, role: 'client' })
    }
  };
  const context = {
    console,
    Blob,
    Date,
    Error,
    JSON,
    Map,
    Math,
    Object,
    Promise,
    RegExp,
    Set,
    String,
    localStorage,
    sessionStorage,
    indexedDB: new Proxy({}, {
      get() { throw new Error('INDEXED_DB_FORBIDDEN'); }
    }),
    Doke,
    window: null
  };
  context.window = context;
  return {
    context: vm.createContext(context),
    localStorage,
    sessionStorage,
    evidenceCalls
  };
}

async function expectCode(promise, expectedCode) {
  let failure = null;
  try {
    await promise;
  } catch (error) {
    failure = error;
  }
  assert(failure, `expected rejection ${expectedCode}`);
  assert.strictEqual(failure.code, expectedCode);
}

async function run() {
  const remote = createContext('supabase');
  vm.runInContext(source, remote.context, {
    filename: 'professional-identity-verifications-repository.js'
  });
  const remoteRepository = remote.context.Doke.repositories.professionalIdentityVerifications;

  assert(remoteRepository, 'professional identity verification repository was not registered');
  assert.strictEqual(remoteRepository.authority, 'supabase-service-or-fixture-memory');
  assert.strictEqual(remoteRepository.storageKey, undefined, 'retired record storage key must not be exported');
  assert.strictEqual(remoteRepository.draftStorageKey, undefined, 'retired draft storage key must not be exported');

  await expectCode(
    remoteRepository.list({ userId: REMOTE_USER_ID }),
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.getByUserId(REMOTE_USER_ID),
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.saveDraft(REMOTE_USER_ID, `professional_profile_${REMOTE_USER_ID}`, {
      currentStep: 1,
      payload: { legalName: 'Remote user' }
    }),
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.submit(REMOTE_USER_ID, `professional_profile_${REMOTE_USER_ID}`, {
      payload: { legalName: 'Remote user' }
    }),
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.transition('professional_verification_user_profissional_demo', 'rejected'),
    'DOKE_PROFESSIONAL_VERIFICATION_AUTHORITY_UNAVAILABLE'
  );

  assert.deepStrictEqual(remote.localStorage.calls, [], 'Supabase path touched localStorage');
  assert.deepStrictEqual(remote.sessionStorage.calls, [], 'Supabase path touched sessionStorage');
  assert.deepStrictEqual(remote.evidenceCalls, [], 'Supabase repository fallback touched binary evidence');

  const fixture = createContext('fixture');
  vm.runInContext(source, fixture.context, {
    filename: 'professional-identity-verifications-repository.js'
  });
  const fixtureRepository = fixture.context.Doke.repositories.professionalIdentityVerifications;

  const draft = await fixtureRepository.saveDraft(FIXTURE_USER_ID, FIXTURE_PROFILE_ID, {
    currentStep: 2,
    payload: {
      verificationType: 'individual',
      legalName: 'Usuário Fixture',
      taxId: '12345678901',
      city: 'Salvador',
      state: 'BA'
    }
  });
  assert.strictEqual(draft.status, 'not_started');
  assert.strictEqual(draft.currentStep, 2);
  assert.strictEqual(draft.payload.legalName, 'Usuário Fixture');

  const reloadedDraft = await fixtureRepository.getByUserId(FIXTURE_USER_ID);
  assert.strictEqual(reloadedDraft.payload.taxId, '12345678901');

  const submitted = await fixtureRepository.submit(FIXTURE_USER_ID, FIXTURE_PROFILE_ID, {
    payload: reloadedDraft.payload
  });
  assert.strictEqual(submitted.status, 'submitted');
  assert.strictEqual(fixture.evidenceCalls.length, 1, 'fixture submission must keep the isolated evidence boundary explicit');

  const underReview = await fixtureRepository.transition(submitted.id, 'under_review', {
    reviewerId: 'fixture_reviewer'
  });
  assert.strictEqual(underReview.status, 'under_review');

  assert.deepStrictEqual(fixture.localStorage.calls, [], 'fixture record path must be memory-only');
  assert.deepStrictEqual(fixture.sessionStorage.calls, [], 'fixture draft path must be memory-only');

  const freshFixture = createContext('fixture');
  vm.runInContext(source, freshFixture.context, {
    filename: 'professional-identity-verifications-repository.js'
  });
  const freshRepository = freshFixture.context.Doke.repositories.professionalIdentityVerifications;
  assert.strictEqual(await freshRepository.getByUserId(FIXTURE_USER_ID), null, 'fixture state survived a fresh runtime');

  console.log('[PROF-A04] Supabase KYC record and draft authority fail closed at the repository boundary.');
  console.log('[PROF-A04] Fixture record and draft compatibility is memory-only.');
  console.log('[PROF-A04] Binary evidence remains isolated behind PROF-B03-KYC-EVIDENCE.');
}

run().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
