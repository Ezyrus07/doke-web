const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/features/community/community-domain.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createStorage(initial = []) {
  const values = new Map([['doke.communities.local.v1', JSON.stringify(initial)]]);
  return {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(String(key), String(value))
  };
}

function loadDomain({ communities = [], user = null, storage = createStorage(communities) } = {}) {
  const window = {
    localStorage: storage,
    location: { search: '' },
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    Doke: { session: { getCurrentUser: () => user } },
    DokeAuth: { service: { getCurrentUser: () => null } }
  };
  vm.runInContext(source, vm.createContext({ window, console, URLSearchParams, Set, Map, Array, Object, String, Number, Boolean, Date, JSON, Math }));
  return { domain: window.Doke.communityDomain, storage };
}

const ownerUser = {
  id: 'auth-owner', accountId: 'account-owner', email: 'owner@doke.local', name: 'Conta A',
  profiles: [{ id: 'cliente-owner', accountId: 'account-owner', email: 'owner@doke.local' }]
};
const requesterKeys = ['requester@doke.local', 'account-requester', 'client-requester', 'professional-requester'];

{
  const { domain } = loadDomain({ user: ownerUser });
  const owner = domain.identity.resolveCurrentUser();
  const created = domain.operations.create({
    id: 'new-community', title: 'Nova comunidade', ownerId: owner.id,
    ownerAccountKey: owner.accountKey, ownerIdentityKeys: owner.identityKeys,
    members: [{ ...owner, role: 'owner', source: 'creator', joinedAt: '2026-07-11T00:00:00.000Z' }]
  });
  const projected = domain.members.projectCommunityMembers({ community: created.record, currentUser: owner });
  assert(created.ok, 'Scenario A: community creation must persist');
  assert(created.record.members.length === 1 && created.record.members[0].role === 'owner', 'Scenario A: owner must be persisted exactly once');
  assert(projected.length === 1 && projected[0].role === 'owner', 'Scenario A/H: counter and panel projection must contain owner');
}

{
  const fixture = {
    id: 'approval-community', title: 'Aprovação', ownerId: 'owner@doke.local', ownerIdentityKeys: ['owner@doke.local'],
    joinRequests: [{ id: 'request-1', userId: 'client-requester', accountKey: 'requester@doke.local', userEmail: 'requester@doke.local', userName: 'Conta B', identityKeys: requesterKeys, status: 'accepted', requestedAt: '2026-07-10T00:00:00.000Z', resolvedAt: '2026-07-11T00:00:00.000Z' }]
  };
  const first = loadDomain({ communities: [fixture], user: ownerUser });
  const persisted = first.domain.repository.getById('approval-community');
  assert(persisted.members.length === 2, 'Scenario B: accepted request must materialize a second member');
  assert(persisted.members.some((member) => member.accountKey === 'requester@doke.local'), 'Scenario B: requester must exist in members');
  const reloaded = loadDomain({ storage: first.storage, user: ownerUser }).domain.repository.getById('approval-community');
  assert(reloaded.members.length === 2, 'Scenario C: owner and requester must survive reload');
}

{
  const { domain } = loadDomain();
  const community = {
    id: 'profiles-community', title: 'Perfis', ownerId: 'owner@doke.local',
    members: [
      { id: 'client-requester', accountKey: 'requester@doke.local', name: 'Conta B Cliente', identityKeys: requesterKeys, role: 'member' },
      { id: 'professional-requester', accountKey: 'requester@doke.local', name: 'Conta B Pro', identityKeys: requesterKeys, role: 'member' }
    ]
  };
  const projected = domain.members.projectCommunityMembers({ community });
  assert(projected.length === 2, 'Scenario D/F: owner plus client/professional account must produce two people total');
  assert(projected.filter((member) => member.accountKey === 'requester@doke.local').length === 1, 'Scenario D/F: canonical accountKey must prevent profile duplication');
}

{
  const { domain } = loadDomain();
  const migrated = domain.migrations.migrateRecord({ id: 'legacy-community', title: 'Legada', ownerId: 'legacy-owner@doke.local', members: [] });
  assert(migrated.members.length === 1 && migrated.members[0].role === 'owner', 'Scenario E: ownerId-only legacy record must gain owner member');
}

console.log('Community member projection contract: OK');
