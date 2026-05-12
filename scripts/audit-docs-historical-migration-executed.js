const fs = require('fs');
const path = require('path');

const root = process.cwd();
const planPath = path.join(root, 'docs', 'DOCS-HISTORICAL-MIGRATION-PLAN.md');
const activeIndexPath = path.join(root, 'docs', 'ACTIVE-CONTRACTS-INDEX.md');
const registryPath = path.join(root, 'docs', 'DOCS-REGISTRY.md');
const reportPath = path.join(root, 'docs', 'validation', 'global-cycle-68-docs-historical-migration-executed-report.json');

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function parseRows(plan) {
  return plan
    .split('\n')
    .filter((line) => line.startsWith('| moved |'))
    .map((line) => {
      const cells = line.split('|').map((cell) => cell.trim());
      return {
        status: cells[1],
        source: cells[2].replace(/^`|`$/g, ''),
        destination: cells[3].replace(/^`|`$/g, ''),
        reason: cells[4],
      };
    });
}

function duplicates(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([value]) => value).sort();
}

const plan = read(planPath);
const activeIndex = read(activeIndexPath);
const registry = read(registryPath);
const rows = parseRows(plan);

const missingDestinations = [];
const remainingSources = [];
const activeIndexLeaks = [];
const invalidDestinations = [];
const registryMissingDestinations = [];
const invalidStatuses = [];
const emptyReasons = [];

for (const row of rows) {
  if (row.status !== 'moved') invalidStatuses.push(row.source);
  if (!row.reason || row.reason === '-') emptyReasons.push(row.source);
  if (!row.destination.startsWith('docs/archive/historical/')) invalidDestinations.push(row.destination);
  if (!fs.existsSync(path.join(root, row.destination))) missingDestinations.push(row.destination);
  if (fs.existsSync(path.join(root, row.source))) remainingSources.push(row.source);
  if (activeIndex.includes(row.source) || activeIndex.includes(row.destination)) activeIndexLeaks.push(row.destination);
  if (!registry.includes(`\`${row.destination}\``)) registryMissingDestinations.push(row.destination);
}

const duplicateSources = duplicates(rows.map((row) => row.source));
const duplicateDestinations = duplicates(rows.map((row) => row.destination));

const checks = {
  expectedMovedCount: rows.length === 15,
  destinationsExist: missingDestinations.length === 0,
  sourcesRemovedFromOriginalLocation: remainingSources.length === 0,
  notInActiveContractsIndex: activeIndexLeaks.length === 0,
  destinationsInsideArchiveHistorical: invalidDestinations.length === 0,
  statusesAreMoved: invalidStatuses.length === 0,
  reasonsPresent: emptyReasons.length === 0,
  noDuplicateSources: duplicateSources.length === 0,
  noDuplicateDestinations: duplicateDestinations.length === 0,
  registryReferencesDestinations: registryMissingDestinations.length === 0,
};

const ok = Object.values(checks).every(Boolean);
const report = {
  ok,
  cycle: 68,
  audit: 'docs-historical-migration-executed',
  plan: 'docs/DOCS-HISTORICAL-MIGRATION-PLAN.md',
  registry: 'docs/DOCS-REGISTRY.md',
  activeIndex: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  destinationRoot: 'docs/archive/historical/',
  movedCount: rows.length,
  checks,
  issues: {
    missingDestinations,
    remainingSources,
    activeIndexLeaks,
    invalidDestinations,
    invalidStatuses,
    emptyReasons,
    duplicateSources,
    duplicateDestinations,
    registryMissingDestinations,
  },
  movedFiles: rows,
};

writeReport(report);

if (!ok) {
  console.error('[docs-historical-migration-executed] FAILED');
  console.error(JSON.stringify(report.issues, null, 2));
  process.exit(1);
}

console.log(`[docs-historical-migration-executed] OK — ${rows.length} historical candidates migrated.`);
console.log(`[docs-historical-migration-executed] Report: ${path.relative(root, reportPath)}`);
