#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
const usersSource = fs.readFileSync(path.join(root, 'assets/js/repositories/users-repository.js'), 'utf8');
const accessSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-access-service.js'), 'utf8');
const verificationSource = fs.readFileSync(path.join(root, 'assets/js/services/professional-identity-verification-service.js'), 'utf8');

class MemoryStorage {
  constructor(initial = {}) { this.data = new Map(Object.entries(initial)); }
  getItem(key) { return this.data.has(String(key)) ? this.data.get(String(key)) : null; }
  setItem(key, value) { this.data.set(String(key), String(value)); }
  removeItem(key) { this.data.delete(String(key)); }
}

function customEvent(type, options = {}) {
  this.type = type;
  this.detail = options.detail;
}

async function assertUsersRepositoryIsReadOnly() {
  const initialProfiles = JSON.stringify([{
    id: 'profile-client-fixture',
    userId: 'client-fixture',
    status: 'active',
    verificationStatus: 'verified',
    updatedAt: '2026-07-26T20:00:00.000Z'
  }]);
  const initialVerifications = JSON.stringify([{
    id: 'verification-client-fixture',
    userId: 'client-fixture',
    status: 'verified',
    updatedAt: '2026-07-26T20:00:00.000Z'
  }]);
  const localStorage = new MemoryStorage({
    'doke.auth.users.v1': JSON.stringify([
      { id: 'client-fixture', name: 'Cliente Fixture', role: 'client', type: 'client', passwordHash: 'retired' },
      { id: 'professional-fixture', name: 'Profissional Fixture', role: 'professional', type: 'professional', professionalProfileId: 'profile-existing' }
    ]),
    'doke.auth.userProfiles.v1': '{}',
    'doke.professionalProfiles.v1': initialProfiles,
    'doke.professionalIdentityVerifications.v1': initialVerifications
  });
  const window = { DokeAuth: {}, localStorage, crypto: { randomUUID: () => 'runtime-id' } };
  vm.runInNewContext(usersSource, {
    window, console, Date, Map, Set, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Promise
  }, { filename: 'users-repository.js' });

  const repository = window.DokeAuth.repositories.users;
  const mutationExports = Object.keys(repository).filter((name) => name.startsWith('update'));
  assert.deepStrictEqual(mutationExports, [], 'users repository still exports a local mutation');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(repository, 'updateProfessionalFixtureUser'), false);

  const users = await repository.list();
  const client = users.find((user) => user.id === 'client-fixture');
  const professional = users.find((user) => user.id === 'professional-fixture');
  assert(client);
  assert(professional);
  assert.strictEqual(client.role, 'client', 'verified fixture data promoted a client during read');
  assert.strictEqual(professional.role, 'professional', 'pre-materialized read-only fixture was not preserved');

  const persisted = JSON.parse(localStorage.getItem('doke.auth.users.v1') || '[]');
  assert.strictEqual(persisted.find((user) => user.id === 'client-fixture').role, 'client');
  assert.strictEqual('passwordHash' in persisted.find((user) => user.id === 'client-fixture'), false);
  assert.strictEqual(localStorage.getItem('doke.professionalProfiles.v1'), initialProfiles, 'user read mutated professional profiles');
  assert.strictEqual(localStorage.getItem('doke.professionalIdentityVerifications.v1'), initialVerifications, 'user read mutated verification fixtures');
}

async function assertProfessionalAccessUsesServerRole() {
  const actor = { id: '00000000-0000-4000-8000-000000000071', role: 'client', type: 'client' };
  let provider = 'supabase';
  let accountRole = 'professional';
  let sessionMutationCalls = 0;
  const queryLog = [];

  const rows = {
    users: () => ({ id: actor.id, role: accountRole, status: 'active' }),
    professional_profiles: () => ({
      id: 'profile-remote', user_id: actor.id, setup_status: 'active', verification_status: 'verified', document_status: 'verified'
    }),
    professional_identity_verifications: () => ({
      id: 'verification-remote', user_id: actor.id, professional_profile_id: 'profile-remote', status: 'verified', document_status: 'verified'
    })
  };
  const client = {
    from(table) {
      queryLog.push(table);
      return {
        select() { return this; },
        eq() { return this; },
        maybeSingle() { return Promise.resolve({ data: rows[table](), error: null }); }
      };
    }
  };
  const localProfiles = { getByUserId: async () => ({ id: 'local-profile', userId: 'local-client', status: 'active', verificationStatus: 'verified', documentStatus: 'verified' }) };
  const localVerifications = { getByUserId: async () => ({ id: 'local-verification', userId: 'local-client', status: 'verified' }) };
  const window = {
    Doke: {
      services: {},
      repositories: {
        professionalProfiles: localProfiles,
        professionalIdentityVerifications: localVerifications
      },
      permissions: {
        PROFESSIONAL_ACTIONS: { ACCESS_PROFILE: 'access_professional_profile' },
        evaluateProfessionalAccess(action, context) {
          return Object.assign({}, context, { action, allowed: context.user && context.user.role === 'professional', reason: context.user && context.user.role === 'professional' ? 'allowed' : 'professional_role_required' });
        }
      },
      session: {
        getCurrentUser() { return actor; },
        getSession() { return { provider, user: actor }; },
        setCurrentUser() { sessionMutationCalls += 1; }
      }
    },
    DokeSupabase: { getClient() { return client; } },
    location: { pathname: '/perfil-profissional.html', search: '', replace() {}, assign() {} },
    dispatchEvent() {}
  };
  window.window = window;
  const document = { documentElement: { dataset: {} }, dispatchEvent() {} };
  vm.runInNewContext(accessSource, {
    window, document, console, Promise, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Error, CustomEvent: customEvent, encodeURIComponent
  }, { filename: 'professional-access-service.js' });

  const service = window.Doke.services.professionalAccess;
  const remote = await service.resolveContext();
  assert.strictEqual(remote.user.role, 'professional');
  assert(queryLog.includes('users'), 'professional access did not read canonical public.users role');
  assert.strictEqual(sessionMutationCalls, 0, 'professional access rewrote the public session');

  accountRole = 'client';
  const conflicting = await service.resolveContext();
  assert.strictEqual(conflicting.user.role, 'client', 'verified documents overrode the server account role');

  provider = 'mock';
  await assert.rejects(
    service.resolveContext(),
    (error) => error && error.code === 'DOKE_PROFESSIONAL_AUTHORITY_UNAVAILABLE'
  );

  const localActor = { id: 'local-client', role: 'client', type: 'client' };
  const localContext = await service.resolveContext(localActor);
  assert.strictEqual(localContext.user.role, 'client', 'read-only local fixture context promoted role');
  assert.strictEqual(sessionMutationCalls, 0);
}

