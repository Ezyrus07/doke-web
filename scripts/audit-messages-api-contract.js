#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}
function assert(condition, message) {
  if (!condition) {
    console.error('[audit:messages-api-contract] ' + message);
    process.exitCode = 1;
  }
}

const service = read('assets/js/services/message-service.js');
const apiProvider = read('assets/js/services/api-repository-provider.js');
const mockProvider = read('assets/js/services/mock-repository-provider.js');
const repo = read('assets/js/repositories/messages-repository.js');
const docs = read('docs/API-ADAPTER-CONTRACT.md') + '\n' + read('docs/BACKEND-INTEGRATION-PLAN.md');

assert(service.includes('getMessagesProviderStatus'), 'message-service must expose provider status.');
assert(service.includes('shouldUseMessagesApi'), 'message-service must gate API usage through provider status.');
assert(service.includes("boundary.list('conversations'"), 'message-service must list conversations through repositoryBoundary.');
assert(service.includes("boundary.action('conversations', 'sendMessage'"), 'message-service must send messages through repositoryBoundary action.');
assert(service.includes("boundary.action('conversations', 'markRead'"), 'message-service must mark conversations read through repositoryBoundary action.');
assert(apiProvider.includes("createForOrder: '/orders/:id/conversation'"), 'api provider must map createForOrder conversation endpoint.');
assert(apiProvider.includes("sendMessage: '/conversations/:id/messages'"), 'api provider must map sendMessage endpoint.');
assert(apiProvider.includes("markRead: '/conversations/:id/read'"), 'api provider must map markRead endpoint.');
assert(mockProvider.includes("conversation: 'conversations'"), 'mock provider must alias conversations.');
assert(mockProvider.includes('mockConversationAction'), 'mock provider must implement conversation actions.');
assert(repo.includes('normalizeMessage: normalizeMessage'), 'messages repository must expose normalizeMessage for provider payloads.');
assert(docs.includes('Sprint 12D') || docs.includes('messages provider'), 'backend docs must mention Sprint 12D/messages provider contract.');

if (process.exitCode) process.exit(process.exitCode);
console.log('[audit:messages-api-contract] ok');
