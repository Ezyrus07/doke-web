#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const keepReadmeDirs = [
  path.join(root, 'reports'),
  path.join(root, 'docs', 'reports'),
];
const deleteFiles = [
  path.join(root, 'component_audit_data.json'),
];


function removeManifestAssets() {
  const manifestPath = path.join(root, 'docs', 'PHASE21-UNUSED-CSS-REMOVAL-MANIFEST.json');
  if (!fs.existsSync(manifestPath)) return;
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  for (const entry of manifest.removed || []) {
    if (!entry.path) continue;
    const target = path.join(root, entry.path);
    if (fs.existsSync(target)) {
      fs.rmSync(target, { recursive: true, force: true });
      console.log(`removed ${entry.path}`);
    }
  }
}

function pruneEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.existsSync(full) && fs.statSync(full).isDirectory()) {
      pruneEmptyDirs(full);
    }
  }
  if (dir !== root) {
    try { fs.rmdirSync(dir); } catch (_) {}
  }
}

function rmFile(file) {
  if (fs.existsSync(file) && fs.statSync(file).isFile()) {
    fs.unlinkSync(file);
    console.log(`removed ${path.relative(root, file)}`);
  }
}

function cleanDirKeepingReadme(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (entry === 'README.md') continue;
    fs.rmSync(full, { recursive: true, force: true });
    console.log(`removed ${path.relative(root, full)}`);
  }
}

for (const file of deleteFiles) rmFile(file);
for (const dir of keepReadmeDirs) cleanDirKeepingReadme(dir);
removeManifestAssets();
pruneEmptyDirs(path.join(root, 'assets', 'css'));
console.log('Phase 21 generated reports and unused CSS cleanup complete.');
