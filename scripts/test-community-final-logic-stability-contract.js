const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const retired = 'assets/js/features/community-final-logic-stability.js';
const fail = (message) => { throw new Error(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

if (fs.existsSync(path.join(root, retired))) fail('retired final logic shim still exists');
for (const page of fs.readdirSync(root).filter((name) => name.endsWith('.html'))) {
  if (read(page).includes('community-final-logic-stability.js')) fail(`${page} still loads retired final logic shim`);
}

const messages = read('assets/js/pages/mensagens.js');
const notifications = read('assets/js/pages/notificacoes.js');
const ownerChecks = [
  ['messages owns auth-session refresh', messages.includes('doke:auth-session-change')],
  ['notifications owns auth-session refresh', notifications.includes('doke:auth-session-change')],
  ['messages owns hydration', messages.includes('DokePageHydration?.create')],
  ['notifications owns hydration', notifications.includes('DokePageHydration?.create')],
  ['messages owns aria-expanded state', /setAttribute\(["']aria-expanded["']/.test(messages)],
  ['notifications owns aria-expanded state', /setAttribute\(["']aria-expanded["']/.test(notifications)]
];
ownerChecks.forEach(([label, ok]) => { if (!ok) fail(label); });

const activeProductFiles = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.js')) activeProductFiles.push(full);
  }
};
walk(path.join(root, 'assets', 'js'));
for (const token of ['doke:account-context-invalidated', 'doke:account-context-refreshed', 'doke:submit-complete', 'logicSubmitting', 'data-logic-fallback-error', 'doke:final-logic-stability-ready']) {
  const owners = activeProductFiles.filter((file) => fs.readFileSync(file, 'utf8').includes(token));
  if (owners.length) fail(`retired shim token still active in product JS: ${token}`);
}

console.log('Community final logic retirement contract: OK');
