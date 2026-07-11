const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const listingHtml = fs.readFileSync(path.join(root, 'comunidade.html'), 'utf8');
const roomHtml = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const listingJs = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade.js'), 'utf8');
const roomJs = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const transitionJs = fs.readFileSync(path.join(root, 'assets/js/features/community/community-transition.js'), 'utf8');
const listingCss = fs.readFileSync(path.join(root, 'assets/css/pages/comunidade/base-and-discovery.css'), 'utf8');
const roomCss = fs.readFileSync(path.join(root, 'assets/css/pages/comunidade-interna.css'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function countMatches(source, pattern) {
  return (source.match(pattern) || []).length;
}

assert(/<body[^>]*data-page="comunidade"/.test(listingHtml) && /<body[^>]*data-data-state="loading"/.test(listingHtml), 'comunidade.html must start in loading state');
assert(/data-communities-page[^>]*data-state="loading"[^>]*data-view-state="loading"/.test(listingHtml), 'comunidade.html page boundary must start loading');
assert(/data-community-hydration-skeleton/.test(listingHtml), 'comunidade.html must include a hydration skeleton');
assert(countMatches(listingHtml, /data-community-hydration-content/g) >= 2, 'comunidade.html must mark real content regions');
assert(/data-community-empty/.test(listingHtml), 'comunidade.html empty state must remain explicit');
assert(/setCommunityPageState\('loading'\)/.test(listingJs), 'comunidade.js must set loading through one page state function');
assert(/setCommunityPageState\('hydrated'\)/.test(listingJs), 'comunidade.js must set hydrated after final render');
assert(/page\.dataset\.communityHydrated = 'true'/.test(listingJs), 'comunidade.js must mark hydration complete once');
assert(/lastCommunityRenderSignature/.test(listingJs), 'comunidade.js must avoid unchanged collection rerenders');
assert(/communityTransition\?\.begin\('room', context\)/.test(listingJs), 'listing must mark room navigation before document navigation');
assert(/communityTransition\?\.consume\('listing'\)/.test(listingJs), 'listing must consume a return transition during hydration');
assert(listingHtml.indexOf('community-transition.js') < listingHtml.indexOf('pages/comunidade.js'), 'listing must load the transition contract before its page controller');
assert(/\[data-data-state="loading"\] \[data-community-hydration-content\]/.test(listingCss), 'comunidade CSS must hide real content during loading');
assert(/\[data-data-state="hydrated"\] \[data-community-hydration-skeleton\]/.test(listingCss), 'comunidade CSS must hide skeleton after hydration');
assert(/\[data-data-state="loading"\] \[data-community-empty\]/.test(listingCss), 'comunidade CSS must prevent empty state flash during loading');

assert(/<body[^>]*data-page="comunidade-interna"/.test(roomHtml) && /<body[^>]*data-data-state="loading"/.test(roomHtml), 'comunidade-interna.html must start in loading state');
assert(/data-community-room-skeleton/.test(roomHtml), 'comunidade-interna.html must include room skeleton');
assert(/data-community-room[^>]*data-community-hydration-content[^>]*hidden/.test(roomHtml), 'community room must start hidden');
assert(!/data-community-thread-status>0 membros/.test(roomHtml), 'community room must not ship 0 members/messages status');
assert(/Carregando comunidade/.test(roomHtml), 'community room status must start as loading copy');
assert(/root\.hidden = true/.test(roomJs), 'community room must stay hidden before access checks');
assert(/setCommunityRoomPageState\('loading'\)/.test(roomJs), 'community room must keep loading during redirect/access checks');
assert(/root\.dataset\.communityHydrated = 'true'/.test(roomJs), 'community room must mark hydrated after final render');
assert(/setCommunityRoomPageState\('hydrated'\)/.test(roomJs), 'community room must reveal through hydrated state');
assert(/root\.dataset\.communityRedirecting === 'true'/.test(roomJs), 'community room redirect must be idempotent');
assert(/root\.dataset\.communityRoomReady === 'true'/.test(roomJs), 'community room bootstrap must remain idempotent');
assert(/communityTransition\.consume\('room'\)/.test(roomJs), 'room must consume the listing transition during bootstrap');
assert(/transition\.begin\('listing', currentCommunityContext \|\| getCommunityContextFromLocation\(\)\)/.test(roomJs), 'room return links must mark a listing transition');
assert(roomHtml.indexOf('community-transition.js') < roomHtml.indexOf('pages/comunidade-interna.js'), 'room must load the transition contract before its page controller');
assert(/doke\.community\.transition\.v1/.test(transitionJs), 'transition contract must own a scoped storage key');
assert(/MAX_AGE_MS = 30000/.test(transitionJs), 'transition marker must expire quickly');
assert(/\[data-data-state="hydrated"\] \[data-community-room-skeleton\]/.test(roomCss), 'community room CSS must hide skeleton after hydration');
assert(/\[data-community-room-skeleton\]/.test(roomCss), 'community room CSS must style the skeleton through canonical hook');

console.log('Community hydration transition contract: OK');
