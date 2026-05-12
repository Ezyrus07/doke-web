#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const pkgPath = path.join(root, 'package.json');
const validationDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(validationDir, { recursive: true });

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function extractNodeTargets(command) {
  const targets = [];
  const re = /(?:^|&&|\|\||;)\s*node\s+([^\s;&|]+)/g;
  let match;
  while ((match = re.exec(command))) {
    targets.push(match[1].replace(/^['\"]|['\"]$/g, ''));
  }
  return targets;
}

function extractNpmRunTargets(command) {
  const targets = [];
  const re = /npm\s+run\s+([^\s;&|]+)/g;
  let match;
  while ((match = re.exec(command))) targets.push(match[1]);
  return targets;
}

const pkg = readJson(pkgPath);
const scripts = pkg.scripts || {};
const failures = [];
const warnings = [];
const notes = [];
const rows = [];
const cleanupScripts = [];
const auditScripts = [];
const visualScripts = [];
const testScripts = [];

for (const [name, command] of Object.entries(scripts)) {
  if (name.startsWith('cleanup:')) cleanupScripts.push(name);
  if (name.startsWith('audit:')) auditScripts.push(name);
  if (name.startsWith('visual:')) visualScripts.push(name);
  if (name.startsWith('test:')) testScripts.push(name);

  const nodeTargets = extractNodeTargets(command);
  const npmRunTargets = extractNpmRunTargets(command);
  const missingNodeTargets = nodeTargets.filter((target) => !exists(target));
  const missingNpmTargets = npmRunTargets.filter((target) => !scripts[target]);

  missingNodeTargets.forEach((target) => failures.push(`${name} points to missing node target: ${target}`));
  missingNpmTargets.forEach((target) => failures.push(`${name} runs missing npm script: ${target}`));

  rows.push({ name, command, nodeTargets, npmRunTargets, missingNodeTargets, missingNpmTargets });
}

if (!scripts['audit:all']) {
  warnings.push('package.json has no audit:all command.');
} else {
  const allTargets = extractNpmRunTargets(scripts['audit:all']);
  const missingFromAll = ['audit:desktop-base', 'audit:desktop-shell', 'audit:responsive-boundaries'].filter((script) => !allTargets.includes(script));
  if (missingFromAll.length) {
    warnings.push(`audit:all does not include core guard(s): ${missingFromAll.join(', ')}`);
  }
  const newCycleAudits = auditScripts.filter((script) => /baseline|data|ownership|cleanup|registry|important|legacy|duplicate|snapshot|visual|script-order|page-assets/.test(script));
  notes.push(`There are ${newCycleAudits.length} specialized audit commands. They are intentionally not all required in audit:all to keep the default pipeline stable.`);
}

const duplicateCommands = new Map();
for (const [name, command] of Object.entries(scripts)) {
  const list = duplicateCommands.get(command) || [];
  list.push(name);
  duplicateCommands.set(command, list);
}
for (const [command, names] of duplicateCommands.entries()) {
  if (names.length > 1) warnings.push(`Multiple scripts share the same command (${names.join(', ')}): ${command}`);
}

// Cleanup scripts are allowed, but each should have an audit pair when they remove files.
for (const cleanup of cleanupScripts) {
  const suffix = cleanup.replace(/^cleanup:/, '');
  const likelyAudit = `audit:${suffix}`;
  if (!scripts[likelyAudit]) {
    notes.push(`Cleanup command ${cleanup} has no same-suffix audit command (${likelyAudit}). This may be acceptable when a broader audit covers it.`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  totals: {
    scripts: Object.keys(scripts).length,
    auditScripts: auditScripts.length,
    cleanupScripts: cleanupScripts.length,
    visualScripts: visualScripts.length,
    testScripts: testScripts.length,
    nodeTargets: rows.reduce((sum, row) => sum + row.nodeTargets.length, 0),
  },
  failures,
  warnings,
  notes,
  scripts: rows,
};

fs.writeFileSync(path.join(validationDir, 'global-cycle-57-package-script-registry-report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('Package script registry audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Package script registry audit passed.');
console.log(`Scripts: ${report.totals.scripts}`);
console.log(`Audit scripts: ${report.totals.auditScripts}`);
console.log(`Cleanup scripts: ${report.totals.cleanupScripts}`);
console.log(`Warnings: ${warnings.length}`);
