/* UX-JOURNEY-001 — no dependencies, accounts or browser: synthetic DOM contract. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const project = path.resolve(__dirname, '..');
const scriptPath = path.join(project, 'assets/js/pages/pedidos/orders-route-context.js');
const source = fs.readFileSync(scriptPath, 'utf8');

function fixture({ order = 'requested-2', ids = ['other-1', 'requested-2', 'other-3'], page = 'pedidos' } = {}) {
  const docEvents = new Map();
  const winEvents = new Map();
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
      focus() { this.focusCount++; },
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
    body: { dataset: { page, ordersAudience: 'client' } },
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
    requestAnimationFrame(cb) { cb(); }
  };
  const env = { window, document, URLSearchParams };
  vm.runInNewContext(source, env, { filename: 'orders-route-context.js' });
  const dispatch = (event, detail = {}) => { (docEvents.get(event) || []).forEach((cb) => cb({ detail })); };
  const dispatchWindow = (event) => { (winEvents.get(event) || []).forEach((cb) => cb({})); };
  return {
    document, window, root, list, dispatch, dispatchWindow,
    cards: () => cards, notice: () => notice,
    setCards(ids) { cards = ids.map(createCard); activeIds = ids; }
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
