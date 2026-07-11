const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/comunidade-interna.css'), 'utf8');
const checks = [
  ['picker hook', html.includes('data-community-mention-picker')],
  ['member mentions', js.includes("type: 'member'")],
  ['role mentions', js.includes("type: 'role'") && js.includes("canCommunity('mentionRoles')")],
  ['mention persistence', js.includes('mentions: getMessageMentions(text)')],
  ['targeted notifications', js.includes("type: 'community-message-mention'")],
  ['deep link', js.includes("&message=") && js.includes('focusRequestedMessage')],
  ['mention highlight', css.includes('.community-message-mention')]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) { console.error(failed.map(([name]) => name).join(', ')); process.exit(1); }
console.log('Community mention contract: OK');
