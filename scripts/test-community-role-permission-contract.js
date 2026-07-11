const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const domain = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');

const requiredPageContracts = [
  'function getCommunityRolesForRecord(record)',
  'communityDomain.roles.projectCommunityRoles',
  'function canCommunityForRecord(permission, record)',
  'function memberMatchesTarget(member, targetKey)',
  'function normalizeMemberRoleIds(member)',
  'function createRoleChecklist(member)',
  'data-community-member-role-toggle',
  "transactCurrentCommunity('ROLE_CREATED'",
  "transactCurrentCommunity('ROLE_DELETED'",
  "transactCurrentCommunity('MEMBER_ROLES_CHANGED'",
  "canCommunityForRecord('manageRoles', storedRecord)",
  'getCommunityRolesForRecord(storedRecord)',
  'memberMatchesTarget(next, targetKey)',
  "next.roleIds = ['member'].concat(roleIds)",
  "reason: 'protected-role'",
  'syncCommunityPermissionUI();'
];

const requiredDomainContracts = [
  'function normalizeMemberRoleIds(member)',
  'roleIds: normalizeMemberRoleIds(member)',
  'return roleIds.some(function (roleId)',
  "roleIds: ['owner']"
];

for (const contract of requiredPageContracts) {
  if (!page.includes(contract)) throw new Error(`Missing community role/permission contract: ${contract}`);
}
for (const contract of requiredDomainContracts) {
  if (!domain.includes(contract)) throw new Error(`Missing community multi-role domain contract: ${contract}`);
}

if (page.includes("select.className = 'community-member-directory__select doke-select'")) {
  throw new Error('Single-role select is still active in the member management menu.');
}
if (page.includes("transactCurrentCommunity('MEMBER_ROLE_CHANGED'")) {
  throw new Error('Legacy single-role transaction is still active.');
}
if (page.includes('ensureCreatedRolePersisted(')) {
  throw new Error('Role creation still performs a second persistence write after the transaction.');
}
if (!/var persistedRecord = operation && operation\.ok \? operation\.record : null;/.test(page)) {
  throw new Error('Role creation does not render from the persisted transaction record.');
}
if (/data-community-member-role = member\.id/.test(page)) {
  throw new Error('Role assignment still depends only on the unstable member id.');
}

console.log('Community role and permission contract: OK');
