#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ENVELOPE_VERSION = 'ord-a06-authorization-v1';
const MAX_TTL_MS = 2 * 60 * 60 * 1000;
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const AUTHORIZATION_ID_PATTERN = /^ord-a06-auth-[a-z0-9][a-z0-9-]{7,80}$/;
const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeOpaque(value) {
  return String(value || '').trim();
}

function normalizeUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const url = new URL(raw);
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function fingerprintExpected(expected) {
  return {
    resources: {
      clientEmailSha256: sha256(normalizeEmail(expected.clientEmail)),
      professionalEmailSha256: sha256(normalizeEmail(expected.professionalEmail)),
      serviceRefSha256: sha256(normalizeOpaque(expected.serviceRef))
    },
    targets: {
      webBaseUrlSha256: sha256(normalizeUrl(expected.webBaseUrl)),
      apiBaseUrlSha256: sha256(normalizeUrl(expected.apiBaseUrl)),
      supabaseUrlSha256: sha256(normalizeUrl(expected.supabaseUrl))
    }
  };
}

function assertOutsideRepository(root, manifestPath) {
  if (!path.isAbsolute(manifestPath)) {
    throw new Error('Authorization manifest path must be absolute.');
  }
  const relative = path.relative(path.resolve(root), path.resolve(manifestPath));
  const isInside = relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  if (isInside) throw new Error('Authorization manifest must remain outside the repository working tree.');
}

function assertNoRawSensitiveValues(source) {
  const forbidden = [
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
    /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i,
    /https?:\/\//i,
    /\bservice_[0-9]{6,}_[a-z0-9_-]+\b/i,
    /(?:password|senha|token|service[_-]?role[_-]?key)\s*[:=]\s*['\"][^'\"]+['\"]/i
  ];
  for (const pattern of forbidden) {
    if (pattern.test(source)) throw new Error(`Authorization manifest contains a raw sensitive value matching ${pattern}.`);
  }
}

function validateAuthorizationEnvelope({ root, manifestPath, manifestDigest, expected, now = new Date() }) {
  const resolvedPath = path.resolve(String(manifestPath || ''));
  assertOutsideRepository(root, resolvedPath);

  if (!SHA256_PATTERN.test(String(manifestDigest || '').trim().toLowerCase())) {
    throw new Error('Authorization manifest digest must be a lowercase SHA-256 value.');
  }
  if (!fs.existsSync(resolvedPath)) throw new Error('Authorization manifest file does not exist.');

  const stats = fs.statSync(resolvedPath);
  if (!stats.isFile()) throw new Error('Authorization manifest path must reference a regular file.');
  if (stats.size > 16 * 1024) throw new Error('Authorization manifest exceeds the 16 KiB safety limit.');

  const source = fs.readFileSync(resolvedPath, 'utf8');
  const actualDigest = sha256(source);
  if (actualDigest !== String(manifestDigest).trim().toLowerCase()) {
    throw new Error('Authorization manifest digest mismatch.');
  }
  assertNoRawSensitiveValues(source);

  let envelope;
  try {
    envelope = JSON.parse(source);
  } catch (error) {
    throw new Error(`Authorization manifest is not valid JSON: ${error.message}`);
  }

  if (envelope.version !== ENVELOPE_VERSION) throw new Error('Authorization manifest version is not supported.');
  if (!AUTHORIZATION_ID_PATTERN.test(String(envelope.authorizationId || ''))) throw new Error('Authorization ID is invalid.');
  if (envelope.environment !== 'staging') throw new Error('Authorization manifest environment must be staging.');
  if (envelope.authorizationAck !== expected.authorizationAck) throw new Error('Authorization acknowledgement does not match the executor contract.');
  if (String(envelope.runId || '').toLowerCase() !== String(expected.runId || '').toLowerCase()) throw new Error('Authorization manifest runId does not match.');
  if (String(envelope.targetMarker || '').toLowerCase() !== String(expected.targetMarker || '').toLowerCase()) throw new Error('Authorization manifest target marker does not match.');

  const issuedAt = Date.parse(envelope.issuedAt);
  const expiresAt = Date.parse(envelope.expiresAt);
  const nowMs = now.getTime();
  if (!Number.isFinite(issuedAt) || !Number.isFinite(expiresAt)) throw new Error('Authorization timestamps must be valid ISO dates.');
  if (issuedAt > nowMs + CLOCK_SKEW_MS) throw new Error('Authorization manifest was issued in the future.');
  if (expiresAt <= nowMs) throw new Error('Authorization manifest has expired.');
  if (expiresAt <= issuedAt || expiresAt - issuedAt > MAX_TTL_MS) throw new Error('Authorization manifest lifetime must be greater than zero and no longer than two hours.');

  const consent = envelope.consent || {};
  if (consent.client !== true || consent.professional !== true || consent.service !== true) {
    throw new Error('Authorization manifest must explicitly authorize client, professional and service resources.');
  }

  const scope = envelope.scope || {};
  if (scope.network !== true || scope.mutations !== true || scope.cleanupRequired !== true || scope.production !== false || scope.maxOrders !== 1) {
    throw new Error('Authorization manifest scope must allow one staging canary with mandatory cleanup and no production access.');
  }

  const fingerprints = fingerprintExpected(expected);
  const resourceFingerprints = envelope.resourceFingerprints || {};
  const targetFingerprints = envelope.targetFingerprints || {};
  for (const [name, value] of Object.entries(fingerprints.resources)) {
    if (resourceFingerprints[name] !== value) throw new Error(`Authorization resource fingerprint mismatch: ${name}.`);
  }
  for (const [name, value] of Object.entries(fingerprints.targets)) {
    if (targetFingerprints[name] !== value) throw new Error(`Authorization target fingerprint mismatch: ${name}.`);
  }

  return {
    envelope,
    summary: {
      authorizationId: envelope.authorizationId,
      version: envelope.version,
      expiresAt: envelope.expiresAt,
      digestVerified: true,
      outsideRepository: true,
      resourcesBound: true,
      targetsBound: true,
      singleOrderScope: true,
      productionAllowed: false
    }
  };
}

function buildAuthorizationEnvelope({ authorizationId, authorizationAck, issuedAt, expiresAt, runId, targetMarker, expected }) {
  const fingerprints = fingerprintExpected(expected);
  return {
    version: ENVELOPE_VERSION,
    authorizationId,
    environment: 'staging',
    authorizationAck,
    issuedAt,
    expiresAt,
    runId: String(runId || '').trim().toLowerCase(),
    targetMarker: String(targetMarker || '').trim().toLowerCase(),
    consent: {
      client: true,
      professional: true,
      service: true
    },
    scope: {
      network: true,
      mutations: true,
      cleanupRequired: true,
      production: false,
      maxOrders: 1
    },
    resourceFingerprints: fingerprints.resources,
    targetFingerprints: fingerprints.targets
  };
}

module.exports = {
  AUTHORIZATION_ID_PATTERN,
  CLOCK_SKEW_MS,
  ENVELOPE_VERSION,
  MAX_TTL_MS,
  SHA256_PATTERN,
  buildAuthorizationEnvelope,
  fingerprintExpected,
  normalizeEmail,
  normalizeOpaque,
  normalizeUrl,
  sha256,
  validateAuthorizationEnvelope
};
