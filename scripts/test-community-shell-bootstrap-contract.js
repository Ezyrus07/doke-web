const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const listingHtml = fs.readFileSync(path.join(root, 'comunidade.html'), 'utf8');
const roomHtml = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const roomJs = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertShellContract(html, page) {
  assert(/class="[^"]*doke-app-shell-page/.test(html), `${page}: body must use global app shell class`);
  assert(/data-shell-contract="app-shell"/.test(html), `${page}: app-shell contract is missing`);
  assert(/data-sidebar-contract="global-sidebar"/.test(html), `${page}: global sidebar contract is missing`);
  assert(html.includes('assets/js/core/app.js'), `${page}: app.js must load`);
  assert(html.includes('assets/js/core/page-hydration.js'), `${page}: page-hydration.js must load`);
  assert(html.includes('assets/js/core/stable-shell-router.js'), `${page}: stable-shell-router.js must load`);
  assert(html.includes('assets/js/ui/mobile-drawer.js'), `${page}: mobile-drawer.js must load`);
  assert(html.includes('assets/js/ui/mobile-drawer-standard.js'), `${page}: mobile-drawer-standard.js must load`);
}

assertShellContract(listingHtml, 'comunidade.html');
assertShellContract(roomHtml, 'comunidade-interna.html');

assert(/root\.dataset\.communityRoomReady === 'true'/.test(roomJs), 'Community room bootstrap must be idempotent');
assert(/document\.addEventListener\('DOMContentLoaded', window\.DokeInitCommunityRoom, \{ once: true \}\)/.test(roomJs), 'DOMContentLoaded bootstrap must use once:true');
assert(/function openRequestedSettingsPanel\(\)/.test(roomJs), 'Community room must support direct settings panel reload');
assert(/params\.get\('settings'\)/.test(roomJs), 'Community room settings reload must read settings query parameter');
assert(/openRequestedSettingsPanel\(\);/.test(roomJs), 'Community room must open requested settings panel during initial render');
assert(!/console\.count\('community-room-bootstrap'\)/.test(roomJs), 'Temporary bootstrap console.count must not ship');
assert(!/console\.trace\('community-room-bootstrap'\)/.test(roomJs), 'Temporary bootstrap console.trace must not ship');

console.log('Community shell/bootstrap contract: OK');
