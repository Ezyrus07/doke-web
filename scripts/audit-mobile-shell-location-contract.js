#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const fail = (messages) => {
  const list = Array.isArray(messages) ? messages : [messages];
  console.error(`Mobile shell location contract: FAIL\n- ${list.join('\n- ')}`);
  process.exit(1);
};

const cssPath = 'assets/css/components/shell/mobile-app-shell.css';
const css = read(cssPath);
const problems = [];

if (!css.includes('--doke-mobile-shell-action-height: var(--doke-mobile-shell-topbar-height);')) {
  problems.push(`${cssPath}: missing action height token tied to the mobile topbar height`);
}

const locationBlock = css.match(/body\.doke-mobile-shell-mounted\s+\.doke-mobile-shell__location\s*\{[\s\S]*?\n\s*\}/);
if (!locationBlock) {
  problems.push(`${cssPath}: missing .doke-mobile-shell__location rule`);
} else {
  const block = locationBlock[0];
  [
    'height: var(--doke-mobile-shell-action-height)',
    'min-height: var(--doke-mobile-shell-action-height)',
    'max-height: var(--doke-mobile-shell-action-height)',
    'border-radius: calc(var(--doke-mobile-shell-action-height) / 2)',
  ].forEach((needle) => {
    if (!block.includes(needle)) problems.push(`${cssPath}: location block missing ${needle}`);
  });
  if (/height:\s*var\(--control-height-xs\)/.test(block)) {
    problems.push(`${cssPath}: location block must not depend on generic --control-height-xs`);
  }
}

const allowed = new Set([cssPath]);
function walk(dir) {
  const files = [];
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = path.join(dir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) files.push(...walk(rel));
    else if (entry.isFile() && rel.endsWith('.css')) files.push(rel);
  }
  return files;
}

for (const file of walk('assets/css')) {
  if (allowed.has(file)) continue;
  const content = read(file);
  if (/\.doke-mobile-shell__location\b/.test(content)) {
    problems.push(`${file}: must not style .doke-mobile-shell__location outside the mobile shell authority`);
  }
}

const appShellCss = read('assets/css/pages/app-shell.css');
if (!/mobile-app-shell\.css\?v=20260701-mobile-location-contract-v1/.test(appShellCss)) {
  problems.push('assets/css/pages/app-shell.css must import mobile-app-shell.css with the mobile location contract version');
}

if (problems.length) fail(problems);
console.log('Mobile shell location contract: PASS');
