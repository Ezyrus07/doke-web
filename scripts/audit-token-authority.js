#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const WRITE = process.argv.includes('--write');
const TOKENS = 'assets/css/core/tokens.css';
const APP_SHELL = 'assets/css/components/shell/app-shell.css';
const BUTTONS = 'assets/css/components/buttons.css';
const UI_SURFACE_TOKENS = 'assets/css/components/ui-surface/tokens.css';
const REPORT = 'reports/generated/token-authority-report.json';

function read(file) {
  return fs.readFileSync(path.join(ROOT, file), 'utf8');
}

function write(file, content) {
  fs.writeFileSync(path.join(ROOT, file), content);
}

function replaceExact(source, before, after, label) {
  if (!source.includes(before)) {
    throw new Error(`FE-T01 codemod could not find expected block: ${label}`);
  }
  return source.replace(before, after);
}

function walkCss(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkCss(absolute, output);
    } else if (entry.isFile() && entry.name.endsWith('.css')) {
      output.push(path.relative(ROOT, absolute).replace(/\\/g, '/'));
    }
  }
  return output.sort();
}

function applyMigration() {
  let tokens = read(TOKENS);
  tokens = replaceExact(
    tokens,
    `  --color-primary: #245f96;\n  --color-primary-rgb: 36, 95, 150;\n  --color-primary-strong: #184a76;\n  --color-primary-deep: #103b63;\n  --color-primary-bright: var(--color-primary);\n  --color-primary-soft: #e5f0f8;\n  --color-primary-soft-strong: #dbeaf5;\n  --color-primary-border: rgba(var(--color-primary-rgb), 0.20);\n  --color-primary-ring: rgba(var(--color-primary-rgb), 0.28);\n\n  --color-secondary: #168c7d;\n  --color-secondary-strong: #0f6f64;\n  --color-secondary-soft: #e2f4f0;\n  --color-secondary-border: rgba(22, 140, 125, 0.30);`,
    `  /* Public brand authority. Legacy aliases resolve here and must not be redefined downstream. */\n  --doke-color-primary: #2a5f90;\n  --doke-color-primary-rgb: 42, 95, 144;\n  --doke-color-secondary: #298f7f;\n  --doke-color-secondary-rgb: 41, 143, 127;\n  --doke-color-surface: var(--color-surface);\n\n  --color-primary: var(--doke-color-primary);\n  --color-primary-rgb: var(--doke-color-primary-rgb);\n  --color-primary-strong: #184a76;\n  --color-primary-deep: #103b63;\n  --color-primary-bright: var(--color-primary);\n  --color-primary-soft: #e5f0f8;\n  --color-primary-soft-strong: #dbeaf5;\n  --color-primary-border: rgba(var(--color-primary-rgb), 0.20);\n  --color-primary-ring: rgba(var(--color-primary-rgb), 0.28);\n\n  --color-secondary: var(--doke-color-secondary);\n  --color-secondary-strong: #0f6f64;\n  --color-secondary-soft: #e2f4f0;\n  --color-secondary-border: rgba(var(--doke-color-secondary-rgb), 0.30);`,
    'canonical brand colors'
  );
  tokens = replaceExact(
    tokens,
    `  --surface-border-subtle: rgba(36, 88, 135, 0.095);`,
    `  --doke-card-border: rgba(24, 75, 118, 0.10);\n  --surface-border-subtle: var(--doke-card-border);`,
    'canonical card border'
  );
  tokens = tokens.replace(
    '  --control-outline-same-surface: rgba(24, 75, 118, 0.10);',
    '  --control-outline-same-surface: var(--doke-card-border);'
  );
  tokens = tokens.replaceAll('rgba(22, 140, 125,', 'rgba(var(--doke-color-secondary-rgb),');
  tokens = replaceExact(
    tokens,
    `  --gradient-button-primary: linear-gradient(135deg, #2a6fa9 0%, var(--color-primary-deep) 100%);\n  --gradient-button-secondary: linear-gradient(135deg, #149b8a 0%, var(--color-secondary-strong) 100%);\n  --gradient-button-primary-angle: linear-gradient(135deg, #2a6fa9 0%, var(--color-primary-deep) 100%);`,
    `  /* Deprecated compatibility aliases: solid values prevent legacy consumers from restoring gradients. */\n  --gradient-button-primary: var(--color-primary);\n  --gradient-button-secondary: var(--color-secondary);\n  --gradient-button-primary-angle: var(--color-primary);`,
    'solid button compatibility aliases'
  );
  tokens = replaceExact(
    tokens,
    `  --shadow-sm: 0 6px 18px rgba(15, 45, 75, 0.045);`,
    `  --shadow-sm: 0 6px 18px rgba(15, 45, 75, 0.045);\n  --doke-shadow-soft: var(--shadow-sm);`,
    'public soft shadow alias'
  );
  tokens = replaceExact(
    tokens,
    `  --doke-radius-control: var(--radius-control);`,
    `  --doke-radius-control: var(--radius-control);\n  --doke-radius-surface: var(--radius-surface);`,
    'public surface radius alias'
  );
  tokens = replaceExact(
    tokens,
    `  --space-4: 16px;`,
    `  --space-4: 16px;\n  --doke-space-base: var(--space-4);`,
    'public base spacing alias'
  );
  write(TOKENS, tokens);

  let appShell = read(APP_SHELL);
  appShell = replaceExact(
    appShell,
    `  --color-bg: #ecedf2;\n  --color-surface: rgba(255, 255, 255, 0.86);\n  --color-heading: #13263f;\n  --color-text: #22354d;\n  --color-text-soft: #4a617d;\n  --color-text-muted: #69809d;\n  --color-primary: #1f5d92;\n  --color-primary-strong: #164771;\n  --color-primary-soft: #e7f1fb;\n  --color-primary-border: var(--doke-card-border);\n  --gradient-button-primary: var(--gradient-button-primary-angle);`,
    `  /* Shell-specific surfaces use shell tokens; global identity remains owned by core/tokens.css. */`,
    'remove app-shell global token overrides'
  );
  write(APP_SHELL, appShell);

  let buttons = read(BUTTONS);
  buttons = buttons.replace(
    '  background: var(--gradient-button-primary, var(--color-primary));',
    '  background: var(--color-primary);'
  );
  buttons = buttons.replace(
    '  background: var(--color-secondary, #168f7d);',
    '  background: var(--color-secondary, #298f7f);'
  );
  buttons = buttons.replace(
    '  color: var(--color-primary, #176db5);',
    '  color: var(--color-primary, #2a5f90);'
  );
  write(BUTTONS, buttons);

  let uiSurface = read(UI_SURFACE_TOKENS);
  uiSurface = replaceExact(
    uiSurface,
    `  --doke-card-border: var(--color-border-soft);\n`,
    '',
    'remove secondary doke-card-border authority'
  );
  write(UI_SURFACE_TOKENS, uiSurface);

  for (const file of walkCss(path.join(ROOT, 'assets', 'css'))) {
    let source = read(file);
    const migrated = source.replace(/font-weight:\s*900\s*;/g, 'font-weight: var(--doke-type-weight-display);');
    if (migrated !== source) write(file, migrated);
  }
}

