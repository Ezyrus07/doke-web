const fs = require('fs');
const domain = fs.readFileSync('assets/js/features/community/community-domain.js','utf8');
const page = fs.readFileSync('assets/js/pages/comunidade-interna.js','utf8');
const html = fs.readFileSync('comunidade-interna.html','utf8');
const checks = [
  ['permission', domain.includes('bypassSlowMode')],
  ['channel slow mode', domain.includes('slowModeSeconds')],
  ['channel link block', domain.includes('blockLinks')],
  ['security validator', page.includes('validateCommunityMessageSecurity')],
  ['flood block', page.includes("reason: 'flood'")],
  ['duplicate block', page.includes("reason: 'duplicate-message'")],
  ['audit event', page.includes('message-security-violation')],
  ['form control', html.includes('data-community-channel-slow-mode') && html.includes('data-community-channel-block-links')]
];
const failed = checks.filter(([,ok]) => !ok);
if (failed.length) { console.error(failed.map(([name]) => name).join(', ')); process.exit(1); }
console.log('Community antispam contract: OK');
