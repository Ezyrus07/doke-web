'use strict';
const fs=require('fs');
const domain=fs.readFileSync('assets/js/features/community/community-domain.js','utf8');
const page=fs.readFileSync('assets/js/pages/comunidade-interna.js','utf8');
const html=fs.readFileSync('comunidade-interna.html','utf8');
[['moderateMembers',domain],['mutedUntil',domain],['restrictedUntil',page],['MEMBER_BANNED',page],['data-community-member-discipline',page],['value="moderateMembers"',html]].forEach(([token,text])=>{if(!text.includes(token))throw new Error('Missing '+token)});
console.log('Community member discipline contract: OK');
