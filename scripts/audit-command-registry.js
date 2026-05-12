#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const REPORT_PATH = path.join(ROOT, 'docs/validation/global-cycle-142-command-registry-report.json');

const commandGroups = {
  baseline: ['audit:active-contracts-index', 'audit:docs-primary-index'],
  product: ['audit:product-pages'],
  structuralDebt: ['audit:global-structural-debt'],
  cssDesignSystem: ['audit:global-css-design-system'],
  dataReady: ['audit:global-data-ready-states', 'audit:global-state-completion'],
  globalClosure: ['audit:global-completion'],
  final: ['audit:global-final-readiness']
};

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const scripts = packageJson.scripts || {};
const missing = [];
for (const [group, commands] of Object.entries(commandGroups)) {
  for (const command of commands) {
    if (!scripts[command]) missing.push({ group, command });
  }
}

const registryPath = path.join(ROOT, 'docs/GLOBAL-AUDIT-COMMANDS.md');
const registryExists = fs.existsSync(registryPath);
const registryText = registryExists ? fs.readFileSync(registryPath, 'utf8') : '';
const registryMissingCommands = Object.values(commandGroups).flat().filter((command) => !registryText.includes(command));

const report = {
  cycle: 142,
  name: 'audit command registry',
  generatedAt: new Date().toISOString(),
  groupCount: Object.keys(commandGroups).length,
  commandCount: Object.values(commandGroups).flat().length,
  missingPackageScripts: missing,
  registryPath: 'docs/GLOBAL-AUDIT-COMMANDS.md',
  registryExists,
  registryMissingCommands,
  status: missing.length || !registryExists || registryMissingCommands.length ? 'failed' : 'passed',
  note: 'Keeps global audit commands discoverable without changing product behavior.'
};

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');
if (report.status !== 'passed') {
  console.error('[command-registry] failed');
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('[command-registry] passed');
