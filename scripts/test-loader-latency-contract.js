#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const lifecycle = read('assets/js/core/navigation-lifecycle.js');
if (!/VISUAL_MINIMUMS\s*=\s*Object\.freeze\(\{\s*document:\s*0,\s*route:\s*0,\s*page:\s*0,\s*guard:\s*0\s*\}\)/.test(lifecycle)) {
  failures.push('navigation-lifecycle must not impose artificial document/route/page/guard minimum durations');
}

const preloader = read('assets/js/core/document-preloader.js');
if (!/LEGACY_FALLBACK_MIN_VISIBLE_MS\s*=\s*0\s*;/.test(preloader)) {
  failures.push('document preloader fallback must not force a minimum visible duration');
}

const verification = read('assets/js/pages/verificacao-profissional.js');
if (/minimumLoading|setTimeout\s*\(\s*resolve\s*,\s*2000\s*\)/.test(verification)) {
  failures.push('professional verification submit must not wait for an artificial two-second loader');
}
if (!/currentVerification\s*=\s*await\s+service\.submit\(\{\s*payload:\s*submissionPayload\s*\}\)/.test(verification)) {
  failures.push('professional verification must settle directly from the real submit operation');
}

if (failures.length) {
  console.error('[loader-latency-contract] FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('[loader-latency-contract] PASS');
console.log('- navigation visual minimums: 0ms');
console.log('- document fallback minimum: 0ms');
console.log('- verification submit: real-operation duration only');
