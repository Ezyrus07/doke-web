'use strict';
const fs = require('fs');
const assert = require('assert');
const router = fs.readFileSync('assets/js/core/stable-shell-router.js', 'utf8');
const community = fs.readFileSync('assets/js/pages/comunidade.js', 'utf8');
for (const route of ['/comunidade.html', '/admin.html']) {
  assert(router.includes(`'${route}'`), `${route} must be registered`);
}
const directBlock = router.slice(router.indexOf('var INTERNAL_DIRECT_HYDRATION_ROUTES'), router.indexOf('function shouldCommitHydrationRouteDirect'));
assert(directBlock.includes("'/comunidade.html'"), 'community must use direct internal commit');
assert(directBlock.includes("'/admin.html'"), 'admin must use direct internal commit');
assert(community.includes('isDirectStableShellCommit'), 'community must distinguish internal direct commit');
assert(community.includes('communitySkeleton.hidden = true'), 'community skeleton must stay hidden on direct commit');
console.log('community/admin navigation hydration contract: ok');
