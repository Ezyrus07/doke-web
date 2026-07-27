#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'config', 'frontend-structural-gates.json');
const REPORT_PATH = path.join(ROOT, 'reports', 'generated', 'frontend-structural-gates-report.json');
const STRICT = process.argv.includes('--strict');

const SKIP_DIRS = new Set([
  '.git', 'node_modules', 'reports', 'playwright-report', 'test-results',
  'coverage', '.vercel',
]);

function toPosix(value) { return value.split(path.sep).join('/'); }
function relativeFromRoot(value) { return toPosix(path.relative(ROOT, value)); }
function readText(relativePath) { return fs.readFileSync(path.join(ROOT, relativePath), 'utf8'); }

function walkFiles(startDir, predicate) {
  const output = [];
  if (!fs.existsSync(startDir)) return output;
  const visit = (currentDir) => {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) visit(path.join(currentDir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      const absolute = path.join(currentDir, entry.name);
      const relative = relativeFromRoot(absolute);
      if (!predicate || predicate(relative, absolute)) output.push(relative);
    }
  };
  visit(startDir);
  return output;
}

function stripQueryAndHash(reference) { return reference.split('#')[0].split('?')[0]; }
function extractQuery(reference) {
  const queryIndex = reference.indexOf('?');
  if (queryIndex === -1) return '';
  const hashIndex = reference.indexOf('#', queryIndex);
  return reference.slice(queryIndex + 1, hashIndex === -1 ? undefined : hashIndex);
}
function isExternalReference(reference) {
  return /^(?:[a-z]+:)?\/\//i.test(reference)
    || reference.startsWith('data:')
    || reference.startsWith('blob:')
    || reference.startsWith('#');
}
function normalizeRepositoryPath(baseFile, reference) {
  const clean = stripQueryAndHash(reference).trim();
  if (!clean || isExternalReference(clean)) return null;
  const baseDir = path.posix.dirname(baseFile);
  const normalized = clean.startsWith('/')
    ? path.posix.normalize(clean.slice(1))
    : path.posix.normalize(path.posix.join(baseDir, clean));
  return normalized.replace(/^\.\//, '');
}
function extractHtmlStylesheets(source) {
  const references = [];
  for (const match of source.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    const relMatch = tag.match(/\brel\s*=\s*[#']([^#']+)[#']/i);
    if (!relMatch || !/\bstylesheet\b/i.test(relMatch[1])) continue;
    const hrefMatch = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (hrefMatch) references.push(hrefMatch[1]);
  }
  return references;
}
function extractCssImports(source) {
  return Array.from(source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi))
    .map((match) => match[1]);
}
function fingerprint(category, values) { return [category, ...values].join('::'); }
function sortedUnique(values) { return Array.from(new Set(values)).sort(); }

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Missing structural gate config: ${relativeFromRoot(CONFIG_PATH)}`);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
}
const config = loadConfig();
function isKnownList(listName, value) {
  return new Set(config.baseline?.[listName] || []).has(value);
}
function isKnownBreakpoint(file, value) {
  const allowed = new Set(config.breakpoints?.allowedValues || []);
  const knownForFile = new Set(config.baseline?.breakpointValuesByFile?.[file] || []);
  return allowed.has(value) || knownForFile.has(value);
}

const findings = {
  cssMissingAssets: [], cssCycles: [], cssDuplicatePaths: [], cssVersionDivergence: [],
  impureManifests: [], storageOwnership: [], routeRegistryCandidates: [],
  duplicateGlobalApis: [], breakpointParity: [], existingAuditFailures: [],
};
const htmlFiles = walkFiles(ROOT, (relative) => (
  relative.endsWith('.html') && !relative.startsWith('docs/') && !relative.startsWith('tests/')
));
const cssFiles = walkFiles(path.join(ROOT, 'assets', 'css'), (relative) => relative.endsWith('.css'));
const jsFiles = walkFiles(path.join(ROOT, 'assets', 'js'), (relative) => relative.endsWith('.js'));

function auditCssGraph() {
  for (const htmlFile of htmlFiles) {
    const occurrences = new Map();
    const versions = new Map();
    const cyclesSeen = new Set();
    const missingSeen = new Set();

    function recordOccurrence(asset, chain, rawReference) {
      if (!occurrences.has(asset)) occurrences.set(asset, []);
      occurrences.get(asset).push(chain);
      if (!versions.has(asset)) versions.set(asset, new Set());
      versions.get(asset).add(extractQuery(rawReference));
    }

    function visitCss(asset, chain, activeStack, rawReference) {
      recordOccurrence(asset, chain, rawReference);
      if (activeStack.includes(asset)) {
        const cycle = [...activeStack.slice(activeStack.indexOf(asset)), asset];
        const cycleKey = cycle.join(' -> ');
        if (!cyclesSeen.has(cycleKey)) {
          cyclesSeen.add(cycleKey);
          findings.cssCycles.push({
            fingerprint: fingerprint('css-cycle', [htmlFile, cycleKey]), page: htmlFile, cycle,
            baseline: isKnownList('cssCycles', cycleKey),
          });
        }
        return;
      }

      const absolute = path.join(ROOT, asset);
      if (!fs.existsSync(absolute)) {
        const key = `${htmlFile}|${asset}`;
        if (!missingSeen.has(key)) {
          missingSeen.add(key);
          findings.cssMissingAssets.push({
            fingerprint: fingerprint('css-missing', [htmlFile, asset]), page: htmlFile,
            asset, chain, baseline: isKnownList('cssMissingAssets', asset),
          });
        }
        return;
      }

      const nextStack = [...activeStack, asset];
      for (const importedReference of extractCssImports(fs.readFileSync(absolute, 'utf8'))) {
        const importedAsset = normalizeRepositoryPath(asset, importedReference);
        if (!importedAsset || !importedAsset.endsWith('.css')) continue;
        visitCss(importedAsset, [...chain, importedAsset], nextStack, importedReference);
      }
    }

    for (const reference of extractHtmlStylesheets(readText(htmlFile))) {
      const asset = normalizeRepositoryPath(htmlFile, reference);
      if (asset?.endsWith('.css')) visitCss(asset, [htmlFile, asset], [], reference);
    }

    for (const [asset, chains] of occurrences.entries()) {
      if (chains.length <= 1) continue;
      const uniqueChains = sortedUnique(chains.map((chain) => chain.join(' -> ')));
      if (uniqueChains.length <= 1) continue;
      findings.cssDuplicatePaths.push({
        fingerprint: fingerprint('css-duplicate', [htmlFile, asset]), page: htmlFile, asset,
        occurrences: chains.length, chains: uniqueChains,
        baseline: isKnownList('cssDuplicateAssets', asset),
      });
    }

    for (const [asset, versionSet] of versions.entries()) {
      const versionList = sortedUnique(Array.from(versionSet));
      if (versionList.length <= 1) continue;
      findings.cssVersionDivergence.push({
        fingerprint: fingerprint('css-version', [htmlFile, asset]), page: htmlFile, asset,
        versions: versionList, baseline: isKnownList('cssVersionDivergenceAssets', asset),
      });
    }
  }
}

function auditManifestPurity() {
  const marker = new RegExp(config.manifests?.markerPattern || 'manifest|import-only', 'i');
  for (const file of cssFiles) {
    const source = readText(file);
    if (!marker.test(source.slice(0, config.manifests?.headerScanCharacters || 1800))) continue;
    const remainder = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/@charset\s+["'][^"']+["']\s*;/gi, '')
      .replace(/@import\s+(?:url\(\s*)?["'][^"']+["']\s*\)?[^;]*;/gi, '')
      .trim();
    if (!remainder) continue;
    findings.impureManifests.push({
      fingerprint: fingerprint('manifest-impure', [file]), file,
      preview: remainder.slice(0, 220), baseline: isKnownList('impureManifestFiles', file),
    });
  }
}

function auditStorageOwnership() {
  const approvedPrefixes = config.storage?.approvedOwnerPrefixes || [];
  const approvedFiles = new Set(config.storage?.approvedOwnerFiles || []);
  const ignoredPrefixes = config.storage?.ignoredPrefixes || [];
  for (const file of jsFiles) {
    if (ignoredPrefixes.some((prefix) => file.startsWith(prefix))) continue;
    const source = readText(file);
    const localCount = (source.match(/\blocalStorage\b/g) || []).length;
    const sessionCount = (source.match(/\bsessionStorage\b/g) || []).length;
    if (!localCount && !sessionCount) continue;
    if (approvedFiles.has(file) || approvedPrefixes.some((prefix) => file.startsWith(prefix))) continue;
    findings.storageOwnership.push({
      fingerprint: fingerprint('storage-owner', [file]), file,
      localStorageReferences: localCount, sessionStorageReferences: sessionCount,
      baseline: isKnownList('storageDebtFiles', file),
    });
  }
}

function auditRouteRegistryCandidates() {
  const owner = config.routes?.owner;
  const knownFiles = new Set(config.baseline?.routeRegistryDebtFiles || []);
  const minimumRoutes = config.routes?.candidateMinimumRoutes || 3;
  const escapedMarkers = (config.routes?.collectionMarkers || [])
    .map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const markerRegex = escapedMarkers.length ? new RegExp(escapedMarkers.join('|'), 'i') : null;

  for (const file of jsFiles) {
    if (file === owner) continue;
    const source = readText(file);
    const routes = sortedUnique(Array.from(source.matchAll(/["'`](\/?[\w./-]+\.html)(?:[?#][^"'`]*)?["'`]/g))
      .map((match) => match[1].startsWith('/') ? match[1] : `/${match[1]}`));
    if (routes.length < minimumRoutes || (markerRegex && !markerRegex.test(source))) continue;
    findings.routeRegistryCandidates.push({
      fingerprint: fingerprint('route-registry', [file]), file, routeCount: routes.length, routes,
      baseline: knownFiles.has(file),
    });
  }
}

