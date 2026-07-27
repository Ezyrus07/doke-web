#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(
  path.join(root, 'assets/js/repositories/professional-verification-evidence-repository.js'),
  'utf8'
);

const REMOTE_USER_ID = '123e4567-e89b-42d3-a456-426614174000';
const FIXTURE_USER_ID = 'fixture_professional_evidence_user';
const VERIFICATION_ID = 'professional_verification_fixture_professional_evidence_user';

function createContext(provider) {
  const indexedDbCalls = [];
  const Doke = {
    repositories: {},
    session: {
      getSession: () => ({ provider })
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
    structuredClone,
    indexedDB: new Proxy({}, {
      get(_target, property) {
        indexedDbCalls.push(String(property));
        throw new Error('INDEXED_DB_FORBIDDEN');
      }
    }),
    Doke,
    window: null
  };
  context.window = context;
  return { context: vm.createContext(context), indexedDbCalls };
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

function fixturePayload() {
  const front = new Blob(['front'], { type: 'image/png' });
  const back = new Blob(['back'], { type: 'image/png' });
  const selfie = new Blob(['selfie'], { type: 'image/jpeg' });
  const proof = new Blob(['proof'], { type: 'application/pdf' });
  return {
    verificationType: 'individual',
    legalName: 'Usuário Fixture',
    taxId: '12345678901',
    documentType: 'rg',
    documentFront: { fileName: 'front.png', type: front.type, size: front.size, blob: front },
    documentBack: { fileName: 'back.png', type: back.type, size: back.size, blob: back },
    selfieDocument: { fileName: 'selfie.jpg', type: selfie.type, size: selfie.size, blob: selfie },
    proofOfAddress: { fileName: 'proof.pdf', type: proof.type, size: proof.size, blob: proof },
    truthConfirmed: true,
    consentAccepted: true
  };
}

async function run() {
  const remote = createContext('supabase');
  vm.runInContext(source, remote.context, {
    filename: 'professional-verification-evidence-repository.js'
  });
  const remoteRepository = remote.context.Doke.repositories.professionalVerificationEvidence;

  assert(remoteRepository, 'professional verification evidence repository was not registered');
  assert.strictEqual(remoteRepository.authority, 'supabase-storage-or-fixture-memory');
  assert.strictEqual(remoteRepository.databaseName, undefined, 'retired IndexedDB name must not be exported');

  await expectCode(
    remoteRepository.save(VERIFICATION_ID, REMOTE_USER_ID, fixturePayload()),
    'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.getByVerificationId(VERIFICATION_ID),
    'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE'
  );
  await expectCode(
    remoteRepository.remove(VERIFICATION_ID),
    'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE'
  );
  assert.deepStrictEqual(remote.indexedDbCalls, [], 'Supabase evidence boundary touched IndexedDB');

  const fixture = createContext('fixture');
  vm.runInContext(source, fixture.context, {
    filename: 'professional-verification-evidence-repository.js'
  });
  const fixtureRepository = fixture.context.Doke.repositories.professionalVerificationEvidence;
  const saved = await fixtureRepository.save(VERIFICATION_ID, FIXTURE_USER_ID, fixturePayload());

  assert.strictEqual(saved.verificationId, VERIFICATION_ID);
  assert.strictEqual(saved.userId, FIXTURE_USER_ID);
  assert.strictEqual(saved.payload.documentFront.fileName, 'front.png');
  assert(saved.payload.documentFront.blob instanceof Blob, 'fixture binary evidence was not kept in memory');

  const loaded = await fixtureRepository.getByVerificationId(VERIFICATION_ID);
  assert.strictEqual(loaded.payload.proofOfAddress.fileName, 'proof.pdf');
  assert.deepStrictEqual(fixture.indexedDbCalls, [], 'fixture evidence path must be memory-only');

  await fixtureRepository.remove(VERIFICATION_ID);
  assert.strictEqual(await fixtureRepository.getByVerificationId(VERIFICATION_ID), null);

  await expectCode(
    fixtureRepository.save(VERIFICATION_ID, REMOTE_USER_ID, fixturePayload()),
    'DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE'
  );

  const firstRuntime = createContext('fixture');
  vm.runInContext(source, firstRuntime.context, {
    filename: 'professional-verification-evidence-repository.js'
  });
  await firstRuntime.context.Doke.repositories.professionalVerificationEvidence.save(
    VERIFICATION_ID,
    FIXTURE_USER_ID,
    fixturePayload()
  );

  const freshRuntime = createContext('fixture');
  vm.runInContext(source, freshRuntime.context, {
    filename: 'professional-verification-evidence-repository.js'
  });
  assert.strictEqual(
    await freshRuntime.context.Doke.repositories.professionalVerificationEvidence.getByVerificationId(VERIFICATION_ID),
    null,
    'fixture binary evidence survived a fresh runtime'
  );
  assert.deepStrictEqual(freshRuntime.indexedDbCalls, [], 'fresh fixture runtime touched IndexedDB');

  console.log('[PROF-B03-KYC-EVIDENCE] Supabase and UUID evidence paths fail closed.');
  console.log('[PROF-B03-KYC-EVIDENCE] Fixture binary evidence is memory-only.');
  console.log('[PROF-B03-KYC-EVIDENCE] IndexedDB evidence authority is retired.');
}

run().catch((error) => {
  console.error(error && error.stack || error);
  process.exitCode = 1;
});
