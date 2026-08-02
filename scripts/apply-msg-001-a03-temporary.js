#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function read(file) { return fs.readFileSync(file, 'utf8'); }
function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}
function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}
function replaceBlock(source, start, end, replacement, label) {
  const a = source.indexOf(start);
  const b = source.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`${label}: block markers missing`);
  if (source.indexOf(start, a + start.length) !== -1) throw new Error(`${label}: duplicate start marker`);
  return source.slice(0, a) + replacement + '\n\n' + source.slice(b);
}
function pushUnique(items, value) { if (!items.includes(value)) items.push(value); }

const observedAt = '2026-08-02T16:59:00-03:00';

// Repository: reads remain remote-only; every authenticated mutation is blocked here.
const repoPath = 'assets/js/repositories/messages-repository.js';
let repo = read(repoPath);
repo = replaceOnce(
  repo,
  "\n\n  function setProviderState(provider) {",
  `

  function createDirectBrowserDmlError(operation) {
    var error = new Error('Comando de mensagens exige o boundary server-owned: ' + normalizeText(operation || 'unknown') + '.');
    error.code = 'DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED';
    error.operation = normalizeText(operation || 'unknown');
    return error;
  }

  function rejectDirectBrowserDml(operation) {
    var error = createDirectBrowserDmlError(operation);
    warnRemote(error, 'DML direto bloqueado');
    return Promise.reject(error);
  }

  function setProviderState(provider) {`,
  'repository direct-DML guard insertion'
);
repo = replaceBlock(
  repo,
  '  function saveRemote(conversation) {',
  '  function saveLocal(conversation, syncStatus) {',
  '',
  'remove direct browser saveRemote'
);
repo = replaceBlock(
  repo,
  '  function save(conversation) {',
  '  function createForOrder(order, options) {',
  `  function save(conversation) {
    var normalized = normalizeConversation(conversation);
    if (getAuthorityMode() === 'fixture-memory') return saveLocal(normalized, 'memory-only');
    return rejectDirectBrowserDml('save');
  }`,
  'repository save boundary'
);
repo = replaceBlock(
  repo,
  '  function removeMessage(conversationId, messageId) {',
  '  function markAsRead(conversationId) {',
  `  function removeMessage(conversationId, messageId) {
    var id = normalizeText(conversationId), target = normalizeText(messageId);
    if (!id || !target) return Promise.resolve(false);
    if (getAuthorityMode() === 'remote-only') return rejectDirectBrowserDml('removeMessage');
    return getById(id).then(function (conversation) {
      if (!conversation) return false;
      var before = conversation.messages || [];
      conversation.messages = before.filter(function (message) { return String(message && (message.id || message.messageId) || '') !== target; });
      if (conversation.messages.length === before.length) return false;
      var last = conversation.messages[conversation.messages.length - 1];
      conversation.lastMessage = getMessagePreview(last) || conversation.lastSeen || conversation.statusLabel || 'Conversa do pedido';
      conversation.updatedAt = nowIso();
      return save(conversation).then(function () { return true; });
    });
  }`,
  'repository remove boundary'
);
repo = replaceBlock(
  repo,
  '  function markAsRead(conversationId) {',
  '  repositories.messages = Object.freeze({',
  `  function markAsRead(conversationId) {
    var id = normalizeText(conversationId);
    if (!id) return Promise.resolve(false);
    if (getAuthorityMode() === 'remote-only') return rejectDirectBrowserDml('markAsRead');
    return getById(id).then(function (conversation) {
      if (!conversation) return false;
      var user = getSessionUser() || {};
      conversation.unread = 0; conversation.unreadCount = 0;
      (conversation.messages || []).forEach(function (message) { if (String(message.senderId) !== String(user.id)) message.read = true; });
      return save(conversation).then(function () { return true; });
    });
  }`,
  'repository read-state boundary'
);
repo = replaceOnce(
  repo,
  "getAuthorityStatus: function () { return Object.freeze({ authority: getAuthorityMode(), persistentLocalAuthority: false, pendingSynchronization: false }); },",
  "getAuthorityStatus: function () { var authority = getAuthorityMode(); return Object.freeze({ authority: authority, commandAuthority: authority === 'remote-only' ? 'server-owned' : 'fixture-memory', directBrowserDml: false, persistentLocalAuthority: false, pendingSynchronization: false }); },",
  'repository authority status'
);
if (repo.includes('function saveRemote(') || repo.includes('.upsert(') || repo.includes("REMOTE_MESSAGES_TABLE).update(")) {
  throw new Error('Repository still contains direct authenticated browser DML');
}
write(repoPath, repo);

