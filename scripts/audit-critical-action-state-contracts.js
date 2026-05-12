const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ACTIONS = [
  { file: 'finalizar-pedido.html', selector: 'data-finalize-submit' },
  { file: 'pagamento.html', selector: 'data-payment-submit' },
  { file: 'adicionar-cartao.html', selector: 'data-card-add-submit' },
  { file: 'avaliacao.html', selector: 'data-review-submit' }
];
const REPORT = path.join(ROOT, 'docs/validation/global-cycle-131-135-critical-action-state-contracts-report.json');

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

const results = ACTIONS.map(({ file, selector }) => {
  const content = read(file);
  const idx = content.indexOf(selector);
  const windowText = idx >= 0 ? content.slice(Math.max(0, idx - 240), idx + 320) : '';
  const missing = [];
  if (idx < 0) missing.push(selector);
  if (!windowText.includes('data-action-state="idle"')) missing.push('data-action-state="idle"');
  if (!windowText.includes('data-action-loading-label=')) missing.push('data-action-loading-label');
  return {
    file,
    selector,
    status: missing.length ? 'failed' : 'passed',
    missing
  };
});

const failed = results.filter((item) => item.status !== 'passed');
const report = {
  cycle: '131-135',
  scope: 'critical-action-state-contracts',
  status: failed.length ? 'failed' : 'passed',
  checkedActions: results.length,
  failedActions: failed.length,
  actions: results
};

fs.mkdirSync(path.dirname(REPORT), { recursive: true });
fs.writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

if (failed.length) {
  console.error('[audit:critical-action-state-contracts] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('[audit:critical-action-state-contracts] passed');
console.log(JSON.stringify({ checkedActions: report.checkedActions }, null, 2));
