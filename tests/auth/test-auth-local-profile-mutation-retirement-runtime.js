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
    'doke.professionalProfiles.v1': JSON.stringify([{
      id: 'profile-1',
      userId: 'fixture-user-1',
      status: 'active',
      verificationStatus: 'verified'
    }]),
    'doke.professionalIdentityVerifications.v1': JSON.stringify([{
      id: 'verification-1',
      userId: 'fixture-user-1',
      status: 'verified'
    }])
  });
  const window = { DokeAuth: {}, localStorage, crypto: { randomUUID: () => 'runtime-id' } };
  vm.runInNewContext(usersSource, { window, console, Date, Map, Set, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Promise }, { filename: 'users-repository.js' });
  return { repository: window.DokeAuth.repositories.users, localStorage };
}

async function assertRepositoryBoundary() {
  const { repository, localStorage } = loadUsersRepository();
  for (const retired of [
    'updateCurrentUser',
    'updateCurrentProfile',
    'updateCurrentSettings',
    'updateProfessionalFixtureUser'
  ]) {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(repository, retired), false, retired + ' must be physically absent');
  }
  assert.deepStrictEqual(Object.keys(repository).filter((name) => name.startsWith('update')), []);

  const users = await repository.list();
  assert.strictEqual(users.length, 1);
  assert.strictEqual(users[0].role, 'client', 'read-only fixture data promoted the user');

  const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1'));
  assert.strictEqual(persisted.length, 1);
  assert.strictEqual(persisted[0].role, 'client');
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
    (error) => error && (error.code === 'DOKE_PROFILE_AUTHORITY_UNAVAILABLE' || error.code === 'DOKE_SETTINGS_AUTHORITY_UNAVAILABLE')
  );
  assert.strictEqual(repositoryMutationCalls, 0, 'profile service called a local mutation fallback');
  assert.strictEqual(sessionMutationCalls, 0, 'profile service rewrote the public session');
}

async function main() {
  assert(!profileSource.includes('repository.updateCurrentProfile'));
  assert(!profileSource.includes('repository.updateCurrentSettings'));
  assert(!profileSource.includes('Doke.session.setCurrentUser'));
  assert(!professionalAccessSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalAccessSource.includes('Doke.session.setCurrentUser'));
  assert(!professionalVerificationSource.includes('updateProfessionalFixtureUser'));
  assert(!professionalVerificationSource.includes('Doke.session.setCurrentUser'));

  await assertRepositoryBoundary();
  await assertProfileServiceFailsClosed();

  console.log('AUTH-A12C cumulative local identity mutation retirement runtime passed.');
  console.log('- generic and professional local identity mutation APIs are absent');
  console.log('- local fixture reads cannot promote account role');
  console.log('- Supabase profile/settings mutations fail closed without self-service authority');
  console.log('- public session snapshots are not manually rewritten');
}

main().catch((error) => {
  console.error('AUTH-A12C cumulative local identity mutation retirement runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
