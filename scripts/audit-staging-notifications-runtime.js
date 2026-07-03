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

const notificationHandlers = read('backend/modules/notifications/route-handlers.js');
[
  'handlers.listNotifications = createActionHandler',
  'handlers.getNotification = createActionHandler',
  'handlers.createNotification = createActionHandler',
  'handlers.updateNotification = createActionHandler',
  'handlers.markNotificationRead = createActionHandler',
  'handlers.dismissNotification = createActionHandler',
  'handlers.markAllNotificationsRead = createActionHandler'
].forEach((snippet) => {
  if (!notificationHandlers.includes(snippet)) failures.push(`notifications route handlers missing ${snippet}`);
});

[
  'listNotifications',
  'getNotification',
  'createNotification',
  'updateNotification',
  'markNotificationRead',
  'dismissNotification',
  'markAllNotificationsRead',
  "from('notifications')",
  'assertNotificationAccess',
  'normalizeNotification',
  'dismissedAt',
  'read_at'
].forEach((snippet) => requireSnippet('backend/modules/notifications/notifications-service.js', snippet));

const registry = requireJs('backend/shared/http/route-registry.js');
const loader = requireJs('backend/shared/http/module-route-loader.js');
if (registry && loader) {
  const notificationRoutes = registry.listRoutesByModule('notifications');
  const expectedRoutes = [
    'notifications.list',
    'notifications.get',
    'notifications.create',
    'notifications.update',
    'notifications.read',
    'notifications.dismiss',
    'notifications.readAll'
  ];

  expectedRoutes.forEach((name) => {
    if (!notificationRoutes.some((route) => route.name === name)) failures.push(`notifications route missing from registry: ${name}`);
  });

  notificationRoutes.forEach((route) => {
    const handler = loader.getHandler('notifications', route.handler);
    if (typeof handler !== 'function') failures.push(`notifications handler not loaded: ${route.handler}`);
  });
}

requireSnippet('docs/STAGING-API-RUNTIME.md', 'Sprint 20');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'GET /notifications');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /notifications/:id/read');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'POST /notifications/read-all');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'notifications runtime');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 20');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:staging-notifications-runtime');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:staging-notifications-runtime');
requireSnippet('docs/VALIDATION.md', 'audit:staging-notifications-runtime');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:staging-notifications-runtime'] !== 'node scripts/audit-staging-notifications-runtime.js') {
  failures.push('package.json missing audit:staging-notifications-runtime script.');
}

if (failures.length) {
  console.error('audit:staging-notifications-runtime failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:staging-notifications-runtime passed');
