#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlTargets = ['pedidos.html', 'auth/login.html', 'auth/cadastro.html', 'auth/esqueci-senha.html'];
const stagePatterns = [
  'form-action-contract-stage10.css',
  'responsive-runtime-stage11.css',
  'responsive-interaction-guard-stage11.js',
];

function read(file) {
  return fs.readFileSync(path.join(root, file), 'utf8');
}

function stripQuery(url) {
  return url.split('?')[0].split('#')[0];
}

function extractScripts(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
}

function extractAssets(html) {
  const scripts = extractScripts(html);
  const links = [...html.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((m) => m[1]);
  return [...scripts, ...links];
}

const report = { checked: [], errors: [] };

for (const file of htmlTargets) {
  const html = read(file);
  const assets = extractAssets(html);
  report.checked.push({ file, assetCount: assets.length });

  for (const asset of assets) {
    if (stagePatterns.some((pattern) => asset.includes(pattern))) {
      report.errors.push(`${file}: legacy stage asset still referenced: ${asset}`);
    }
  }
}

const pedidos = read('pedidos.html');
const scripts = extractScripts(pedidos).map(stripQuery).filter((src) => !src.startsWith('http') && !src.startsWith('//'));
const counts = new Map();
for (const src of scripts) counts.set(src, (counts.get(src) || 0) + 1);
for (const [src, count] of counts) {
  if (count > 1) report.errors.push(`pedidos.html: duplicate script import (${count}x): ${src}`);
}

for (const src of scripts) {
  const resolved = path.join(root, src);
  if (!fs.existsSync(resolved)) report.errors.push(`pedidos.html: missing script: ${src}`);
}

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-44-js-duplicates-safety-report.json'), JSON.stringify(report, null, 2));

if (report.errors.length) {
  console.error('JS duplicate safety audit failed:');
  for (const error of report.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('JS duplicate safety audit passed.');
