const fs = require('fs');
const assert = require('assert');

const js = fs.readFileSync('assets/js/pages/comunidade-interna.js', 'utf8');
const css = fs.readFileSync('assets/css/pages/comunidade-interna.css', 'utf8');

[
  'doke.community.channel-state.local.v1',
  'getChannelUnreadCount',
  'markChannelRead',
  'data-community-channel-unread',
  'data-community-channel-mute',
  'community-channel-announcement',
  'notifyAnnouncementChannel',
  'COMMUNITY_CHANNEL_STATE_STORAGE_KEY'
].forEach((token) => assert(js.includes(token), `Missing JS contract: ${token}`));
[
  '.community-room-channel__badge',
  '.community-room-channel__mute',
  '.community-room-channel__meta'
].forEach((token) => assert(css.includes(token), `Missing CSS contract: ${token}`));
assert(js.includes("markChannelRead(currentChannelId)"), 'Opening a channel must mark it read');
assert(js.includes("!isChannelMutedForAccount(channel.id, accountKey)"), 'Muted recipients must not receive announcement notifications');
console.log('Community channel unread contract: OK');
