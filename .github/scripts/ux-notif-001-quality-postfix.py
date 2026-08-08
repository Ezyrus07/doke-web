from pathlib import Path

path = Path('scripts/test-ux-notif-001-in-app-adapter.js')
text = path.read_text(encoding='utf-8')


def replace_once(old, new, label):
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    """const localStorageStub = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  key(index) { return Array.from(storage.keys())[index] || null; },
  get length() { return storage.size; }
};

const documentStub = {
  readyState: 'loading',
  body: { appendChild() {} },
""",
    """const localStorageStub = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  key(index) { return Array.from(storage.keys())[index] || null; },
  get length() { return storage.size; }
};

function createFakeElement(tagName) {
  const elementListeners = new Map();
  return {
    tagName: String(tagName || '').toUpperCase(),
    isConnected: false,
    className: '',
    tabIndex: 0,
    dataset: {},
    children: [],
    classList: { add() {} },
    setAttribute() {},
    appendChild(child) {
      this.children.push(child);
      child.isConnected = true;
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      child.isConnected = true;
    },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(type, listener) {
      if (!elementListeners.has(type)) elementListeners.set(type, []);
      elementListeners.get(type).push(listener);
    },
    remove() { this.isConnected = false; },
    get lastElementChild() { return this.children[this.children.length - 1] || null; }
  };
}

const documentStub = {
  readyState: 'loading',
  body: { appendChild(child) { child.isConnected = true; return child; } },
""",
    'fake DOM helper'
)
replace_once(
    "  createElement() { throw new Error('Toast DOM should not be created while test preferences disable delivery.'); },",
    "  createElement(tagName) { return createFakeElement(tagName); },",
    'fake DOM createElement'
)
replace_once(
    """  const resumedPrefs = inApp.setPreferences({ social: false, digest: true, dndEnabled: false, dndUntil: 0 });
  assert.equal(inApp.isDndActive(resumedPrefs), false);
  inApp.flushDigest();
  assert.equal(storage.has('doke.in-app-notification.digest.v1'), false, 'digest flush must drain queued notifications');

  const actionCommand = inApp.publishAction({ kind: 'coverage-check', notificationId: 'alpha-reload' });
""",
    """  const resumedPrefs = inApp.setPreferences({ social: false, digest: true, dndEnabled: false, dndUntil: 0 });
  assert.equal(inApp.isDndActive(resumedPrefs), false);
  inApp.flushDigest();
  assert.equal(storage.has('doke.in-app-notification.digest.v1'), false, 'digest flush must drain queued notifications');

  inApp.setPreferences({ social: true, digest: true, dndEnabled: false, sound: false });
  const visiblePayload = {
    id: 'alpha-visible',
    recipientAccountKey: currentUser.id,
    title: 'Visible toast',
    type: 'social',
    createdAt: new Date().toISOString()
  };
  assert.equal(inApp.show(visiblePayload), true, 'eligible notification must render a toast');
  assert.equal(inApp.show(visiblePayload), false, 'already-seen notification must not render twice');
  inApp.setPreferences({ social: false, digest: true, dndEnabled: false, sound: false });

  const actionCommand = inApp.publishAction({ kind: 'coverage-check', notificationId: 'alpha-reload' });
""",
    'toast rendering coverage'
)
replace_once(
    """  Doke.services.notifications = notificationsService;

  inApp.markAllAsRead();
  assert.equal(center.getSnapshot().unreadCount, 0);
""",
    """  Doke.services.notifications = notificationsService;

  const availableCenter = Doke.notificationCenter;
  Doke.notificationCenter = null;
  assert.equal(inApp.markAsRead('center-unavailable'), null, 'mark read must fail closed without center');
  assert.equal(inApp.dismiss('center-unavailable'), null, 'dismiss must fail closed without center');
  assert.equal(inApp.markAllAsRead(), null, 'mark all must fail closed without center');
  Doke.notificationCenter = availableCenter;

  inApp.markAllAsRead();
  assert.equal(center.getSnapshot().unreadCount, 0);
""",
    'unavailable center fallback coverage'
)

path.write_text(text, encoding='utf-8')
