#!/usr/bin/env node
/*
 * Doke unused asset candidate audit.
 * This script is intentionally conservative: it reports candidates only and does not approve deletion.
 */

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outputPath = path.join(root, 'docs/validation/unused-asset-candidates-summary.json');

const IGNORE_DIRS = new Set(['.git', 'node_modules', 'reports', 'archive']);
const TEXT_EXTENSIONS = new Set(['.html', '.css', '.js', '.json', '.md']);
const ASSET_EXTENSIONS = new Set(['.css', '.js']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

function rel(abs) {
  return path.relative(root, abs).replace(/\\/g, '/');
}

function normalizeRef(ref) {
  return ref
    .replace(/^\.\//, '')
    .replace(/[?#].*$/, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '');
}

const allFiles = walk(root);
const textFiles = allFiles.filter((file) => TEXT_EXTENSIONS.has(path.extname(file).toLowerCase()));
const assetFiles = allFiles
  .filter((file) => file.includes(`${path.sep}assets${path.sep}`))
  .filter((file) => ASSET_EXTENSIONS.has(path.extname(file).toLowerCase()))
  .map(rel)
  .sort();

const haystacks = [];
for (const file of textFiles) {
  const relative = rel(file);
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  haystacks.push({ path: relative, content });
}

function isReferenced(asset) {
  const fileName = path.basename(asset);
  const normalized = normalizeRef(asset);
  const withoutAssetsPrefix = normalized.replace(/^assets\//, '');
  for (const haystack of haystacks) {
    if (haystack.path === asset) continue;
    if (haystack.content.includes(normalized)) return true;
    if (haystack.content.includes(`./${withoutAssetsPrefix}`)) return true;
    if (haystack.content.includes(`../${withoutAssetsPrefix}`)) return true;
    if (haystack.content.includes(fileName) && /(?:import\(|import\s+|src=|href=|url\(|@import)/.test(haystack.content)) {
      return true;
    }
  }
  return false;
}

const candidates = assetFiles.filter((asset) => !isReferenced(asset));
const byExtension = candidates.reduce((acc, asset) => {
  const ext = path.extname(asset).slice(1) || 'unknown';
  acc[ext] = (acc[ext] || 0) + 1;
  return acc;
}, {});

const summary = {
  generatedAt: new Date().toISOString(),
  warning: 'Candidates only. Do not delete without runtime/page validation and dynamic-load review.',
  totals: {
    assetCssJs: assetFiles.length,
    candidateCount: candidates.length,
    byExtension,
  },
  candidateSamples: candidates.slice(0, 120),
  nextSteps: [
    'Review candidates by page/domain before deletion.',
    'Search dynamic loaders/controllers before removing JS.',
    'For CSS, verify direct HTML links and @import chains before deletion.',
    'Remove in small batches with visual validation.',
  ],
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log('Unused asset candidate audit complete.');
console.log(`CSS/JS assets scanned: ${assetFiles.length}`);
console.log(`Candidates: ${candidates.length}`);
console.log(`Wrote ${rel(outputPath)}`);
