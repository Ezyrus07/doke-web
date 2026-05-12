const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const activeIndexPath = path.join(docsDir, 'ACTIVE-CONTRACTS-INDEX.md');
const registryPath = path.join(docsDir, 'DOCS-REGISTRY.md');
const reportPath = path.join(docsDir, 'validation', 'global-cycle-66-docs-registry-structure-report.json');

function read(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
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

function section(content, startHeading, endHeadingPattern) {
  const startIndex = content.indexOf(startHeading);
  if (startIndex === -1) return '';
  const afterStart = content.slice(startIndex + startHeading.length);
  const endMatch = afterStart.match(endHeadingPattern);
  if (!endMatch || endMatch.index === undefined) return afterStart;
  return afterStart.slice(0, endMatch.index);
}

function extractBulletDocs(content) {
  const docs = [];
  const bulletPattern = /^-\s+`([^`]+\.md)`/gm;
  let match;
  while ((match = bulletPattern.exec(content)) !== null) {
    docs.push(normalizeDocPath(match[1]));
  }
  return unique(docs);
}

function existsFromRoot(docPath) {
  return fs.existsSync(path.join(root, docPath));
}

const activeIndexContent = read(activeIndexPath);
const registryContent = read(registryPath);

const requiredHeadings = [
  '## Reestruturação do registry — Ciclo Global 66',
  '## Contratos ativos / base técnica',
  '### Contratos ativos espelhados do índice primário',
  '### Apoio operacional',
  '### Candidatos históricos migrados',
  '### Evidências de validação',
];

const activeIndexDocs = extractActiveIndexDocs(activeIndexContent);
const mirroredActiveSection = section(
  registryContent,
  '### Contratos ativos espelhados do índice primário',
  /^###\s+/m,
);
const supportSection = section(registryContent, '### Apoio operacional', /^###\s+/m);
const historicalSection = section(registryContent, '### Candidatos históricos migrados', /^###\s+/m);
const validationSection = section(registryContent, '### Evidências de validação', /^##\s+/m);

const mirroredActiveDocs = extractBulletDocs(mirroredActiveSection);
const supportDocs = extractBulletDocs(supportSection);
const historicalDocs = extractBulletDocs(historicalSection);
const validationDocs = extractBulletDocs(validationSection);

const activeIndexSet = new Set(activeIndexDocs);
const mirroredSet = new Set(mirroredActiveDocs);
const nonPrimaryGroups = [...supportDocs, ...historicalDocs, ...validationDocs];
const nonPrimarySet = new Set(nonPrimaryGroups);

const missingHeadings = requiredHeadings.filter((heading) => !registryContent.includes(heading));
const activeMissingFromMirror = activeIndexDocs.filter((doc) => !mirroredSet.has(doc));
const mirrorNotInActiveIndex = mirroredActiveDocs.filter((doc) => !activeIndexSet.has(doc));
const activeLeakedToNonPrimaryGroups = activeIndexDocs.filter((doc) => nonPrimarySet.has(doc));
const duplicateNonPrimaryDocs = nonPrimaryGroups.filter((doc, index, arr) => arr.indexOf(doc) !== index);
const validationOutsideValidationFolder = validationDocs.filter((doc) => !doc.startsWith('docs/validation/'));
const missingFiles = unique([
  ...activeIndexDocs,
  ...mirroredActiveDocs,
  ...supportDocs,
  ...historicalDocs,
  ...validationDocs,
].filter((doc) => !existsFromRoot(doc)));

const report = {
  cycle: 66,
  name: 'docs-registry-structure',
  ok: true,
  checkedAt: new Date().toISOString(),
  sourceOfTruth: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  registry: 'docs/DOCS-REGISTRY.md',
  summary: {
    activeIndexDocs: activeIndexDocs.length,
    mirroredActiveDocs: mirroredActiveDocs.length,
    supportDocs: supportDocs.length,
    historicalDocs: historicalDocs.length,
    validationDocs: validationDocs.length,
    missingHeadings: missingHeadings.length,
    activeMissingFromMirror: activeMissingFromMirror.length,
    mirrorNotInActiveIndex: mirrorNotInActiveIndex.length,
    activeLeakedToNonPrimaryGroups: activeLeakedToNonPrimaryGroups.length,
    duplicateNonPrimaryDocs: duplicateNonPrimaryDocs.length,
    validationOutsideValidationFolder: validationOutsideValidationFolder.length,
    missingFiles: missingFiles.length,
  },
  missingHeadings,
  activeMissingFromMirror,
  mirrorNotInActiveIndex,
  activeLeakedToNonPrimaryGroups,
  duplicateNonPrimaryDocs: unique(duplicateNonPrimaryDocs),
  validationOutsideValidationFolder,
  missingFiles,
  warnings: [],
};

if (missingHeadings.length > 0) {
  report.ok = false;
  report.warnings.push('The registry is missing one or more required Cycle 66 structure headings.');
}
if (activeMissingFromMirror.length > 0) {
  report.ok = false;
  report.warnings.push('Some active index documents are not mirrored in the active registry subsection.');
}
if (mirrorNotInActiveIndex.length > 0) {
  report.ok = false;
  report.warnings.push('Some mirrored active registry documents are not present in the primary active index.');
}
if (activeLeakedToNonPrimaryGroups.length > 0) {
  report.ok = false;
  report.warnings.push('Some primary active contracts also appear in non-primary registry groups.');
}
if (duplicateNonPrimaryDocs.length > 0) {
  report.ok = false;
  report.warnings.push('Some non-primary registry documents appear in more than one group.');
}
if (validationOutsideValidationFolder.length > 0) {
  report.ok = false;
  report.warnings.push('Some validation evidence entries are outside docs/validation/.');
}
if (missingFiles.length > 0) {
  report.ok = false;
  report.warnings.push('Some referenced documents do not exist on disk.');
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({ ok: report.ok, report: path.relative(root, reportPath), summary: report.summary }, null, 2));

if (!report.ok) process.exit(1);
