#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const cssPath = path.join(root, 'assets/css/pages/detalhe-anuncio.css');
const foundationPath = path.join(root, 'assets/css/pages/marketplace-detail-foundation.css');
const htmlPath = path.join(root, 'detalhe-anuncio.html');
const css = fs.readFileSync(cssPath, 'utf8');
const foundation = fs.readFileSync(foundationPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

expect(css.includes('User-authored content safety contract'), 'missing content safety contract');
expect(css.includes('overflow-wrap: anywhere;'), 'missing emergency wrapping for long user content');
expect(css.includes('word-break: break-word;'), 'missing compatible word-break fallback');
expect(css.includes('#ad-detail-title'), 'title is not covered by content safety contract');
expect(css.includes('.detail-section h2'), 'section headings are not covered by content safety contract');
expect(css.includes('.detail-section__header + p'), 'description copy is not covered by content safety contract');
expect(css.includes('.detail-checklist li'), 'checklist/scope items are not covered by content safety contract');
expect(css.includes('.detail-spec strong'), 'service specification values are not covered');
expect(css.includes('.ad-detail-title-block > div {\n  flex: 1 1 auto;'), 'title text column cannot shrink inside flex layout');
expect(css.includes('.detail-scope-card {\n  overflow: hidden;'), 'scope cards do not contain defensive overflow');
expect(foundation.includes('detalhe-anuncio.css?v=20260719-owner-actions-v1'), 'foundation does not load the current detail CSS contract');
expect(html.includes('marketplace-detail-foundation.css?v=20260719-owner-actions-v1'), 'detail HTML does not bust the previous CSS cache');

if (failures.length) {
  console.error('Detail ad content overflow contract failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Detail ad content overflow contract passed.');
