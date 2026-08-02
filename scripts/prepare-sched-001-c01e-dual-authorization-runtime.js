#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const FIXTURE_AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_C01E_SYNTHETIC_ORDER_FIXTURE_LIFECYCLE_ON_DOKE_STAGING';
const BROWSER_AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING';
const PROJECT_REF = 'zwkczgewzbsorbrjuzpb';

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizedEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function required(name) {
  const value = String(process.env[name] || '').trim();
  if (!value) fail(`DOKE_SCHED_C01E_${name}_MISSING`);
  return value;
}

function write(file, value) {
  const text = `${JSON.stringify(value, null, 2)}\n`;
  fs.writeFileSync(file, text, 'utf8');
  return { text, digest: sha256(text) };
}

function run() {
  const fixtureAuthorization = required('DOKE_SCHED_C01E_AUTHORIZATION');
  const browserAuthorization = required('DOKE_SCHED_C01E_BROWSER_AUTHORIZATION');
  const c01dAuthorization = required('DOKE_SCHED_C01D_AUTHORIZATION');
  const headSha = required('DOKE_SCHED_C01E_EXPECTED_HEAD_SHA');
  const c01dHeadSha = required('DOKE_SCHED_C01D_EXPECTED_HEAD_SHA');
  const projectRef = required('SUPABASE_PROJECT_REF');
  const runId = required('DOKE_SCHED_C01E_RUN_ID');
  const clientEmail = normalizedEmail(required('DOKE_STAGING_CLIENT_EMAIL'));
  const professionalEmail = normalizedEmail(required('DOKE_STAGING_PROFESSIONAL_EMAIL'));
  const runnerTemp = required('RUNNER_TEMP');
  const githubEnv = required('GITHUB_ENV');

  if (fixtureAuthorization !== FIXTURE_AUTHORIZATION) fail('DOKE_SCHED_C01E_FIXTURE_AUTHORIZATION_MISMATCH');
  if (browserAuthorization !== BROWSER_AUTHORIZATION || c01dAuthorization !== BROWSER_AUTHORIZATION) fail('DOKE_SCHED_C01E_BROWSER_AUTHORIZATION_MISMATCH');
  if (headSha !== c01dHeadSha || !/^[a-f0-9]{40}$/.test(headSha)) fail('DOKE_SCHED_C01E_HEAD_MISMATCH');
  if (projectRef !== PROJECT_REF) fail('DOKE_SCHED_C01E_PROJECT_MISMATCH');
  if (!/^sched-c01e-[a-z0-9][a-z0-9-]{5,72}$/.test(runId)) fail('DOKE_SCHED_C01E_RUN_ID_INVALID');
  if (!clientEmail || !professionalEmail || clientEmail === professionalEmail) fail('DOKE_SCHED_C01E_PERSONAS_INVALID');

  const directory = path.join(runnerTemp, 'sched-c01e');
  fs.mkdirSync(directory, { recursive: true });
  const statePath = path.join(directory, 'state.json');
  const fixtureManifestPath = path.join(directory, 'fixture-manifest.json');
  const fixtureEnvelopePath = path.join(directory, 'authorization-envelope.json');
  const c01dManifestPath = path.join(directory, 'c01d-case-manifest.json');
  const c01dEnvelopePath = path.join(directory, 'c01d-authorization-envelope.json');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 55 * 60 * 1000);

  const fixtureManifest = write(fixtureManifestPath, {
    contractVersion: 'sched-c01e-fixture-manifest-v1',
    serviceCount: 1,
    serviceVersionCount: 1,
    orderCount: 2,
    conversationCount: 2,
    messageCountMaximum: 2,
    scheduleReservationCount: 1,
    canonicalConfirmedOrderCount: 1,
    alternateOrderCount: 1
  });

  const fixtureEnvelope = write(fixtureEnvelopePath, {
    contractVersion: 'sched-c01e-external-authorization-envelope-v1',
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    headSha,
    projectRef,
    runId,
    fixtureAuthorizationPhraseDigest: sha256(fixtureAuthorization),
    browserAuthorizationPhraseDigest: sha256(browserAuthorization),
    clientAccountDigest: sha256(clientEmail),
    professionalAccountDigest: sha256(professionalEmail),
    fixtureManifestDigest: fixtureManifest.digest
  });

  const c01dManifest = write(c01dManifestPath, {
    contractVersion: 'sched-c01d-read-only-case-manifest-v1',
    headSha,
    projectRef,
    requiredAuthorities: ['canonical_confirmed'],
    alternateAuthorities: ['client_intent', 'none'],
    maximumOrders: 4
  });

  const c01dEnvelope = write(c01dEnvelopePath, {
    contractVersion: 'sched-c01d-external-authorization-envelope-v1',
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    headSha,
    projectRef,
    authorizationPhraseDigest: sha256(c01dAuthorization),
    clientAccountDigest: sha256(clientEmail),
    professionalAccountDigest: sha256(professionalEmail),
    caseManifestDigest: c01dManifest.digest
  });

  const values = {
    DOKE_SCHED_C01E_STATE_PATH: statePath,
    DOKE_SCHED_C01E_FIXTURE_MANIFEST_PATH: fixtureManifestPath,
    DOKE_SCHED_C01E_FIXTURE_MANIFEST_SHA256: fixtureManifest.digest,
    DOKE_SCHED_C01E_AUTHORIZATION_ENVELOPE_PATH: fixtureEnvelopePath,
    DOKE_SCHED_C01E_AUTHORIZATION_ENVELOPE_SHA256: fixtureEnvelope.digest,
    DOKE_SCHED_C01D_CASE_MANIFEST_PATH: c01dManifestPath,
    DOKE_SCHED_C01D_CASE_MANIFEST_SHA256: c01dManifest.digest,
    DOKE_SCHED_C01D_AUTHORIZATION_ENVELOPE_PATH: c01dEnvelopePath,
    DOKE_SCHED_C01D_AUTHORIZATION_ENVELOPE_SHA256: c01dEnvelope.digest
  };
  fs.appendFileSync(githubEnv, `${Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')}\n`);
  process.stdout.write(`${JSON.stringify({
    contractVersion: 'sched-c01e-dual-authorization-runtime-v1',
    status: 'ephemeral_dual_authorization_materialized',
    headSha,
    projectRef,
    runDigest: sha256(runId),
    fixtureManifestDigest: fixtureManifest.digest,
    fixtureEnvelopeDigest: fixtureEnvelope.digest,
    c01dManifestDigest: c01dManifest.digest,
    c01dEnvelopeDigest: c01dEnvelope.digest,
    rawIdentifiersRecorded: false,
    credentialsRecorded: false
  }, null, 2)}\n`);
}

try { run(); }
catch (error) {
  console.error(String(error && (error.code || error.message) || error));
  process.exitCode = 1;
}
