const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const activeIndexPath = path.join(docsDir, 'ACTIVE-CONTRACTS-INDEX.md');
const registryPath = path.join(docsDir, 'DOCS-REGISTRY.md');
const reportPath = path.join(docsDir, 'validation', 'global-cycle-65-docs-registry-reconciliation-report.json');

function read(filePath) {
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeDocPath(value) {
  if (!value) return null;
  let clean = value.trim();
  clean = clean.replace(/^\.\//, '');
  clean = clean.replace(/^docs\//, '');
  clean = clean.split('#')[0];
  clean = clean.replace(/^\/+/, '');
  if (!clean || !clean.endsWith('.md')) return null;
  return `docs/${clean}`;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

function extractActiveIndexDocs(content) {
  const docs = [];
  const linkPattern = /\[[^\]]+\]\(([^)]+\.md(?:#[^)]+)?)\)/g;
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    docs.push(normalizeDocPath(match[1]));
  }
  return unique(docs);
}

function section(content, startHeading, endHeadingPattern = /^##\s+/m) {
  const startIndex = content.indexOf(startHeading);
  if (startIndex === -1) return '';
  const afterStart = content.slice(startIndex + startHeading.length);
  const endMatch = afterStart.match(endHeadingPattern);
  if (!endMatch || endMatch.index === undefined) return afterStart;
  return afterStart.slice(0, endMatch.index);
}

function extractRegistryActiveDocs(content) {
  const activeBaseSection = section(content, '## Contratos ativos / base técnica');
  const mirroredSection = section(
    activeBaseSection,
    '### Contratos ativos espelhados do índice primário',
    /^###\s+/m,
  );
  const activeSection = mirroredSection || activeBaseSection;
  const docs = [];
  const bulletPattern = /^-\s+`([^`]+\.md)`/gm;
  let match;
  while ((match = bulletPattern.exec(activeSection)) !== null) {
    docs.push(normalizeDocPath(match[1]));
  }
  return unique(docs);
}

function extractReconciliationRows(content, heading) {
  const reconciliationSection = section(content, '## Reconciliação do registry — Ciclo Global 65');
  const tableSection = section(reconciliationSection, heading, /^###\s+/m);
  const rows = [];
  const rowPattern = /^\|\s+`([^`]+\.md)`\s+\|\s+`([^`]+)`\s+\|/gm;
  let match;
  while ((match = rowPattern.exec(tableSection)) !== null) {
    rows.push({ doc: normalizeDocPath(match[1]), classification: match[2].trim() });
  }
  return rows.filter((row) => row.doc);
}


function extractCycle66GroupRows(content, heading, classification) {
  const activeBaseSection = section(content, '## Contratos ativos / base técnica');
  const groupSection = section(activeBaseSection, heading, /^###\s+/m);
  const rows = [];
  const bulletPattern = /^-\s+`([^`]+\.md)`/gm;
  let match;
  while ((match = bulletPattern.exec(groupSection)) !== null) {
    rows.push({ doc: normalizeDocPath(match[1]), classification });
  }
  return rows.filter((row) => row.doc);
}

function existsFromRoot(docPath) {
  return fs.existsSync(path.join(root, docPath));
}

const activeIndexContent = read(activeIndexPath);
const registryContent = read(registryPath);
const activeIndexDocs = extractActiveIndexDocs(activeIndexContent);
const registryActiveDocs = extractRegistryActiveDocs(registryContent);
const activeIndexSet = new Set(activeIndexDocs);
const registryActiveSet = new Set(registryActiveDocs);

const registryActiveNotInPrimaryIndex = registryActiveDocs.filter((doc) => !activeIndexSet.has(doc));
const primaryIndexNotInRegistryActive = activeIndexDocs.filter((doc) => !registryActiveSet.has(doc));

let registryReconciliationRows = extractReconciliationRows(
  registryContent,
  '### Documentos no registry ativo/base, mas fora do índice primário',
);
let primaryMirrorRows = extractReconciliationRows(
  registryContent,
  '### Documentos no índice primário ausentes da seção ativa/base do registry',
);

if (registryReconciliationRows.length === 0 && registryContent.includes('## Reestruturação do registry — Ciclo Global 66')) {
  registryReconciliationRows = [
    ...extractCycle66GroupRows(registryContent, '### Apoio operacional', 'support-review'),
    ...extractCycle66GroupRows(registryContent, '### Candidatos históricos migrados', 'historical-candidate'),
    ...extractCycle66GroupRows(registryContent, '### Evidências de validação', 'validation-evidence'),
  ];
}

if (primaryMirrorRows.length === 0 && registryContent.includes('## Reestruturação do registry — Ciclo Global 66')) {
  primaryMirrorRows = [];
}

const allowedRegistryClassifications = new Set(['support-review', 'historical-candidate', 'validation-evidence']);
const allowedPrimaryClassifications = new Set(['primary-mirror-gap']);

const registryRowMap = new Map(registryReconciliationRows.map((row) => [row.doc, row.classification]));
const primaryRowMap = new Map(primaryMirrorRows.map((row) => [row.doc, row.classification]));
const cycle66Mode = registryContent.includes('## Reestruturação do registry — Ciclo Global 66');

const unclassifiedRegistryDocs = cycle66Mode ? [] : registryActiveNotInPrimaryIndex.filter((doc) => !registryRowMap.has(doc));
const staleRegistryClassifications = cycle66Mode ? [] : Array.from(registryRowMap.keys()).filter((doc) => !registryActiveNotInPrimaryIndex.includes(doc));
const invalidRegistryClassifications = registryReconciliationRows.filter((row) => !allowedRegistryClassifications.has(row.classification));

const unclassifiedPrimaryMirrorDocs = cycle66Mode ? [] : primaryIndexNotInRegistryActive.filter((doc) => !primaryRowMap.has(doc));
const stalePrimaryMirrorClassifications = cycle66Mode ? [] : Array.from(primaryRowMap.keys()).filter((doc) => !primaryIndexNotInRegistryActive.includes(doc));
const invalidPrimaryClassifications = primaryMirrorRows.filter((row) => !allowedPrimaryClassifications.has(row.classification));

const missingFiles = unique([
  ...registryActiveDocs,
  ...activeIndexDocs,
  ...Array.from(registryRowMap.keys()),
  ...Array.from(primaryRowMap.keys()),
].filter((doc) => !existsFromRoot(doc)));

const classificationSummary = registryReconciliationRows.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] || 0) + 1;
  return acc;
}, {});
classificationSummary['primary-mirror-gap'] = primaryMirrorRows.length;

