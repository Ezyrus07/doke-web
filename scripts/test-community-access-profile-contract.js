const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const room = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const listing = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/comunidade-interna.css'), 'utf8');
const checks = [
  [html.includes('data-community-invite-form'), 'invite creation form'],
  [html.includes('data-community-invite-list'), 'invite management list'],
  [html.includes('data-community-manage-entry-mode'), 'entry approval setting'],
  [html.includes('data-community-manage-questions'), 'join questions setting'],
  [html.includes('data-community-profile-preview'), 'public card preview'],
  [room.includes('getCommunityInvites'), 'multiple invite authority'],
  [room.includes("INVITE_REVOKED"), 'invite revocation transaction'],
  [room.includes('maxUses'), 'invite usage limits'],
  [listing.includes("record.visibility !== 'hidden'"), 'hidden discovery guard'],
  [listing.includes('joinQuestions'), 'join questions listing projection'],
  [listing.includes('invite.requireApproval'), 'invite approval guard'],
  [listing.includes('invite.uses >= invite.maxUses'), 'invite exhaustion guard'],
  [css.includes('.community-room-profile-preview'), 'profile preview styling']
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, label]) => console.error('Missing:', label));
  process.exit(1);
}
console.log('Community access and profile contract: OK');
