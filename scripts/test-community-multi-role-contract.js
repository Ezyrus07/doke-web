const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const domainCode = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');
const pageCode = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');

for (const contract of [
  'roleIds: normalizeMemberRoleIds(member)',
  'return roleIds.some(function (roleId)',
  "next.roleIds = ['member'].concat(roleIds)",
  "transactCurrentCommunity('MEMBER_ROLES_CHANGED'",
  'function createRoleChecklist(member)'
]) {
  if (!domainCode.includes(contract) && !pageCode.includes(contract)) {
    throw new Error(`Missing multi-role contract: ${contract}`);
  }
}

if (!pageCode.includes("input.type = 'checkbox'")) {
  throw new Error('Multi-role UI is not checkbox based.');
}
if (!pageCode.includes('assigned: shouldAssign')) {
  throw new Error('Role toggle transaction does not persist assign/remove intent.');
}
if (!pageCode.includes("next.role = roleIds.length ? roleIds[roleIds.length - 1] : 'member'")) {
  throw new Error('Primary display role is not updated after multi-role assignment.');
}

console.log('Community multi-role contract: OK');
