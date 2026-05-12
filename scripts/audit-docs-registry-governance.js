const fs = require('fs');
const path = require('path');

const root = process.cwd();
const docsDir = path.join(root, 'docs');
const activeIndexPath = path.join(docsDir, 'ACTIVE-CONTRACTS-INDEX.md');
const registryPath = path.join(docsDir, 'DOCS-REGISTRY.md');
const reportPath = path.join(docsDir, 'validation', 'global-cycle-64-docs-registry-governance-report.json');

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
const missingFiles = unique([...activeIndexDocs, ...registryActiveDocs].filter((doc) => !existsFromRoot(doc)));

const report = {
  cycle: 64,
  name: 'docs-registry-governance',
  ok: true,
  checkedAt: new Date().toISOString(),
  sourceOfTruth: 'docs/ACTIVE-CONTRACTS-INDEX.md',
  registry: 'docs/DOCS-REGISTRY.md',
  summary: {
    activeIndexDocs: activeIndexDocs.length,
    registryActiveDocs: registryActiveDocs.length,
    registryActiveNotInPrimaryIndex: registryActiveNotInPrimaryIndex.length,
    primaryIndexNotInRegistryActive: primaryIndexNotInRegistryActive.length,
    missingFiles: missingFiles.length,
  },
  governanceRule: 'ACTIVE-CONTRACTS-INDEX.md is the primary source of truth. DOCS-REGISTRY.md is an operational navigation registry and may contain candidates or historical support documents until reviewed.',
  registryActiveNotInPrimaryIndex,
  primaryIndexNotInRegistryActive,
  missingFiles,
  warnings: [],
};

if (registryActiveNotInPrimaryIndex.length > 0) {
  report.warnings.push('DOCS-REGISTRY.md lists documents under active/base technical docs that are not present in ACTIVE-CONTRACTS-INDEX.md. Treat them as review candidates, not active contracts.');
}

if (primaryIndexNotInRegistryActive.length > 0) {
  report.warnings.push('ACTIVE-CONTRACTS-INDEX.md references active contracts that are not listed in the registry active/base section. This is acceptable for now, but the registry should be reconciled in a dedicated documentation cycle.');
}

if (missingFiles.length > 0) {
  report.ok = false;
  report.warnings.push('Some referenced docs do not exist on disk and should be corrected before relying on the registry/index pair.');
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(JSON.stringify({ ok: report.ok, report: path.relative(root, reportPath), summary: report.summary }, null, 2));

if (!report.ok) process.exit(1);
