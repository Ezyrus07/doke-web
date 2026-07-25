#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const file = path.join(process.cwd(), 'tests/auth/test-auth-provider-authority-runtime.js');
let source = fs.readFileSync(file, 'utf8');

const previous = `  const status = window.DokeAuth.getAuthProviderStatus();
  assert.strictEqual(status.activeProvider, 'supabase');
  assert.strictEqual(status.requestedProvider, 'supabase');
  assert.strictEqual(status.implementationStatus, 'supabase_active');
  assert.strictEqual(window.DokeAuth.getActiveAuthProvider(), 'supabase');
  assert.strictEqual(typeof window.DokeAuth.configureAuthIdentityCanary, 'undefined');
  assert.strictEqual(typeof window.DokeAuth.rollbackAuthIdentityCanary, 'undefined');
  assert.strictEqual(window.DokeAuth.getAuthIdentityCanaryStatus().active, false);
`;

const replacement = `  assert.strictEqual(window.DokeAuth.getActiveAuthProvider(), 'supabase');
  for (const retiredFacade of [
    'getAuthProviderStatus',
    'getAuthIdentityCanaryStatus',
    'configureAuthIdentityCanary',
    'rollbackAuthIdentityCanary'
  ]) {
    assert.strictEqual(typeof window.DokeAuth[retiredFacade], 'undefined', retiredFacade + ' remains exposed');
  }
`;

const occurrences = source.split(previous).length - 1;
if (occurrences !== 1) throw new Error('Expected exactly one AUTH-A09 provider-status assertion block, found ' + occurrences);
source = source.replace(previous, replacement);
source = source.replace(
  "  console.log('- browser canary mutation APIs are retired');",
  "  console.log('- browser provider status and canary mutation facades are retired');"
);
fs.writeFileSync(file, source.endsWith('\n') ? source : source + '\n', 'utf8');
console.log('AUTH-A09 runtime assertion migrated for AUTH-A10.');
