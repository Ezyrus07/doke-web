const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const page = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const domain = fs.readFileSync(path.join(root, 'assets/js/features/community/community-domain.js'), 'utf8');

const checks = [
  [html.includes('data-community-settings-tab="security"'), 'security navigation tab'],
  [html.includes('data-community-security-bans'), 'ban management list'],
  [html.includes('data-community-audit-type'), 'audit type filter'],
  [page.includes('function renderCommunitySecurityPanel()'), 'security renderer'],
  [page.includes('function unbanCommunityMember('), 'unban transaction'],
  [page.includes('channelDiscipline'), 'per-channel discipline'],
  [page.includes('cleanupExpiredCommunityDiscipline'), 'automatic cleanup'],
  [page.includes('data-community-discipline-duration'), 'custom duration control'],
  [page.includes('getEffectiveMemberDiscipline(currentMember'), 'send enforcement'],
  [domain.includes('expiresAt:'), 'expiring ban normalization']
];

const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length) {
  console.error('Community security center contract failed:', failed.join(', '));
  process.exit(1);
}
console.log('Community security center contract: OK');
