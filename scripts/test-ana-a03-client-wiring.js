'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const repositorySource = fs.readFileSync(path.join(root, 'assets/js/repositories/analytics-repository.js'), 'utf8');

const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });

function executeRepository(config, invokeHandler) {
  let invokeCount = 0;
  const storage = new Map();
  const sandbox = {
    DOKE_SUPABASE_CONFIG: config,
    Doke: { repositories: {} },
    DokeSupabase: {
      getClient: () => ({
        functions: {
          invoke: (functionName, options) => {
            invokeCount += 1;
            if (typeof invokeHandler === 'function') return Promise.resolve(invokeHandler(functionName, options, invokeCount));
            return Promise.resolve({ data: {} });
          }
        }
      })
    },
    sessionStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: (key) => storage.delete(key)
    },
    crypto: { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    console
  };
  sandbox.window = sandbox;
  new Function('window', repositorySource)(sandbox);
  return {
    repository: sandbox.Doke.repositories.analytics,
    getInvokeCount: () => invokeCount
  };
}

(async () => {
  const disabled = executeRepository({
    analyticsEnabled: false,
    analyticsTransport: 'edge-v1',
    analyticsEdgeFunction: 'analytics-behavior-v1'
  });
  check('disabled reports false', disabled.repository.enabled() === false);
  const disabledResult = await disabled.repository.trackServiceDetail('22222222-2222-4222-8222-222222222222', 'direct');
  check('disabled returns skipped', disabledResult && disabledResult.skipped === true);
  check('disabled performs zero network invocations', disabled.getInvokeCount() === 0);

  const wrongTransport = executeRepository({
    analyticsEnabled: true,
    analyticsTransport: 'rpc-v1',
    analyticsEdgeFunction: 'analytics-behavior-v1'
  });
  check('wrong transport reports false', wrongTransport.repository.enabled() === false);
  await wrongTransport.repository.trackBudgetCta('22222222-2222-4222-8222-222222222222');
  check('wrong transport performs zero network invocations', wrongTransport.getInvokeCount() === 0);

  const missingProof = executeRepository({
    analyticsEnabled: true,
    analyticsTransport: 'edge-v1',
    analyticsEdgeFunction: 'analytics-behavior-v1'
  });
  const missingProofResult = await missingProof.repository.trackSearchImpression({});
  check('missing exposure proof skips', missingProofResult && missingProofResult.skipped === true);
  check('missing exposure proof performs zero network invocations', missingProof.getInvokeCount() === 0);

  const quoteBodies = [];
  let quoteSessionCount = 0;
  let quoteTrackCount = 0;
  const rotatingQuote = executeRepository({
    analyticsEnabled: true,
    analyticsTransport: 'edge-v1',
    analyticsEdgeFunction: 'analytics-behavior-v1'
  }, (_functionName, options) => {
    const body = options && options.body || {};
    if (body.action === 'session') {
      return { data: {
        analyticsSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sessionToken: 'session-token',
        expiresAt: '2099-01-01T00:00:00Z'
      } };
    }
    if (body.action === 'quote_session') {
      quoteSessionCount += 1;
      return { data: {
        quoteSessionId: quoteSessionCount === 1
          ? 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
          : 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        quoteSessionToken: quoteSessionCount === 1 ? 'quote-token-old' : 'quote-token-new',
        expiresAt: '2099-01-01T00:00:00Z'
      } };
    }
    if (body.action === 'track') {
      quoteTrackCount += 1;
      quoteBodies.push(body);
      if (quoteTrackCount === 1) {
        return { error: { context: {
          clone() { return this; },
          json() { return Promise.resolve({ error: 'DOKE_ANALYTICS_QUOTE_SESSION_EXPIRED' }); }
        } } };
      }
      return { data: { eventId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' } };
    }
    return { data: {} };
  });
  const rotated = await rotatingQuote.repository.trackQuoteStarted('22222222-2222-4222-8222-222222222222', {
    stepIndex: 0, questionCount: 3, answeredQuestionCount: 0
  });
  check('expired quote session retries successfully', rotated && rotated.eventId === 'dddddddd-dddd-4ddd-8ddd-dddddddddddd');
  check('expired quote session is rotated once', quoteSessionCount === 2 && quoteTrackCount === 2);
  check('quote retry preserves client event id', quoteBodies.length === 2 && quoteBodies[0].clientEventId === quoteBodies[1].clientEventId);
  check('quote retry uses fresh token', quoteBodies.length === 2 && quoteBodies[0].quoteSessionToken === 'quote-token-old' && quoteBodies[1].quoteSessionToken === 'quote-token-new');

  const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
  console.log(JSON.stringify({
    contractId: 'ana-a03-client-wiring-runtime-v1',
    total: checks.length,
    passed: checks.length - failedChecks.length,
    failed: failedChecks.length,
    status: failedChecks.length ? 'failed' : 'passed',
    failedChecks
  }, null, 2));
  if (failedChecks.length) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
