#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

const runtimeConfig = read('assets/js/core/runtime-config.js');
const boundary = read('assets/js/services/repository-boundary.js');
const apiProvider = read('assets/js/services/api-repository-provider.js');
const mockProvider = read('assets/js/services/mock-repository-provider.js');
const adapterDoc = read('docs/API-ADAPTER-CONTRACT.md');

const requiredRuntimeSnippets = [
  "dataProvider: resolveDataProvider(windowConfig)",
  "apiBaseUrl: resolveApiBaseUrl(windowConfig)",
  "enableNetworkRequests",
  "dokeDataProvider",
  "dokeApiBaseUrl"
];

for (const snippet of requiredRuntimeSnippets) {
  if (!runtimeConfig.includes(snippet)) failures.push(`runtime-config missing snippet: ${snippet}`);
}

const requiredBoundarySnippets = [
  "activeProviderName = 'mock'",
  "requestedProviderName",
  "getProviderBlockReason",
  "apiBaseUrl is not configured",
  "enableNetworkRequests flag is disabled",
  "getDataProviderStatus",
  "configureProvider",
  "data-doke-data-provider"
];

for (const snippet of requiredBoundarySnippets) {
  if (!boundary.includes(snippet)) failures.push(`repository-boundary missing snippet: ${snippet}`);
}

const requiredProviderSnippets = [
  "createRuntimeApiClient",
  "API provider blocked: apiBaseUrl is not configured",
  "API provider blocked: enableNetworkRequests is disabled",
  "window.fetch(baseUrl + path"
];

for (const snippet of requiredProviderSnippets) {
  if (!apiProvider.includes(snippet)) failures.push(`api provider missing snippet: ${snippet}`);
}

for (const method of ['create: create', 'update: update', 'remove: remove', 'action: action']) {
  if (!mockProvider.includes(method)) failures.push(`mock provider missing method contract: ${method}`);
}

for (const snippet of ['Provider padrão', 'Ativação controlada de API', 'page/controller → service → repositoryBoundary → provider mock/api']) {
  if (!adapterDoc.includes(snippet)) failures.push(`API adapter doc missing snippet: ${snippet}`);
}

if (failures.length) {
  console.error('Data provider flag contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Data provider flag contract audit passed.');
console.log('Provider default: mock');
console.log('API readiness requires apiBaseUrl and enableNetworkRequests.');
