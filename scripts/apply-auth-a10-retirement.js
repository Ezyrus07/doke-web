#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function write(file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith('\n') ? content : content + '\n', 'utf8');
}

function replaceOnce(content, search, replacement, label) {
  const first = content.indexOf(search);
  if (first < 0) throw new Error('Missing exact block: ' + label);
  if (content.indexOf(search, first + search.length) >= 0) throw new Error('Duplicate exact block: ' + label);
  return content.slice(0, first) + replacement + content.slice(first + search.length);
}

function replaceRegexOnce(content, pattern, replacement, label) {
  const matches = content.match(pattern);
  if (!matches) throw new Error('Missing regex block: ' + label);
  return content.replace(pattern, replacement);
}

function replaceRegexCount(content, pattern, replacement, expected, label) {
  const matches = content.match(pattern) || [];
  if (matches.length !== expected) throw new Error(label + ' expected ' + expected + ' matches, found ' + matches.length);
  return content.replace(pattern, replacement);
}

const authServicePath = 'assets/js/services/auth-service.js';
let authService = read(authServicePath);

authService = replaceRegexOnce(
  authService,
  /  const AUTH_PROVIDER_VALUES = Object\.freeze\(\{ mock: 'mock', api: 'api', supabase: 'supabase' \}\);\n  const AUTH_ENDPOINTS = Object\.freeze\(\{[\s\S]*?\n  \}\);\n/,
  "  const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' });\n",
  'auth provider values and legacy endpoints'
);

authService = replaceRegexOnce(
  authService,
  /  const CANARY_REQUIRED_ENDPOINTS = Object\.freeze\(\{[\s\S]*?\n  \}\);\n  let apiAccessToken = '';\n/,
  '',
  'legacy canary endpoints and volatile API token'
);