// Service: authenticated UUID commands use the registered API provider directly.
const servicePath = 'assets/js/services/message-service.js';
let service = read(servicePath);
service = replaceOnce(
  service,
  "\n\n  function getMessagesProviderStatus() {",
  `

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function requiresServerOwnedCommands() {
    var actor = getCurrentUser();
    return Boolean(actor && isUuid(actor.id));
  }

  function createServerCommandError(message, action, cause) {
    var error = new Error(message || 'Boundary server-owned de mensagens indisponível.');
    error.code = 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE';
    error.action = normalizeText(action || 'unknown');
    if (cause) error.cause = cause;
    return error;
  }

  function getServerCommandBoundaryStatus() {
    var boundary = getRepositoryBoundary();
    var status = boundary && typeof boundary.getDataProviderStatus === 'function'
      ? boundary.getDataProviderStatus()
      : null;
    var registered = Boolean(boundary && typeof boundary.hasProvider === 'function' && boundary.hasProvider('api'));
    return Object.freeze({
      required: requiresServerOwnedCommands(),
      provider: 'api',
      registered: registered,
      apiReady: Boolean(status && status.apiReady === true),
      ready: registered && Boolean(status && status.apiReady === true),
      activeProvider: status && status.activeProvider || 'mock'
    });
  }

  function executeMessagesServerCommand(actionName, payload) {
    var boundary = getRepositoryBoundary();
    var status = getServerCommandBoundaryStatus();
    if (!status.ready || !boundary || typeof boundary.getProvider !== 'function') {
      return Promise.reject(createServerCommandError('Boundary server-owned de mensagens não está configurado.', actionName));
    }
    var provider;
    try {
      provider = boundary.getProvider('api');
    } catch (error) {
      return Promise.reject(createServerCommandError('Provider de API de mensagens indisponível.', actionName, error));
    }
    if (!provider || typeof provider.action !== 'function') {
      return Promise.reject(createServerCommandError('Provider de API não implementa comandos de mensagens.', actionName));
    }
    var actor = getCurrentUser() || {};
    var nextPayload = Object.assign({}, payload || {}, {
      action: actionName,
      actorId: actor.id || '',
      actorRole: actor.role || 'guest'
    });
    return Promise.resolve(provider.action('conversations', nextPayload)).catch(function (error) {
      if (error && error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE') throw error;
      throw createServerCommandError('Comando server-owned de mensagens falhou.', actionName, error);
    });
  }

  function getMessagesProviderStatus() {`,
  'service server-command helpers'
);
service = replaceOnce(
  service,
  "      fallbackProvider: 'local-mock'\n",
  "      fallbackProvider: 'local-mock',\n      commandAuthority: requiresServerOwnedCommands() ? 'server-owned' : 'fixture-memory',\n      commandReady: getServerCommandBoundaryStatus().ready\n",
  'service provider status'
);
service = replaceOnce(
  service,
  "    if (shouldUseMessagesApi()) return messagesBoundaryCreateForOrder(order || {}, options || {});",
  `    if (requiresServerOwnedCommands()) {
      return executeMessagesServerCommand('createForOrder', Object.assign({}, options || {}, {
        id: order && (order.id || order.orderId) || options && options.orderId || '',
        orderId: order && (order.id || order.orderId) || options && options.orderId || '',
        order: clone(order || {})
      })).then(function (response) {
        return normalizeConversationFromProvider(response && response.conversation || response);
      });
    }
    if (shouldUseMessagesApi()) return messagesBoundaryCreateForOrder(order || {}, options || {});`,
  'create conversation server boundary'
);
service = replaceOnce(
  service,
  "    if (shouldUseMessagesApi()) return messagesBoundaryUpdateOrder(order || {}, options || {});",
  `    if (requiresServerOwnedCommands()) {
      return executeMessagesServerCommand('updateOrder', Object.assign({}, options || {}, {
        id: order && (order.conversationId || order.id || order.orderId) || options && options.conversationId || '',
        orderId: order && (order.id || order.orderId) || options && options.orderId || '',
        order: clone(order || {})
      })).then(function (response) {
        return normalizeConversationFromProvider(response && response.conversation || response);
      });
    }
    if (shouldUseMessagesApi()) return messagesBoundaryUpdateOrder(order || {}, options || {});`,
  'update conversation server boundary'
);
service = replaceOnce(
  service,
  "      if (shouldUseMessagesApi()) return messagesBoundarySendMessage(conversationId, messagePayload);",
  `      if (requiresServerOwnedCommands()) {
        return executeMessagesServerCommand('sendMessage', Object.assign({}, messagePayload, {
          id: conversationId,
          conversationId: conversationId
        })).then(function (response) {
          return normalizeMessageFromProvider(response && response.message || response, { id: conversationId });
        });
      }
      if (shouldUseMessagesApi()) return messagesBoundarySendMessage(conversationId, messagePayload);`,
  'send message server boundary'
);
service = replaceOnce(
  service,
  `      if (shouldUseMessagesApi()) {
        throw new Error('Remoção compensatória de mensagem ainda não está disponível no provider de API.');
      }`,
  `      if (requiresServerOwnedCommands() || shouldUseMessagesApi()) {
        return executeMessagesServerCommand('removeMessage', {
          id: conversationId,
          conversationId: conversationId,
          messageId: messageId
        }).then(function (response) {
          if (typeof response === 'boolean') return response;
          return response ? response.ok !== false : true;
        });
      }`,
  'remove message server boundary'
);
service = replaceOnce(
  service,
  `    if (shouldUseMessagesApi()) {
      return getConversationById(conversationId).then(function (conversation) {
        if (conversation) assertConversationAccess(conversation, 'mark_conversation_read', actor);
        return messagesBoundaryMarkAsRead(conversationId);
      });
    }`,
  `    if (requiresServerOwnedCommands() || shouldUseMessagesApi()) {
      return getConversationById(conversationId).then(function (conversation) {
        if (conversation) assertConversationAccess(conversation, 'mark_conversation_read', actor);
        return executeMessagesServerCommand('markRead', {
          id: conversationId,
          conversationId: conversationId
        });
      }).then(function (response) {
        if (typeof response === 'boolean') return response;
        return response ? response.ok !== false : true;
      });
    }`,
  'mark read server boundary'
);
service = replaceOnce(
  service,
  "    getMessagesProviderStatus: getMessagesProviderStatus,\n",
  "    getMessagesProviderStatus: getMessagesProviderStatus,\n    getServerCommandBoundaryStatus: getServerCommandBoundaryStatus,\n",
  'service public command status'
);
write(servicePath, service);

