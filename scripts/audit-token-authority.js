#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TOKENS = 'assets/css/core/tokens.css';
const APP_SHELL = 'assets/css/components/shell/app-shell.css';
const HOME_SHELL = 'assets/css/pages/home-shell.css';
const BUTTONS = 'assets/css/components/buttons.css';
const REPORT = 'reports/generated/token-authority-report.json';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function walkCss(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) walkCss(absolute, output);
    else if (entry.isFile() && entry.name.endsWith('.css')) {
      output.push(path.relative(ROOT, absolute).replace(/\\/g, '/'));
    }
  }
  return output;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const failures = [];
const findings = [];
const tokenSource = read(TOKENS);
const appShellSource = read(APP_SHELL);
const homeShellSource = read(HOME_SHELL);
const buttonSource = read(BUTTONS);

function expectIncludes(source, snippet, message) {
  if (!source.includes(snippet)) failures.push(message);
}

expectIncludes(tokenSource, '--doke-color-primary: #2a5f90;', 'Canonical primary token is not #2a5f90.');
expectIncludes(tokenSource, '--doke-color-primary-rgb: 42, 95, 144;', 'Canonical primary RGB token is missing.');
expectIncludes(tokenSource, '--doke-color-secondary: #298f7f;', 'Canonical secondary token is not #298f7f.');
expectIncludes(tokenSource, '--doke-color-secondary-rgb: 41, 143, 127;', 'Canonical secondary RGB token is missing.');
expectIncludes(tokenSource, '--color-primary: var(--doke-color-primary);', 'Legacy primary alias does not resolve to the public token.');
expectIncludes(tokenSource, '--color-primary-rgb: var(--doke-color-primary-rgb);', 'Legacy primary RGB alias does not resolve to the public token.');
expectIncludes(tokenSource, '--color-secondary: var(--doke-color-secondary);', 'Legacy secondary alias does not resolve to the public token.');
expectIncludes(tokenSource, '--doke-card-border: rgba(24, 75, 118, 0.10);', 'Canonical card border is missing.');
expectIncludes(tokenSource, '--surface-border-subtle: var(--doke-card-border);', 'Surface border does not resolve to the canonical card border.');
expectIncludes(tokenSource, '--doke-shadow-soft: var(--shadow-sm);', 'Canonical soft shadow alias is missing.');
expectIncludes(tokenSource, '--doke-radius-control: var(--radius-control);', 'Canonical control radius alias is missing.');
expectIncludes(tokenSource, '--doke-radius-surface: var(--radius-surface);', 'Canonical surface radius alias is missing.');
expectIncludes(tokenSource, '--doke-space-base: var(--space-4);', 'Canonical base spacing alias is missing.');
expectIncludes(tokenSource, '--doke-type-weight-display: var(--font-weight-extrabold);', 'Display weight is not tied to 800.');
expectIncludes(tokenSource, '--gradient-button-primary: var(--color-primary);', 'Primary compatibility alias is not solid.');
expectIncludes(tokenSource, '--gradient-button-secondary: var(--color-secondary);', 'Secondary compatibility alias is not solid.');
expectIncludes(buttonSource, 'background: var(--color-primary);', 'Canonical primary button does not consume the solid primary token.');

for (const [file, source] of [[APP_SHELL, appShellSource], [HOME_SHELL, homeShellSource]]) {
  for (const forbidden of ['--color-primary:', '--color-primary-strong:', '--color-primary-soft:', '--gradient-button-primary:']) {
    if (source.includes(forbidden)) failures.push(`${file} still redefines ${forbidden}`);
  }
}
if (buttonSource.includes('gradient-button-primary')) failures.push('buttons.css still consumes the deprecated gradient alias.');

const protectedTokens = [
  '--doke-color-primary',
  '--doke-color-primary-rgb',
  '--doke-color-secondary',
  '--doke-color-secondary-rgb',
  '--doke-card-border',
  '--doke-shadow-soft',
  '--doke-radius-control',
  '--doke-radius-surface',
  '--doke-space-base',
  '--doke-type-weight-display',
  '--color-primary',
  '--color-primary-rgb',
  '--color-secondary',
  '--gradient-button-primary',
  '--gradient-button-secondary',
  '--gradient-button-primary-angle'
];

const declarations = Object.fromEntries(protectedTokens.map((token) => [token, []]));
for (const file of walkCss(path.join(ROOT, 'assets', 'css'))) {
  const source = read(file);
  for (const token of protectedTokens) {
    const pattern = new RegExp(`${escapeRegExp(token)}\\s*:`, 'g');
    if (pattern.test(source)) declarations[token].push(file);
  }
  const syntheticCount = (source.match(/font-weight:\s*900\s*;/g) || []).length;
  if (syntheticCount) findings.push({ type: 'synthetic-weight-900', file, count: syntheticCount });
}

for (const [token, owners] of Object.entries(declarations)) {
  const unexpected = owners.filter((file) => file !== TOKENS);
  if (unexpected.length) failures.push(`${token} has additional authorities: ${unexpected.join(', ')}`);
  if (!owners.includes(TOKENS)) failures.push(`${token} is not declared in ${TOKENS}.`);
}
if (findings.length) failures.push(`Synthetic font-weight 900 remains in ${findings.length} active CSS files.`);

const report = {
  status: failures.length ? 'fail' : 'pass',
  canonical: {
    primary: '#2a5f90',
    secondary: '#298f7f',
    cardBorder: 'rgba(24, 75, 118, 0.10)',
    displayWeight: 800,
    buttonFill: 'solid'
  },
  protectedTokenOwners: declarations,
  findings,
  failures
};

fs.mkdirSync(path.dirname(path.join(ROOT, REPORT)), { recursive: true });
fs.writeFileSync(path.join(ROOT, REPORT), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('[audit:token-authority] failed');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[audit:token-authority] passed');
console.log(`- report: ${REPORT}`);