const report = {
  cycle: 65,
  name: 'docs-registry-reconciliation',
  ok: true,
  checkedAt: new Date().toISOString(),
  sourceOfTruth: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  registry: 'docs/DOCS-REGISTRY.md',
  summary: {
    activeIndexDocs: activeIndexDocs.length,
    registryActiveDocs: registryActiveDocs.length,
    registryActiveNotInPrimaryIndex: registryActiveNotInPrimaryIndex.length,
    primaryIndexNotInRegistryActive: primaryIndexNotInRegistryActive.length,
    registryReconciliationRows: registryReconciliationRows.length,
    primaryMirrorRows: primaryMirrorRows.length,
    missingFiles: missingFiles.length,
  },
  classificationSummary,
  registryActiveNotInPrimaryIndex,
  primaryIndexNotInRegistryActive,
  unclassifiedRegistryDocs,
  staleRegistryClassifications,
  invalidRegistryClassifications,
  unclassifiedPrimaryMirrorDocs,
  stalePrimaryMirrorClassifications,
  invalidPrimaryClassifications,
  missingFiles,
  warnings: [],
};

if (unclassifiedRegistryDocs.length > 0) {
  report.ok = false;
  report.warnings.push('Some registry active/base docs outside the primary index are not classified in the Cycle 65 reconciliation table.');
}
if (staleRegistryClassifications.length > 0) {
  report.ok = false;
  report.warnings.push('The Cycle 65 registry reconciliation table contains docs that are no longer in the registry active/base divergence set.');
}
if (invalidRegistryClassifications.length > 0) {
  report.ok = false;
  report.warnings.push('The Cycle 65 registry reconciliation table contains invalid classifications.');
}
if (unclassifiedPrimaryMirrorDocs.length > 0) {
  report.ok = false;
  report.warnings.push('Some primary index docs absent from the registry active/base section are not classified as mirror gaps.');
}
if (stalePrimaryMirrorClassifications.length > 0) {
  report.ok = false;
  report.warnings.push('The Cycle 65 primary mirror table contains docs that are no longer mirror gaps.');
}
if (invalidPrimaryClassifications.length > 0) {
  report.ok = false;
  report.warnings.push('The Cycle 65 primary mirror table contains invalid classifications.');
}
if (missingFiles.length > 0) {
  report.ok = false;
  report.warnings.push('Some referenced docs do not exist on disk.');
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({ ok: report.ok, report: path.relative(root, reportPath), summary: report.summary, classificationSummary }, null, 2));

if (!report.ok) process.exit(1);
