#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const manifests = [
  'assets/css/pages/comunidade.css',
  'assets/css/pages/comunidade-interna.css',
];
const legacyFiles = [
  'assets/css/pages/comunidade/internal-modal-legacy.css',
  'assets/css/pages/comunidade-interna/internal-modal-legacy.css',
];
const requiredPatterns = [
  'assets/css/patterns/community-request-modal.css',
  'assets/css/patterns/community-room-layout.css',
];

const failures = [];
const warnings = [];

function read(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    failures.push(`Missing expected file: ${rel}`);
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}

for (const rel of requiredPatterns) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing migrated pattern: ${rel}`);
}

for (const rel of manifests) {
  const content = read(rel);
  if (/internal-modal-legacy\.css/.test(content)) {
    failures.push(`${rel} still imports internal-modal-legacy.css`);
  }
}

const comunidade = read('assets/css/pages/comunidade.css');
const interna = read('assets/css/pages/comunidade-interna.css');
if (!/community-request-modal\.css/.test(comunidade)) {
  failures.push('comunidade.css must import community-request-modal.css');
}
if (!/community-request-modal\.css/.test(interna)) {
  failures.push('comunidade-interna.css must import community-request-modal.css');
}
if (!/community-room-layout\.css/.test(interna)) {
  failures.push('comunidade-interna.css must import community-room-layout.css');
}

const stillPresent = legacyFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
if (stillPresent.length) {
  warnings.push(`Legacy files still present but disconnected: ${stillPresent.join(', ')}. Run npm run cleanup:community-legacy-css to remove them.`);
}

const report = {
  ok: failures.length === 0,
  checkedAt: new Date().toISOString(),
  manifests,
  requiredPatterns,
  legacyFiles,
  stillPresent,
  warnings,
  failures,
};

const out = path.join(root, 'docs/validation/global-cycle-50-community-legacy-removal-report.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));

if (failures.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('Community legacy removal audit passed.');
if (warnings.length) console.warn(warnings.join('\n'));
