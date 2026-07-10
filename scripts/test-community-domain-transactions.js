const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const domain = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');
const community = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade.js'), 'utf8');
const room = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const checks = [
  ['domain create operation', /function createOperation\(/.test(domain)],
  ['domain transaction operation', /function transactCommunity\(/.test(domain)],
  ['domain deletion operation', /function deleteCommunity\(/.test(domain)],
  ['operation id dedupe', /findEventByOperationId\(operationId\)/.test(domain)],
  ['creation event', /COMMUNITY_CREATED/.test(community)],
  ['public join event', /MEMBER_JOINED/.test(community)],
  ['join request event', /JOIN_REQUEST_CREATED/.test(community)],
  ['request resolution events', /JOIN_REQUEST_ACCEPTED/.test(room) && /JOIN_REQUEST_REJECTED/.test(room)],
  ['membership lifecycle events', /MEMBER_LEFT/.test(room) && /MEMBER_REMOVED/.test(room)],
  ['ownership event', /OWNER_TRANSFERRED/.test(room)],
  ['deletion event', /COMMUNITY_DELETED/.test(room)]
];
const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  failed.forEach(([name]) => console.error('FAIL:', name));
  process.exit(1);
}
console.log('Community domain transactions contract: OK');
