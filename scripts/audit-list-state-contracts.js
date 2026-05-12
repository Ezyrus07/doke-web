const fs = require('fs');
const path = require('path');

const root = process.cwd();
const files = {
  manifest: 'assets/css/core/components.css',
  css: 'assets/css/components/states/list-states.css',
  js: 'assets/js/core/list-state.js',
  docs: 'docs/LIST-STATE-CONTRACTS.md'
};

const report = {
  ok: true,
  checkedAt: new Date().toISOString(),
  missing: [],
  failures: []
};

function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    report.ok = false;
    report.missing.push(rel);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

const manifest = read(files.manifest);
const css = read(files.css);
const js = read(files.js);
read(files.docs);

if (manifest && !manifest.includes('../components/states/list-states.css')) {
  report.ok = false;
  report.failures.push('components.css must import components/states/list-states.css');
}

['data-list-region', 'data-list', 'data-list-loading', 'data-list-empty', 'data-list-error', 'data-state'].forEach((hook) => {
  if (!css.includes(hook)) {
    report.ok = false;
    report.failures.push(`list-states.css missing hook ${hook}`);
  }
});

['setListState', 'updateListStateFromItems', 'clearList', 'appendListItems'].forEach((fn) => {
  if (!js.includes(`export function ${fn}`)) {
    report.ok = false;
    report.failures.push(`list-state.js missing export ${fn}`);
  }
});

['fetch(', 'supabase', 'firebase', 'localStorage', 'sessionStorage'].forEach((forbidden) => {
  if (js.includes(forbidden)) {
    report.ok = false;
    report.failures.push(`list-state.js must not depend on ${forbidden}`);
  }
});

if (/!important/.test(css)) {
  report.ok = false;
  report.failures.push('list-states.css must not use !important');
}

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/validation/global-cycle-29-list-state-contracts-report.json'), JSON.stringify(report, null, 2));

if (!report.ok) {
  console.error('List state contract audit failed.');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('List state contract audit passed.');
