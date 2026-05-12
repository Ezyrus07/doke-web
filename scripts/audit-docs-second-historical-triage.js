const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const registryPath = path.join(ROOT, 'docs', 'DOCS-REGISTRY.md');
const triagePath = path.join(ROOT, 'docs', 'DOCS-SECOND-HISTORICAL-TRIAGE.md');
const activeIndexPath = path.join(ROOT, 'docs', 'ACTIVE-CONTRACTS-INDEX.md');
const reportPath = path.join(ROOT, 'docs', 'validation', 'global-cycle-69-docs-second-historical-triage-report.json');

const allowedCategories = new Set([
  'historical-candidate',
  'support-operational',
  'manual-review',
  'validation-evidence'
]);

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function extractSection(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(regex);
  return match ? match[1] : '';
}

function extractRegistryLegacyItems(markdown) {
  const section = extractSection(markdown, 'Histórico/legado a revisar');
  return [...section.matchAll(/- `([^`]+)`/g)].map((match) => match[1]);
}

function extractTriageRows(markdown) {
  const rows = [];
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith('| `docs/')) continue;
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length < 4) continue;
    const file = cells[0].replace(/^`|`$/g, '');
    const category = cells[1].replace(/^`|`$/g, '');
    rows.push({ file, category, recommendation: cells[2], reason: cells[3] });
  }
  return rows;
}

function unique(values) {
  return [...new Set(values)];
}

const registry = read(registryPath);
const triage = read(triagePath);
const activeIndex = read(activeIndexPath);

const legacyItems = extractRegistryLegacyItems(registry);
const rows = extractTriageRows(triage);
const triageFiles = rows.map((row) => row.file);

const legacySet = new Set(legacyItems);
const triageSet = new Set(triageFiles);

const missingFromTriage = legacyItems.filter((file) => !triageSet.has(file));
const extraInTriage = triageFiles.filter((file) => !legacySet.has(file));
const duplicateTriageFiles = unique(triageFiles.filter((file, index) => triageFiles.indexOf(file) !== index));

const invalidCategories = rows.filter((row) => !allowedCategories.has(row.category));
const missingFiles = rows.filter((row) => !fs.existsSync(path.join(ROOT, row.file))).map((row) => row.file);
const activeIndexLeaks = rows
  .filter((row) => activeIndex.includes(row.file))
  .map((row) => row.file);
const validationCategoryErrors = rows
  .filter((row) => row.file.startsWith('docs/validation/') && row.category !== 'validation-evidence')
  .map((row) => row.file);
const nonValidationEvidenceErrors = rows
  .filter((row) => row.category === 'validation-evidence' && !row.file.startsWith('docs/validation/'))
  .map((row) => row.file);

const counts = rows.reduce((acc, row) => {
  acc[row.category] = (acc[row.category] || 0) + 1;
  return acc;
}, {});

const report = {
  cycle: 69,
  audit: 'docs-second-historical-triage',
  generatedAt: new Date().toISOString(),
  sourceRegistry: 'docs/DOCS-REGISTRY.md',
  triageDocument: 'docs/DOCS-SECOND-HISTORICAL-TRIAGE.md',
  activeContractsIndex: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  summary: {
    registryLegacyItems: legacyItems.length,
    triageRows: rows.length,
    counts,
    missingFromTriage: missingFromTriage.length,
    extraInTriage: extraInTriage.length,
    duplicateTriageFiles: duplicateTriageFiles.length,
    invalidCategories: invalidCategories.length,
    missingFiles: missingFiles.length,
    activeIndexLeaks: activeIndexLeaks.length,
    validationCategoryErrors: validationCategoryErrors.length,
    nonValidationEvidenceErrors: nonValidationEvidenceErrors.length
  },
  details: {
    missingFromTriage,
    extraInTriage,
    duplicateTriageFiles,
    invalidCategories,
    missingFiles,
    activeIndexLeaks,
    validationCategoryErrors,
    nonValidationEvidenceErrors
  }
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');

const failed = [
  missingFromTriage.length,
  extraInTriage.length,
  duplicateTriageFiles.length,
  invalidCategories.length,
  missingFiles.length,
  activeIndexLeaks.length,
  validationCategoryErrors.length,
  nonValidationEvidenceErrors.length
].some(Boolean);

if (failed) {
  console.error('[docs-second-historical-triage] FAILED');
  console.error(JSON.stringify(report.summary, null, 2));
  process.exit(1);
}

console.log('[docs-second-historical-triage] OK');
console.log(JSON.stringify(report.summary, null, 2));
