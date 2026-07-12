'use strict';
const fs = require('fs');
const page = fs.readFileSync('assets/js/pages/comunidade-interna.js', 'utf8');
const domain = fs.readFileSync('assets/js/features/community/community-domain.js', 'utf8');
const checks = [
  ['safe discipline date formatter', /function\s+formatDisciplineEnd\s*\(/],
  ['notification uses safe formatter', /Término previsto:[\s\S]*formatDisciplineEnd\(until\)/],
  ['discipline result reads transaction result or event payload', /result\.result\s*\|\|\s*result\.event/],
  ['raw persisted member lookup', /var\s+rawMembers\s*=\s*\(Array\.isArray\(storedRecord\.members\)/],
  ['mute clears restrict', /action === 'mute'[\s\S]*restrictedUntil = ''/],
  ['restrict clears mute', /action === 'restrict'[\s\S]*mutedUntil = ''/],
  ['composer state respects discipline', /var\s+blocked\s*=\s*Boolean\(getCurrentMemberDisciplineState\(\)\)/],
  ['banned access is explicit', /role === 'banned'[\s\S]*community-ban-active/],
  ['ban notification exists', /function\s+notifyBannedMember\s*\(/],
  ['ban writes membership history', /action:\s*'banned'/],
  ['merge preserves mutedUntil', /mutedUntil:\s*String\(disciplineSource\.mutedUntil/],
  ['accepted request cannot revive banned user', /bans\.some\(function \(ban\)[\s\S]*request\.identityKeys/]
];
const failed = checks.filter(([, pattern]) => !pattern.test(page + '\n' + domain));
if (failed.length) {
  console.error('Community discipline cumulative contract failed:');
  failed.forEach(([label]) => console.error('- ' + label));
  process.exit(1);
}
console.log('Community discipline cumulative contract: OK');
