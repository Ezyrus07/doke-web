#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const servicePath = path.join(root, 'assets/js/services/services-service.js');
const repositoryPath = path.join(root, 'assets/js/repositories/services-repository.js');
const source = fs.readFileSync(servicePath, 'utf8');
const repositorySource = fs.readFileSync(repositoryPath, 'utf8');

assert(source.includes('repository.transitionOwnedLifecycle'), 'CAT-A03 lifecycle routing marker missing');
assert(source.includes('repository.submitForReview(candidate'), 'CAT-A03 versioned edit marker missing');
assert(!source.includes('return repository.update(serviceId, patch || {})'), 'generic remote edit route remains');
assert(repositorySource.includes("invokeSelfService('transition_owned_service_lifecycle'"), 'repository lifecycle operation missing');
assert(repositorySource.includes('DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN'), 'direct mutation fail-closed marker missing');
assert(!repositorySource.includes('function saveRemote(service)'), 'direct remote save function remains');
assert(!repositorySource.includes("upsert(payload, { onConflict: 'external_id' })"), 'direct services upsert remains');

function createRuntime() {
  const calls = [];
  let actor = { id: '11111111-1111-4111-8111-111111111111', role: 'professional' };
  let current = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    externalId: 'service-cat-a03',
    ownerId: actor.id,
    professionalId: actor.id,
    providerId: actor.id,
    title: 'Serviço aprovado',
    status: 'active',
    moderationStatus: 'published',
    approvedVersionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    images: ['https://example.test/service.jpg']
  };

  const repository = {
    getById() { return Promise.resolve(Object.assign({}, current)); },
    submitForReview(candidate, options) {
      calls.push(['submitForReview', candidate, options]);
      return Promise.resolve(Object.assign({}, candidate, { moderationStatus: 'changes_pending_review' }));
    },
    transitionOwnedLifecycle(id, action) {
      calls.push(['transitionOwnedLifecycle', id, action]);
      if (action === 'pause') current.status = 'inactive';
      if (action === 'reactivate') current.status = 'active';
      if (action === 'archive') current.status = 'archived';
      return Promise.resolve(Object.assign({}, current));
    },
    update() {
      calls.push(['fixtureUpdate']);
      throw new Error('Remote services must not use generic update.');
    },
    list() { return Promise.resolve([Object.assign({}, current)]); }
  };

  const window = {
    Doke: {
      repositories: { services: repository },
      session: { getCurrentUser: () => actor },
      services: {
        professionalAccess: {
          ACTIONS: { PUBLISH_SERVICE: 'publish_service' },
          assert() { return Promise.resolve({ user: actor }); }
        }
      }
    },
    location: { search: '' },
    URLSearchParams
  };
  const context = vm.createContext({ window, URLSearchParams, Promise, Object, Array, String, Error, Date, console });
  vm.runInContext(source, context, { filename: servicePath });
  return { window, calls, getCurrent: () => current, setActor: (value) => { actor = value; } };
}

(async () => {
  const runtime = createRuntime();
  const services = runtime.window.Doke.services.services;

  const edited = await services.updateOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { title: 'Serviço em revisão' });
  assert.strictEqual(edited.moderationStatus, 'changes_pending_review');
  assert.strictEqual(runtime.calls.filter((entry) => entry[0] === 'submitForReview').length, 1, 'edit must cross versioned review once');
  assert.strictEqual(runtime.calls.filter((entry) => entry[0] === 'fixtureUpdate').length, 0, 'remote edit cannot use generic update');

  await services.deactivateOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await services.reactivateOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  await services.archiveOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
  assert.deepStrictEqual(
    runtime.calls.filter((entry) => entry[0] === 'transitionOwnedLifecycle').map((entry) => entry[2]),
    ['pause', 'reactivate', 'archive']
  );
  await assert.rejects(
    services.reactivateOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    /Transição de status inválida/
  );

  runtime.setActor({ id: '22222222-2222-4222-8222-222222222222', role: 'professional' });
  await assert.rejects(
    services.updateOwned('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', { title: 'Tentativa indevida' }),
    /Você não pode alterar este serviço/
  );

  console.log('[CAT-A03] content edits cross versioned moderation authority.');
  console.log('[CAT-A03] pause, reactivate and archive cross explicit lifecycle authority.');
  console.log('[CAT-A03] generic remote table mutation is fail-closed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
