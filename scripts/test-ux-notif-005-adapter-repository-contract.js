#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const inApp = fs.readFileSync('assets/js/features/in-app-notifications.js', 'utf8');
const repo = fs.readFileSync('assets/js/repositories/notifications-repository.js', 'utf8');

for (const required of [
  'const getNotificationService = () => window.Doke?.services?.notifications || null;',
  "center.markRead(id, { pendingSync: true })",
  "center.dismiss(id, { pendingSync: true })",
  "persistPresentationMutation(id, 'read', fence)",
  "persistPresentationMutation(id, 'dismiss', fence)",
  'center.resolveMutation?.',
  'center.reconcile(',
  'applySynchronizedItems(event.detail || {})',
  "freshness: 'DEGRADED'"
]) assert.ok(inApp.includes(required), `missing H05 adapter contract: ${required}`);
assert.equal(inApp.includes('applySynchronizedItems(event.detail?.items || [])'), false, 'sync must preserve reconciliation metadata');

for (const required of [
  'stateSyncStatus',
  'pendingStatePatch',
  'stateSyncError',
  "item.stateSyncStatus === 'pending'",
  'updateRemote(item.id, item.pendingStatePatch)',
  "freshness: 'DEGRADED'",
  'accountId: normalizeText(user.id || user.userId || user.uid || \'\')',
  'completeSnapshot: metadata.completeSnapshot !== false'
]) assert.ok(repo.includes(required), `missing H05 repository contract: ${required}`);

const updateBlock = repo.match(/function update\(id, patch\)[\s\S]*?\n  }\n\n  function markAsRead/);
assert(updateBlock, 'repository update block must exist');
assert.ok(updateBlock[0].includes("stateSyncStatus = client ? 'pending' : 'local'"));
assert.ok(updateBlock[0].includes("stateSyncStatus: 'pending'"));
assert.ok(updateBlock[0].includes("stateSyncStatus: 'synced'"));

console.log('[ux-notif-005-adapter-repository-contract] ok');
console.log('- in-app mutation persistence, reconciliation metadata and repository pending state replay validated');
