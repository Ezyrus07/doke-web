'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const router = read('assets/js/core/stable-shell-router.js');
const hydration = read('assets/js/core/page-hydration.js');
const messages = read('assets/js/pages/mensagens.js');
const notifications = read('assets/js/pages/notificacoes.js');
const home = read('assets/js/pages/index-data-controller.js');
const notificationHtml = read('notificacoes.html');

['/index.html', '/mensagens.html', '/notificacoes.html'].forEach((route) => {
  assert(router.includes(`'${route}'`), `${route}: missing internal direct hydration route`);
});
assert(router.includes('hasSkeleton && !shouldCommitHydrationRouteDirect(path)'), 'router: hydration routes are not bypassing skeleton commit internally');
assert(hydration.includes('preserveReadyDuringHydration'), 'page hydration: missing stale-ready preservation option');
assert(messages.includes('preserveReadyDuringHydration: true'), 'messages: ready surface is not preserved during internal hydration');
assert(notifications.includes('preserveReadyDuringHydration: true'), 'notifications: ready surface is not preserved during internal hydration');
assert(home.includes('preserveReadyDuringHydration: true'), 'home: ready surface is not preserved during internal hydration');
assert(!notificationHtml.includes('Verificando pedidos, mensagens e atualizações.'), 'notifications: generic blocking loading copy remains');
assert((notificationHtml.match(/notifications-hydration-state__row/g) || []).length >= 4, 'notifications: structural row skeleton is incomplete');

if (failures.length) {
  console.error('[regional-navigation-hydration-contract] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('[regional-navigation-hydration-contract] OK');
