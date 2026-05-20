#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const targets = [
  'assets/css/components/ui/doke-legacy-bridge.css',
  'assets/css/components/surface-contract-final.css',
  'assets/css/pages/comunidade/internal-modal-legacy.css',
];

const activeExtensions = new Set(['.html', '.css']);
const ignoredDirs = new Set(['.git', 'node_modules', 'docs', 'scripts', 'tools']);

function walk(dir, output = []) {
  if (!fs.existsSync(dir)) return output;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, output);
    else if (activeExtensions.has(path.extname(entry.name))) output.push(full);
  }
  return output;
}

const files = walk(root);
const problems = [];

for (const target of targets) {
  const absolute = path.join(root, target);
  if (fs.existsSync(absolute)) {
    problems.push({ type: 'target-still-exists', target });
  }

  const basename = path.basename(target);
  for (const file of files) {
    const relative = path.relative(root, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf8');
    const activeReference = content.includes(target) ||
      content.includes(`href="${target}"`) ||
      content.includes(`href='${target}'`) ||
      content.includes(`@import url("${target}")`) ||
      content.includes(`@import "${target}"`) ||
      content.includes(`@import '${target}'`) ||
      content.includes(`/${basename}`);
    if (activeReference) {
      problems.push({ type: 'active-reference', target, file: relative });
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  auditedTargets: targets,
  activeFilesScanned: files.length,
  problemCount: problems.length,
  problems,
};

fs.mkdirSync(path.join(root, 'docs/validation'), { recursive: true });
fs.writeFileSync(
  path.join(root, 'docs/validation/global-cycle-55-unused-legacy-css-cleanup-audit.json'),
  JSON.stringify(report, null, 2) + '\n'
);

if (problems.length) {
  console.error('Unused legacy CSS cleanup audit failed.');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log('Unused legacy CSS cleanup audit passed.');
