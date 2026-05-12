#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { getLoadedCssAssets } = require('./lib/css-assets');

const root = process.cwd();
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const cssAssets = getLoadedCssAssets(html, root);
const scriptPattern = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
const jsAssets = [];
let match;
while ((match = scriptPattern.exec(html))) {
  const src = match[1].split('?')[0];
  if (!/^(?:https?:)?\/\//i.test(src)) jsAssets.push(src.replace(/^\.\//, ''));
}
const missingCss = cssAssets.filter((asset) => !fs.existsSync(path.join(root, asset)));
const missingJs = jsAssets.filter((asset) => !fs.existsSync(path.join(root, asset)));
function importantCount(asset) {
  const file = path.join(root, asset);
  if (!fs.existsSync(file)) return 0;
  return (fs.readFileSync(file, 'utf8').match(/!important/g) || []).length;
}
const cssImportant = cssAssets
  .map((asset) => ({ asset, important: importantCount(asset) }))
  .filter((item) => item.important > 0)
  .sort((a, b) => b.important - a.important);
const report = {
  html: 'index.html',
  directStylesheetLinks: (html.match(/<link\b[^>]*rel=["']stylesheet["'][^>]*>|<link\b(?=[^>]*rel=["']stylesheet["'])(?=[^>]*href=)[^>]*>/gi) || []).length,
  cssAssetsCount: cssAssets.length,
  uniqueCssAssetsCount: new Set(cssAssets).size,
  jsAssetsCount: jsAssets.length,
  uniqueJsAssetsCount: new Set(jsAssets).size,
  missingCss,
  missingJs,
  totalImportant: cssImportant.reduce((sum, item) => sum + item.important, 0),
  topImportantCss: cssImportant.slice(0, 25),
  cssAssets,
  jsAssets,
};
fs.mkdirSync(path.join(root, 'docs', 'validation'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs', 'validation', 'index-assets-audit.json'), JSON.stringify(report, null, 2));
console.log(`Index assets audit passed: ${report.uniqueCssAssetsCount} CSS, ${report.uniqueJsAssetsCount} JS, ${report.totalImportant} !important, ${missingCss.length + missingJs.length} missing.`);
if (missingCss.length || missingJs.length) process.exitCode = 1;
