'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const repositorySource = fs.readFileSync(path.join(root, 'assets/js/repositories/analytics-repository.js'), 'utf8');

const checks = [];
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });

function executeRepository(config) {
  let invokeCount = 0;
  const storage = new Map();
  const sandbox = {
    DOKE_SUPABASE_CONFIG: config,
    Doke: { repositories: {} },
    DokeSupabase: {
      getClient: () => ({
        functions: {
          invoke: () => {
            invokeCount += 1;
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
