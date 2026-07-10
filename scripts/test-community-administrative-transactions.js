const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const file = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');

const required = [
  "transactCurrentCommunity('COMMUNITY_UPDATED'",
  "transactCurrentCommunity('INVITE_REGENERATED'",
  "transactCurrentCommunity('ROLE_CREATED'",
  "transactCurrentCommunity('ROLE_DELETED'",
  "transactCurrentCommunity('MEMBER_ROLE_CHANGED'",
  "transactCurrentCommunity('MEMBER_ADDED'"
];

for (const contract of required) {
  if (!file.includes(contract)) {
    throw new Error(`Missing administrative transaction contract: ${contract}`);
  }
}

if (!file.includes("reason: 'protected-role'")) throw new Error('Protected role deletion guard is missing.');
if (!file.includes("reason: 'already-member'")) throw new Error('Manual member duplication guard is missing.');
if (!file.includes("previousRole: previousRole, nextRole: roleId")) throw new Error('Role change audit payload is missing.');

console.log('Community administrative transactions contract: OK');
