'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { audit } = require('./audit-detail-anuncio-data-boundary.js');
const html = fs.readFileSync('detalhe-anuncio.html', 'utf8');
const tag = html.match(/<script\b[^>]*src="assets\/js\/core\/preview-e2e-boundary\.js[^>]*><\/script>/)[0];
let passed = 0;
function test(name, value, expected) {
  assert.equal(audit(value).status, expected, name);
  console.log('PASS ' + name); passed++;
}
test('canonical synchronous boundary first, hooks and hidden retained', html, 'passed');
test('boundary query version may change without changing its path', html.replace(tag, tag.replace(/\?v=[^"]+/, '?v=synthetic')), 'passed');
test('single-quoted module accepted for another external script', html.replace('</head>', "<script type='module' src='synthetic-late.js'></script></head>"), 'passed');
test('missing boundary rejected', html.replace(tag, ''), 'failed');
test('duplicate boundary rejected', html.replace(tag, tag + tag), 'failed');
test('deferred duplicate boundary rejected', html.replace(tag, tag + tag.replace('<script ', '<script defer ')), 'failed');
test('boundary after SDK/Auth rejected even when SDK uses defer', html.replace(tag, '<script defer src="synthetic-sdk-auth.js"></script>' + tag), 'failed');
test('earlier inline executable bootstrap rejected', html.replace(tag, '<script>window.supabase.createClient();</script>' + tag), 'failed');
test('other blocking external script rejected', html.replace('</head>', '<script src="synthetic-blocking.js"></script></head>'), 'failed');
test('different path rejected', html.replace(tag, tag.replace('preview-e2e-boundary.js', 'other-boundary.js')), 'failed');
test('remote same basename rejected', html.replace(tag, tag.replace('assets/js/core/', 'https://unapproved.test/')), 'failed');
test('async boundary rejected', html.replace(tag, tag.replace('<script ', '<script async ')), 'failed');
test('deferred boundary rejected', html.replace(tag, tag.replace('<script ', '<script defer ')), 'failed');
test('module boundary rejected', html.replace(tag, tag.replace('<script ', '<script type="module" ')), 'failed');
test('non executable boundary rejected', html.replace(tag, tag.replace('<script ', '<script type="application/json" ')), 'failed');
test('comment cannot supply missing executable boundary', html.replace(tag, '<!--' + tag + '-->'), 'failed');
for (const hook of audit(html).requiredHooks) {
  test('required hook retained: ' + hook, html.split(hook).join(''), 'failed');
}
const noHidden = html.replace(/<[^>]*\bdata-detail-data-boundary\b[^>]*>/, value => value.replace(/\s+hidden(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/, ''));
assert.notEqual(noHidden, html);
test('hidden data boundary required', noHidden, 'failed');
console.log('DETAIL_BOUNDARY_AUDIT: ' + passed + ' checks passed.');
