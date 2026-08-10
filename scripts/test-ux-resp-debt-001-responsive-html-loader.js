#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { expandLocalCss, loadHtmlWithLocalCss } = require('./lib/responsive-html-loader');

const rootDir = path.resolve(__dirname, '..');

function write(root, relativePath, content) {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function withFixture(run) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'doke-responsive-loader-'));
  try {
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

withFixture(root => {
  write(root, 'index.html', '<!doctype html><html><head><link rel="stylesheet" href="css/main.css?v=7#cache"><link rel="stylesheet" href="https://example.invalid/external.css"></head><body></body></html>');
  write(root, 'css/main.css', '@import url("./nested/a.css?v=2");\n.main { display: grid; }');
  write(root, 'css/nested/a.css', '@import "../shared.css#fragment" screen and (min-width: 600px);\n.a { color: red; }');
  write(root, 'css/shared.css', '.shared { color: blue; }');

  const html = loadHtmlWithLocalCss('index.html', root, { modeLabel: 'loader-test' });
  assert.match(html, /data-source-css="css\/main\.css"/);
  assert.match(html, /responsive-inline-source:start css\/nested\/a\.css/);
  assert.match(html, /@media screen and \(min-width: 600px\)/);
  assert.match(html, /responsive-inline-source:start css\/shared\.css/);
  assert.match(html, /\.shared \{ color: blue; \}/);
  assert.match(html, /\.main \{ display: grid; \}/);
  assert.match(html, /external stylesheet disabled for loader-test/);
  assert.ok(html.indexOf('.shared { color: blue; }') < html.indexOf('.a { color: red; }'), 'nested import must remain before importer declarations');
});

withFixture(root => {
  write(root, 'css/main.css', '@import url("./missing.css");\n.main { color: black; }');
  assert.throws(() => expandLocalCss('css/main.css', root), /Missing local CSS import/);
});

withFixture(root => {
  write(root, 'css/a.css', '@import url("./b.css");');
  write(root, 'css/b.css', '@import url("./a.css");');
  assert.throws(() => expandLocalCss('css/a.css', root), /CSS import cycle detected/);
});

withFixture(root => {
  write(root, 'index.html', '<html><head><link rel="stylesheet" href="css/missing.css"></head><body></body></html>');
  assert.throws(() => loadHtmlWithLocalCss('index.html', root), /Missing local stylesheet linked by index\.html/);
});

withFixture(root => {
  write(root, 'css/main.css', '@import url("https://example.invalid/theme.css");\n.main { color: green; }');
  const css = expandLocalCss('css/main.css', root);
  assert.match(css, /external CSS import skipped by responsive harness/);
  assert.match(css, /\.main \{ color: green; \}/);
});

const detailCss = expandLocalCss('assets/css/pages/marketplace-detail-foundation.css', rootDir);
assert.match(detailCss, /responsive-inline-source:start assets\/css\/layout\/header\.css/);
assert.match(detailCss, /\.app-header \{\s*width: var\(--doke-header-rail/);
assert.ok(
  detailCss.indexOf('responsive-inline-source:start assets/css/layout/page-rail-authority.css')
    < detailCss.indexOf('responsive-inline-source:start assets/css/layout/header.css'),
  'detail manifest must preserve page rail before active header authority',
);

const detailHtml = loadHtmlWithLocalCss('detalhe-anuncio.html', rootDir, { modeLabel: 'responsive contract' });
assert.match(detailHtml, /data-source-css="assets\/css\/pages\/marketplace-detail-foundation\.css"/);
assert.match(detailHtml, /responsive-inline-source:start assets\/css\/layout\/header\.css/);
assert.doesNotMatch(detailHtml, /<script\b[^>]*\bsrc=/i);

console.log('[ux-resp-debt-001] responsive HTML loader contract passed');