authService = replaceRegexOnce(
  authService,
  /\n  const readAccessTokenFromPayload = \(payload\) => \{[\s\S]*?\n  const getSupabaseAccessToken =/,
  '\n  const getSupabaseAccessToken =',
  'legacy API token helpers'
);

authService = replaceRegexOnce(
  authService,
  /\n  const normalizeBaseUrl = \(value\) =>[\s\S]*?\n  const toPublicUser =/,
  '\n  const toPublicUser =',
  'browser provider status and canary facade'
);

authService = replaceRegexOnce(
  authService,
  /\n  const mergeUserWithProfile = \(user, profile\) => \{[\s\S]*?\n  const buildSession =/,
  '\n  const buildSession =',
  'legacy API identity merge helper'
);

authService = replaceRegexOnce(
  authService,
  /\n  const getSessionToken = async \(\) => getAccessToken\(\);[\s\S]*?\n  const reconcileSupabaseSession =/,
  '\n  const reconcileSupabaseSession =',
  'unreachable browser auth API adapter'
);

authService = replaceRegexCount(
  authService,
  /\n    if \(canUseApiAuth\(\)\) \{[\s\S]*?\n    \}\n\n    const repo = getUsersRepository\(\);/g,
  '\n\n    const repo = getUsersRepository();',
  2,
  'profile compatibility API branches'
);

authService = replaceOnce(authService, '    clearApiAccessToken();\n', '', 'logout API token cleanup');
authService = replaceOnce(
  authService,
  '    getActiveAuthProvider: () => getAuthProviderStatus().activeProvider,\n    getAuthProviderStatus,\n    getAuthIdentityCanaryStatus,\n',
  '    getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase,\n',
  'public provider status exports'
);
authService = replaceOnce(authService, '    refreshApiSession,\n', '', 'refreshApiSession export');
authService = replaceOnce(authService, '    refreshCurrentIdentity: fetchApiCurrentIdentity,\n', '', 'refreshCurrentIdentity export');
write(authServicePath, authService);

const ownerProfilePath = 'assets/js/pages/owner-profile-experience.js';
let ownerProfile = read(ownerProfilePath);
const refreshApiMatches = ownerProfile.match(/refreshApiSession/g) || [];
if (refreshApiMatches.length !== 2) throw new Error('owner-profile refreshApiSession expected 2 matches, found ' + refreshApiMatches.length);
ownerProfile = ownerProfile.replace(/refreshApiSession/g, 'refreshSession');
write(ownerProfilePath, ownerProfile);

const realAuditPath = 'scripts/audit-auth-real-contract.js';
let realAudit = read(realAuditPath);
realAudit = replaceOnce(
  realAudit,
  "const providerRuntimeTest = read('tests/auth/test-auth-provider-authority-runtime.js');\n",
  "const providerRuntimeTest = read('tests/auth/test-auth-provider-authority-runtime.js');\nconst deadAdapterRuntimeTest = read('tests/auth/test-auth-dead-adapter-retirement-runtime.js');\n",
  'dead adapter test import'
);
realAudit = replaceRegexOnce(
  realAudit,
  /expect\(authService, 'auth-service\.js', \[[\s\S]*?\n\]\);\nforbid\(authService, 'auth-service\.js', \[[\s\S]*?\n\]\);/,
  `expect(authService, 'auth-service.js', [
  "const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })",
  'getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase',
  'signInWithPassword',
  'signUp',
  'onAuthStateChange',
  'getAccessToken',
  'refreshSupabaseSession',
  'O login local/demo está desativado'
]);
forbid(authService, 'auth-service.js', [
  'AUTH_ENDPOINTS',
  'CANARY_REQUIRED_ENDPOINTS',
  'apiAccessToken',
  'readAccessTokenFromPayload',
  'setApiAccessTokenFromPayload',
  'clearApiAccessToken',
  'normalizeApiErrorMessage',
  'apiRequest',
  'normalizeApiSessionPayload',
  'setSessionFromApiPayload',
  'fetchApiCurrentIdentity',
  'apiLogin',
  'apiRegister',
  'refreshApiSession',
  'refreshCurrentIdentity',
  'getAuthProviderStatus',
  'getAuthIdentityCanaryStatus',
  'canUseApiAuth',
  'AUTH_PROVIDER_VALUES.api',
  'AUTH_PROVIDER_VALUES.mock',
  "'/auth/login'",
  "'/auth/register'",
  "'/auth/logout'",
  "'/auth/session'"
]);`,
  'real auth service contract'
);
realAudit = replaceOnce(
  realAudit,
  "expect(providerRuntimeTest, 'AUTH-A09 runtime test', [\n  'Browser-selected legacy auth API was called',\n  \"assert.strictEqual(production.authProvider, 'supabase')\",\n  \"assert.strictEqual(fetchCalls, 0\"\n]);\n",
  "expect(providerRuntimeTest, 'AUTH-A09 runtime test', [\n  'Browser-selected legacy auth API was called',\n  \"assert.strictEqual(production.authProvider, 'supabase')\",\n  \"assert.strictEqual(fetchCalls, 0\"\n]);\nexpect(deadAdapterRuntimeTest, 'AUTH-A10 dead adapter runtime test', [\n  'getActiveAuthProvider',\n  'refreshApiSession',\n  'Browser auth adapter retirement runtime test passed.'\n]);\n",
  'AUTH-A10 test expectation'
);
realAudit = realAudit.replace(
  "console.log('Browser-controlled mock/API provider selection is retired.');",
  "console.log('Browser-controlled provider selection and the unreachable /auth/* adapter are retired.');"
);
write(realAuditPath, realAudit);

const canaryAuditPath = 'scripts/audit-auth-identity-canary-contract.js';
let canaryAudit = read(canaryAuditPath);
canaryAudit = replaceRegexOnce(
  canaryAudit,
  /expect\(authService, 'auth-service', \[[\s\S]*?\n\]\);\nforbid\(authService, 'auth-service', \[[\s\S]*?\n\]\);/,
  `expect(authService, 'auth-service', [
  "const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })",
  'getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase',
  'refreshSupabaseSession'
]);
forbid(authService, 'auth-service', [
  'AUTH_ENDPOINTS',
  'CANARY_REQUIRED_ENDPOINTS',
  'apiAccessToken',
  'apiRequest',
  'refreshApiSession',
  'refreshCurrentIdentity',
  'getAuthProviderStatus',
  'getAuthIdentityCanaryStatus',
  'canUseApiAuth',
  "'/auth/login'",
  "'/auth/register'",
  "'/auth/logout'",
  "'/auth/session'"
]);`,
  'CLI-only canary browser boundary'
);
canaryAudit = canaryAudit.replace(
  "console.log('Browser provider mutation is retired; legacy API verification is CLI-only.');",
  "console.log('Browser provider mutation and browser /auth/* adapter code are retired; legacy verification is CLI-only.');"
);
write(canaryAuditPath, canaryAudit);

const canonicalRuntimePath = 'scripts/test-auth-canonical-session-runtime.js';
let canonicalRuntime = read(canonicalRuntimePath);
canonicalRuntime = replaceOnce(
  canonicalRuntime,
  "  execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-provider-authority-runtime.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n",
  "  execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-provider-authority-runtime.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n  execFileSync(process.execPath, [path.join(root, 'tests/auth/test-auth-dead-adapter-retirement-runtime.js')], {\n    cwd: root,\n    stdio: 'inherit'\n  });\n\n",
  'canonical AUTH-A10 runtime invocation'
);
canonicalRuntime = replaceOnce(
  canonicalRuntime,
  "  console.log('- browser-controlled provider selection cannot replace Supabase');\n",
  "  console.log('- browser-controlled provider selection cannot replace Supabase');\n  console.log('- unreachable browser /auth/* adapter code is absent from the public auth facade');\n",
  'canonical AUTH-A10 log'
);
write(canonicalRuntimePath, canonicalRuntime);

const deadAdapterTest = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = process.cwd();
const authSource = fs.readFileSync(path.join(root, 'assets/js/services/auth-service.js'), 'utf8');
const ownerProfileSource = fs.readFileSync(path.join(root, 'assets/js/pages/owner-profile-experience.js'), 'utf8');

const forbiddenSource = [
  'AUTH_ENDPOINTS',
  'CANARY_REQUIRED_ENDPOINTS',
  'apiAccessToken',
  'readAccessTokenFromPayload',
  'setApiAccessTokenFromPayload',
  'clearApiAccessToken',
  'normalizeApiErrorMessage',
  'apiRequest',
  'normalizeApiSessionPayload',
  'setSessionFromApiPayload',
  'fetchApiCurrentIdentity',
  'apiLogin',
  'apiRegister',
  'refreshApiSession',
  'refreshCurrentIdentity',
  'getAuthProviderStatus',
  'getAuthIdentityCanaryStatus',
  'canUseApiAuth',
  "'/auth/login'",
  "'/auth/register'",
  "'/auth/logout'",
  "'/auth/session'"
];

for (const snippet of forbiddenSource) {
  assert(!authSource.includes(snippet), 'auth-service still contains retired browser adapter snippet: ' + snippet);
}
assert(authSource.includes("const AUTH_PROVIDER_VALUES = Object.freeze({ supabase: 'supabase' })"));
assert(authSource.includes('getActiveAuthProvider: () => AUTH_PROVIDER_VALUES.supabase'));
assert(ownerProfileSource.includes('auth.refreshSession({ silent: true })'));
assert(!ownerProfileSource.includes('refreshApiSession'));

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

const session = {
  getSession() { return null; },
  read() { return null; },
  getCurrentUser() { return null; },
  getUser() { return null; },
  hasRole() { return false; },
  subscribe() { return () => {}; },
  clear() {},
  write(value) { return value; },
  getAuthContext() { return Object.freeze({ authenticated: false, user: null, role: 'guest', permissions: [], provider: 'supabase' }); }
};
const document = {
  readyState: 'complete',
  documentElement: { dataset: {} },
  querySelectorAll() { return []; },
  addEventListener() {},
  dispatchEvent() { return true; }
};
const window = {
  document,
  Doke: { session },
  DokeAuth: { session, repositories: {} },
  DOKE_SUPABASE_CONFIG: { enabled: false },
  location: { pathname: '/index.html', search: '', hash: '', assign() {}, replace() {} },
  localStorage: { removeItem() {} },
  setTimeout(fn) { fn(); return 0; },
  clearTimeout() {},
  console
};
window.window = window;
const sandbox = { window, document, CustomEvent: CustomEventStub, URL, URLSearchParams, Promise, console, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout };
vm.createContext(sandbox);
vm.runInContext(authSource, sandbox, { filename: 'auth-service.js' });

assert.strictEqual(window.DokeAuth.getActiveAuthProvider(), 'supabase');
assert.strictEqual(typeof window.DokeAuth.refreshSession, 'function');
for (const retiredExport of ['refreshApiSession', 'refreshCurrentIdentity', 'getAuthProviderStatus', 'getAuthIdentityCanaryStatus']) {
  assert.strictEqual(Object.prototype.hasOwnProperty.call(window.DokeAuth, retiredExport), false, retiredExport + ' remains public');
  assert.strictEqual(Object.prototype.hasOwnProperty.call(window.DokeAuth.service, retiredExport), false, retiredExport + ' remains on service facade');
}

console.log('Browser auth adapter retirement runtime test passed.');
console.log('- Supabase remains the only browser authentication provider');
console.log('- the historical /auth/* adapter is absent from browser runtime');
console.log('- owner profile refresh uses the canonical provider session');
`;
write('tests/auth/test-auth-dead-adapter-retirement-runtime.js', deadAdapterTest);

const apiContractPath = 'docs/API-ADAPTER-CONTRACT.md';
let apiContract = read(apiContractPath);
apiContract = replaceRegexOnce(
  apiContract,
  /## Auth provider boundary[\s\S]*?\n## Sprint 12B — resources de usuários e perfis/,
  `## Auth authority boundary — current state

Autenticação não usa o repository provider genérico. Supabase Auth é a única autoridade ativa no navegador.

O adapter histórico que chamava \`/auth/login\`, \`/auth/register\`, \`/auth/session\` e \`/auth/logout\` foi removido de \`assets/js/services/auth-service.js\` no AUTH-A10. Esses endpoints permanecem apenas no runtime server-side e no diagnóstico CLI controlado; não são uma opção de provider selecionável pelo browser.

O contrato público preservado é:

- \`DokeAuth.getActiveAuthProvider() === 'supabase'\`;
- \`DokeAuth.refreshSession()\` para reconciliação canônica;
- \`DokeAuth.getAccessToken()\` resolvendo o token diretamente do Supabase;
- login, cadastro e logout usando o SDK Supabase.

Provider \`mock/api\` neste documento continua válido somente para dados de domínio atrás de \`repositoryBoundary\`, nunca para autenticação.

## Sprint 12B — resources de usuários e perfis`,
  'API adapter auth historical section'
);
write(apiContractPath, apiContract);

const activeContractsPath = 'docs/ACTIVE-CONTRACTS-INDEX.md';
let activeContracts = read(activeContractsPath);
activeContracts = replaceRegexOnce(
  activeContracts,
  /## Sprint 25 — auth\/identity canary[\s\S]*?\n## Sprint 27 active contract — Auth\/identity local network canary/,
  `## Sprints 25–26 — browser auth canary retired

O canário Auth/Identity de navegador foi aposentado. \`assets/js/core/runtime-config.js\` não aceita seleção de provider de autenticação, e \`assets/js/services/auth-service.js\` não contém adapter \`/auth/*\`, ativação, rollback ou status de canário.

Autoridades atuais:

- Supabase Auth: única autoridade de autenticação do navegador;
- \`scripts/validate-auth-identity-canary.js\`: diagnóstico CLI-only de endpoints históricos em alvo local/staging controlado;
- \`scripts/audit-auth-identity-canary-contract.js\`: garante que o diagnóstico CLI permaneça isolado do runtime do browser;
- \`tests/auth/test-auth-dead-adapter-retirement-runtime.js\`: impede a restauração do adapter no frontend.

Comandos CLI preservados:

\`\`\`bash
npm run audit:auth-identity-canary-contract
npm run validate:auth-identity-canary:dry-run
npm run validate:auth-identity-canary
\`\`\`

## Sprint 27 active contract — Auth/identity local network canary`,
  'ACTIVE-CONTRACTS browser canary sections'
);
write(activeContractsPath, activeContracts);

const authIntegrationPath = 'docs/AUTH-INTEGRATION-CONTRACT.md';
let authIntegration = read(authIntegrationPath);
const a10IntegrationSection = `

## AUTH-A10 — remoção física do adapter browser /auth/*

- \`assets/js/services/auth-service.js\` não contém endpoints, request helpers, token temporário ou branches do provider API histórico.
- \`DokeAuth.refreshApiSession\`, \`refreshCurrentIdentity\`, \`getAuthProviderStatus\` e \`getAuthIdentityCanaryStatus\` foram removidos da fachada pública porque não possuíam consumidores válidos após a migração.
- O único consumidor de página foi migrado para \`DokeAuth.refreshSession()\`.
- \`DokeAuth.getActiveAuthProvider()\` permanece como compatibilidade pública e retorna sempre \`supabase\`.
- O diagnóstico de \`/auth/*\` permanece exclusivamente em \`scripts/validate-auth-identity-canary.js\`; ele não é carregado pelo navegador.
- Nenhuma configuração, usuário ou sessão do Supabase foi alterada neste sublote.
`;
if (!authIntegration.includes('## AUTH-A10 — remoção física do adapter browser /auth/*')) authIntegration += a10IntegrationSection;
write(authIntegrationPath, authIntegration);

const canaryRunbookPath = 'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md';
let canaryRunbook = read(canaryRunbookPath);
const a10RunbookSection = `

## AUTH-A10 — isolamento físico do diagnóstico

O frontend não contém mais adapter para \`/auth/login\`, \`/auth/register\`, \`/auth/session\` ou \`/auth/logout\`. O validador CLI é o único proprietário desses endpoints para fins de diagnóstico local/staging.

Consequências operacionais:

- nenhuma query string, chave de storage ou API pública do browser ativa esse diagnóstico;
- o smoke CLI não publica token no snapshot da Doke;
- falha do diagnóstico não altera a autoridade Supabase do navegador;
- remover ou alterar o CLI exige preservar os gates de isolamento e não reintroduzir chamadas \`fetch\` em \`auth-service.js\`.
`;
if (!canaryRunbook.includes('## AUTH-A10 — isolamento físico do diagnóstico')) canaryRunbook += a10RunbookSection;
write(canaryRunbookPath, canaryRunbook);

write('docs/validation/AUTH-001-A10-DEAD-ADAPTER-RETIREMENT.md', `# AUTH-001 A10 — Dead browser adapter retirement

## Status

Implemented; pending canonical CI validation.

## Root cause

After AUTH-A09 fixed Supabase as the only browser authority, \`auth-service.js\` still contained unreachable \`/auth/*\` request code, API token helpers, provider status facades and a no-op \`refreshApiSession\` compatibility path.

## Decision

Delete the unreachable browser adapter rather than preserve dormant authority-shaped code. Keep only the standalone CLI diagnostic and the public methods that still have valid page consumers.

## Implementation

- removed browser endpoint constants and API request/session/token helpers;
- removed dead provider and canary status facades;
- removed \`refreshApiSession\` and \`refreshCurrentIdentity\` exports;
- migrated owner profile identity confirmation to \`refreshSession\`;
- preserved \`getActiveAuthProvider\` as a constant Supabase compatibility surface;
- preserved CLI-only Auth/Identity diagnostics;
- added deterministic source and runtime regression coverage;
- corrected active contracts that still described the retired browser canary.

## Boundaries

- no production or Supabase configuration changed;
- no account, credential, session, contact, profile or role changed;
- no SMTP, SMS or OAuth provider enabled;
- generic domain repository providers remain outside this sublot;
- PR #9 remains draft.
`);

write('docs/validation/AUTH-001-A10-DEAD-ADAPTER-RETIREMENT.json', JSON.stringify({
  domain: 'AUTH-001',
  sublot: 'AUTH-A10',
  status: 'implemented_pending_ci',
  authority: 'supabase',
  removedBrowserAdapter: true,
  cliDiagnosticPreserved: true,
  productionChanged: false,
  supabaseConfigurationChanged: false,
  usersChanged: false,
  blockersRemaining: ['MAIL-001', 'PAID-001']
}, null, 2));

console.log('AUTH-A10 codemod applied.');
