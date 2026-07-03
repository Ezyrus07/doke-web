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

function requireSnippets(file, snippets) {
  const content = read(file);
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
  }
}

requireSnippets('assets/js/services/notification-service.js', [
  'getNotificationsProviderStatus',
  'shouldUseNotificationsApi',
  "boundary.list('notifications'",
  "boundary.create('notifications'",
  "boundary.action('notifications', 'read'",
  "boundary.action('notifications', 'dismiss'",
  "boundary.action('notifications', 'readAll'"
]);

requireSnippets('assets/js/services/api-repository-provider.js', [
  "notifications: '/notifications'",
  "read: '/notifications/:id/read'",
  "dismiss: '/notifications/:id/dismiss'",
  "readAll: '/notifications/read-all'"
]);

requireSnippets('assets/js/services/mock-repository-provider.js', [
  "notification: 'notifications'",
  'mockNotificationCreate',
  'mockNotificationUpdate',
  'mockNotificationAction'
]);

requireSnippets('assets/js/repositories/notifications-repository.js', [
  'normalize: normalizeNotification',
  'getById: getById',
  'markAsRead: markAsRead',
  'dismiss: dismiss',
  'markAllAsRead: markAllAsRead'
]);

requireSnippets('notificacoes.html', [
  'assets/js/services/repository-boundary.js',
  'assets/js/services/mock-repository-provider.js',
  'assets/js/services/api-repository-provider.js'
]);

requireSnippets('assets/js/contracts/backend-domain-contract.js', [
  'NOTIFICATION_STATUS',
  'NOTIFICATION_TYPE',
  'NOTIFICATION_EVENTS'
]);

requireSnippets('docs/API-ADAPTER-CONTRACT.md', [
  'Sprint 12E',
  'POST /notifications/:id/dismiss',
  'POST /notifications/read-all'
]);

requireSnippets('docs/BACKEND-INTEGRATION-PLAN.md', [
  'Sprint 12E',
  'Notificações reais controladas'
]);

const packageJson = read('package.json');
try {
  const parsed = JSON.parse(packageJson);
  if (!parsed.scripts || parsed.scripts['audit:notifications-api-contract'] !== 'node scripts/audit-notifications-api-contract.js') {
    failures.push('package.json missing audit:notifications-api-contract script.');
  }
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Notifications API contract audit failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Notifications API contract audit passed.');
console.log('Notifications provider default remains mock; API path is controlled by repositoryBoundary.');