function auditGlobalApis() {
  const ignoredNames = new Set(config.globals?.ignoredNames || []);
  const owners = new Map();
  for (const file of jsFiles) {
    const source = readText(file);
    const names = new Set();
    for (const match of source.matchAll(/\b(?:window|globalThis)\.([A-Za-z_$][\w$]*)\s*(?:=|\|\|=|\?\?=)/g)) names.add(match[1]);
    for (const match of source.matchAll(/Object\.defineProperty\(\s*(?:window|globalThis)\s*,\s*["']([^"']+)["']/g)) names.add(match[1]);
    for (const name of names) {
      if (ignoredNames.has(name)) continue;
      if (!owners.has(name)) owners.set(name, new Set());
      owners.get(name).add(file);
    }
  }
  for (const [name, files] of owners.entries()) {
    const fileList = sortedUnique(Array.from(files));
    if (fileList.length <= 1) continue;
    findings.duplicateGlobalApis.push({
      fingerprint: fingerprint('global-api', [name]), global: name, files: fileList,
      baseline: isKnownList('duplicateGlobalNames', name),
    });
  }
}

function auditBreakpointParity() {
  const targetPatterns = (config.breakpoints?.structuralFilePatterns || []).map((pattern) => new RegExp(pattern));
  for (const file of jsFiles) {
    if (!targetPatterns.some((pattern) => pattern.test(file))) continue;
    const source = readText(file);
    const values = new Set();
    for (const match of source.matchAll(/(?:max-width|min-width|maxWidth|minWidth)\s*[:=,(]\s*["'`]?\s*(\d{3,4})/g)) values.add(Number(match[1]));
    for (const match of source.matchAll(/matchMedia\(\s*["'`][^"'`]*(?:max-width|min-width)\s*:\s*(\d{3,4})px/g)) values.add(Number(match[1]));
    for (const match of source.matchAll(/(?:innerWidth|clientWidth)\s*(?:<=|>=|<|>)\s*(\d{3,4})/g)) values.add(Number(match[1]));
    for (const value of sortedUnique(Array.from(values))) {
      if (isKnownBreakpoint(file, value)) continue;
      findings.breakpointParity.push({
        fingerprint: fingerprint('breakpoint', [file, String(value)]), file, value,
        allowedValues: config.breakpoints?.allowedValues || [], baseline: false,
      });
    }
  }
}

function runExistingAudits() {
  for (const script of config.existingAudits || []) {
    const result = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: 'utf8', env: process.env });
    if (result.status === 0) continue;
    findings.existingAuditFailures.push({
      fingerprint: fingerprint('existing-audit', [script]), script, status: result.status,
      stdout: (result.stdout || '').slice(-3000), stderr: (result.stderr || '').slice(-3000), baseline: false,
    });
  }
}

auditCssGraph();
auditManifestPurity();
auditStorageOwnership();
auditRouteRegistryCandidates();
auditGlobalApis();
auditBreakpointParity();
runExistingAudits();

const allFindings = Object.values(findings).flat();
const newViolations = allFindings.filter((finding) => !finding.baseline);
const baselineViolations = allFindings.filter((finding) => finding.baseline);
const report = {
  generatedAt: new Date().toISOString(), strict: STRICT,
  policy: { baselineAware: true, blocksNewViolations: true, historicalDebtMayRemainOnlyWhenExplicitlyListed: true },
  inputs: { htmlFiles: htmlFiles.length, cssFiles: cssFiles.length, jsFiles: jsFiles.length, config: relativeFromRoot(CONFIG_PATH) },
  summary: {
    totalFindings: allFindings.length, baselineFindings: baselineViolations.length,
    newViolations: newViolations.length, status: newViolations.length ? 'failed' : 'passed',
  },
  countsByCategory: Object.fromEntries(Object.entries(findings).map(([category, entries]) => [category, {
    total: entries.length, baseline: entries.filter((entry) => entry.baseline).length,
    new: entries.filter((entry) => !entry.baseline).length,
  }])),
  findings,
};
fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log('[frontend-structural-gates]');
console.log(`- HTML files: ${htmlFiles.length}`);
console.log(`- CSS files: ${cssFiles.length}`);
console.log(`- JS files: ${jsFiles.length}`);
console.log(`- baseline findings: ${baselineViolations.length}`);
console.log(`- new violations: ${newViolations.length}`);
console.log(`- report: ${relativeFromRoot(REPORT_PATH)}`);
if (newViolations.length) {
  console.error('\nNew structural violations:');
  for (const finding of newViolations.slice(0, 80)) console.error(`- ${finding.fingerprint}`);
  if (newViolations.length > 80) console.error(`- ... and ${newViolations.length - 80} more`);
}
if (STRICT && newViolations.length) process.exit(1);
