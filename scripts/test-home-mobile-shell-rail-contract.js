#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const mobileShell = read('assets/css/components/shell/mobile-app-shell.css');
const mobileBase = read('assets/css/pages/home/mobile/base.css');
const mobileAlignment = read('assets/css/pages/home/mobile-alignment.css');
const mobileComposition = read('assets/css/pages/home/mobile-composition.css');
const mobileHeroFeed = read('assets/css/pages/home/mobile-hero-feed.css');
const mobileFeedRails = fs.existsSync(path.join(root, 'assets/css/pages/home/mobile-feed-rails.css'))
  ? read('assets/css/pages/home/mobile-feed-rails.css')
  : '';

assert(
  /--doke-mobile-shell-edge:\s*clamp\(18px,\s*5\.6vw,\s*var\(--space-6,\s*24px\)\)/.test(mobileShell),
  'mobile-app-shell.css must own the canonical mobile shell edge token.'
);

assert(
  /\.doke-mobile-shell__inline-search\s*\{[\s\S]*?position:\s*absolute;/.test(mobileShell) &&
    /\.doke-mobile-shell__inline-search\.is-expanded\s*\{[\s\S]*?position:\s*static;/.test(mobileShell),
  'Collapsed inline search must stay outside the action grid and re-enter flow only while expanded.'
);

const edgeConsumers = [
  ['home/mobile/base.css', mobileBase, '--home-mobile-edge'],
  ['home/mobile-alignment.css', mobileAlignment, '--index-stage20-axis'],
  ['home/mobile-composition.css', mobileComposition, '--index-mobile-gutter'],
  ['home/mobile-hero-feed.css', mobileHeroFeed, '--home-mobile-edge'],
];

if (mobileFeedRails) {
  edgeConsumers.push(['home/mobile-feed-rails.css', mobileFeedRails, '--home-mobile-feed-gutter']);
}

for (const [file, css, token] of edgeConsumers) {
  assert(
    new RegExp(`${token.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\s*:\\s*var\\(--doke-mobile-shell-edge,`).test(css),
    `${file} must derive ${token} from --doke-mobile-shell-edge so page content aligns with the mounted mobile header/search shell.`
  );
}

assert(
  /body\.home-index-shell \.home-catégories,[\s\S]*?body\.home-index-shell \.more-services\s*\{[\s\S]*?padding-inline:\s*var\(--index-stage20-axis\)/.test(mobileAlignment),
  'mobile-alignment.css must route the main home sections through the single mobile rail axis.'
);

if (failures.length) {
  console.error('Home mobile shell rail contract: FAIL');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Home mobile shell rail contract: PASS');
