#!/usr/bin/env node
/*
  Detects exact duplicate CSS/JS assets after line-ending normalization.
  This audit is informational: it writes a compact report and exits 0 so the
  cleanup can be planned without blocking unrelated work.
*/
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'reports', 'generated');
const OUT_JSON = path.join(OUT_DIR, 'duplicate-assets-summary.json');
const ASSET_ROOTS = ['assets/css', 'assets/js'];
const EXTENSIONS = new Set(['.css', '.js']);
const IGNORE_DIRS = new Set(['node_modules', '.git']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry.name))) out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/');
}

function hashFile(file) {
  const normalized = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const groups = new Map();
for (const root of ASSET_ROOTS) {
  for (const file of walk(path.join(ROOT, root))) {
    const hash = hashFile(file);
    if (!groups.has(hash)) groups.set(hash, []);
    groups.get(hash).push(rel(file));
  }
}

const duplicateGroups = [...groups.values()]
  .filter((files) => files.length > 1)
  .map((files) => ({ files: files.sort(), count: files.length }));

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify({
  generatedAt: new Date().toISOString(),
  duplicateGroups: duplicateGroups.length,
  duplicatedFiles: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
  groups: duplicateGroups,
}, null, 2));

console.log('Duplicate asset audit complete.');
console.log(`Duplicate groups: ${duplicateGroups.length}`);
console.log(`Duplicated files: ${duplicateGroups.reduce((sum, group) => sum + group.count, 0)}`);
console.log(`Report: ${path.relative(ROOT, OUT_JSON).replace(/\\/g, '/')}`);
