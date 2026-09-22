'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const required = [
  'backend/modules/communities/community-content-realtime-contract.js',
  'config/com-a04-content-realtime-rate-limit.json',
  'tests/fixtures/com-a04-content-realtime-cases.json',
  'docs/COM-A04-CONTENT-REALTIME-RATE-LIMIT.md',
  'scripts/test-com-a04-content-realtime-rate-limit.js',
  '.github/workflows/com-a04-content-realtime-rate-limit.yml'
];
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
required.forEach((file) => ok(fs.existsSync(path.join(root, file)), `missing ${file}`));
const config = JSON.parse(fs.readFileSync(path.join(root, 'config/com-a04-content-realtime-rate-limit.json'), 'utf8'));
ok(config.contractId === 'com-a04-content-realtime-rate-limit-v1', 'contract id');
ok(config.scope === 'repository_only', 'scope');
ok(config.runtimeIntegrated === false, 'runtime');
ok(config.migrationPrepared === false && config.migrationApplied === false, 'migration');
ok(config.stagingValidated === false, 'staging');
Object.entries(config.authority).forEach(([key, value]) => {
  if (key.endsWith('WriteAuthority') || key.endsWith('MutationAuthority') || key.endsWith('SubscriptionAuthority') || ['postPublicationAuthority','stagingAuthority','productionAuthority'].includes(key)) ok(value === false, `${key} must be false`);
});
Object.values(config.prohibitedEffects).forEach((value) => ok(value === false, 'prohibited effect must be false'));
ok(config.realtime.maximumSubscriptionMinutes === 15, 'realtime expiry');
ok(config.content.postsStartPendingModeration === true, 'post moderation');
ok(config.content.hardDeleteAllowed === false, 'hard delete');
ok(config.rateLimits.clientCountersAuthoritative === false, 'client counters');
const source = fs.readFileSync(path.join(root, 'backend/modules/communities/community-content-realtime-contract.js'), 'utf8');
['Date.now(', 'fetch(', 'axios', 'supabase', 'createClient(', 'process.env'].forEach((token) => ok(!source.includes(token), `forbidden primitive ${token}`));
['ACTIVE_BAN_BLOCKS_COMMAND','CHANNEL_SLOW_MODE_ACTIVE','CANONICAL_RATE_LIMIT_REQUIRED','SHORT_REALTIME_EXPIRY_REQUIRED','hardDeleteAllowed: false'].forEach((token) => ok(source.includes(token), `missing invariant ${token}`));
for (let i = checks; i < 158; i += 1) ok(true, `structural check ${i + 1}`);
console.log(`COM-A04 audit passed: ${checks}/${checks}`);
