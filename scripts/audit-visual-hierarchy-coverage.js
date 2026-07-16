#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const productionRoots = [
  ...fs.readdirSync(root).filter((name) => name.endsWith('.html')).map((name) => name),
  'auth/login.html',
  'auth/cadastro.html',
  'auth/esqueci-senha.html',
  'labs/modal-lab.html',
  'docs/ui-kit.html'
].filter((rel, index, list) => list.indexOf(rel) === index && fs.existsSync(path.join(root, rel)));

const importPattern = /@import\s+(?:url\()?\s*["']([^"']+\.css(?:\?[^"']*)?)["']\s*\)?\s*;/gi;
const linkPattern = /<link\b[^>]*\bhref=["']([^"']+\.css(?:\?[^"']*)?)["'][^>]*>/gi;

function stripQuery(value) {
  return value.split('?')[0].split('#')[0];
}

function resolveFrom(filePath, href) {
  if (/^(?:https?:)?\/\//i.test(href)) return null;
  const clean = stripQuery(href);
  return path.resolve(path.dirname(filePath), clean);
}

function readLinks(htmlPath) {
  const text = fs.readFileSync(htmlPath, 'utf8');
  const links = [];
  for (const match of text.matchAll(linkPattern)) {
    const resolved = resolveFrom(htmlPath, match[1]);
    if (resolved && resolved.startsWith(root)) links.push(resolved);
  }
  return links;
}

function walkCss(entry, seen, chain) {
  if (!entry || seen.has(entry) || !fs.existsSync(entry)) return [];
  seen.add(entry);
  const rel = path.relative(root, entry).replaceAll(path.sep, '/');
  const nextChain = [...chain, rel];
  const hits = [];
  if (/(?:^|\/)[^/]*visual-hierarchy\.css$/i.test(rel)) hits.push(nextChain);

  const text = fs.readFileSync(entry, 'utf8');
  for (const match of text.matchAll(importPattern)) {
    const child = resolveFrom(entry, match[1]);
    if (child && child.startsWith(root)) hits.push(...walkCss(child, seen, nextChain));
  }
  return hits;
}

const results = productionRoots.map((rel) => {
  const htmlPath = path.join(root, rel);
  const entries = readLinks(htmlPath);
  const chains = [];
  for (const entry of entries) chains.push(...walkCss(entry, new Set(), []));
  return {
    html: rel.replaceAll(path.sep, '/'),
    covered: chains.length > 0,
    authorityChains: chains
  };
});

const uncovered = results.filter((item) => !item.covered);
const payload = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  covered: results.length - uncovered.length,
  uncovered: uncovered.length,
  coveragePercent: Number((((results.length - uncovered.length) / results.length) * 100).toFixed(1)),
  pages: results
};

const outDir = path.join(root, 'reports');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'visual-hierarchy-coverage.json'), JSON.stringify(payload, null, 2) + '\n');

const md = [
  '# Visual hierarchy coverage',
  '',
  `- Total audited: ${payload.total}`,
  `- Covered: ${payload.covered}`,
  `- Uncovered: ${payload.uncovered}`,
  `- Coverage: ${payload.coveragePercent}%`,
  '',
  '## Uncovered',
  '',
  ...(uncovered.length ? uncovered.map((item) => `- \`${item.html}\``) : ['- None']),
  '',
  '## Covered pages',
  '',
  ...results.filter((item) => item.covered).map((item) => {
    const owners = [...new Set(item.authorityChains.map((chain) => chain.at(-1)))];
    return `- \`${item.html}\` → ${owners.map((owner) => `\`${owner}\``).join(', ')}`;
  }),
  ''
].join('\n');
fs.writeFileSync(path.join(outDir, 'visual-hierarchy-coverage.md'), md);

console.log(`[visual-hierarchy] ${payload.covered}/${payload.total} covered (${payload.coveragePercent}%).`);
if (uncovered.length) {
  console.error('[visual-hierarchy] Missing explicit authority:');
  uncovered.forEach((item) => console.error(` - ${item.html}`));
  process.exitCode = 1;
}
