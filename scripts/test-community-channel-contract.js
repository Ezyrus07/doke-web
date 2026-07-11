const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const domain = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');

const checks = [
  ['domain channel projection', /function projectCommunityChannels\(/.test(domain)],
  ['schema channels migration', /next\.channels = projectCommunityChannels/.test(domain)],
  ['manageChannels permission', /manageChannels/.test(domain) && /manageChannels/.test(page)],
  ['channel settings panel', /data-community-panel="channels"/.test(html)],
  ['dynamic channel list', /data-community-channel-list/.test(html) && /function renderChannels\(/.test(page)],
  ['read-only enforcement', /function canSendToChannel\(/.test(page) && /channelReadOnly/.test(page)],
  ['role visibility', /allowedRoleIds/.test(page) && /sendRoleIds/.test(page)],
  ['channel transactions', /CHANNEL_CREATED/.test(page) && /CHANNEL_DELETED/.test(page)]
];

const failures = checks.filter(([, ok]) => !ok).map(([name]) => name);
if (failures.length) {
  console.error('Community channel contract failed:', failures.join(', '));
  process.exit(1);
}
console.log('Community channel contract: OK');
