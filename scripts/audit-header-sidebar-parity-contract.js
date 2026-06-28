#!/usr/bin/env node
/*
 * Guard for global header/sidebar shell parity.
 * It verifies that every active root HTML consumes the same shell, sidebar and
 * app-header contracts. Visual anatomy remains owned by layout/header.css and
 * pages/sidebar-unified.css; pages may choose contextual actions only.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const rootHtmlFiles = fs.readdirSync(ROOT)
  .filter((file) => file.endsWith('.html'))
  .sort();
const failures = [];

function fail(file, check) {
  failures.push({ file, check });
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}=(['"])(.*?)\\1`, 'i'));
  return match ? match[2] : '';
}

function hasAttr(tag, name) {
  return new RegExp(`\\b${name}(?:=|\\s|>|$)`, 'i').test(tag);
}

function hasClass(tag, className) {
  return getAttr(tag, 'class').split(/\s+/).includes(className);
}

function tagsByName(html, tagName) {
  return html.match(new RegExp(`<${tagName}\\b[^>]*>`, 'gi')) || [];
}

function tagsWithClass(html, tagName, className) {
  return tagsByName(html, tagName).filter((tag) => hasClass(tag, className));
}

for (const file of rootHtmlFiles) {
  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const bodyTag = tagsByName(html, 'body')[0] || '';
  const headerTags = tagsByName(html, 'header').filter((tag) => hasAttr(tag, 'data-app-header'));
  const headerTag = headerTags[0] || '';
  const shellTags = tagsWithClass(html, 'div', 'app-shell');
  const shellTag = shellTags[0] || '';
  const sidebarTags = tagsWithClass(html, 'aside', 'sidebar');
  const sidebarTag = sidebarTags[0] || '';

  if (!hasClass(bodyTag, 'doke-app-shell-page')) fail(file, 'body must keep doke-app-shell-page');
  if (!hasClass(bodyTag, 'app-shell-page')) fail(file, 'body must keep app-shell-page');
  if (!hasClass(bodyTag, 'internal-shell-page')) fail(file, 'body must keep internal-shell-page for shared shell styling');
  if (!hasClass(bodyTag, 'has-global-header')) fail(file, 'body must keep has-global-header');

  if (shellTags.length !== 1) fail(file, `expected exactly one app-shell root, found ${shellTags.length}`);
  if (getAttr(shellTag, 'data-shell-contract') !== 'app-shell') fail(file, 'app-shell must declare data-shell-contract="app-shell"');

  if (sidebarTags.length !== 1) fail(file, `expected exactly one sidebar root, found ${sidebarTags.length}`);
  if (!hasAttr(sidebarTag, 'data-shell-sidebar')) fail(file, 'sidebar must declare data-shell-sidebar');
  if (getAttr(sidebarTag, 'data-sidebar-contract') !== 'global-sidebar') fail(file, 'sidebar must declare data-sidebar-contract="global-sidebar"');

  if (headerTags.length !== 1) fail(file, `expected exactly one data-app-header, found ${headerTags.length}`);
  if (!hasClass(headerTag, 'app-header')) fail(file, 'data-app-header must keep app-header class');
  if (getAttr(headerTag, 'data-header-contract') !== 'app-header') fail(file, 'header must declare data-header-contract="app-header"');

  const variant = getAttr(headerTag, 'data-header-variant');
  const family = getAttr(headerTag, 'data-header-family');
  if (!variant) fail(file, 'header must declare data-header-variant');
  if (!family) fail(file, 'header must declare data-header-family');
  if (variant && family && variant !== family) fail(file, 'data-header-family must match data-header-variant');

  const headerInnerCount = (html.match(/\bdata-header-inner\b/gi) || []).length;
  const primarySlotCount = (html.match(/\bdata-header-slot=["']primary["']/gi) || []).length;
  const actionsSlotCount = (html.match(/\bdata-header-slot=["']actions["']/gi) || []).length;
  if (headerInnerCount !== 1) fail(file, `expected exactly one data-header-inner, found ${headerInnerCount}`);
  if (primarySlotCount !== 1) fail(file, `expected exactly one primary header slot, found ${primarySlotCount}`);
  if (actionsSlotCount !== 1) fail(file, `expected exactly one actions header slot, found ${actionsSlotCount}`);

  for (const hook of ['home-side-meta__tablet-menu', 'home-side-meta__search', 'home-side-meta__profile-wrap']) {
    if (!html.includes(hook)) fail(file, `header is missing ${hook}`);
  }
}

const appJs = fs.readFileSync(path.join(ROOT, 'assets/js/core/app.js'), 'utf8');
for (const snippet of [
  'ensureShellChromeContracts',
  "data-shell-contract', 'app-shell'",
  "data-sidebar-contract', 'global-sidebar'",
  'data-header-family',
  'data-sidebar-scrim',
]) {
  if (!appJs.includes(snippet)) fail('assets/js/core/app.js', `missing runtime shell contract safeguard: ${snippet}`);
}

const headerCss = fs.readFileSync(path.join(ROOT, 'assets/css/layout/header.css'), 'utf8');
for (const snippet of [
  'body[data-page].has-global-header',
  '--doke-header-height',
  '--doke-header-control-size',
  '--doke-header-profile-height',
  '[data-header-slot="primary"]',
  '[data-header-slot="actions"]',
]) {
  if (!headerCss.includes(snippet)) fail('assets/css/layout/header.css', `missing app-header parity authority: ${snippet}`);
}

const sidebarCss = fs.readFileSync(path.join(ROOT, 'assets/css/pages/sidebar-unified.css'), 'utf8');
for (const snippet of [
  'Shared sidebar normalization',
  'body.app-shell-page .sidebar',
  'body.shell-home .sidebar',
  '.nav-link__icon',
  '.sidebar__group--account',
]) {
  if (!sidebarCss.includes(snippet)) fail('assets/css/pages/sidebar-unified.css', `missing sidebar parity authority: ${snippet}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  status: failures.length ? 'FAIL' : 'PASS',
  activeRootHtmlFiles: rootHtmlFiles,
  scannedPages: rootHtmlFiles.length,
  failures,
};
const reportPath = path.join(ROOT, 'reports/generated/header-sidebar-parity-contract-report.json');
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`[audit:header-sidebar-parity-contract] ${report.status} — ${rootHtmlFiles.length} root HTMLs scanned`);
console.log(`- report: ${path.relative(ROOT, reportPath)}`);
if (failures.length) {
  failures.slice(0, 20).forEach((failure) => console.log(`- ${failure.file}: ${failure.check}`));
  process.exitCode = 1;
}
