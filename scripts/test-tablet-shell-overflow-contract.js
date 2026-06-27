#!/usr/bin/env node
/*
  P17 — Tablet shell overflow contract.
  Responsibility: protect the P16 fix that removed the 1024px desktop floor from
  tablet widths. Tablet vertical/landscape up to 1024px must not force html/body
  to 1024px; desktop 1025px+ may keep the persistent sidebar floor.
*/
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const target = path.join(root, 'assets/css/components/shell/desktop-base-stability.css');
const reportsDir = path.join(root, 'reports/generated');
fs.mkdirSync(reportsDir, { recursive: true });

function fail(message, details = {}) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'FAIL',
    file: 'assets/css/components/shell/desktop-base-stability.css',
    message,
    details,
  };
  fs.writeFileSync(path.join(reportsDir, 'tablet-shell-overflow-contract-report.json'), JSON.stringify(report, null, 2));
  console.error(`Tablet shell overflow contract: FAIL\n${message}`);
  process.exit(1);
}

function pass(details) {
  const report = {
    generatedAt: new Date().toISOString(),
    status: 'PASS',
    file: 'assets/css/components/shell/desktop-base-stability.css',
    ...details,
  };
  fs.writeFileSync(path.join(reportsDir, 'tablet-shell-overflow-contract-report.json'), JSON.stringify(report, null, 2));
  console.log('Tablet shell overflow contract: PASS');
  console.log('Tablet 761px–1024px does not force 1024px desktop width.');
}

if (!fs.existsSync(target)) {
  fail('Missing desktop-base-stability.css.');
}

const css = fs.readFileSync(target, 'utf8');
const compact = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, ' ');

function includesMedia(query) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\ /g, '\\s+');
  return new RegExp(`@media\\s*\\(\\s*${escaped}\\s*\\)`, 'i').test(css);
}

if (!includesMedia('min-width: 761px')) {
  fail('Expected @media (min-width: 761px) tablet/desktop stability block.');
}

if (!includesMedia('min-width: 1025px')) {
  fail('Expected @media (min-width: 1025px) desktop floor block.');
}

const tabletBlockMatch = compact.match(/@media\s*\(\s*min-width:\s*761px\s*\)\s*\{([\s\S]*?)@media\s*\(\s*min-width:\s*1025px\s*\)/i);
if (!tabletBlockMatch) {
  fail('Could not isolate tablet/desktop-shared block before the 1025px desktop block.');
}

const tabletBlock = tabletBlockMatch[1];
const forbiddenTabletPatterns = [
  /html\s*\{[^}]*min-width\s*:\s*1024px/i,
  /body\s*\{[^}]*min-width\s*:\s*1024px/i,
  /min-inline-size\s*:\s*1024px/i,
  /width\s*:\s*1024px/i,
];

for (const pattern of forbiddenTabletPatterns) {
  if (pattern.test(tabletBlock)) {
    fail('Tablet block must not force 1024px width/min-width.', { pattern: String(pattern) });
  }
}

const requiredTabletSignals = [
  /html\s*\{[^}]*min-width\s*:\s*0/i,
  /body\s*\{[^}]*min-width\s*:\s*0/i,
  /html\s*\{[^}]*overflow-x\s*:\s*(clip|hidden)/i,
];

for (const pattern of requiredTabletSignals) {
  if (!pattern.test(tabletBlock)) {
    fail('Tablet block is missing a required anti-overflow signal.', { pattern: String(pattern) });
  }
}

const desktopBlockMatch = compact.match(/@media\s*\(\s*min-width:\s*1025px\s*\)\s*\{([\s\S]*)\}\s*$/i);
if (!desktopBlockMatch) {
  fail('Could not isolate desktop 1025px+ block.');
}

const desktopBlock = desktopBlockMatch[1];
const requiredDesktopSignals = [
  /html\s*\{[^}]*min-width\s*:\s*1024px/i,
  /body\s*\{[^}]*min-width\s*:\s*1024px/i,
];

for (const pattern of requiredDesktopSignals) {
  if (!pattern.test(desktopBlock)) {
    fail('Desktop block must preserve the 1024px desktop floor for persistent-sidebar layouts.', { pattern: String(pattern) });
  }
}

pass({
  protectedRange: '761px–1024px',
  desktopFloorRange: '1025px+',
  requiredTabletSignals: requiredTabletSignals.map(String),
  requiredDesktopSignals: requiredDesktopSignals.map(String),
});
