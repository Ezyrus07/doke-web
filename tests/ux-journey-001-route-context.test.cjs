/* UX-JOURNEY-001 — no dependencies, accounts or browser: synthetic DOM contract. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.resolve(__dirname, '..');
const scriptPath = path.join(project, 'assets/js/pages/pedidos/orders-route-context.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function fixture({ order = 'requested-2', ids = ['other-1', 'requested-2', 'other-3'], page = 'pedidos', deferFrames = false } = {}) {
  const docEvents = new Map();
  const winEvents = new Map();
  const frames = [];
  let notice = null;
  let activeIds = ids;
  const createCard = (id) => {
    const attrs = new Map();
    const classes = new Set();
    const card = {
      dataset: { id },
      classList: {
        add: (name) => classes.add(name),
        remove: (name) => classes.delete(name),
        contains: (name) => classes.has(name)
      },
      hidden: false,
      isConnected: true,
      focusCount: 0,
      scrollCount: 0,
      getAttribute: (name) => attrs.get(name) ?? null,
      setAttribute: (name, value) => attrs.set(name, String(value)),
      removeAttribute: (name) => attrs.delete(name),
      hasAttribute: (name) => attrs.has(name),
      focus() { this.focusCount++; document.activeElement = this; },
      scrollIntoView() { this.scrollCount++; }
    };
    return card;
  };
  let cards = activeIds.map(createCard);
  const list = {
    dataset: { localOrdersRendered: 'false' },
    hidden: false,
    querySelectorAll(selector) {
      assert.equal(selector, '.order-card[data-id]');
      return cards;
    },
    before(node) { notice = node; }
  };
  const root = {
    contains(card) { return cards.includes(card); },
    querySelector(selector) {
      if (selector === '.orders-list') return list;
      if (selector === '[data-orders-route-feedback]') return notice;
      throw new Error('Unknown selector ' + selector);
    }
  };
  const document = {
    body: { tagName: 'BODY', dataset: { page, ordersAudience: 'client' } },
    documentElement: { tagName: 'HTML' },
    activeElement: null,
    readyState: 'loading',
    querySelector(selector) {
      if (selector === '.orders-page') return root;
      return null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, '[data-orders-route-feedback]');
      return notice ? [notice] : [];
    },
    createElement(tag) {
      assert.equal(tag, 'p');
      const attrs = new Map();
      return {
        dataset: {},
        className: '',
        textContent: '',
        setAttribute: (k, v) => attrs.set(k, v),
        getAttribute: (k) => attrs.get(k),
        remove() { notice = null; }
      };
    },
    addEventListener(event, cb) { (docEvents.get(event) ?? (docEvents.set(event, []), docEvents.get(event))).push(cb); }
  };
  const window = {
    location: { search: order ? '?order=' + encodeURIComponent(order) : '', pathname: '/pedidos.html' },
    addEventListener(event, cb) { (winEvents.get(event) ?? (winEvents.set(event, []), winEvents.get(event))).push(cb); },
    requestAnimationFrame(cb) { if (deferFrames) frames.push(cb); else cb(); }
  };
  document.activeElement = document.body;
  const env = { window, document, URLSearchParams };
  vm.runInNewContext(source, env, { filename: 'orders-route-context.js' });
  const dispatch = (event, detail = {}) => { (docEvents.get(event) || []).forEach((cb) => cb({ detail })); };
  const dispatchWindow = (event) => { (winEvents.get(event) || []).forEach((cb) => cb({})); };
  return {
    document, window, root, list, dispatch, dispatchWindow,
    cards: () => cards, notice: () => notice,
    flushFrames() {
      let count = 0;
      while (frames.length) {
        assert.ok(++count <= 20, 'requestAnimationFrame queue must settle');
        const batch = frames.splice(0);
        batch.forEach((cb) => cb());
      }
    },
    nextFrame() { frames.splice(0).forEach((cb) => cb()); },
    setCards(ids) {
      const previous = cards;
      previous.forEach((card) => { card.isConnected = false; });
      if (previous.includes(document.activeElement)) document.activeElement = document.body;
      cards = ids.map(createCard);
      activeIds = ids;
    }
  };
}

test('does not focus any order before an authorized list hydration event', () => {
  const f = fixture();
  assert.equal(f.cards()[1].classList.contains('is-route-highlighted'), false);
  f.dispatch('doke:orders-list-hydrated');
  const [a, target, c] = f.cards();
  assert.equal(target.classList.contains('is-route-highlighted'), true);
  assert.equal(target.getAttribute('aria-current'), 'location');
  assert.equal(target.focusCount, 1);
  assert.equal(target.scrollCount, 1);
  assert.equal(a.focusCount, 0);
  assert.equal(c.focusCount, 0);
  f.dispatch('doke:page-hydration-ready', { page: 'pedidos' });
  assert.equal(target.focusCount, 1, 'no repeat focus when already selected');
});

test('stable-shell terminal ready restores focus to selected order, not unrelated pages', () => {
  const f = fixture();
  f.dispatch('doke:orders-list-hydrated');
  const target = f.cards()[1];
  assert.equal(target.focusCount, 1);
  f.dispatch('doke:navigation-lifecycle-route', { state: 'ready', to: '/index.html' });
  assert.equal(target.focusCount, 1);
  f.dispatch('doke:navigation-lifecycle-route', { state: 'ready', to: '/pedidos.html' });
  assert.equal(target.focusCount, 2);
  assert.equal(target.classList.contains('is-route-highlighted'), true);
});
test('unknown ID never selects first or any other order, shows generic text', () => {
  const f = fixture({ order: 'not-mine' });
  f.dispatch('doke:orders-list-hydrated');
  assert.equal(f.cards().some((c) => c.classList.contains('is-route-highlighted')), false);
  assert.match(f.notice().textContent, /não está disponível nesta conta/);
  assert.equal(f.notice().getAttribute('role'), 'status');
  assert.doesNotMatch(f.notice().textContent, /not-mine/);
});

test('auth change clears old focus and waits for the newly authorized account list', () => {
  const f = fixture();
  f.dispatch('doke:orders-list-hydrated');
  const previouslySelected = f.cards()[1];
  f.dispatch('doke:auth-session-change');
  assert.equal(previouslySelected.classList.contains('is-route-highlighted'), false);
  assert.equal(previouslySelected.getAttribute('aria-current'), null);
  f.setCards(['new-account-only']);
  f.dispatch('doke:page-hydration-ready', { page: 'pedidos' });
  assert.equal(f.notice(), null, 'no premature missing-order feedback while changing accounts');
  f.dispatch('doke:orders-list-hydrated');
  assert.match(f.notice().textContent, /não está disponível nesta conta/);
});

test('replaces highlighted card after a legitimate refreshed list', () => {
  const f = fixture();
  f.dispatch('doke:orders-list-hydrated');
  const oldCard = f.cards()[1];
  f.setCards(['requested-2', 'new-other']);
  f.dispatch('doke:orders-list-hydrated');
  assert.equal(oldCard.classList.contains('is-route-highlighted'), false);
  assert.equal(f.cards()[0].classList.contains('is-route-highlighted'), true);
  assert.equal(f.cards()[0].focusCount, 1);
});

test('popstate switches exact target and clears old focus; empty query clears both', () => {
  const f = fixture();
  f.dispatch('doke:orders-list-hydrated');
  f.window.location.search = '?order=other-3';
  f.dispatchWindow('popstate');
  assert.equal(f.cards()[1].classList.contains('is-route-highlighted'), false);
  assert.equal(f.cards()[2].classList.contains('is-route-highlighted'), true);
  f.window.location.search = '';
  f.dispatchWindow('popstate');
  assert.equal(f.cards().some((c) => c.classList.contains('is-route-highlighted')), false);
  assert.equal(f.notice(), null);
});

test('hidden list is marked but not focused until the page is visible', () => {
  const f = fixture();
  f.list.hidden = true;
  f.dispatch('doke:orders-list-hydrated');
  assert.equal(f.cards()[1].focusCount, 0);
  f.list.hidden = false;
  f.dispatch('doke:page-hydration-ready', { page: 'pedidos' });
  assert.equal(f.cards()[1].focusCount, 1);
});

test('route leaving clears highlight; no parameter does nothing', () => {
  const f = fixture();
  f.dispatch('doke:orders-list-hydrated');
  f.dispatch('doke:route-leaving', { from: '/pedidos.html' });
  assert.equal(f.cards()[1].classList.contains('is-route-highlighted'), false);
  const noLink = fixture({ order: '' });
  noLink.dispatch('doke:orders-list-hydrated');
  assert.equal(noLink.notice(), null);
  assert.equal(noLink.cards().some((c) => c.focusCount), false);
});

test('HTML includes route context after local orders bootstrap; code does not use network', () => {
  const html = fs.readFileSync(path.join(project, 'pedidos.html'), 'utf8');
  const controller = 'assets/js/pages/pedidos/orders-route-context.js';
  assert.equal(html.split(controller).length - 1, 1);
  assert.ok(html.indexOf(controller) > html.indexOf('assets/js/pages/pedidos/orders-bootstrap.js'));
  assert.ok(!/\bfetch\s*\(|\.post\s*\(|\.put\s*\(|\.delete\s*\(/.test(source));
});

const interactiveElement = (tagName) => ({
  tagName,
  hasAttribute: () => false
});

test('keeps a control focused before delayed order hydration without losing route highlight', () => {
  for (const tag of ['INPUT', 'BUTTON', 'TEXTAREA', 'SELECT']) {
    const f = fixture();
    const control = interactiveElement(tag);
    f.document.activeElement = control;
    f.dispatch('doke:orders-list-hydrated');
    const card = f.cards()[1];
    assert.equal(f.document.activeElement, control, tag + ' retains its focus');
    assert.equal(card.focusCount, 0, tag + ' must not be superseded');
    assert.equal(card.classList.contains('is-route-highlighted'), true);
    assert.equal(card.getAttribute('aria-current'), 'location');
  }
});

test('does not steal focus chosen after hydration but before requestAnimationFrame', () => {
  const f = fixture({ deferFrames: true });
  f.dispatch('doke:orders-list-hydrated');
  const input = interactiveElement('INPUT');
  f.document.activeElement = input;
  f.flushFrames();
  assert.equal(f.document.activeElement, input);
  assert.equal(f.cards()[1].focusCount, 0);
  assert.equal(f.cards()[1].getAttribute('aria-current'), 'location');
});

test('does not override an editable surface during async hydration', () => {
  const f = fixture({ deferFrames: true });
  f.dispatch('doke:orders-list-hydrated');
  const editable = { tagName: 'DIV', hasAttribute: (name) => name === 'contenteditable' };
  f.document.activeElement = editable;
  f.flushFrames();
  assert.equal(f.document.activeElement, editable);
  assert.equal(f.cards()[1].focusCount, 0);
});

test('terminal ready and empty cannot recapture a user-focused control', () => {
  for (const state of ['ready', 'empty']) {
    const f = fixture({ deferFrames: true });
    f.dispatch('doke:orders-list-hydrated');
    f.flushFrames();
    const card = f.cards()[1];
    assert.equal(card.focusCount, 1);
    const control = interactiveElement(state === 'ready' ? 'INPUT' : 'BUTTON');
    f.document.activeElement = control;
    f.dispatch('doke:navigation-lifecycle-route', { state, to: '/pedidos.html' });
    f.flushFrames();
    assert.equal(f.document.activeElement, control, state + ' retains user focus');
    assert.equal(card.focusCount, 1, state + ' never repeats card focus');
  }
});

test('terminal ready can restore focus from the main landmark', () => {
  for (const landmark of [
    { tagName: 'MAIN', hasAttribute: () => false },
    { tagName: 'DIV', hasAttribute: (name) => name === 'data-doke-main-landmark' }
  ]) {
    const f = fixture({ deferFrames: true });
    f.dispatch('doke:orders-list-hydrated');
    f.flushFrames();
    const card = f.cards()[1];
    f.document.activeElement = landmark;
    f.dispatch('doke:navigation-lifecycle-route', { state: 'ready', to: '/pedidos.html' });
    f.flushFrames();
    assert.equal(f.document.activeElement, card);
    assert.equal(card.focusCount, 2);
  }
});

test('a user action between ready frames wins over landmark focus correction', () => {
  const f = fixture({ deferFrames: true });
  f.dispatch('doke:orders-list-hydrated');
  f.flushFrames();
  const card = f.cards()[1];
  f.document.activeElement = { tagName: 'MAIN', hasAttribute: () => false };
  f.dispatch('doke:navigation-lifecycle-route', { state: 'ready', to: '/pedidos.html' });
  f.nextFrame();
  const afterFirstFrame = card.focusCount;
  const control = interactiveElement('INPUT');
  f.document.activeElement = control;
  f.flushFrames();
  assert.equal(f.document.activeElement, control);
  assert.equal(card.focusCount, afterFirstFrame);
});

test('a changed order query keeps user focus and never refocuses the prior card', () => {
  const f = fixture({ deferFrames: true });
  f.dispatch('doke:orders-list-hydrated');
  const oldCard = f.cards()[1];
  const input = interactiveElement('INPUT');
  f.document.activeElement = input;
  f.window.location.search = '?order=other-3';
  f.dispatchWindow('popstate');
  f.flushFrames();
  assert.equal(f.document.activeElement, input);
  assert.equal(oldCard.focusCount, 0);
  assert.equal(oldCard.classList.contains('is-route-highlighted'), false);
  assert.equal(f.cards()[2].classList.contains('is-route-highlighted'), true);
  assert.equal(f.cards()[2].focusCount, 0);
});

test('a detached or hidden routed card is never focused by a queued frame', () => {
  for (const mode of ['detached', 'card-hidden', 'list-hidden']) {
    const f = fixture({ deferFrames: true });
    f.dispatch('doke:orders-list-hydrated');
    const card = f.cards()[1];
    if (mode === 'detached') card.isConnected = false;
    if (mode === 'card-hidden') card.hidden = true;
    if (mode === 'list-hidden') f.list.hidden = true;
    f.flushFrames();
    assert.equal(card.focusCount, 0, mode);
    assert.equal(f.document.activeElement, f.document.body, mode);
  }
});
