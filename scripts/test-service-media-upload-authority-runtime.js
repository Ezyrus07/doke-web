#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const actorId = '11111111-1111-4111-8111-111111111111';
const actions = [];
const signedUploads = [];
let directRepositorySubmissions = 0;

const repository = {
  getProviderStatus() {
    return { provider: 'supabase' };
  },
  submitForReview() {
    directRepositorySubmissions += 1;
    throw new Error('legacy repository submission must not execute');
  },
  getOwnedReviewDraft(id) {
    return Promise.resolve({
      id,
      externalId: id,
      status: 'draft',
      moderationStatus: 'pending_review',
      pendingVersionId: '22222222-2222-4222-8222-222222222222',
      images: ['https://project.supabase.co/storage/v1/object/public/service-media/pending/canonical.jpg']
    });
  },
  list() { return Promise.resolve([]); },
  getById() { return Promise.resolve(null); }
};

const client = {
  storage: {
    from(bucket) {
      return {
        uploadToSignedUrl(path, token, blob, options) {
          signedUploads.push({ bucket, path, token, size: blob.size, options });
          return Promise.resolve({ data: { path }, error: null });
        }
      };
    }
  }
};

const context = {
  console,
  Promise,
  Blob,
  Uint8Array,
  URLSearchParams,
  setTimeout,
  clearTimeout,
  atob,
  window: null,
  document: {
    createElement() { throw new Error('dynamic loader should not run when authority is preloaded'); },
    querySelector() { return null; },
    head: { appendChild() {} },
    documentElement: { appendChild() {} }
  }
};
context.window = context;
context.Doke = {
  repositories: { services: repository },
  services: {
    professionalAccess: {
      ACTIONS: { PUBLISH_SERVICE: 'publish_service' },
      assert() {
        return Promise.resolve({
          user: { id: actorId, name: 'Profissional Teste' },
          professionalProfile: { id: 'profile-1' },
          verification: { status: 'verified' }
        });
      }
    }
  },
  session: {
    getCurrentUser() { return { id: actorId }; }
  }
};
context.DokeSupabase = {
  getClient() { return client; },
  invokeSelfService(action, params) {
    actions.push({ action, params });
    if (action === 'prepare_service_media_uploads') {
      return Promise.resolve({
        intentId: '33333333-3333-4333-8333-333333333333',
        uploads: [{
          kind: 'upload',
          sortOrder: 0,
          bucket: 'service-media',
          path: 'pending/' + actorId + '/intent/01-canonical.png',
          token: 'signed-token',
          type: 'image/png'
        }]
      });
    }
    if (action === 'submit_service_for_review') {
      return Promise.resolve({
        serviceId: '44444444-4444-4444-8444-444444444444',
        externalId: 'service-test-1',
        versionId: '22222222-2222-4222-8222-222222222222',
        moderationStatus: 'pending_review',
        publicStatus: 'draft',
        mediaUrls: ['https://project.supabase.co/storage/v1/object/public/service-media/pending/canonical.jpg']
      });
    }
    throw new Error('unexpected action: ' + action);
  }
};

vm.createContext(context);
vm.runInContext(fs.readFileSync('assets/js/services/service-media-upload-service.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('assets/js/services/services-service.js', 'utf8'), context);

const image = 'data:image/png;base64,' + Buffer.from('canonical-image').toString('base64');

context.Doke.services.services.create({
  id: 'service-test-1',
  title: 'Serviço de teste válido',
  category: 'Tecnologia',
  shortDescription: 'Descrição curta suficientemente extensa para validação.',
  description: 'Descrição completa suficientemente extensa para a submissão versionada do serviço de teste.',
  quoteMode: 'default',
  images: [image]
}).then((saved) => {
  assert.equal(directRepositorySubmissions, 0, 'legacy repository submission executed');
  assert.equal(actions.length, 2);
  assert.equal(actions[0].action, 'prepare_service_media_uploads');
  assert.equal(actions[1].action, 'submit_service_for_review');
  assert.equal(signedUploads.length, 1);
  assert.equal(signedUploads[0].bucket, 'service-media');
  assert.equal(signedUploads[0].token, 'signed-token');
  assert.equal(Object.prototype.hasOwnProperty.call(signedUploads[0].options, 'upsert'), false);

  const submit = actions[1].params;
  assert.equal(submit.p_upload_intent_id, '33333333-3333-4333-8333-333333333333');
  assert.equal(Array.isArray(submit.p_snapshot.images), true);
  assert.equal(submit.p_snapshot.images.length, 0);
  assert.equal(submit.p_snapshot.image, '');
  assert.equal(saved.pendingVersionId, '22222222-2222-4222-8222-222222222222');
  assert.equal(saved.images.length, 1);
  console.log('Service media signed upload authority runtime: PASS');
}).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