async function assertReviewerAuthorityIsRemoteOnly() {
  let provider = 'supabase';
  let responseRole = 'professional';
  let localMutationCalls = 0;
  const events = [];
  const reviewer = { id: '00000000-0000-4000-8000-000000000099', role: 'admin', type: 'admin' };
  const client = {
    functions: {
      invoke(name, options) {
        assert.strictEqual(name, 'professional-verification-operations');
        assert.strictEqual(options.body.action, 'decide');
        return Promise.resolve({
          data: {
            verificationId: 'verification-1',
            publicVerificationId: 'professional_verification_target',
            userId: '00000000-0000-4000-8000-000000000071',
            status: 'verified',
            role: responseRole,
            reviewerId: reviewer.id,
            decidedAt: '2026-07-26T21:00:00.000Z'
          },
          error: null
        });
      }
    }
  };
  const window = {
    Doke: {
      services: {},
      repositories: {
        professionalIdentityVerifications: {
          statuses: {},
          transition() { localMutationCalls += 1; return Promise.resolve(null); }
        },
        professionalProfiles: {
          transition() { localMutationCalls += 1; return Promise.resolve(null); },
          setVerificationStatus() { localMutationCalls += 1; return Promise.resolve(null); }
        }
      },
      session: {
        getCurrentUser() { return reviewer; },
        getSession() { return { provider, user: reviewer }; },
        setCurrentUser() { localMutationCalls += 1; }
      }
    },
    DokeSupabase: {
      getClient() { return client; },
      invokeSelfService() { return Promise.reject(new Error('not used')); }
    },
    dispatchEvent(event) { events.push(event); return true; }
  };
  window.window = window;
  vm.runInNewContext(verificationSource, {
    window, console, Promise, Object, Array, String, Number, Boolean, JSON, Math, RegExp, Error, Date, Map, Set, CustomEvent: customEvent
  }, { filename: 'professional-identity-verification-service.js' });

  const service = window.Doke.services.professionalIdentityVerification;
  const approved = await service.approve('verification-1');
  assert.strictEqual(approved.status, 'verified');
  assert.strictEqual(approved.role, 'professional');
  assert.strictEqual(events.at(-1).detail.remote, true);
  assert.strictEqual(localMutationCalls, 0);

  responseRole = '';
  await assert.rejects(
    service.approve('verification-1'),
    (error) => error && error.code === 'DOKE_PROFESSIONAL_ROLE_RECONCILIATION_INCOMPLETE'
  );
  assert.strictEqual(localMutationCalls, 0);

  provider = 'mock';
  await assert.rejects(
    Promise.resolve().then(() => service.approve('verification-1')),
    (error) => error && error.code === 'DOKE_PROFESSIONAL_REVIEW_AUTHORITY_UNAVAILABLE'
  );
  assert.strictEqual(localMutationCalls, 0, 'non-Supabase approval called local repositories or session mutation');
}

async function main() {
  assert(!usersSource.includes('updateProfessionalFixtureUser'));
  assert(!usersSource.includes('reconcileProfessionalUser'));
  assert(!accessSource.includes('Doke.session.setCurrentUser'));
  assert(!accessSource.includes('updateProfessionalFixtureUser'));
  assert(!verificationSource.includes('Doke.session.setCurrentUser'));
  assert(!verificationSource.includes('updateProfessionalFixtureUser'));
  assert(!verificationSource.includes("provider || 'mock'"));
  assert(!verificationSource.includes('refreshToken'));

  await assertUsersRepositoryIsReadOnly();
  await assertProfessionalAccessUsesServerRole();
  await assertReviewerAuthorityIsRemoteOnly();

  console.log('AUTH-A12C professional authority retirement runtime passed.');
  console.log('- local user fixtures are read-only and cannot self-promote during reads');
  console.log('- professional access consumes the canonical public.users role without session rewrites');
  console.log('- reviewer decisions are remote-only and require server-confirmed professional role');
}

main().catch((error) => {
  console.error('AUTH-A12C professional authority retirement runtime failed:');
  console.error(error && error.stack || error);
  process.exit(1);
});
