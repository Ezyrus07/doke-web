#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FUNCTION_NAME = 'search-public-services-v2';
const ALLOWED_ORIGIN = 'https://ezyrus07.github.io';
const DENIED_ORIGIN = 'https://attacker.invalid';
const REPORT_PATH = path.resolve('reports/generated/search-observability-staging-http-canary.json');
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const extractClientConfig = async () => {
  const source = await readFile('assets/js/core/supabase-config.js', 'utf8');
  const url = source.match(/\burl:\s*["']([^"']+)["']/)?.[1] || '';
  const anonKey = source.match(/\banonKey:\s*\n?\s*["']([^"']+)["']/)?.[1] || '';
  assert.match(url, /^https:\/\/[a-z0-9]+\.supabase\.co$/i, 'Staging Supabase URL is missing from client config.');
  assert.ok(anonKey.split('.').length === 3, 'Legacy anon JWT is missing from client config.');
  return { url: url.replace(/\/$/, ''), anonKey };
};

const responseSnapshot = async (response) => ({
  status: response.status,
  headers: Object.fromEntries([...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b))),
  body: (await response.text()).slice(0, 4_000),
});

const request = async (url, options) => {
  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        ...options,
        redirect: 'manual',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return responseSnapshot(response);
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS) throw error;
      await sleep(750 * attempt);
    }
  }
  throw lastError || new Error('Unknown network failure.');
};

const parsePayload = (snapshot) => {
  try {
    return JSON.parse(snapshot.body || '{}');
  } catch {
    return {};
  }
};

const requireSecurityHeaders = (snapshot, allowedOrigin = ALLOWED_ORIGIN) => {
  assert.ok(snapshot.headers['x-doke-request-id'], 'x-doke-request-id missing');
  assert.equal(snapshot.headers['x-content-type-options'], 'nosniff');
  assert.ok(snapshot.headers['cache-control']);
  if (allowedOrigin) assert.equal(snapshot.headers['access-control-allow-origin'], allowedOrigin);
};

const run = async () => {
  const { url, anonKey } = await extractClientConfig();
  const endpoint = `${url}/functions/v1/${FUNCTION_NAME}`;
  const results = [];

  const execute = async (caseName, operation) => {
    const startedAt = new Date().toISOString();
    try {
      const snapshot = await operation();
      results.push({ caseName, passed: true, startedAt, snapshot });
      process.stdout.write(`PASS ${caseName} :: ${snapshot.status}\n`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ caseName, passed: false, startedAt, error: message });
      process.stderr.write(`FAIL ${caseName} :: ${message}\n`);
    }
  };

  await execute('allowed-preflight', async () => {
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
    requireSecurityHeaders(snapshot);
    return snapshot;
  });

  await execute('denied-preflight', async () => {
    const snapshot = await request(endpoint, {
      method: 'OPTIONS',
      headers: {
        apikey: anonKey,
        origin: DENIED_ORIGIN,
        'access-control-request-method': 'POST',
      },
    });
    assert.equal(snapshot.status, 403);
    assert.equal(parsePayload(snapshot).error, 'DOKE_ORIGIN_NOT_ALLOWED');
    requireSecurityHeaders(snapshot, '');
    return snapshot;
  });

  await execute('missing-jwt', async () => {
    const snapshot = await request(endpoint, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        origin: ALLOWED_ORIGIN,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ pageSize: 1 }),
    });
    assert.equal(snapshot.status, 401);
    return snapshot;
  });

  const authorizedHeaders = {
    apikey: anonKey,
    authorization: `Bearer ${anonKey}`,
    origin: ALLOWED_ORIGIN,
    'content-type': 'application/json',
  };

  await execute('valid-anon-search', async () => {
    const snapshot = await request(endpoint, {
      method: 'POST',
      headers: authorizedHeaders,
      body: JSON.stringify({ pageSize: 1 }),
    });
    assert.equal(snapshot.status, 200);
    requireSecurityHeaders(snapshot);
    const payload = parsePayload(snapshot);
    assert.equal(payload.authority, 'public.search_public_services_v2');
    assert.equal(payload.contractVersion, '2.0.0');
    assert.equal(payload.ranking?.version, 'search-rank-v0');
    assert.ok(Array.isArray(payload.items));
    return snapshot;
  });

  await execute('unknown-field', async () => {
    const snapshot = await request(endpoint, {
      method: 'POST',
      headers: authorizedHeaders,
      body: JSON.stringify({ pageSize: 1, rankScore: 999 }),
    });
    assert.equal(snapshot.status, 400);
    requireSecurityHeaders(snapshot);
    assert.equal(parsePayload(snapshot).error, 'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD');
    return snapshot;
  });

  await execute('invalid-cursor', async () => {
    const snapshot = await request(endpoint, {
      method: 'POST',
      headers: authorizedHeaders,
      body: JSON.stringify({ pageSize: 1, cursor: 'tampered-cursor' }),
    });
    assert.equal(snapshot.status, 400);
    requireSecurityHeaders(snapshot);
    assert.match(String(parsePayload(snapshot).error || ''), /^DOKE_SEARCH_CURSOR_/);
    return snapshot;
  });

  const failures = results.filter((item) => !item.passed);
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    gitSha: process.env.GITHUB_SHA || null,
    projectRef: new URL(url).hostname.split('.')[0],
    functionName: FUNCTION_NAME,
    allowedOrigin: ALLOWED_ORIGIN,
    totalCases: results.length,
    passedCases: results.length - failures.length,
    failedCases: failures.length,
    results,
    passed: failures.length === 0,
  };

  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (failures.length) throw new Error(`${failures.length} SEARCH-A09 HTTP canary cases failed.`);
  process.stdout.write(`SEARCH-A09 staging HTTP canary passed: ${results.length} cases.\n`);
};

await run();
