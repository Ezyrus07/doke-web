const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = process.cwd();
const AUTHORITY = path.join(ROOT, 'assets/js/core/card-experience.js');
const CSS = path.join(ROOT, 'assets/css/core/card-experience.css');
const BOOTSTRAP = path.join(ROOT, 'assets/js/core/page-bootstrap.js');
const PILOT = path.join(ROOT, 'assets/js/pages/news-card-pilot.js');

function createNode(tagName = 'div') {
  const attrs = new Map();
  const listeners = new Map();
  const classes = new Set();
  const children = [];
  const node = {
    tagName: String(tagName).toUpperCase(),
    dataset: {},
    style: {
      values: new Map(),
      setProperty(name, value) { this.values.set(name, String(value)); },
      getPropertyValue(name) { return this.values.get(name) || ''; }
    },
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      contains(name) { return classes.has(name); }
    },
    textContent: '',
    complete: false,
    naturalWidth: 0,
    setAttribute(name, value) { attrs.set(name, String(value)); },
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    hasAttribute(name) { return attrs.has(name); },
    removeAttribute(name) { attrs.delete(name); },
    addEventListener(name, listener) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(listener);
    },
    dispatch(name) {
      (listeners.get(name) || []).slice().forEach((listener) => listener({ type: name, target: node }));
    },
    appendChild(child) { children.push(child); return child; },
    append(...items) { children.push(...items); },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
  return node;
}

function loadAuthority() {
  const events = [];
  const document = {
    readyState: 'complete',
    documentElement: createNode('html'),
    body: createNode('body'),
    createElement: (tag) => createNode(tag),
    querySelectorAll: () => [],
    dispatchEvent(event) { events.push(event); return true; }
  };
  const window = { Doke: {}, document };
  window.window = window;
  const context = vm.createContext({
    window,
    document,
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    Object,
    Array,
    String,
    Number,
    Boolean,
    Date,
    Math,
    Map,
    Set,
    JSON,
    Promise,
    Error,
    TypeError,
    console
  });
  vm.runInContext(fs.readFileSync(AUTHORITY, 'utf8'), context, { filename: AUTHORITY });
  return { api: window.Doke.cardExperience, document, events };
}

function runtimeContracts() {
  const { api } = loadAuthority();
  assert(api, 'card authority must be published');
  assert.strictEqual(api.version, '20260804-ux-cards-001-v1');
  assert.strictEqual(api.contractVersion, 'card-contract-v1');
  assert(Object.isFrozen(api), 'API must be frozen');
  [
    api.kinds,
    api.authorities,
    api.identityStates,
    api.verificationStates,
    api.verificationProvenance,
    api.mediaStates,
    api.mediaPriorities,
    api.renderTiers,
    api.trustedVerificationProvenance
  ].forEach((value) => assert(Object.isFrozen(value), 'published contract collections must be frozen'));

  const unproven = api.normalizeServiceCard({
    id: 'local-service-1',
    providerName: 'Pessoa declarada',
    verified: true,
    image: 'https://example.invalid/image.jpg'
  }, { surface: 'test' });
  assert.strictEqual(unproven.identity.verification, api.verificationStates.UNPROVEN);
  assert.strictEqual(unproven.identity.provenance, api.verificationProvenance.SELF_DECLARED);
  assert.strictEqual(unproven.identity.badgeEligible, false);
  assert.strictEqual(api.createVerificationBadge(unproven.identity), null);

  const trusted = api.normalizeServiceCard({
    id: '4d6dcd83-ece5-4e32-8ee6-1f4685d6577e',
    remoteId: '4d6dcd83-ece5-4e32-8ee6-1f4685d6577e',
    providerId: '991f165d-a49a-4599-b9a4-748d98dbe36a',
    providerName: 'Profissional',
    verified: true,
    verificationStatus: 'verified',
    verificationAuthority: 'professional_verification_authority',
    image: 'media.jpg'
  }, { surface: 'test', mediaPriority: 'important' });
  assert.strictEqual(trusted.authority, api.authorities.REMOTE_CATALOG);
  assert.strictEqual(trusted.identity.state, api.identityStates.VERIFIED);
  assert.strictEqual(trusted.identity.verification, api.verificationStates.VERIFIED);
  assert.strictEqual(trusted.identity.badgeEligible, true);
  const badge = api.createVerificationBadge(trusted.identity);
  assert(badge, 'trusted verification must create a badge');
  assert.strictEqual(badge.textContent, 'Identidade verificada');
  assert.strictEqual(badge.dataset.dokeCardBadgeKind, 'identity_verification');

  const fixture = api.normalizeServiceCard({
    id: 'fixture-service',
    syncStatus: 'fixture-memory',
    providerName: 'Fixture'
  });
  assert.strictEqual(fixture.authority, api.authorities.LOCAL_FIXTURE);

  const editorial = api.normalizeEditorialCard({ id: 'news-1', editorial: true }, { surface: 'news' });
  assert.strictEqual(editorial.kind, api.kinds.EDITORIAL);
  assert.strictEqual(editorial.authority, api.authorities.PLATFORM_EDITORIAL);
  assert.strictEqual(editorial.identity.state, api.identityStates.NOT_APPLICABLE);
  assert.deepStrictEqual(Array.from(editorial.badgeKinds), ['content_category']);

  const card = createNode('article');
  let emitted = null;
  const stop = api.subscribe((event) => { emitted = event; });
  api.attachCard(card, trusted);
  stop();
  assert.strictEqual(card.dataset.dokeCardContract, 'card-contract-v1');
  assert.strictEqual(card.dataset.dokeCardAuthority, api.authorities.REMOTE_CATALOG);
  assert.strictEqual(card.dataset.dokeCardVerification, api.verificationStates.VERIFIED);
  assert(card.classList.contains('doke-card-contract'));
  const payload = JSON.stringify(emitted);
  assert(!payload.includes('Profissional'), 'events must not include display names');
  assert(!payload.includes('4d6dcd83-ece5-4e32-8ee6-1f4685d6577e'), 'events must not include raw ids');

  const image = createNode('img');
  const mediaBoundary = createNode('div');
  api.bindImage(image, mediaBoundary, trusted);
  assert.strictEqual(image.getAttribute('width'), '640');
  assert.strictEqual(image.getAttribute('height'), '400');
  assert.strictEqual(image.getAttribute('loading'), 'lazy');
  assert.strictEqual(image.getAttribute('decoding'), 'async');
  assert.strictEqual(mediaBoundary.dataset.dokeCardMediaState, api.mediaStates.LOADING);
  image.dispatch('load');
  assert.strictEqual(mediaBoundary.dataset.dokeCardMediaState, api.mediaStates.READY);

  const errorImage = createNode('img');
  const errorBoundary = createNode('div');
  api.bindImage(errorImage, errorBoundary, trusted);
  errorImage.dispatch('error');
  assert.strictEqual(errorBoundary.dataset.dokeCardMediaState, api.mediaStates.ERROR);

  const items = ['a', 'b', 'c', 'd', 'e'];
  const plan = api.createRenderPlan(items, { initialCount: 2 });
  assert.deepStrictEqual(Array.from(plan.initial), ['a', 'b']);
  assert.deepStrictEqual(Array.from(plan.deferred), ['c', 'd', 'e']);
  assert.strictEqual(plan.totalCount, 5);
  assert(Object.isFrozen(plan), 'render plan must be frozen');
}

