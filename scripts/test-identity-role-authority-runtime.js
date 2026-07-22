#!/usr/bin/env node
'use strict';

const assert = require('assert');
const actorResolver = require('../backend/shared/auth/supabase-actor-resolver');
const identityService = require('../backend/modules/auth/identity-service');

const forgedUserMetadata = {
  id: 'user-1',
  email: 'client@example.com',
  user_metadata: { role: 'admin' },
  app_metadata: {}
};
const forgedActor = actorResolver.toActor(forgedUserMetadata, null);
assert.strictEqual(forgedActor.role, 'client', 'Forged user_metadata role must be ignored.');

const appMetadataUser = {
  id: 'user-2',
  email: 'operator@example.com',
  user_metadata: { role: 'client' },
  app_metadata: { role: 'support' }
};
const appMetadataActor = actorResolver.toActor(appMetadataUser, null);
assert.strictEqual(appMetadataActor.role, 'support', 'Server-controlled app_metadata role must be honored.');

const databaseActor = actorResolver.toActor(appMetadataUser, {
  id: 'user-2',
  role: 'admin',
  status: 'active'
});
assert.strictEqual(databaseActor.role, 'admin', 'Database role must override token metadata.');

const normalizedForged = identityService.normalizeUser(null, forgedUserMetadata);
assert.strictEqual(normalizedForged.role, 'client', 'Identity normalization must ignore forged user metadata role.');
const normalizedApp = identityService.normalizeUser(null, appMetadataUser);
assert.strictEqual(normalizedApp.role, 'support', 'Identity normalization must use app metadata role.');
const normalizedDatabase = identityService.normalizeUser({ id: 'user-2', role: 'professional' }, appMetadataUser);
assert.strictEqual(normalizedDatabase.role, 'professional', 'Database role must remain authoritative.');

console.log(JSON.stringify({
  forgedUserMetadataIgnored: true,
  appMetadataAccepted: true,
  databaseRoleWins: true
}));
