#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rel = (...parts) => path.join(root, ...parts);
const failures = [];
const notes = [];

const requiredFiles = [
  'assets/css/patterns/community-request-modal.css',
  'assets/css/patterns/community-room-layout.css',
  'assets/css/pages/comunidade.css',
  'assets/css/pages/comunidade-interna.css'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(rel(file))) failures.push(`Missing required file: ${file}`);
}

function read(file) {
  return fs.existsSync(rel(file)) ? fs.readFileSync(rel(file), 'utf8') : '';
}

const comunidade = read('assets/css/pages/comunidade.css');
const interna = read('assets/css/pages/comunidade-interna.css');
const requestPattern = read('assets/css/patterns/community-request-modal.css');
const roomPattern = read('assets/css/patterns/community-room-layout.css');

if (/internal-modal-legacy\.css/.test(comunidade)) {
  failures.push('comunidade.css still imports internal-modal-legacy.css');
}
if (/internal-modal-legacy\.css/.test(interna)) {
  failures.push('comunidade-interna.css still imports internal-modal-legacy.css');
}
if (!/community-request-modal\.css/.test(comunidade)) {
  failures.push('comunidade.css does not import community-request-modal.css');
}
if (!/community-request-modal\.css/.test(interna)) {
  failures.push('comunidade-interna.css does not import community-request-modal.css');
}
if (!/community-room-layout\.css/.test(interna)) {
  failures.push('comunidade-interna.css does not import community-room-layout.css');
}
if (!/\.community-request-modal/.test(requestPattern)) {
  failures.push('community-request-modal.css does not own .community-request-modal');
}
if (!/\.community-request-modal__dialog/.test(requestPattern)) {
  failures.push('community-request-modal.css does not own .community-request-modal__dialog');
}
if (!/\.community-room\b/.test(roomPattern)) {
  failures.push('community-room-layout.css does not own .community-room');
}
if (!/\.community-message-list/.test(roomPattern)) {
  failures.push('community-room-layout.css does not own .community-message-list');
}
if (!/\.community-chat-composer/.test(roomPattern)) {
  failures.push('community-room-layout.css does not own .community-chat-composer');
}

const legacyFiles = [
  'assets/css/pages/comunidade/internal-modal-legacy.css',
  'assets/css/pages/comunidade-interna/internal-modal-legacy.css'
].filter(file => fs.existsSync(rel(file)));
if (legacyFiles.length) {
  notes.push(`Legacy files kept for compatibility, but no longer imported by page manifests: ${legacyFiles.join(', ')}`);
}

const report = {
  cycle: 49,
  name: 'community pattern migration',
  checkedAt: new Date().toISOString(),
  failures,
  notes,
  files: requiredFiles
};

const outDir = rel('docs/validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-49-community-pattern-migration-report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('Community pattern migration audit failed:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log('Community pattern migration audit passed.');
if (notes.length) notes.forEach(note => console.log(`Note: ${note}`));