function sourceContracts() {
  const authority = fs.readFileSync(AUTHORITY, 'utf8');
  const css = fs.readFileSync(CSS, 'utf8');
  const bootstrap = fs.readFileSync(BOOTSTRAP, 'utf8');
  const pilot = fs.readFileSync(PILOT, 'utf8');

  assert(authority.includes('Doke.cardExperience = api'), 'canonical authority must be published');
  assert(authority.includes('TRUSTED_VERIFICATION_PROVENANCE'), 'trusted provenance allowlist must exist');
  assert(authority.includes('claimedVerified && confirmedStatus && trusted'), 'verification needs status and provenance');
  assert(authority.includes('VERIFICATION_STATES.UNPROVEN'), 'unproven claims must be explicit');
  assert(authority.includes('createRenderPlan'), 'progressive render planning must exist');
  assert(authority.includes("setAttribute('width'"), 'intrinsic media width must be reserved');
  assert(authority.includes("setAttribute('height'"), 'intrinsic media height must be reserved');
  assert(!authority.includes('innerHTML'), 'authority must not inject raw HTML');
  assert(!authority.includes('location.href'), 'authority must not emit full URLs');

  assert(css.includes('.doke-card-verification-badge'), 'verified badge style must be opt-in');
  assert(css.includes('@media (forced-colors: active)'), 'forced colors must be supported');
  assert(!css.includes('!important'), 'card CSS must not use !important');
  assert(!css.includes('.doke-ad-card'), 'global advertisement card anatomy must remain untouched');

  assert(bootstrap.includes('CARD_EXPERIENCE_VERSION'), 'bootstrap must pin card authority');
  assert(bootstrap.includes('NEWS_CARD_PILOT_VERSION'), 'bootstrap must pin card pilot');
  assert(bootstrap.includes('var cardTask = ensureCardExperience()'), 'card loading must begin in parallel');
  assert(bootstrap.includes('Promise.all([performanceTask, cardTask])'), 'performance and cards must settle together');
  assert(bootstrap.includes('cardExperienceReady'), 'card readiness must be observable');
  assert(bootstrap.includes('cardPilotReady'), 'pilot readiness must be observable');
  assert(bootstrap.includes('ensureCardExperience'), 'bootstrap must expose card retry');
  assert(bootstrap.includes('ensureCardPilot'), 'bootstrap must expose pilot retry');

  assert(pilot.includes('.news-feature, [data-news-card], [data-news-important-card]'), 'pilot must cover News cards');
  assert(pilot.includes('normalizeEditorialCard'), 'pilot must use canonical normalization');
  assert(pilot.includes("'content_category'"), 'category badges must not be identity badges');
  assert(pilot.includes('PLATFORM_EDITORIAL'), 'editorial authority must be explicit');
  assert(!pilot.includes('providerName'), 'News pilot must not invent provider identity');
}

runtimeContracts();
sourceContracts();
console.log('[test:ux-cards-001] passed');
