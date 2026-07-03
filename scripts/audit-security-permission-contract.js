#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const requireInFile = (file, snippets) => {
  const source = read(file);
  snippets.forEach((snippet) => {
    if (!source.includes(snippet)) failures.push(`${file} missing ${snippet}`);
  });
};

requireInFile('assets/js/core/permissions.js', [
  'canAccessOrder',
  'assertOrderTransition',
  'canAccessConversation',
  'canAccessNotification',
  'canAccessWalletOwner',
  'assertAdminAction',
  'auditSecurityEvent',
  'doke.security.audit.v1'
]);

requireInFile('assets/js/services/orders-service.js', [
  'assertOrderAccess',
  'assertOrderTransitionAccess',
  'scopeApiFilters',
  'currentUser_false_requires_admin'
]);

requireInFile('assets/js/services/message-service.js', [
  'assertConversationAccess',
  'scopeApiFilters',
  'send_message',
  'mark_conversation_read'
]);

requireInFile('assets/js/services/notification-service.js', [
  'assertNotificationAccess',
  'scopeApiFilters',
  'dismiss_notification',
  'read_notification'
]);

requireInFile('assets/js/services/wallet-service.js', [
  'assertWalletOwner',
  'assertAdminAction',
  'resolve_dispute',
  'resolve_withdrawal',
  'currentUser_false_requires_admin'
]);

requireInFile('docs/API-ADAPTER-CONTRACT.md', [
  'Security and permission boundary',
  'doke.security.audit.v1'
]);

requireInFile('docs/BACKEND-INTEGRATION-PLAN.md', [
  'Sprint 13',
  'permissões'
]);

if (failures.length) {
  console.error('Security permission contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Security permission contract audit passed.');
