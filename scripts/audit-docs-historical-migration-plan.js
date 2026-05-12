const fs = require('fs');
const path = require('path');

const root = process.cwd();
const planPath = path.join(root, 'docs', 'DOCS-HISTORICAL-MIGRATION-PLAN.md');
const activeIndexPath = path.join(root, 'docs', 'ACTIVE-CONTRACTS-INDEX.md');
const reportPath = path.join(root, 'docs', 'validation', 'global-cycle-67-docs-historical-migration-plan-report.json');

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function parseRows(plan) {
  return plan
    .split('\n')
    .filter((line) => line.startsWith('| planned |') || line.startsWith('| moved |'))
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
const rows = parseRows(plan);
const statuses = new Set(rows.map((row) => row.status));
const phase = statuses.has('moved') ? 'executed' : 'planned';

const invalidStatuses = rows.filter((row) => !['planned', 'moved'].includes(row.status)).map((row) => row.source);
const invalidDestinations = rows.filter((row) => !row.destination.startsWith('docs/archive/historical/')).map((row) => row.destination);
const emptyReasons = rows.filter((row) => !row.reason || row.reason === '-').map((row) => row.source);
const activeIndexLeaks = rows.filter((row) => activeIndex.includes(row.source) || activeIndex.includes(row.destination)).map((row) => row.destination);
const duplicateSources = duplicates(rows.map((row) => row.source));
const duplicateDestinations = duplicates(rows.map((row) => row.destination));

const missingSources = [];
const alreadyMovedDestinations = [];
const missingDestinations = [];
const remainingSources = [];

for (const row of rows) {
  const sourceExists = fs.existsSync(path.join(root, row.source));
  const destinationExists = fs.existsSync(path.join(root, row.destination));
  if (phase === 'planned') {
    if (!sourceExists) missingSources.push(row.source);
    if (destinationExists) alreadyMovedDestinations.push(row.destination);
  } else {
    if (!destinationExists) missingDestinations.push(row.destination);
    if (sourceExists) remainingSources.push(row.source);
  }
}

const checks = {
  expectedCount: rows.length === 15,
  statusesAreKnown: invalidStatuses.length === 0,
  reasonsPresent: emptyReasons.length === 0,
  notInActiveContractsIndex: activeIndexLeaks.length === 0,
  destinationsInsideArchiveHistorical: invalidDestinations.length === 0,
  noDuplicateSources: duplicateSources.length === 0,
  noDuplicateDestinations: duplicateDestinations.length === 0,
  plannedSourcesExist: phase === 'planned' ? missingSources.length === 0 : true,
  plannedDestinationsNotMovedYet: phase === 'planned' ? alreadyMovedDestinations.length === 0 : true,
  movedDestinationsExist: phase === 'executed' ? missingDestinations.length === 0 : true,
  movedSourcesRemovedFromOriginalLocation: phase === 'executed' ? remainingSources.length === 0 : true,
};

const ok = Object.values(checks).every(Boolean);
const report = {
  ok,
  cycle: 67,
  audit: 'docs-historical-migration-plan',
  currentPhase: phase,
  plan: 'docs/DOCS-HISTORICAL-MIGRATION-PLAN.md',
  activeIndex: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  plannedOrMovedCount: rows.length,
  destinationRoot: 'docs/archive/historical/',
  checks,
  issues: {
    invalidStatuses,
    emptyReasons,
    activeIndexLeaks,
    invalidDestinations,
    duplicateSources,
    duplicateDestinations,
    missingSources,
    alreadyMovedDestinations,
    missingDestinations,
    remainingSources,
  },
  moves: rows,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (!ok) {
  console.error('[docs-historical-migration-plan] FAILED');
  console.error(JSON.stringify(report.issues, null, 2));
  process.exit(1);
}

console.log(`[docs-historical-migration-plan] OK — ${rows.length} historical candidates validated (${phase}).`);
console.log(`[docs-historical-migration-plan] Report: ${path.relative(root, reportPath)}`);