if (WRITE) applyMigration();

const failures = [];
const findings = [];
const tokenSource = read(TOKENS);
const appShellSource = read(APP_SHELL);
const buttonSource = read(BUTTONS);

function expectIncludes(source, snippet, message) {
  if (!source.includes(snippet)) failures.push(message);
}

expectIncludes(tokenSource, '--doke-color-primary: #2a5f90;', 'Canonical primary token is not #2a5f90.');
expectIncludes(tokenSource, '--doke-color-primary-rgb: 42, 95, 144;', 'Canonical primary RGB token is missing.');
expectIncludes(tokenSource, '--doke-color-secondary: #298f7f;', 'Canonical secondary token is not #298f7f.');
expectIncludes(tokenSource, '--doke-color-secondary-rgb: 41, 143, 127;', 'Canonical secondary RGB token is missing.');
expectIncludes(tokenSource, '--color-primary: var(--doke-color-primary);', 'Legacy primary alias does not resolve to the public token.');
expectIncludes(tokenSource, '--color-secondary: var(--doke-color-secondary);', 'Legacy secondary alias does not resolve to the public token.');
expectIncludes(tokenSource, '--doke-card-border: rgba(24, 75, 118, 0.10);', 'Canonical card border is missing.');
expectIncludes(tokenSource, '--doke-shadow-soft: var(--shadow-sm);', 'Canonical soft shadow alias is missing.');
expectIncludes(tokenSource, '--doke-radius-control: var(--radius-control);', 'Canonical control radius alias is missing.');
expectIncludes(tokenSource, '--doke-radius-surface: var(--radius-surface);', 'Canonical surface radius alias is missing.');
expectIncludes(tokenSource, '--doke-space-base: var(--space-4);', 'Canonical base spacing alias is missing.');
expectIncludes(tokenSource, '--doke-type-weight-display: var(--font-weight-extrabold);', 'Display weight is not tied to 800.');
expectIncludes(tokenSource, '--gradient-button-primary: var(--color-primary);', 'Primary gradient compatibility alias is not solid.');
expectIncludes(tokenSource, '--gradient-button-secondary: var(--color-secondary);', 'Secondary gradient compatibility alias is not solid.');

for (const forbidden of ['--color-primary:', '--color-primary-strong:', '--color-primary-soft:', '--gradient-button-primary:']) {
  if (appShellSource.includes(forbidden)) failures.push(`app-shell.css still redefines ${forbidden}`);
}
if (buttonSource.includes('gradient-button-primary')) failures.push('buttons.css still consumes the deprecated gradient token.');

const protectedTokens = [
  '--doke-color-primary', '--doke-color-primary-rgb', '--doke-color-secondary',
  '--doke-color-secondary-rgb', '--doke-card-border', '--doke-shadow-soft',
  '--doke-radius-control', '--doke-radius-surface', '--doke-space-base',
  '--doke-type-weight-display', '--color-primary', '--color-primary-rgb',
  '--color-secondary', '--gradient-button-primary', '--gradient-button-secondary',
  '--gradient-button-primary-angle'
];
const declarations = {};
for (const token of protectedTokens) declarations[token] = [];
for (const file of walkCss(path.join(ROOT, 'assets', 'css'))) {
  const source = read(file);
  for (const token of protectedTokens) {
    const pattern = new RegExp(`${token.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\s*:`, 'g');
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
  writeMode: WRITE,
  canonical: {
    primary: '#2a5f90',
    secondary: '#298f7f',
    cardBorder: 'rgba(24, 75, 118, 0.10)',
    displayWeight: 800
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
