const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('notificacoes.html');
const runtime = read('assets/js/features/in-app-notifications.js');
const page = read('assets/js/pages/notificacoes.js');
const css = read('assets/css/components/in-app-notifications.css');
const checks = [
  [html.includes('data-notifications-settings-panel'), 'settings panel'],
  [html.includes('data-notifications-settings-toggle'), 'settings trigger'],
  [runtime.includes('CENTER_KEY'), 'persistent center'],
  [runtime.includes('repeatCount'), 'group repeated alerts'],
  [runtime.includes('markAsRead'), 'read state'],
  [runtime.includes('syncGlobalBadges'), 'global badge sync'],
  [page.includes('doke:notification-center-changed'), 'live center refresh'],
  [page.includes('data-notification-pref'), 'preference save'],
  [css.includes('.doke-global-notification-badge'), 'badge style']
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, name]) => console.error(`Missing: ${name}`));
  process.exit(1);
}
console.log('Notification center v2 contract: OK');