// API provider: add explicit message removal command endpoint.
const apiPath = 'assets/js/services/api-repository-provider.js';
let api = read(apiPath);
api = replaceOnce(
  api,
  "      sendMessage: '/conversations/:id/messages',\n      markRead: '/conversations/:id/read'",
  "      sendMessage: '/conversations/:id/messages',\n      removeMessage: '/conversations/:id/messages/remove',\n      markRead: '/conversations/:id/read'",
  'API remove message endpoint'
);
write(apiPath, api);

// Canonical contract and evidence.
const contract = {
  contractVersion: 'msg-a03-server-command-boundary-v1',
  status: 'repository_only_server_command_boundary_enforced',
  domain: 'MSG-001',
  observedAt,
  repository: { name: 'Ezyrus07/doke-web', branch: 'msg/msg-001-baseline-audit', baseHead: '2eb72a137092aa2eb699af0cd5bd1e57e82921e5' },
  commandAuthority: {
    authenticatedUuidSession: 'server-owned-api-provider',
    fixtureSession: 'fixture-memory',
    globalProviderMayRemainMock: true,
    directBrowserSupabaseDmlAllowed: false,
    localFallbackAllowed: false,
    unavailableServerBoundaryPolicy: 'reject_fail_closed',
    unavailableErrorCode: 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE',
    directDmlErrorCode: 'DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED'
  },
  commands: ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead'],
  readAuthority: { conversationsAndMessages: 'supabase-remote-only', changedByA03: false },
  endpoints: {
    createForOrder: '/orders/:id/conversation',
    updateOrder: '/conversations/:id/order',
    sendMessage: '/conversations/:id/messages',
    removeMessage: '/conversations/:id/messages/remove',
    markRead: '/conversations/:id/read'
  },
  blockerDisposition: {
    'MSG-B02': { status: 'open', reason: 'Realtime publication and subscription are MSG-A04.' },
    'MSG-B03': { status: 'narrowed', reason: 'Conversation commands and read state now require the server-owned provider; presence and typing remain local-only.' },
    'MSG-B04': { status: 'open', reason: 'Attachment lifecycle remains MSG-A05.' }
  },
  orderedNextActions: [
    'MSG-A04: prepare participant-scoped Realtime publication and subscription contracts without staging application.',
    'MSG-A05: harden transaction-attachments ownership, signed URL, cleanup and retention boundaries.'
  ],
  effects: {
    stagingReads: 0, stagingMutations: 0, migrationsApplied: 0, realtimePublicationChanges: 0,
    storagePolicyChanges: 0, deployments: 0, productionChanged: false, accountsChanged: 0,
    messagesChanged: 0, pullRequestsMerged: 0
  }
};
write('config/msg-001-a03-server-command-boundary.json', JSON.stringify(contract, null, 2) + '\n');
write('docs/validation/MSG-001-A03-SERVER-COMMAND-BOUNDARY.json', JSON.stringify(contract, null, 2) + '\n');

