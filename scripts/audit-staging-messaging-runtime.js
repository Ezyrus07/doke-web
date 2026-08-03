#!/usr/bin/env node
'use strict';

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

function requireSnippet(file, snippet) {
  const content = read(file);
  if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
}

function requireJs(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const messagingHandlers = read('backend/modules/messaging/route-handlers.js');
[
  'handlers.listConversations = createActionHandler',
  'handlers.getConversation = createActionHandler',
  'handlers.createConversationForOrder = createMessagingCommandHandler',
  'handlers.updateConversationOrder = createMessagingCommandHandler',
  'handlers.sendMessage = createMessagingCommandHandler',
  'handlers.removeMessage = createMessagingCommandHandler',
  'handlers.markConversationRead = createMessagingCommandHandler'
].forEach((snippet) => {
  if (!messagingHandlers.includes(snippet)) failures.push(`messaging route handlers missing ${snippet}`);
});
if (!messagingHandlers.includes('function createMessagingCommandHandler')) failures.push('messaging command handler factory missing');
if (!messagingHandlers.includes('createActionHandler(route')) failures.push('messaging command handler must delegate to createActionHandler');

[
  'listConversations',
  'getConversation',
  'createConversationForOrder',
  'updateConversationOrder',
  'sendMessage',
  'removeMessage',
  'markConversationRead',
  "from('conversations')",
  "from('messages')",
  "from('orders')",
  'assertConversationAccess',
  'assertOrderAccess',
  'normalizeConversation',
  'normalizeMessage'
].forEach((snippet) => requireSnippet('backend/modules/messaging/messaging-service.js', snippet));

const registry = requireJs('backend/shared/http/route-registry.js');
const loader = requireJs('backend/shared/http/module-route-loader.js');
if (registry && loader) {
  const messagingRoutes = registry.listRoutesByModule('messaging');
  const expectedRoutes = [
    'conversations.list',
    'conversations.get',
    'conversations.createForOrder',
    'conversations.updateOrder',
    'messages.send',
    'messages.remove',
    'messages.markRead'
  ];

  expectedRoutes.forEach((name) => {
    if (!messagingRoutes.some((route) => route.name === name)) failures.push(`messaging route missing from registry: ${name}`);
  });

  messagingRoutes.forEach((route) => {
    const handler = loader.getHandler('messaging', route.handler);
    if (typeof handler !== 'function') failures.push(`messaging handler not loaded: ${route.handler}`);
  });
}

requireSnippet('docs/STAGING-API-RUNTIME.md', 'Sprint 19');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'GET /conversations');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /conversations/:id/messages');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'messaging runtime');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 19');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:staging-messaging-runtime');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:staging-messaging-runtime');
requireSnippet('docs/VALIDATION.md', 'audit:staging-messaging-runtime');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:staging-messaging-runtime'] !== 'node scripts/audit-staging-messaging-runtime.js') {
  failures.push('package.json missing audit:staging-messaging-runtime script.');
}

if (failures.length) {
  console.error('audit:staging-messaging-runtime failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:staging-messaging-runtime passed');
