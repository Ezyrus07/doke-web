const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const feature = fs.readFileSync(path.join(root, 'assets/js/features/in-app-notifications.js'), 'utf8');
const messages = fs.readFileSync(path.join(root, 'assets/js/pages/mensagens.js'), 'utf8');
const community = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/components/in-app-notifications.css'), 'utf8');
const checks = [
  ['inline reply', feature.includes('data-toast-inline-reply')],
  ['duplicate action lock', feature.includes('pendingActions') && feature.includes('actionKeyFor')],
  ['action expiration', feature.includes('isActionExpired')],
  ['retry action', feature.includes('data-toast-retry')],
  ['undo action', feature.includes('data-toast-undo')],
  ['message undo handler', messages.includes("action.kind === 'delete-last-message'")],
  ['community error feedback', community.includes('doke:notification-action-error')],
  ['inline reply styles', css.includes('.doke-live-toast__reply')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  failed.forEach(([label]) => console.error('FAIL:', label));
  process.exit(1);
}
console.log('Notification quick actions v2 contract: OK');
