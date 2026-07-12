const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(base, file), 'utf8');
const community = read('assets/js/pages/comunidade-interna.js');
const messages = read('assets/js/pages/mensagens.js');
const notificationModule = read('assets/js/features/in-app-notifications.js');
const failures = [];
const check = (label, value) => { if (!value) failures.push(label); };
check('discipline notifications resolve the persisted member', /persistedTarget\s*=\s*getCommunityMembersForRecord\(record\)/.test(community));
check('quick notification actions use an in-flight lock', /pendingNotificationActions\s*=\s*new Set\(\)/.test(messages));
check('quick notification actions release the lock for retries', /finally\(releaseNotificationAction\)/.test(messages));
check('quick reply action remains wired', /action\.kind\s*===\s*['"]quick-reply['"]/.test(messages));
check('event RSVP action remains wired', /action\.kind\s*===\s*['"]event-rsvp['"]/.test(community));
check('notification module still exposes retry handling', /retryPayload/.test(notificationModule));
if (failures.length) {
  console.error('Community critical hardening contract failed:');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('Community critical hardening contract: OK');
