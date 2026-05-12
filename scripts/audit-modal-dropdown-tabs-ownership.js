#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [
  {
    file: 'assets/css/components/overlays/modal.css',
    tokens: ['.doke-modal', '[data-modal]', '.doke-modal__surface', '[data-modal-surface]', '[data-modal-close]'],
  },
  {
    file: 'assets/css/components/dropdowns/dropdown.css',
    tokens: ['.doke-dropdown', '[data-dropdown]', '.doke-dropdown__menu', '[data-dropdown-menu]', '[data-dropdown-item]'],
  },
  {
    file: 'assets/css/components/tabs/tabs.css',
    tokens: ['.doke-tabs', '[data-tabs]', '.doke-tabs__list', '[data-tabs-list]', '[data-tab-panel]'],
  },
];
const manifest = 'assets/css/core/components.css';
const errors = [];
const report = {
  cycle: 'global-cycle-15-modal-dropdown-tabs-ownership',
  checkedAt: new Date().toISOString(),
  files: [],
  manifestImports: [],
};

for (const check of checks) {
  const abs = path.join(root, check.file);
  if (!fs.existsSync(abs)) {
    errors.push(`Missing contract: ${check.file}`);
    continue;
  }
  const css = fs.readFileSync(abs, 'utf8');
  if (/!important\b/.test(css)) {
    errors.push(`${check.file} must not introduce !important`);
  }
  for (const token of check.tokens) {
    if (!css.includes(token)) errors.push(`${check.file} missing token ${token}`);
  }
  report.files.push({ file: check.file, bytes: Buffer.byteLength(css), importantCount: (css.match(/!important\b/g) || []).length });
}

const manifestAbs = path.join(root, manifest);
if (!fs.existsSync(manifestAbs)) {
  errors.push(`Missing manifest: ${manifest}`);
} else {
  const css = fs.readFileSync(manifestAbs, 'utf8');
  for (const check of checks) {
    const needle = check.file.replace('assets/css/', '../');
    const imported = css.includes(needle);
    report.manifestImports.push({ file: check.file, imported });
    if (!imported) errors.push(`${manifest} does not import ${check.file}`);
  }
}

const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(validationDir, { recursive: true });
fs.writeFileSync(path.join(validationDir, 'global-cycle-15-modal-dropdown-tabs-report.json'), JSON.stringify({ ...report, errors }, null, 2));

if (errors.length) {
  console.error('Modal/dropdown/tabs ownership audit failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('Modal/dropdown/tabs ownership audit passed.');
