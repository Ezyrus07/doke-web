const fs = require('fs');
const js = fs.readFileSync('assets/js/pages/comunidade-interna.js', 'utf8');
const html = fs.readFileSync('comunidade-interna.html', 'utf8');
const css = fs.readFileSync('assets/css/pages/comunidade-interna.css', 'utf8');
const required = [
  ['reply state', js.includes('pendingReply') && html.includes('data-community-reply-preview')],
  ['reactions', js.includes('toggleMessageReaction') && css.includes('.community-message-reaction')],
  ['edit history', js.includes('showMessageEditHistory')],
  ['threads', js.includes('threadReplies') && js.includes('showThreadReplies')],
  ['forward', js.includes('forwardCommunityMessage')],
  ['message filters', html.includes('data-community-message-author-filter') && js.includes('applyMessageSearchFilters')]
];
const failed = required.filter(([, ok]) => !ok);
if (failed.length) { console.error('Advanced messages contract failed:', failed.map(([name]) => name).join(', ')); process.exit(1); }
console.log('Community advanced messages contract: OK');
