const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const communityPage = read('assets/js/pages/comunidade.js');
const communityRoom = read('assets/js/pages/comunidade-interna.js');
const notifications = read('assets/js/pages/notificacoes.js');

const assertions = [
  [communityPage.includes('getCommunityBanState'), 'listing resolves active ban state'],
  [communityPage.includes('data-community-ban-countdown'), 'listing renders ban countdown'],
  [communityPage.includes('community-continue-card__ban-details'), 'listing renders reason and moderator'],
  [communityPage.includes('cleanupExpiredCommunityBans'), 'listing cleans expired bans'],
  [communityPage.includes("if (banState.active)"), 'invite flow blocks active bans'],
  [communityPage.includes("renderCommunityCollections({ force: true })"), 'cross-tab access refresh is forced'],
  [communityRoom.includes('notifyUnbannedMember'), 'unban creates member notification'],
  [communityRoom.includes("targetParams.set('banExpiresAt'"), 'ban notification carries expiry metadata'],
  [notifications.includes('getBanNotificationState'), 'notifications parse ban metadata'],
  [notifications.includes('formatBanCountdown'), 'notifications render countdown'],
  [notifications.includes('notification-card__ban-status'), 'notifications expose ban status UI']
];

const failed = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failed.length) {
  console.error('Community ban experience contract failed:');
  failed.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}
console.log('Community ban experience contract: OK');
