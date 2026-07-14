const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const finalLogic = fs.readFileSync(path.join(root, 'assets/js/features/community-final-logic-stability.js'), 'utf8');
const runtime = fs.readFileSync(path.join(root, 'assets/js/features/community-runtime-stability.js'), 'utf8');
const messages = fs.readFileSync(path.join(root, 'mensagens.html'), 'utf8');
const notifications = fs.readFileSync(path.join(root, 'notificacoes.html'), 'utf8');
const failures = [];
const check = (label, condition) => { if (!condition) failures.push(label); };

check('ARIA writes are idempotent', finalLogic.includes('function setAttributeIfChanged'));
check('aria-expanded synchronization uses the idempotent writer', /setAttributeIfChanged\(control, ['"]aria-expanded['"]/.test(finalLogic));
check('aria-hidden synchronization uses the idempotent writer', /setAttributeIfChanged\(node, ['"]aria-hidden['"]/.test(finalLogic));
check('observer does not watch its own aria-expanded writes', /attributeFilter:\s*\[['"]hidden['"]\]/.test(finalLogic) && !/attributeFilter:\s*\[[^\]]*aria-expanded/.test(finalLogic));
check('expanded state is derived from controlled target visibility', finalLogic.includes('function syncControlsForTarget'));
check('offline queue rejects non-array values before length access', /!Array\.isArray\(queue\) \|\| !queue\.length/.test(runtime));
check('offline enqueue normalizes non-array storage', /Array\.isArray\(parsedQueue\) \? parsedQueue : \[\]/.test(runtime));
check('messages invalidates the shared runtime cache', messages.includes('20260714-interaction-stability-v1'));
check('notifications invalidates the shared runtime cache', notifications.includes('20260714-interaction-stability-v1'));

if (failures.length) {
  console.error('Messages interaction stability contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Messages interaction stability contract: OK');
