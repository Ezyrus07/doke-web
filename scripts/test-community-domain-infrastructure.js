const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const domainPath = path.join(root, 'assets/js/features/community/community-domain.js');
const communityHtml = fs.readFileSync(path.join(root, 'comunidade.html'), 'utf8');
const roomHtml = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const listingJs = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade.js'), 'utf8');
const roomJs = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');

const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

assert(fs.existsSync(domainPath), 'community domain service is missing');
const domain = fs.readFileSync(domainPath, 'utf8');
[
  'communityDomain',
  'repository',
  'permissions',
  'migrations',
  'integrity',
  'events',
  'transaction',
  'auditAll',
  'migrateAll',
  'schemaVersion'
].forEach((token) => assert(domain.includes(token), `domain contract missing: ${token}`));
assert(communityHtml.indexOf('community-domain.js') < communityHtml.indexOf('assets/js/pages/comunidade.js'), 'listing page must load domain before page controller');
assert(roomHtml.indexOf('community-domain.js') < roomHtml.indexOf('assets/js/pages/comunidade-interna.js'), 'room page must load domain before page controller');
assert(listingJs.includes('communityDomain?.repository'), 'listing page must delegate storage to repository');
assert(roomJs.includes('communityDomain && window.Doke.communityDomain.repository'), 'room page must delegate storage to repository');
assert(roomJs.includes('communityDomain.permissions'), 'room permissions must delegate to permission service');
assert(!domain.includes('dokeDataProvider=api'), 'domain infrastructure must not activate api provider');

if (failures.length) {
  console.error('Community domain infrastructure contract: FAILED');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Community domain infrastructure contract: OK');
