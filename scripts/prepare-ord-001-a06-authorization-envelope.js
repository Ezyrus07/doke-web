#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {
  buildAuthorizationEnvelope,
  sha256,
  validateAuthorizationEnvelope
} = require('./lib/ord-a06-authorization-envelope');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnv = args.has('--check-env');
const write = args.has('--write');

const AUTHORIZATION_ACK = 'I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS';
const AUTHORIZATION_DECISION = 'I_EXPLICITLY_AUTHORIZE_ORD_A06_VISUAL_CANARY';
const RUN_ID_PATTERN = /^ord-a06-[a-z0-9][a-z0-9-]{5,80}$/;
const AUTHORIZATION_ID_PATTERN = /^ord-a06-auth-[a-z0-9][a-z0-9-]{7,80}$/;

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  authorizationAck: 'DOKE_ORD_A06_AUTHORIZATION_ACK',
  authorizationDecision: 'DOKE_ORD_A06_AUTHORIZATION_DECISION',
  writeAuthorization: 'DOKE_ORD_A06_WRITE_AUTHORIZATION',
  authorizationId: 'DOKE_ORD_A06_AUTHORIZATION_ID',
  authorizationOutputPath: 'DOKE_ORD_A06_AUTHORIZATION_OUTPUT_PATH',
  authorizationTtlMinutes: 'DOKE_ORD_A06_AUTHORIZATION_TTL_MINUTES',
  webBaseUrl: 'DOKE_ORD_A06_WEB_BASE_URL',
  apiBaseUrl: 'DOKE_ORD_A06_API_BASE_URL',
  supabaseUrl: 'DOKE_ORD_A06_SUPABASE_URL',
  clientEmail: 'DOKE_ORD_A06_CLIENT_EMAIL',
  professionalEmail: 'DOKE_ORD_A06_PROFESSIONAL_EMAIL',
  serviceRef: 'DOKE_ORD_A06_SERVICE_REF',
  runId: 'DOKE_ORD_A06_RUN_ID',
  targetMarker: 'DOKE_ORD_A06_TARGET_MARKER'
});

const report = {
  name: 'ord-a06-authorization-envelope-preparer',
  mode: dryRun ? 'dry-run' : checkEnv ? 'check-env' : write ? 'write' : 'blocked',
  performsNetworkRequest: false,
  performsMutation: false,
  credentialsRecorded: false,
  rawResourcesRecorded: false,
  envelopeWritten: false,
  status: 'not_evaluated',
  checks: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error && error.message || String(error));
  report.status = 'failed';
  printReport();
  process.exitCode = 1;
});

function requireValue(name) {
  if (!String(process.env[name] || '').trim()) report.failures.push(`${name} is required.`);
}

function requireExact(name, expected) {
  if (String(process.env[name] || '') !== expected) report.failures.push(`${name} must equal the explicit authorization value.`);
}

function assertOutsideRepository(outputPath) {
  if (!path.isAbsolute(outputPath)) {
    report.failures.push(`${ENV.authorizationOutputPath} must be an absolute path.`);
    return;
  }
  const relative = path.relative(path.resolve(root), path.resolve(outputPath));
  const isInside = relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
  if (isInside) report.failures.push('Authorization output must remain outside the repository working tree.');
}

function collect() {
  requireExact(ENV.environment, 'staging');
  requireExact(ENV.authorizationAck, AUTHORIZATION_ACK);
  requireExact(ENV.authorizationDecision, AUTHORIZATION_DECISION);
  requireValue(ENV.authorizationId);
  requireValue(ENV.authorizationOutputPath);
  requireValue(ENV.authorizationTtlMinutes);
  requireValue(ENV.webBaseUrl);
  requireValue(ENV.apiBaseUrl);
  requireValue(ENV.supabaseUrl);
  requireValue(ENV.clientEmail);
  requireValue(ENV.professionalEmail);
  requireValue(ENV.serviceRef);
  requireValue(ENV.runId);
  requireValue(ENV.targetMarker);

  const authorizationId = String(process.env[ENV.authorizationId] || '').trim().toLowerCase();
  const outputPath = String(process.env[ENV.authorizationOutputPath] || '').trim();
  const runId = String(process.env[ENV.runId] || '').trim().toLowerCase();
  const ttlMinutes = Number(process.env[ENV.authorizationTtlMinutes]);
  const clientEmail = String(process.env[ENV.clientEmail] || '').trim().toLowerCase();
  const professionalEmail = String(process.env[ENV.professionalEmail] || '').trim().toLowerCase();

  if (authorizationId && !AUTHORIZATION_ID_PATTERN.test(authorizationId)) report.failures.push(`${ENV.authorizationId} has an invalid format.`);
  if (runId && !RUN_ID_PATTERN.test(runId)) report.failures.push(`${ENV.runId} has an invalid format.`);
  if (!Number.isInteger(ttlMinutes) || ttlMinutes < 5 || ttlMinutes > 120) report.failures.push(`${ENV.authorizationTtlMinutes} must be an integer between 5 and 120.`);
  if (clientEmail && professionalEmail && clientEmail === professionalEmail) report.failures.push('Client and professional resources must be distinct.');
  if (outputPath) assertOutsideRepository(outputPath);

  return {
    authorizationId,
    outputPath,
    runId,
    targetMarker: String(process.env[ENV.targetMarker] || '').trim().toLowerCase(),
    ttlMinutes,
    expected: {
      authorizationAck: AUTHORIZATION_ACK,
      clientEmail,
      professionalEmail,
      serviceRef: String(process.env[ENV.serviceRef] || '').trim(),
      webBaseUrl: String(process.env[ENV.webBaseUrl] || '').trim(),
      apiBaseUrl: String(process.env[ENV.apiBaseUrl] || '').trim(),
      supabaseUrl: String(process.env[ENV.supabaseUrl] || '').trim()
    }
  };
}

