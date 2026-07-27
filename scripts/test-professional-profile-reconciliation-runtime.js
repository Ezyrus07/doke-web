#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'assets/js/services/professional-profile-service.js');
const source = fs.readFileSync(sourcePath, 'utf8');

assert(source.includes("invokeSelfService('update_professional_profile_reconciled'"), 'PROF-A03 operation marker missing');
assert(!source.includes('repo.updateActiveProfile'), 'legacy professional repository mutation remains active');
assert(!source.includes('base.updateCurrentProfile'), 'split base-profile mutation remains active');

function createRuntime(overrides = {}) {
  const calls = [];
  const events = [];
  const user = { id: '11111111-1111-4111-8111-111111111111', name: 'Profissional Teste', handle: 'prof.teste' };
  const professionalProfile = {
    id: `professional_profile_${user.id}`,
    userId: user.id,
    status: 'active',
    currentStep: 2,
    payload: {
      mainCategory: 'Pintura',
      specialties: 'Pintura residencial',
      shortBio: 'Apresentação profissional válida para o teste.',
      serviceRegion: 'Salvador',
      experienceYears: '5 anos',
    },
    verificationStatus: 'verified',
    documentStatus: 'verified',
  };
  const profile = {
    profileId: user.id,
    userId: user.id,
    displayName: 'Profissional Atualizado',
    username: 'prof.atualizado',
    city: 'Salvador',
    state: 'BA',
    bio: professionalProfile.payload.shortBio,
    interests: ['Pintura'],
    avatarUrl: '',
    coverUrl: '',
  };

  const window = {
    Doke: {
      services: {
        professionalAccess: {
          ACTIONS: { EDIT_PROFILE: 'edit_professional_profile' },
          assert(action) {
            calls.push(['access.assert', action]);
            return Promise.resolve({ allowed: true });
          },
        },
        profile: {
          refreshCurrentProfile() {
            calls.push(['profile.refreshCurrentProfile']);
            return Promise.resolve(Object.assign({ name: profile.displayName, handle: profile.username }, profile));
          },
        },
      },
      repositories: {
        professionalProfiles: {
          normalize(value) {
            calls.push(['repository.normalize']);
            return value;
          },
          getByUserId() {
            return Promise.resolve(professionalProfile);
          },
        },
      },
      session: {
        getCurrentUser() {
          return user;
        },
      },
    },
    DokeSupabase: {
      invokeSelfService(action, params) {
        calls.push(['invokeSelfService', action, params]);
        if (overrides.result) return Promise.resolve(overrides.result);
        return Promise.resolve({
          userId: user.id,
          profile,
          professionalProfile,
        });
      },
    },
    CustomEvent: function CustomEvent(type, init) {
      this.type = type;
      this.detail = init && init.detail;
    },
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };

  const context = vm.createContext({
    window,
    CustomEvent: window.CustomEvent,
    Promise,
    Object,
    Array,
    String,
    Error,
    console,
  });
  vm.runInContext(source, context, { filename: sourcePath });

  return { window, calls, events, user, professionalProfile, profile };
}

async function main() {
  const runtime = createRuntime();
  const service = runtime.window.Doke.services.professionalProfile;
  assert(service && typeof service.update === 'function', 'professional profile service not registered');

  const result = await service.update({
    name: 'Profissional Atualizado',
    handle: 'prof.atualizado',
    city: 'Salvador',
    state: 'BA',
    mainCategory: 'Pintura',
    specialties: 'Pintura residencial',
    shortBio: 'Apresentação profissional válida para o teste.',
    serviceRegion: 'Salvador',
    experienceYears: '5 anos',
  });

  const operationCalls = runtime.calls.filter((entry) => entry[0] === 'invokeSelfService');
  assert.strictEqual(operationCalls.length, 1, 'profile editor must perform one server mutation');
  assert.strictEqual(operationCalls[0][1], 'update_professional_profile_reconciled');
  assert.strictEqual(operationCalls[0][2].p_professional_payload.mainCategory, 'Pintura');
  assert(runtime.calls.some((entry) => entry[0] === 'profile.refreshCurrentProfile'), 'base profile cache was not reconciled');
  assert.strictEqual(result.userId, runtime.user.id);
  assert.strictEqual(result.professionalProfile.status, 'active');
  assert.strictEqual(result.source, 'server');
  assert.strictEqual(result.reconciled, true);
  assert(runtime.events.some((event) => event.type === 'doke:professional-profile-updated'), 'reconciled event missing');

  const mismatch = createRuntime({
    result: {
      userId: '22222222-2222-4222-8222-222222222222',
      profile: {},
      professionalProfile: runtime.professionalProfile,
    },
  });
  await assert.rejects(
    mismatch.window.Doke.services.professionalProfile.update({
      name: 'Profissional Atualizado',
      handle: 'prof.atualizado',
      city: 'Salvador',
      state: 'BA',
      mainCategory: 'Pintura',
      specialties: 'Pintura residencial',
      shortBio: 'Apresentação profissional válida para o teste.',
      serviceRegion: 'Salvador',
      experienceYears: '5 anos',
    }),
    (error) => error && error.code === 'DOKE_PROFESSIONAL_PROFILE_RECONCILIATION_SUBJECT_MISMATCH'
  );

  console.log('[PROF-A03] one atomic server mutation owns base and professional profile edits.');
  console.log('[PROF-A03] split repository/base mutations are retired from the active editor.');
  console.log('[PROF-A03] server response subject and active-profile state are reconciled.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
