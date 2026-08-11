const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const runtime = fs.readFileSync(path.join(root, 'assets/js/features/community-runtime-stability.js'), 'utf8');
const messagesHtml = fs.readFileSync(path.join(root, 'mensagens.html'), 'utf8');
const notificationsHtml = fs.readFileSync(path.join(root, 'notificacoes.html'), 'utf8');
const messagesJs = fs.readFileSync(path.join(root, 'assets/js/pages/mensagens.js'), 'utf8');
const notificationsJs = fs.readFileSync(path.join(root, 'assets/js/pages/notificacoes.js'), 'utf8');
const failures = [];
const check = (label, condition) => { if (!condition) failures.push(label); };

check('retired final logic shim is absent', !fs.existsSync(path.join(root, 'assets/js/features/community-final-logic-stability.js')));
check('messages no longer loads retired final logic shim', !messagesHtml.includes('community-final-logic-stability.js'));
check('notifications no longer loads retired final logic shim', !notificationsHtml.includes('community-final-logic-stability.js'));
check('messages owns aria-expanded synchronization', /setAttribute\(["']aria-expanded["']/.test(messagesJs));
check('notifications owns aria-expanded synchronization', /setAttribute\(["']aria-expanded["']/.test(notificationsJs));
check('messages owns page hydration fallback', messagesJs.includes('DokePageHydration?.create'));
check('notifications owns page hydration fallback', notificationsJs.includes('DokePageHydration?.create'));
check('messages refreshes on canonical auth-session change', messagesJs.includes('doke:auth-session-change'));
check('notifications refreshes on canonical auth-session change', notificationsJs.includes('doke:auth-session-change'));
check('offline queue rejects non-array values before length access', /!Array\.isArray\(queue\) \|\| !queue\.length/.test(runtime));
check('offline enqueue normalizes non-array storage', /Array\.isArray\(parsedQueue\) \? parsedQueue : \[\]/.test(runtime));
check('messages invalidates the shared runtime cache', messagesHtml.includes('20260714-interaction-stability-v1'));
check('notifications invalidates the shared runtime cache', notificationsHtml.includes('20260714-interaction-stability-v1'));

if (failures.length) {
  console.error('Messages interaction stability contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Messages interaction stability contract: OK');