write('docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md', `# MSG-001 A03 — Server-Owned Command Boundary

## Result

Authenticated UUID sessions now execute message commands through the registered API provider even when the global data provider remains mock. The browser repository is read-only for real sessions and rejects direct Supabase DML.

## Commands

- create conversation for order;
- update order context;
- send message;
- remove message;
- mark conversation read.

A missing or disabled API boundary rejects with \`DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE\`. Any authenticated repository mutation attempt rejects with \`DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED\`. Fixtures remain memory-only.

## Scope exclusions

Realtime publication, subscription, attachment lifecycle, staging application and deployment are unchanged.

## Operational effects

- staging reads: 0
- staging mutations: 0
- migrations: 0
- deploys: 0
- production changes: 0
- real messages changed: 0
- merges: 0
`);

// Runtime test.
write('scripts/test-msg-001-a03-server-command-boundary.js', `#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
const uuid = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';

function boot(apiReady) {
  const calls = [];
  const conversation = {
    id: 'conv-1', clientId: uuid, professionalId: peer, participants: [uuid, peer],
    status: 'accepted', order: { status: 'accepted' },
    messages: [{ id: 'msg-1', senderId: uuid, body: 'old' }]
  };
  const provider = {
    action(resource, payload) {
      calls.push({ resource, payload });
      if (payload.action === 'sendMessage') return Promise.resolve({ message: Object.assign({ id: 'msg-new' }, payload) });
      if (payload.action === 'createForOrder' || payload.action === 'updateOrder') return Promise.resolve({ conversation });
      return Promise.resolve({ ok: true });
    }
  };
  const Doke = {
    session: { getCurrentUser() { return { id: uuid, role: 'client', name: 'Real' }; } },
    repositories: { messages: {
      normalize(value) { return value; },
      normalizeMessage(value) { return value; },
      getById() { return Promise.resolve(conversation); },
      list() { return Promise.resolve([conversation]); },
      listLocal() { return []; }
    } },
    repositoryBoundary: {
      getDataProviderStatus() { return { activeProvider: 'mock', requestedProvider: 'mock', apiReady: apiReady === true }; },
      hasProvider(name) { return name === 'api'; },
      getProvider(name) { if (name !== 'api') throw new Error('bad provider'); return provider; }
    },
    services: {},
    permissions: {}
  };
  const document = { dispatchEvent() {} };
  function CustomEvent(name, init) { this.type = name; this.detail = init && init.detail; }
  const root = { Doke, document, CustomEvent, localStorage: { getItem() { return null; } }, console: { warn() {} } };
  root.window = root;
  vm.runInNewContext(source, { window: root, document, CustomEvent, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, console: root.console }, { filename: 'message-service.js' });
  return { service: Doke.services.messages, calls };
}

(async function () {
  const ready = boot(true);
  assert.strictEqual(ready.service.getServerCommandBoundaryStatus().ready, true);
  await ready.service.createConversationForOrder({ id: 'order-1', clientId: uuid, professionalId: peer });
  await ready.service.updateConversationOrder({ id: 'order-1', conversationId: 'conv-1' });
  await ready.service.sendMessage('conv-1', { body: 'hello', deferSideEffects: true });
  await ready.service.removeMessage('conv-1', 'msg-1');
  await ready.service.markAsRead('conv-1');
  assert.deepStrictEqual(ready.calls.map(item => item.payload.action), ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead']);
  assert(ready.calls.every(item => item.resource === 'conversations'));
  assert(ready.calls.every(item => item.payload.actorId === uuid));

  const blocked = boot(false);
  await assert.rejects(
    blocked.service.createConversationForOrder({ id: 'order-2' }),
    error => error && error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE'
  );
  console.log('MSG-A03 server-owned command boundary runtime test passed.');
}()).catch(error => { console.error(error); process.exitCode = 1; });
`);

