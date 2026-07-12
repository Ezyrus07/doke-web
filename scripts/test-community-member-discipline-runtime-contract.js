const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'assets', 'js', 'pages', 'comunidade-interna.js');
const source = fs.readFileSync(file, 'utf8');

const checks = [
  ['record-aware member resolver exists', /function\s+getCommunityMembersForRecord\s*\(/],
  ['discipline transaction uses record-aware members', /function\s+disciplineCommunityMember[\s\S]*getCommunityMembersForRecord\(storedRecord\)/],
  ['notification resolves persisted target', /persistedTarget\s*=\s*getCommunityMembersForRecord\(record\)/],
  ['discipline click handler is wired', /data-community-member-discipline/]
];

const failed = checks.filter(([, pattern]) => !pattern.test(source));
if (failed.length) {
  console.error('Community member discipline runtime contract failed:');
  failed.forEach(([label]) => console.error('- ' + label));
  process.exit(1);
}
console.log('Community member discipline runtime contract: OK');
