const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.resolve(__dirname, '..', 'assets/js/features/community/community-domain.js'), 'utf8');
const storage = new Map();
const localStorage = { getItem: key => storage.has(key) ? storage.get(key) : null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) };
function loadDomain() {
  const window = { Doke: {}, localStorage, location: { search: '' }, console, crypto: { randomUUID: () => `uuid-${Date.now()}-${Math.random()}` } };
  window.window = window;
  vm.runInNewContext(source, { window, console, URLSearchParams, Set, Map, Date, JSON, Math }, { filename: 'community-domain.js' });
  return window.Doke.communityDomain;
}

let domain = loadDomain();
const owner = { id: 'owner-1', accountKey: 'owner@example.com', email: 'owner@example.com', name: 'Owner', role: 'owner' };
const member = { id: 'member-client', accountKey: 'member@example.com', identityKeys: ['member@example.com', 'professional:member'], name: 'Member', role: 'member' };
if (!domain.operations.create({ id: 'community-roles', title: 'Roles', ownerId: owner.id, ownerAccountKey: owner.accountKey, ownerIdentityKeys: [owner.id, owner.accountKey], members: [owner, member], roles: [] }, { operationId: 'create-community' }).ok) throw new Error('Could not create fixture.');

const role = { id: 'role-moderador-teste', name: 'Moderador teste', color: '#2167ae', permissions: { deleteMessages: true }, system: false, createdAt: new Date().toISOString(), createdByAccountKey: owner.accountKey };
let result = domain.operations.transact('community-roles', { operationId: 'create-role', type: 'ROLE_CREATED' }, record => ({ record: { ...record, roles: [...record.roles, role] } }));
if (!result.ok || !result.record.roles.some(item => item.id === role.id && item.createdAt && item.createdByAccountKey === owner.accountKey)) throw new Error('Created role lost canonical fields.');
domain = loadDomain();
if (!domain.roles.projectCommunityRoles({ community: domain.repository.getById('community-roles') }).some(item => item.id === role.id)) throw new Error('Created role did not survive domain reload/migration.');

result = domain.operations.transact('community-roles', { operationId: 'assign-role', type: 'MEMBER_ROLE_CHANGED' }, record => ({ record: { ...record, members: record.members.map(item => item.accountKey === member.accountKey ? { ...item, role: role.id } : item) } }));
let reloaded = domain.repository.getById('community-roles');
if (!result.ok || !reloaded.members.some(item => item.accountKey === member.accountKey && item.role === role.id && item.identityKeys.includes('professional:member'))) throw new Error('Role assignment did not survive reload/profile identity.');

result = domain.operations.transact('community-roles', { operationId: 'delete-role', type: 'ROLE_DELETED' }, record => ({ record: { ...record, roles: record.roles.filter(item => item.id !== role.id), members: record.members.map(item => item.role === role.id ? { ...item, role: 'member' } : item) } }));
reloaded = domain.repository.getById('community-roles');
if (!result.ok || reloaded.roles.some(item => item.id === role.id) || reloaded.members.some(item => item.role === role.id)) throw new Error('Role deletion and reassignment were not atomic.');

console.log('Community role persistence contract: OK');