// Audit.
write('scripts/audit-msg-001-a03-server-command-boundary.js', `#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/msg-001-a03-server-command-boundary.json',
  evidence: 'docs/validation/MSG-001-A03-SERVER-COMMAND-BOUNDARY.json',
  docs: 'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md',
  repository: 'assets/js/repositories/messages-repository.js',
  service: 'assets/js/services/message-service.js',
  api: 'assets/js/services/api-repository-provider.js',
  test: 'scripts/test-msg-001-a03-server-command-boundary.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json',
  workflow: '.github/workflows/msg-001-a03-server-command-boundary.yml'
};
Object.values(paths).forEach(file => assert(fs.existsSync(file), 'Missing MSG-A03 asset: ' + file));
const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const repository = fs.readFileSync(paths.repository, 'utf8');
const service = fs.readFileSync(paths.service, 'utf8');
const api = fs.readFileSync(paths.api, 'utf8');
const matrix = JSON.parse(fs.readFileSync(paths.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(paths.package, 'utf8'));
const workflow = fs.readFileSync(paths.workflow, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'msg-a03-server-command-boundary-v1');
assert.strictEqual(config.commandAuthority.directBrowserSupabaseDmlAllowed, false);
assert.strictEqual(config.commandAuthority.authenticatedUuidSession, 'server-owned-api-provider');
assert.strictEqual(config.commands.length, 5);
Object.values(config.effects).forEach(value => assert(value === 0 || value === false));

['DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED', "return rejectDirectBrowserDml('save')", "return rejectDirectBrowserDml('removeMessage')", "return rejectDirectBrowserDml('markAsRead')", 'directBrowserDml: false'].forEach(fragment => assert(repository.includes(fragment), fragment));
['function saveRemote(', '.upsert(', 'REMOTE_MESSAGES_TABLE).update('].forEach(fragment => assert(!repository.includes(fragment), 'Direct DML retained: ' + fragment));
['executeMessagesServerCommand', 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE', "executeMessagesServerCommand('createForOrder'", "executeMessagesServerCommand('updateOrder'", "executeMessagesServerCommand('sendMessage'", "executeMessagesServerCommand('removeMessage'", "executeMessagesServerCommand('markRead'"].forEach(fragment => assert(service.includes(fragment), fragment));
assert(api.includes("removeMessage: '/conversations/:id/messages/remove'"));

const version = matrix.version.split('.').map(Number);
assert(version[0] === 1 && version[1] === 3 && version[2] >= 80);
const msg = matrix.domains.find(domain => domain.id === 'MSG-001');
assert(msg);
assert(msg.evidence.some(item => item.includes('MSG-A03')));
assert(msg.nextActions.length === 2 && msg.nextActions[0].includes('MSG-A04'));
Object.values(paths).filter(file => ![paths.matrix, paths.package].includes(file)).forEach(file => assert(msg.requiredPaths.includes(file), 'requiredPaths: ' + file));
assert(msg.tests.includes('audit:msg-001-a03-server-command-boundary'));
assert(msg.tests.includes('test:msg-001-a03-server-command-boundary'));
assert.strictEqual(pkg.scripts['audit:msg-001-a03-server-command-boundary'], 'node scripts/audit-msg-001-a03-server-command-boundary.js');
assert.strictEqual(pkg.scripts['test:msg-001-a03-server-command-boundary'], 'node scripts/test-msg-001-a03-server-command-boundary.js');
['server-owned', 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE', 'staging reads: 0', 'production changes: 0'].forEach(fragment => assert(docs.includes(fragment), fragment));
assert(workflow.includes('permissions:\\n  contents: read'));
['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'curl ', 'git push'].forEach(fragment => assert(!workflow.includes(fragment), fragment));
console.log('MSG-A03 server-owned command boundary audit passed.');
`);