async function main() {
  if (dryRun) {
    report.status = 'dry_run_plan_only';
    report.checks.push('No authorization was issued, no file was written and no network request or mutation was performed.');
    printPlan();
    printReport();
    return;
  }

  if (!checkEnv && !write) {
    report.failures.push('Use --dry-run, --check-env or --write.');
    report.status = 'blocked';
    printReport();
    process.exitCode = 1;
    return;
  }

  const input = collect();
  if (write && process.env[ENV.writeAuthorization] !== '1') {
    report.failures.push(`${ENV.writeAuthorization}=1 is required for --write.`);
  }
  if (report.failures.length) {
    report.status = 'blocked_by_environment';
    printReport();
    process.exitCode = 1;
    return;
  }

  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + input.ttlMinutes * 60_000);
  const envelope = buildAuthorizationEnvelope({
    authorizationId: input.authorizationId,
    authorizationAck: AUTHORIZATION_ACK,
    issuedAt: issuedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    runId: input.runId,
    targetMarker: input.targetMarker,
    expected: input.expected
  });
  const source = `${JSON.stringify(envelope, null, 2)}\n`;
  const digest = sha256(source);

  if (checkEnv) {
    report.status = 'environment_ready_to_issue_authorization';
    report.checks.push('Authorization input is valid, but no envelope was written.');
    report.authorization = { authorizationId: input.authorizationId, expiresAt: envelope.expiresAt, digestPreview: `${digest.slice(0, 12)}…` };
    printReport();
    return;
  }

  if (fs.existsSync(input.outputPath)) throw new Error('Authorization output already exists; refusing to overwrite it.');
  fs.mkdirSync(path.dirname(input.outputPath), { recursive: true });
  fs.writeFileSync(input.outputPath, source, { encoding: 'utf8', mode: 0o600, flag: 'wx' });

  validateAuthorizationEnvelope({
    root,
    manifestPath: input.outputPath,
    manifestDigest: digest,
    expected: {
      ...input.expected,
      runId: input.runId,
      targetMarker: input.targetMarker
    },
    now: issuedAt
  });

  report.envelopeWritten = true;
  report.status = 'authorization_envelope_written_and_verified';
  report.authorization = {
    authorizationId: input.authorizationId,
    expiresAt: envelope.expiresAt,
    sha256: digest,
    outputOutsideRepository: true
  };
  report.checks.push('Envelope was written with restrictive permissions where supported and verified against all bound resources and targets.');
  printReport();
}

function printPlan() {
  console.log('ORD-A06 authorization envelope plan:');
  console.log('1. Require an explicit human authorization decision and the existing executor acknowledgement.');
  console.log('2. Bind one short-lived authorization to the runId, staging marker, two accounts, one service and three target URLs using SHA-256.');
  console.log('3. Write the envelope only to an absolute path outside the repository.');
  console.log('4. Refuse overwrite, production scope, more than one order, missing cleanup or TTL longer than two hours.');
  console.log('5. Pass the file path and SHA-256 digest to the fail-closed Playwright executor.');
}

function printReport() {
  console.log(`ORD-A06 authorization envelope status: ${report.status}`);
  console.log(`- mode: ${report.mode}`);
  console.log(`- performsNetworkRequest: ${report.performsNetworkRequest}`);
  console.log(`- performsMutation: ${report.performsMutation}`);
  console.log(`- envelopeWritten: ${report.envelopeWritten}`);
  if (report.authorization) console.log(`- authorization: ${JSON.stringify(report.authorization)}`);
  report.checks.forEach((item) => console.log(`- passed: ${item}`));
  report.failures.forEach((item) => console.error(`- failed: ${item}`));
}
