#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const runtime = read('assets/js/features/in-app-notifications.js');
const page = read('assets/js/pages/notificacoes.js');
const repository = read('assets/js/repositories/notifications-repository.js');
const center = read('assets/js/core/notification-center.js');

for (const file of ['notificacoes.html', 'mensagens.html', 'comunidade-interna.html']) {
  const html = read(file);
  const session = html.indexOf('assets/js/core/session.js');
  const accountStorage = html.indexOf('assets/js/core/account-storage.js');
  const notificationCenter = html.indexOf('assets/js/core/notification-center.js');
  const inApp = html.indexOf('assets/js/features/in-app-notifications.js');
  assert(session >= 0, `${file}: session script must be present`);
  assert(accountStorage > session, `${file}: account storage must load after session`);
  assert(notificationCenter > accountStorage, `${file}: notification center must load after account storage`);
  assert(inApp > notificationCenter, `${file}: in-app adapter must load after notification center`);
}

assert(!runtime.includes('CENTER_KEY'));
assert(!runtime.includes('doke.in-app-notification.center.v1'));
assert(runtime.includes('getNotificationCenter'));
assert(runtime.includes('getSnapshot'));
assert(runtime.includes('hydrateNotificationCenter'));
assert(runtime.includes("doke:notifications-synced"));
assert(runtime.includes("doke:auth-session-change"));
assert(!runtime.includes("querySelectorAll('[data-notifications-unread-count]"));

assert(repository.includes('dispatchPresentationSnapshot'));
assert(!repository.includes('syncGlobalBadges'));
assert(repository.includes("dispatchSynced(scoped, source || 'repository')"));

assert(page.includes("const getNotificationCenter = () => window.Doke?.notificationCenter || null"));
assert(page.includes('center?.createFence?.()'));
assert(page.includes('commitNotificationItems'));
assert(page.includes('center.replace'));
assert(page.includes("getNotificationCenter()?.markRead?.(id)"));
assert(page.includes("getNotificationCenter()?.dismiss?.(id)"));
assert(!page.includes("querySelectorAll('[data-notifications-unread-count]"));
assert(!page.includes("doke:notification-center-changed', () => refreshLocalNotifications"));
assert(center.includes("BADGE_SELECTOR = '[data-notifications-unread-count]'"));
assert(center.includes('node.dataset.notificationCenterWriter = CONTRACT'));

console.log('[ux-notif-001-surface-contract] ok');
console.log('- script order, single badge writer, repository separation, account fence and mutation commits validated');
