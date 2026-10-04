'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const runtimeSource = fs.readFileSync('assets/js/core/runtime-config.js', 'utf8');
const boundarySource = fs.readFileSync('assets/js/services/repository-boundary.js', 'utf8');

function runtimeFor({ hostname, search = '', storageEntries = [], windowConfig = undefined }) {
  const storage = new Map(storageEntries);
  const window = {
    location: { hostname, search },
    localStorage: { getItem(key) { return storage.has(key) ? storage.get(key) : null; } },
    DOKE_RUNTIME_CONFIG: windowConfig
  };
  window.window = window;
  vm.runInNewContext(runtimeSource, { window, URLSearchParams, Object, String, Boolean }, { filename: 'runtime-config.js' });
  return window.Doke.runtimeConfig;
}

const preview = runtimeFor({
  hostname: 'doke-web-git-codex-kontrat-staging-authority-policy-20261004-doke1.vercel.app',
  search: '?dokeDataProvider=mock&dokeOrdersWriteCanary=1&dokeOrdersProvider=mock',
  storageEntries: [
    ['doke.dataProvider', 'mock'],
    ['doke.canary.ordersWrite.enabled', 'true'],
    ['doke.ordersProvider', 'mock']
  ]
});
assert.strictEqual(preview.environment, 'staging');
assert.strictEqual(preview.remoteAuthorityRequired, true);
assert.strictEqual(preview.mockAuthorityAllowed, false);
assert.strictEqual(preview.dataProvider, 'blocked');
assert.strictEqual(preview.ordersProvider, 'supabase-read');
assert.strictEqual(preview.ordersReadProvider, 'supabase-read');
assert.strictEqual(preview.ordersWriteCanary, false);

const stagingApi = runtimeFor({
  hostname: 'preview.doke.example',
  windowConfig: { environment: 'staging', dataProvider: 'api', apiBaseUrl: 'https://api.staging.doke.example', enableNetworkRequests: true }
});
assert.strictEqual(stagingApi.dataProvider, 'api');
assert.strictEqual(stagingApi.flags.enableNetworkRequests, true);

const local = runtimeFor({
  hostname: '127.0.0.1',
  search: '?dokeDataProvider=mock&dokeOrdersWriteCanary=1'
});
assert.strictEqual(local.environment, 'local');
assert.strictEqual(local.dataProvider, 'mock');
assert.strictEqual(local.ordersWriteCanary, true);

const production = runtimeFor({ hostname: 'doke-web.vercel.app' });
assert.strictEqual(production.environment, 'production');
assert.strictEqual(production.remoteAuthorityRequired, false);
assert.strictEqual(production.dataProvider, 'mock');

const attributes = new Map();
const boundaryWindow = {
  Doke: { runtimeConfig: preview },
  document: { documentElement: { setAttribute(name, value) { attributes.set(name, value); } } },
  console: { warn() {} }
};
boundaryWindow.window = boundaryWindow;
vm.runInNewContext(boundarySource, { window: boundaryWindow, document: boundaryWindow.document, Object, String, Boolean, Error, Promise }, { filename: 'repository-boundary.js' });

const boundary = boundaryWindow.Doke.repositoryBoundary;
assert.strictEqual(boundary.getActiveProviderName(), 'blocked');
assert.strictEqual(boundary.getDataProviderStatus().activeProvider, 'blocked');
assert.strictEqual(attributes.get('data-doke-data-provider'), 'blocked');
assert.throws(() => boundary.getProvider(), (error) => error && error.code === 'DOKE_REMOTE_AUTHORITY_UNAVAILABLE');

console.log('Staging frontend authority policy passed.');
