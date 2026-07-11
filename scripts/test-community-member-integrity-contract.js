const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'assets/js/features/community/community-domain.js'), 'utf8');
const values = new Map([['doke.communities.local.v1', '[]']]);
const window = {
  localStorage: { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(String(key), String(value)) },
  location: { search: '' }, crypto: { randomUUID: () => 'integrity-id' },
  Doke: { session: { getCurrentUser: () => null } }, DokeAuth: { service: { getCurrentUser: () => null } }
};
vm.runInContext(source, vm.createContext({ window, console, URLSearchParams, Set, Map, Array, Object, String, Number, Boolean, Date, JSON, Math }));
const domain = window.Doke.communityDomain;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const inconsistent = {
  id: 'integrity-community', title: 'Integridade', ownerId: 'owner@doke.local', memberCount: 9,
  roles: [{ id: 'helpers', name: 'Ajudantes' }],
  members: [
    { id: 'owner@doke.local', accountKey: 'owner@doke.local', name: 'Owner A', role: 'member' },
    { id: 'owner-copy', accountKey: 'owner@doke.local', name: 'Owner B', role: 'owner' },
    { id: 'current-user', name: 'Registro ambíguo', role: 'unknown-role' }
  ],
  joinRequests: [{ id: 'accepted-without-member', accountKey: 'accepted@doke.local', userEmail: 'accepted@doke.local', userName: 'Aceito', status: 'accepted' }]
};

const report = domain.integrity.auditRecord(inconsistent);
assert(report.issues.some((issue) => issue.indexOf('duplicate-member-account:') === 0), 'Integrity: duplicate account must be reported');
assert(report.issues.includes('member-count-mismatch'), 'Integrity: divergent persisted counter must be reported');
assert(report.issues.some((issue) => issue.indexOf('member-without-identity:') === 0), 'Integrity: ambiguous member must be reported');
assert(report.issues.some((issue) => issue.indexOf('member-with-unknown-role:') === 0), 'Integrity: unknown role must be reported');
assert(report.projectedMembers.some((member) => member.accountKey === 'accepted@doke.local'), 'Scenario G: safe accepted request must be materialized by projection');
assert(report.projectedMembers.filter((member) => member.role === 'owner').length === 1, 'Integrity: projection must expose exactly one owner');
assert(report.projectedMembers.some((member) => member.id === 'current-user'), 'Integrity: ambiguous member must be preserved, not deleted');

const migrated = domain.migrations.migrateRecord(inconsistent);
const panelMembers = domain.members.projectCommunityMembers({ community: migrated });
const headerMemberCount = panelMembers.length;
assert(headerMemberCount === migrated.members.length, 'Scenario H: header and renderer must consume exactly the same collection');
assert(migrated.members.some((member) => member.id === 'current-user'), 'Integrity normalization must preserve ambiguous records');

console.log('Community member integrity contract: OK');