write('.github/workflows/msg-001-a03-server-command-boundary.yml', `name: Doke MSG-A03 Server-Owned Command Boundary

on:
  push:
    branches:
      - msg/msg-001-baseline-audit
    paths:
      - 'assets/js/repositories/messages-repository.js'
      - 'assets/js/services/message-service.js'
      - 'assets/js/services/api-repository-provider.js'
      - 'config/msg-001-a03-server-command-boundary.json'
      - 'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md'
      - 'docs/validation/MSG-001-A03-SERVER-COMMAND-BOUNDARY.json'
      - 'scripts/audit-msg-001-a03-server-command-boundary.js'
      - 'scripts/test-msg-001-a03-server-command-boundary.js'
      - 'config/domain-completion-matrix.json'
      - 'package.json'
      - '.github/workflows/msg-001-a03-server-command-boundary.yml'
  pull_request:
    branches:
      - ord/ord-001-baseline-audit

permissions:
  contents: read

jobs:
  boundary:
    runs-on: ubuntu-24.04
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci --ignore-scripts
      - name: Validate MSG-A03 server-owned command boundary
        run: |
          node --check assets/js/repositories/messages-repository.js
          node --check assets/js/services/message-service.js
          npm run audit:msg-001-a01-authority-baseline
          npm run audit:msg-001-a02-canonical-authority-boundary
          npm run test:msg-001-a02-canonical-authority-boundary
          npm run audit:msg-001-a03-server-command-boundary
          npm run test:msg-001-a03-server-command-boundary
          npm run audit:messages-api-contract
          npm run test:messages-supabase-repository-contract
          npm run test:attachments-supabase-repository-contract
          npm run audit:domain-completion-matrix
`);

// Cumulative audits and tests.
let a01 = read('scripts/audit-msg-001-a01-authority-baseline.js');
const a01Old = `if (fs.existsSync('config/msg-001-a02-canonical-authority-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A03')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A02')));
} else {
  assert(msg.nextActions.some((item) => item.includes('MSG-A02')));
}`;
const a01New = `if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A04')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A03')));
} else if (fs.existsSync('config/msg-001-a02-canonical-authority-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A03')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A02')));
} else {
  assert(msg.nextActions.some((item) => item.includes('MSG-A02')));
}`;
a01 = replaceOnce(a01, a01Old, a01New, 'A01 next action compatibility');
write('scripts/audit-msg-001-a01-authority-baseline.js', a01);

let a02 = read('scripts/audit-msg-001-a02-canonical-authority-boundary.js');
a02 = replaceOnce(
  a02,
  "assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A03'));",
  `if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  assert(msg.nextActions.length === 2 && msg.nextActions[0].includes('MSG-A04'));
} else {
  assert(msg.nextActions.length === 3 && msg.nextActions[0].includes('MSG-A03'));
}`,
  'A02 next action compatibility'
);
write('scripts/audit-msg-001-a02-canonical-authority-boundary.js', a02);

