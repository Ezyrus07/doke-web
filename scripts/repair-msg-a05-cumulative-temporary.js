#!/usr/bin/env node
'use strict';

const fs = require('fs');
const file = 'scripts/audit-msg-001-a01-authority-baseline.js';
let source = fs.readFileSync(file, 'utf8');

function replaceOnce(before, after, label) {
  if (!source.includes(before)) throw new Error('Missing repair anchor: ' + label);
  source = source.replace(before, after);
}

replaceOnce(`[
  "var BUCKET = 'transaction-attachments'",
  'var SIGNED_URL_TTL = 900',
  "setProviderState('local-fallback')",
  "syncStatus: 'pending'"
].forEach((fragment) => assert(attachments.includes(fragment), 'Attachment baseline missing fragment: ' + fragment));`, `if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  const attachmentContract = JSON.parse(
    fs.readFileSync('config/msg-001-a05-attachment-lifecycle.json', 'utf8')
  );
  [
    "var BUCKET = 'transaction-attachments'",
    'var DEFAULT_SIGNED_URL_TTL = 300',
    "return user && isUuid(user.id) ? 'remote-server-owned' : 'fixture-memory'",
    'uploadToSignedUrl',
    'DOKE_ATTACHMENTS_PENDING_SYNC_FORBIDDEN'
  ].forEach((fragment) => assert(attachments.includes(fragment), 'Attachment A05 closure missing fragment: ' + fragment));
  [
    "setProviderState('local-fallback')",
    "syncStatus: 'pending'",
    '.upload(objectPath',
    '.remove([item.path])'
  ].forEach((fragment) => assert(!attachments.includes(fragment), 'Attachment A05 retained unsafe fragment: ' + fragment));
  assert.strictEqual(attachmentContract.authority.directBrowserUpload, false);
  assert.strictEqual(attachmentContract.authority.directBrowserDelete, false);
  assert.strictEqual(attachmentContract.authority.localPendingFallback, false);
  assert.strictEqual(attachmentContract.authority.persistentBase64Authority, false);
  assert.strictEqual(attachmentContract.storage.signedReadUrlTtlSeconds, 300);
  assert.strictEqual(attachmentContract.effects.storagePolicyChanges, 0);
  assert.strictEqual(attachmentContract.effects.edgeDeployments, 0);
} else {
  [
    "var BUCKET = 'transaction-attachments'",
    'var SIGNED_URL_TTL = 900',
    "setProviderState('local-fallback')",
    "syncStatus: 'pending'"
  ].forEach((fragment) => assert(attachments.includes(fragment), 'Attachment baseline missing fragment: ' + fragment));
}`, 'attachment baseline compatibility');

replaceOnce(`if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A04')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A03')));
} else if (fs.existsSync('config/msg-001-a02-canonical-authority-boundary.json')) {`, `if (fs.existsSync('config/msg-001-a05-attachment-lifecycle.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A06')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A05:')));
} else if (fs.existsSync('config/msg-001-a03-server-command-boundary.json')) {
  assert(msg.nextActions.some((item) => item.includes('MSG-A04')));
  assert(!msg.nextActions.some((item) => item.includes('MSG-A03')));
} else if (fs.existsSync('config/msg-001-a02-canonical-authority-boundary.json')) {`, 'MSG next-action compatibility');

fs.writeFileSync(file, source);
console.log('MSG-A05 cumulative A01 repair completed.');
