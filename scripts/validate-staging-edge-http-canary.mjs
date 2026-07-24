import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FUNCTIONS = Object.freeze([
  'self-service-operations',
  'financial-operations',
  'professional-verification-operations',
  'service-moderation-operations',
  'staging-finance-sandbox',
  'order-event-operations',
  'quote-template-ai',
]);

const ALLOWED_ORIGIN = 'https://ezyrus07.github.io';
const DENIED_ORIGIN = 'https://attacker.invalid';
const REPORT_PATH = path.resolve('reports/generated/staging-edge-http-canary.json');
const REQUEST_TIMEOUT_MS = 25_000;

const extractClientConfig = async () => {
  const source = await readFile('assets/js/core/supabase-config.js', 'utf8');
  const url = source.match(/\burl:\s*["']([^"']+)["']/)?.[1] || '';
  const anonKey = source.match(/\banonKey:\s*\n?\s*["']([^"']+)["']/)?.[1] || '';
  assert.match(url, /^https:\/\/[a-z0-9]+\.supabase\.co$/i, 'Staging Supabase URL is missing from client config.');
  assert.ok(anonKey.split('.').length === 3, 'Legacy anon JWT is missing from client config.');
  return { url: url.replace(/\/$/, ''), anonKey };
};

const responseSnapshot = async (response) => {
  const body = (await response.text()).slice(0, 1_000);
  return {
    status: response.status,
    headers: Object.fromEntries([...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b))),
    body,
  };
};

const request = async (url, options) => {
  const response = await fetch(url, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  return responseSnapshot(response);
};

const requireHeader = (snapshot, name, expectedValue = null) => {
  const value = snapshot.headers[name.toLowerCase()] || '';
  assert.ok(value, `Missing response header: ${name}`);
  if (expectedValue !== null) assert.equal(value, expectedValue, `${name} mismatch`);
  return value;
};

const requireFunctionSecurityHeaders = (snapshot, origin = ALLOWED_ORIGIN) => {
  requireHeader(snapshot, 'x-doke-request-id');
  requireHeader(snapshot, 'cache-control');
  requireHeader(snapshot, 'x-content-type-options', 'nosniff');
  if (origin) requireHeader(snapshot, 'access-control-allow-origin', origin);
};

const parseError = (snapshot) => {
  try {
    const payload = JSON.parse(snapshot.body || '{}');
    return String(payload.error || '');
  } catch {
    return '';
  }
};

const executeCase = async (results, functionName, caseName, operation) => {
  const startedAt = new Date().toISOString();
  try {
    const snapshot = await operation();
    results.push({ functionName, caseName, passed: true, startedAt, snapshot });
    process.stdout.write(`PASS ${functionName} :: ${caseName} :: ${snapshot.status}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({ functionName, caseName, passed: false, startedAt, error: message });
    process.stderr.write(`FAIL ${functionName} :: ${caseName} :: ${message}\n`);
  }
};

const run = async () => {
  const { url: supabaseUrl, anonKey } = await extractClientConfig();
  const results = [];
  const oversizedBody = JSON.stringify({ payload: 'x'.repeat(1_100_000) });

  for (const functionName of FUNCTIONS) {
    const endpoint = `${supabaseUrl}/functions/v1/${functionName}`;

    await executeCase(results, functionName, 'allowed-preflight', async () => {
      const snapshot = await request(endpoint, {
        method: 'OPTIONS',
        headers: {
          apikey: anonKey,
          origin: ALLOWED_ORIGIN,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, apikey, content-type, x-doke-request-id',
        },
      });
      assert.equal(snapshot.status, 204);
      requireFunctionSecurityHeaders(snapshot);
      assert.match(requireHeader(snapshot, 'access-control-allow-methods'), /POST/);
      assert.match(requireHeader(snapshot, 'vary'), /Origin/i);
      return snapshot;
    });

    await executeCase(results, functionName, 'denied-preflight', async () => {
      const snapshot = await request(endpoint, {
        method: 'OPTIONS',
        headers: {
          apikey: anonKey,
          origin: DENIED_ORIGIN,
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'authorization, apikey, content-type',
        },
      });
      assert.equal(snapshot.status, 403);
      assert.equal(parseError(snapshot), 'DOKE_ORIGIN_NOT_ALLOWED');
      assert.equal(snapshot.headers['access-control-allow-origin'] || '', '');
      requireFunctionSecurityHeaders(snapshot, '');
      return snapshot;
    });

    await executeCase(results, functionName, 'missing-jwt', async () => {
      const snapshot = await request(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          origin: ALLOWED_ORIGIN,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'canary' }),
      });
      assert.equal(snapshot.status, 401);
      return snapshot;
    });

    await executeCase(results, functionName, 'anon-token-has-no-user', async () => {
      const snapshot = await request(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          origin: ALLOWED_ORIGIN,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ action: 'canary' }),
      });
      assert.equal(snapshot.status, 401);
      requireFunctionSecurityHeaders(snapshot);
      return snapshot;
    });

    await executeCase(results, functionName, 'invalid-json', async () => {
      const snapshot = await request(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          origin: ALLOWED_ORIGIN,
          'content-type': 'application/json',
        },
        body: '{',
      });
      assert.equal(snapshot.status, 400);
      assert.equal(parseError(snapshot), 'DOKE_INVALID_JSON');
      requireFunctionSecurityHeaders(snapshot);
      return snapshot;
    });

    await executeCase(results, functionName, 'unsupported-content-type', async () => {
      const snapshot = await request(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          origin: ALLOWED_ORIGIN,
          'content-type': 'text/plain',
        },
        body: '{}',
      });
      assert.equal(snapshot.status, 415);
      assert.equal(parseError(snapshot), 'DOKE_JSON_CONTENT_TYPE_REQUIRED');
      requireFunctionSecurityHeaders(snapshot);
      return snapshot;
    });

    await executeCase(results, functionName, 'oversized-payload', async () => {
      const snapshot = await request(endpoint, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          authorization: `Bearer ${anonKey}`,
          origin: ALLOWED_ORIGIN,
          'content-type': 'application/json',
        },
        body: oversizedBody,
      });
      assert.equal(snapshot.status, 413);
      requireFunctionSecurityHeaders(snapshot);
      return snapshot;
    });
  }

  const failures = results.filter((item) => !item.passed);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || null,
    projectRef: new URL(supabaseUrl).hostname.split('.')[0],
    allowedOrigin: ALLOWED_ORIGIN,
    functions: FUNCTIONS,
    totalCases: results.length,
    passedCases: results.length - failures.length,
    failedCases: failures.length,
    rateLimitEvidence: {
      source: 'supabase/tests/014_edge_function_abuse_guard_validation.sql',
      note: 'The durable threshold, denial, remaining count and retry metadata are validated transactionally in staging SQL. This public HTTP canary intentionally does not create or use a privileged staging user.',
    },
    results,
    passed: failures.length === 0,
  };

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (failures.length) {
    throw new Error(`${failures.length} of ${results.length} staging HTTP canary cases failed.`);
  }
  process.stdout.write(`Staging Edge HTTP canary passed: ${results.length} cases across ${FUNCTIONS.length} functions.\n`);
};

await run();
