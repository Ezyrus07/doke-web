const fs = require('fs');

function read(path) { return fs.readFileSync(path, 'utf8'); }
function expect(condition, message) { if (!condition) throw new Error(message); }

const adminHtml = read('admin.html');
const adminJs = read('assets/js/pages/admin.js');
const adminCss = read('assets/css/pages/admin.css');
const roomHtml = read('comunidade-interna.html');
const roomJs = read('assets/js/pages/comunidade-interna.js');
const roomCss = read('assets/css/pages/comunidade-interna.css');

expect(adminHtml.includes('data-admin-access-pending'), 'Admin must expose a compact authorization pending surface.');
expect(!adminHtml.includes('data-admin-access-skeleton'), 'Admin must not use a dashboard-shaped skeleton for authorization.');
expect(adminJs.includes("setAccessSurface('guard-pending')"), 'Admin guard must keep an explicit pending lifecycle state.');
expect(adminJs.includes("next === 'loading' ? 'Preparando o painel administrativo'"), 'Admin pending copy must distinguish authorization from data preparation.');
expect(adminCss.includes('.admin-access-pending__surface'), 'Admin pending surface must be styled by the page owner.');
expect(!adminCss.includes('.admin-lifecycle-skeleton__grid'), 'Obsolete admin skeleton anatomy must be removed.');

expect(roomHtml.includes('data-community-room-pending'), 'Community room must expose a compact protected-route pending surface.');
expect(!roomHtml.includes('data-community-room-skeleton'), 'Community room must not use a full chat skeleton while access is unresolved.');
expect(roomJs.includes("setCommunityRoomPending('checking')"), 'Community room must start in access-checking state.');
expect(roomJs.includes("setCommunityRoomPending('preparing')"), 'Community room must distinguish allowed data preparation.');
expect(roomCss.includes('.community-room-access-pending__surface'), 'Community room pending surface must be styled.');
expect(!roomCss.includes('community-room-hydration-skeleton__'), 'Obsolete community room skeleton anatomy must be removed.');

console.log('protected-route-pending-state-contract: ok');
