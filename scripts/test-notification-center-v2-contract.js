const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('notificacoes.html');
const runtime = read('assets/js/features/in-app-notifications.js');
const page = read('assets/js/pages/notificacoes.js');
const repository = read('assets/js/repositories/notifications-repository.js');
const center = read('assets/js/core/notification-center.js');
const css = read('assets/css/components/in-app-notifications.css');
const checks = [
  [html.includes('data-notifications-settings-panel'), 'settings panel'],
  [html.includes('data-notifications-settings-toggle'), 'settings trigger'],
  [center.includes("CONTRACT = 'notification-center-v1'"), 'canonical notification center'],
  [runtime.includes('getNotificationCenter') && runtime.includes('hydrateNotificationCenter'), 'in-app center adapter'],
  [!runtime.includes('CENTER_KEY') && !runtime.includes('doke.in-app-notification.center.v1'), 'no private center storage'],
  [runtime.includes('repeatCount'), 'group repeated alerts'],
  [runtime.includes('markAsRead'), 'read state'],
  [runtime.includes('syncGlobalBadges'), 'compatibility badge facade'],
  [page.includes('doke:notification-center-changed'), 'live center render'],
  [!repository.includes('syncGlobalBadges'), 'repository is not badge writer'],
  [page.includes('data-notification-pref'), 'preference save'],
  [css.includes('.doke-global-notification-badge'), 'legacy badge cleanup style']
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, name]) => console.error(`Missing: ${name}`));
  process.exit(1);
}
console.log('Notification center v2 contract: OK');
