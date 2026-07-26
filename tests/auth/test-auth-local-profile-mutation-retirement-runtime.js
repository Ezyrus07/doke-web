#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const usersSource = fs.readFileSync(path.join(root, 'assets/js/repositories/users-repository.js'), 'utf8');
const profileSource = fs.readFileSync(path.join(root, 'assets/js/services/profile-service.js'), 'utf8');
const professionalAccessSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-access-service.js'), 'utf8');
const professionalVerificationSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-identity-verification-service.js'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

function loadUsersRepository() {
  const localStorage = new MemoryStorage({
    'doke.auth.users.v1': JSON.stringify([{
      id: 'fixture-user-1',
      name: 'Fixture User',
      email: 'fixture@example.test',
      handle: 'fixture.user',
      role: 'client',
      type: 'client',
      passwordHash: 'retired'
    }]),
    'doke.auth.userProfiles.v1': '{}',
    'doke.professionalProfiles.v1': '[]',
    'doke.professionalIdentityVerifications.v1': '[]'
  });
  const window = { DokeAuth: {}, localStorage, crypto: { randomUUID: () => 'runtime-id' } };
  vm.runInNewContext(usersSource, { window, console, Date, Map, Set, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Promise }, { filename: 'users-repository.js' });
  return { repository: window.DokeAuth.repositories.users, localStorage };
}

async function assertRepositoryBoundary() {
  const { repository, localStorage } = loadUsersRepository();
  for (const retired of ['updateCurrentUser', 'updateCurrentProfile', 'updateCurrentSettings']) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(repository, retired), false, retired + ' must be physically absent');
  }
  assert.strictEqual(typeof repository.updateProfessionalFixtureUser, 'function');

  await assert.rejects(
    repository.updateProfessionalFixtureUser('00000000-0000-4000-8000-000000000001', { role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_MUTATION_FORBIDDEN'
  );
  await assert.rejects(
    repository.updateProfessionalFixtureUser('fixture-user-1', { name: 'Forbidden', role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_PATCH_FORBIDDEN'
  );
  await assert.rejects(
    repository.updateProfessionalFixtureUser('missing-fixture', { role: 'professional', type: 'professional', professionalProfileId: 'profile-1' }),
    (error) => error && error.code === 'DOKE_LOCAL_FIXTURE_NOT_FOUND'
  );

  const updated = await repository.updateProfessionalFixtureUser('fixture-user-1', {
    role: 'professional',
    type: 'professional',
    professionalProfileId: 'profile-1',
    publicProfileUrl: 'perfil.html',
    ownerProfileUrl: 'perfil-profissional.html'
  });
  assert.strictEqual(updated.role, 'professional');
  assert.strictEqual(updated.professionalProfileId, 'profile-1');

  const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1'));
  assert.strictEqual(persisted.length, 1);
  assert.strictEqual(persisted[0].role, 'professional');
  assert.strictEqual('password' in persisted[0], false);
  assert.strictEqual('passwordHash' in persisted[0], false);
}

async function assertProfileServiceFailsClosed() {
  let repositoryMutationCalls = 0;
  let sessionMutationCalls = 0;
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Gabriel Teste',
    handle: 'gabriel.teste',
    role: 'client',
    type: 'client',
    settings: {}
  };
  const document = { documentElement: { setAttribute() {} } };
  const window = {
    Doke: {
      services: {},
      session: {
        getCurrentUser() { return user; },
        getSession() { return { provider: 'supabase' }; },
        setCurrentUser() { sessionMutationCalls += 1; }
      }
    },
    DokeAuth: {
      repositories: {
        users: {
          list: async () => [],
          findById: async () => null,
          updateCurrentProfile: async () => { repositoryMutationCalls += 1; },
          updateCurrentSettings: async () => { repositoryMutationCalls += 1; }
        }
      }
    },
    DOKE_SUPABASE_CONFIG: { enabled: true, url: 'https://staging.example', anonKey: 'anon' },
    dispatchEvent() {},
    document
  };
  window.window = window;
  vm.runInNewContext(profileSource, {
    window,
    document,
    console,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options && options.detail; } },
    FileReader: class {},
    Promise,
    Object,
    Array,
    String,
    Number,
    Boolean,
    JSON,
    Math,
    RegExp,
    Date
  }, { filename: 'profile-service.js' });

  await assert.rejects(
    window.Doke.services.profile.updateCurrentProfile({ name: 'Gabriel Teste', handle: 'gabriel.teste' }),
    (error) => error && error.code === 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE'
  );
  await assert.rejects(
    window.Doke.services.profile.updateCurrentSettings({ theme: 'dark' }),
    (error) => error && error.code === 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE' || error && error.code === 'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(repositoryMutationCalls, 0, 'profile service called a local mutation fallback');
  assert.strictEqual(sessionMutationCalls, 0, 'profile service rewrote the public session');
}

async function main() {
  assert(!profileSource.includes('repository.updateCurrentProfile'));
  assert(!profileSource.includes('repository.updateCurrentSettings'));
  assert(!profileSource.includes('Doke.session.setCurrentUser'));
  assert(professionalAccessSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalAccessSource.includes('updateCurrentUser'));
  assert(professionalVerificationSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalVerificationSource.includes('updateCurrentUser'));

  await assertRepositoryBoundary();
  await assertProfileServiceFailsClosed();

  console.log('AUTH-A12B.2 local profile mutation retirement runtime passed.');
  console.log('- generic local account/profile/settings mutation APIs are absent');
  console.log('- Supabase profile/settings mutations fail closed without self-service authority');
  console.log('- public session snapshots are not manually rewritten');
  console.log('- professional fixture mutation is explicit, narrow and blocks UUID subjects');
}

main().catch((error) => {
  console.error('AUTH-A12B.2 local profile mutation retirement runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
