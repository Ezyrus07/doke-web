const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const bridge = read('assets/js/features/browser-notification-bridge.js');
const runtime = read('assets/js/features/community-runtime-stability.js');
const communityController = read('assets/js/pages/comunidade-interna.js');
const messagingFoundation = read('assets/css/pages/messaging-foundation.css');
const messagingExtensions = read('assets/css/pages/messaging-runtime-extensions.css');

for (const token of ['notification-browser-v1', 'Notification.requestPermission', 'document.visibilityState', 'DokeBrowserNotifications']) {
  assert.ok(bridge.includes(token), `browser notification authority missing ${token}`);
}

for (const token of ['navigator.onLine', 'doke:connection-state', 'MutationObserver', 'Escape', 'DokeCommunityRuntime']) {
  assert.ok(runtime.includes(token), `messaging runtime stability missing ${token}`);
}

for (const file of ['mensagens.html', 'notificacoes.html']) {
  const html = read(file);
  assert.ok(html.includes('browser-notification-bridge.js'), `${file}: browser notification consumer missing`);
  assert.ok(html.includes('community-runtime-stability.js'), `${file}: runtime stability consumer missing`);
}

const communityHtml = read('comunidade-interna.html');
assert.equal(communityHtml.includes('browser-notification-bridge.js'), false, 'comunidade-interna.html must not gain notification bridge only to satisfy QA');
assert.equal(communityHtml.includes('community-runtime-stability.js'), false, 'comunidade-interna.html must not gain messaging runtime stability only to satisfy QA');
assert.ok(communityController.includes('doke:auth-session-change'), 'community controller auth/session ownership missing');
assert.ok(communityController.includes("'Escape'"), 'community controller keyboard ownership missing');

assert.ok(messagingFoundation.includes('messaging-runtime-extensions.css'), 'messages foundation must load messaging runtime extensions');
assert.ok(messagingExtensions.includes('community-runtime-stability.css'), 'messaging runtime extensions must load runtime stability styles');
assert.ok(read('notificacoes.html').includes('community-runtime-stability.css'), 'notificacoes.html runtime stability styles missing');

console.log('Community logic stability contract: OK (consumer ownership reconciled)');