let a02Test = read('scripts/test-msg-001-a02-canonical-authority-boundary.js');
a02Test = replaceOnce(
  a02Test,
  "    function (error) { return error && error.code === 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE'; }\n  );\n  assert.strictEqual(remote.getWrites(), 0, 'real authority must not persist failed operations locally');",
  `    function (error) {
      if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) return error && error.code === 'DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED';
      return error && error.code === 'DOKE_MESSAGES_REMOTE_AUTHORITY_UNAVAILABLE';
    }
  );
  assert.strictEqual(remote.getWrites(), 0, 'real authority must not persist failed operations locally');`,
  'A02 runtime save error compatibility'
);
write('scripts/test-msg-001-a02-canonical-authority-boundary.js', a02Test);

let supabaseTest = read('scripts/test-messages-supabase-repository-contract.js');
supabaseTest = replaceOnce(
  supabaseTest,
  "assert(repo.includes('saveRemote'));",
  `if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  const service = fs.readFileSync('assets/js/services/message-service.js', 'utf8');
  assert(!repo.includes('saveRemote'));
  assert(service.includes('executeMessagesServerCommand'));
  assert(repo.includes('DOKE_MESSAGES_DIRECT_BROWSER_DML_BLOCKED'));
} else {
  assert(repo.includes('saveRemote'));
}`,
  'Supabase contract A03 compatibility'
);
write('scripts/test-messages-supabase-repository-contract.js', supabaseTest);

let apiAudit = read('scripts/audit-messages-api-contract.js');
apiAudit = replaceOnce(
  apiAudit,
  "assert(service.includes(\"boundary.action('conversations', 'sendMessage'\"), 'message-service must send messages through repositoryBoundary action.');",
  "assert(service.includes('executeMessagesServerCommand'), 'message-service must expose the dedicated server command executor.');\nassert(service.includes(\"executeMessagesServerCommand('sendMessage'\"), 'message-service must send authenticated messages through the server-owned provider.');",
  'messages API send audit'
);
apiAudit = replaceOnce(
  apiAudit,
  "assert(service.includes(\"boundary.action('conversations', 'markRead'\"), 'message-service must mark conversations read through repositoryBoundary action.');",
  "assert(service.includes(\"executeMessagesServerCommand('markRead'\"), 'message-service must mark authenticated conversations read through the server-owned provider.');",
  'messages API read audit'
);
apiAudit = replaceOnce(
  apiAudit,
  "assert(apiProvider.includes(\"markRead: '/conversations/:id/read'\"), 'api provider must map markRead endpoint.');",
  "assert(apiProvider.includes(\"removeMessage: '/conversations/:id/messages/remove'\"), 'api provider must map removeMessage endpoint.');\nassert(apiProvider.includes(\"markRead: '/conversations/:id/read'\"), 'api provider must map markRead endpoint.');",
  'messages API remove endpoint audit'
);
write('scripts/audit-messages-api-contract.js', apiAudit);

// Package.
const pkg = JSON.parse(read('package.json'));
pkg.scripts['audit:msg-001-a03-server-command-boundary'] = 'node scripts/audit-msg-001-a03-server-command-boundary.js';
pkg.scripts['test:msg-001-a03-server-command-boundary'] = 'node scripts/test-msg-001-a03-server-command-boundary.js';
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

// Matrix.
const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(read(matrixPath));
matrix.version = '1.3.80';
matrix.updatedAt = observedAt;
const msg = matrix.domains.find(domain => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix domain missing');
[
  'config/msg-001-a03-server-command-boundary.json',
  'docs/MSG-001-A03-SERVER-COMMAND-BOUNDARY.md',
  'docs/validation/MSG-001-A03-SERVER-COMMAND-BOUNDARY.json',
  'scripts/audit-msg-001-a03-server-command-boundary.js',
  'scripts/test-msg-001-a03-server-command-boundary.js',
  '.github/workflows/msg-001-a03-server-command-boundary.yml'
].forEach(value => pushUnique(msg.requiredPaths, value));
pushUnique(msg.evidence, 'MSG-A03 repository-only server-owned command boundary: authenticated UUID commands require the dedicated API provider and direct browser Supabase DML is blocked.');
pushUnique(msg.tests, 'audit:msg-001-a03-server-command-boundary');
pushUnique(msg.tests, 'test:msg-001-a03-server-command-boundary');
msg.nextActions = contract.orderedNextActions.slice();
write(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

console.log('MSG-A03 compact generator completed.');
