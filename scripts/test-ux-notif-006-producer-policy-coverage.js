#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const eventPath = path.join(rootDir, 'assets/js/core/notification-event.js');
const notificationServicePath = path.join(rootDir, 'assets/js/services/notification-service.js');
const walletServicePath = path.join(rootDir, 'assets/js/services/wallet-service.js');
const walletRepositoryPath = path.join(rootDir, 'assets/js/repositories/wallet-repository.js');
const previousWindow = global.window;
const previousDoke = global.Doke;

const notificationServiceSource = fs.readFileSync(notificationServicePath, 'utf8');
const walletServiceSource = fs.readFileSync(walletServicePath, 'utf8');
const walletRepositorySource = fs.readFileSync(walletRepositoryPath, 'utf8');
const producerSource = [notificationServiceSource, walletServiceSource, walletRepositorySource].join('\n');

const expectedProducerTypes = [
  'message_received',
  'order_created',
  'order_status_changed',
  'order_accepted',
  'order_in_progress',
  'order_completed',
  'order_cancelled',
  'order_reviewed',
  'order_completion_requested',
  'proposal_sent',
  'proposal_approved',
  'proposal_rejected',
  'payment_held',
  'wallet_receivable_available',
  'wallet_withdraw_requested',
  'wallet_withdraw_completed',
  'wallet_withdraw_declined',
  'dispute_opened',
  'dispute_reported',
  'dispute_responded',
  'dispute_resolved'
];

for (const eventType of expectedProducerTypes) {
  assert.ok(
    producerSource.includes(`'${eventType}'`) || producerSource.includes(`"${eventType}"`),
    `${eventType} must still exist in the canonical producer inventory`
  );
}

const directEventTypes = new Set();
for (const match of producerSource.matchAll(/eventType:\s*['"]([^'"]+)['"]/g)) directEventTypes.add(match[1]);
for (const match of producerSource.matchAll(/canonicalEventType\s*=\s*['"]([^'"]+)['"]/g)) directEventTypes.add(match[1]);
for (const match of producerSource.matchAll(/localFinancialNotificationEnvelope\(\s*['"]([^'"]+)['"]/g)) directEventTypes.add(match[1]);
for (const match of producerSource.matchAll(/canonicalLocalDisputeEnvelope\(\s*['"]([^'"]+)['"]/g)) directEventTypes.add(match[1]);

const scopedProducerTypes = new Set(expectedProducerTypes);
for (const eventType of directEventTypes) {
  if (/^(message_|order_|proposal_|payment_|wallet_|dispute_)/.test(eventType)) scopedProducerTypes.add(eventType);
}

delete require.cache[require.resolve(eventPath)];
global.window = global;
global.Doke = {};

try {
  require(eventPath);
  const event = global.Doke.notificationEvent;
  assert.ok(event);

  const missingPolicies = [...scopedProducerTypes].filter((eventType) => !event.getPolicy(eventType));
  assert.deepEqual(missingPolicies, [], `canonical producer eventTypes missing H06 policy: ${missingPolicies.join(', ')}`);

  assert.match(notificationServiceSource, /eventType:\s*canonicalEventType/,
    'order status producer must continue routing semantic eventType through canonicalEventType');
  assert.match(walletServiceSource, /localFinancialNotificationEnvelope\(/,
    'wallet service must continue using canonical financial envelopes');
  assert.match(walletRepositorySource, /canonicalLocalDisputeEnvelope\(/,
    'wallet repository must continue using canonical dispute envelopes');

  console.log('[ux-notif-006-producer-policy-coverage] ok');
  console.log(`- ${scopedProducerTypes.size} current canonical producer eventTypes are fenced by H06 policy`);
} finally {
  delete require.cache[require.resolve(eventPath)];
  if (previousWindow === undefined) delete global.window;
  else global.window = previousWindow;
  if (previousDoke === undefined) delete global.Doke;
  else global.Doke = previousDoke;
}
