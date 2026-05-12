const fs = require('fs');
const path = require('path');

const root = process.cwd();
const htmlPath = path.join(root, 'comunidade-interna.html');
const html = fs.readFileSync(htmlPath, 'utf8');

const required = [
  'data-community-internal-root',
  'data-page-key="comunidade-interna"',
  'data-data-ready="community-room"',
  'data-community-id=',
  'data-community-room-id=',
  'data-community-room-sidebar',
  'data-community-channel-search',
  'data-community-channels-region',
  'data-community-channel-list',
  'data-community-channel-card',
  'data-channel-id=',
  'data-community-summary-region',
  'data-community-summary-card',
  'data-community-room-thread',
  'data-community-room-header',
  'data-community-room-profile',
  'data-community-room-messages',
  'data-community-post-list',
  'data-community-post',
  'data-message-id=',
  'data-community-composer',
  'data-community-composer-input',
  'data-community-composer-submit'
];

const missing = required.filter((token) => !html.includes(token));
const counts = {
  channelCards: (html.match(/data-community-channel-card/g) || []).length,
  posts: (html.match(/data-community-post(\s|>)/g) || []).length,
  composer: (html.match(/data-community-composer(\s|>)/g) || []).length,
};

const problems = [];
if (missing.length) problems.push(`Missing required hooks: ${missing.join(', ')}`);
if (counts.channelCards < 3) problems.push(`Expected at least 3 channel cards, found ${counts.channelCards}.`);
if (counts.posts < 4) problems.push(`Expected at least 4 community posts, found ${counts.posts}.`);
if (html.includes('style="')) problems.push('Found inline style attribute.');

const report = {
  ok: problems.length === 0,
  html: 'comunidade-interna.html',
  requiredHookCount: required.length,
  missing,
  counts,
  problems,
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-41-comunidade-interna-data-hooks-report.json'), JSON.stringify(report, null, 2));

if (problems.length) {
  console.error('Comunidade interna data hooks audit failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Comunidade interna data hooks audit passed.');
