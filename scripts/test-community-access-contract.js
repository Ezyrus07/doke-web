const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');

function createStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function loadDomain({ sessionUser = null, authUser = null, communities = [] } = {}) {
  const localStorage = createStorage();
  localStorage.setItem('doke.communities.local.v1', JSON.stringify(communities));
  const window = {
    localStorage,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
    Doke: {
      session: { getCurrentUser: () => sessionUser }
    },
    DokeAuth: {
      service: { getCurrentUser: () => authUser }
    }
  };
  const context = vm.createContext({ window, console, Set, Map, Array, Object, String, Number, Boolean, Date, JSON, Math });
  vm.runInContext(source, context, { filename: 'community-domain.js' });
  return window.Doke.communityDomain;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const accountA = {
  id: 'auth-a',
  accountId: 'account-a',
  email: 'conta-a@doke.local',
  name: 'Conta A',
  profile: { id: 'cliente-a', accountId: 'account-a', email: 'conta-a@doke.local' }
};
const accountBClient = {
  id: 'auth-b',
  accountId: 'account-b',
  email: 'conta-b@doke.local',
  name: 'Conta B',
  profile: { id: 'cliente-b', accountId: 'account-b', email: 'conta-b@doke.local' },
  profiles: [
    { id: 'cliente-b', accountId: 'account-b', email: 'conta-b@doke.local' },
    { id: 'profissional-b', accountId: 'account-b', email: 'conta-b@doke.local' }
  ]
};
const accountBProfessional = {
  id: 'auth-b',
  accountId: 'account-b',
  email: 'conta-b@doke.local',
  name: 'Conta B Pro',
  profile: { id: 'profissional-b', accountId: 'account-b', email: 'conta-b@doke.local' },
  profiles: accountBClient.profiles
};
const accountC = {
  id: 'auth-c',
  accountId: 'account-c',
  email: 'conta-c@doke.local',
  name: 'Conta C'
};

function communityFixture(domain) {
  const owner = domain.identity.resolveCurrentUser();
  const member = {
    id: 'conta-b@doke.local',
    accountKey: 'conta-b@doke.local',
    name: 'Conta B',
    email: 'conta-b@doke.local',
    identityKeys: ['conta-b@doke.local', 'account-b', 'auth-b', 'cliente-b', 'profissional-b'],
    role: 'member',
    source: 'public-discovery'
  };
  return domain.migrations.migrateRecord({
    id: 'community-access-contract',
    title: 'Comunidade Contrato',
    visibility: 'public',
    ownerId: owner.id,
    ownerIdentityKeys: owner.identityKeys,
    members: [Object.assign({}, owner, { role: 'owner' }), member]
  });
}

{
  const domain = loadDomain({ sessionUser: accountA });
  const community = communityFixture(domain);
  const relation = domain.identity.resolveCommunityRelation({ community, currentUser: domain.identity.resolveCurrentUser() });
  assert(relation.relation === 'owner', 'Scenario A: owner must resolve as owner');
  assert(relation.allowed, 'Scenario A: owner must be allowed');
}

{
  const ownerDomain = loadDomain({ sessionUser: accountA });
  const community = communityFixture(ownerDomain);
  const memberDomain = loadDomain({ sessionUser: accountBClient });
  const relation = memberDomain.identity.resolveCommunityRelation({ community, currentUser: memberDomain.identity.resolveCurrentUser() });
  assert(relation.relation === 'member', 'Scenario B: joined account must resolve as member');
  assert(relation.allowed, 'Scenario B: member must not be redirected');
}

{
  const ownerDomain = loadDomain({ sessionUser: accountA });
  const community = communityFixture(ownerDomain);
  const visitorDomain = loadDomain({ sessionUser: accountC });
  const relation = visitorDomain.identity.resolveCommunityRelation({ community, currentUser: visitorDomain.identity.resolveCurrentUser() });
  assert(relation.relation === 'visitor', 'Scenario C: unrelated account must resolve as visitor');
  assert(!relation.allowed, 'Scenario C: visitor redirect remains allowed');
}

{
  const ownerDomain = loadDomain({ sessionUser: accountA });
  const community = communityFixture(ownerDomain);
  const clientDomain = loadDomain({ sessionUser: accountBClient });
  const professionalDomain = loadDomain({ sessionUser: accountBProfessional });
  const clientUser = clientDomain.identity.resolveCurrentUser();
  const professionalUser = professionalDomain.identity.resolveCurrentUser();
  assert(clientUser.accountKey === professionalUser.accountKey, 'Scenario D: client and professional profiles must share accountKey');
  assert(professionalDomain.identity.resolveCommunityRelation({ community, currentUser: professionalUser }).relation === 'member', 'Scenario D: professional profile must remain member');
}

{
  const domain = loadDomain({ sessionUser: accountBClient, authUser: accountA });
  const user = domain.identity.resolveCurrentUser();
  assert(user.email === accountBClient.email, 'Scenario E: Doke.session must win over legacy auth service');
  assert(user.accountKey === 'conta-b@doke.local', 'Scenario E: resolved accountKey must belong to session account');
}

{
  const domain = loadDomain({ sessionUser: accountA });
  const migrated = domain.migrations.migrateRecord({
    id: 'migration-contract',
    title: 'Migração Contrato',
    ownerId: 'conta-a@doke.local',
    ownerIdentityKeys: ['conta-a@doke.local'],
    members: [
      { id: 'conta-a@doke.local', name: 'Conta A', email: 'conta-a@doke.local', role: 'owner' },
      { id: 'conta-b@doke.local', name: 'Conta B', email: 'conta-b@doke.local', role: 'member' },
      { id: 'current-user', name: 'Registro antigo', role: 'member' }
    ]
  });
  assert(migrated.members.some((member) => member.email === 'conta-b@doke.local'), 'Scenario F: migration must preserve valid member');
  assert(migrated.members.some((member) => member.id === 'current-user'), 'Scenario F: migration must preserve ambiguous generic legacy record for audit');
}

console.log('Community access contract: OK');
