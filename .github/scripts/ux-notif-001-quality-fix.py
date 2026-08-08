from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# 1) Remove Sonar conditional ambiguity without changing runtime semantics.
path = 'assets/js/features/in-app-notifications.js'
text = read(path)
old = """  window.addEventListener('storage',(event)=>{if(event.key===ACTION_KEY&&event.newValue){const action=safeParse(event.newValue,null);if(action&&action.originTabId!==TAB_ID)document.dispatchEvent(new CustomEvent('doke:notification-action',{detail:action}));}if(event.key===PREFS_KEY)document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed',{detail:readPrefs()}));if(event.key!==BUS_KEY||!event.newValue)return;const payload=safeParse(event.newValue,null);if(!payload||payload.originTabId===TAB_ID)return;const stored=persist(payload);show(stored);});
  document.addEventListener('doke:in-app-notification',(event)=>{const payload=event.detail;if(!payload||payload.originTabId===TAB_ID)return;show(payload);});
  document.addEventListener('doke:notifications-synced',(event)=>{applySynchronizedItems(event.detail?.items || []);});
  document.addEventListener('doke:auth-session-change',()=>{getNotificationCenter()?.refreshAccount?.();hydrateNotificationCenter();});
  document.addEventListener('DOMContentLoaded',()=>{hydrateNotificationCenter();syncGlobalBadges();flushDigest();window.setInterval(flushDigest,30000);});

  window.DokeInAppNotifications={publish,show,publishAction,recordActionResult,list:()=>readCenter().filter((item)=>isForCurrentUser(item)),markAsRead,dismiss,markAllAsRead(){const center=getNotificationCenter();if(!center)return null;readCenter().filter((item)=>isForCurrentUser(item)&&!item.read).forEach((item)=>center.markRead(item.id));return center.getSnapshot();},getPreferences:readPrefs,setPreferences(next={}){return writePrefs({...readPrefs(),...next});},muteScope,unmuteScope,isDndActive,flushDigest,syncGlobalBadges,hydrateNotificationCenter};
"""
new = """  window.addEventListener('storage', (event) => {
    if (event.key === ACTION_KEY && event.newValue) {
      const action = safeParse(event.newValue, null);
      if (action && action.originTabId !== TAB_ID) {
        document.dispatchEvent(new CustomEvent('doke:notification-action', { detail: action }));
      }
    }
    if (event.key === PREFS_KEY) {
      document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: readPrefs() }));
    }
    if (event.key !== BUS_KEY || !event.newValue) return;
    const payload = safeParse(event.newValue, null);
    if (!payload || payload.originTabId === TAB_ID) return;
    const stored = persist(payload);
    show(stored);
  });
  document.addEventListener('doke:in-app-notification', (event) => {
    const payload = event.detail;
    if (!payload || payload.originTabId === TAB_ID) return;
    show(payload);
  });
  document.addEventListener('doke:notifications-synced', (event) => {
    applySynchronizedItems(event.detail?.items || []);
  });
  document.addEventListener('doke:auth-session-change', () => {
    getNotificationCenter()?.refreshAccount?.();
    hydrateNotificationCenter();
  });
  document.addEventListener('DOMContentLoaded', () => {
    hydrateNotificationCenter();
    syncGlobalBadges();
    flushDigest();
    window.setInterval(flushDigest, 30000);
  });

  window.DokeInAppNotifications = {
    publish,
    show,
    publishAction,
    recordActionResult,
    list: () => readCenter().filter((item) => isForCurrentUser(item)),
    markAsRead,
    dismiss,
    markAllAsRead() {
      const center = getNotificationCenter();
      if (!center) return null;
      readCenter()
        .filter((item) => isForCurrentUser(item) && !item.read)
        .forEach((item) => center.markRead(item.id));
      return center.getSnapshot();
    },
    getPreferences: readPrefs,
    setPreferences(next = {}) {
      return writePrefs({ ...readPrefs(), ...next });
    },
    muteScope,
    unmuteScope,
    isDndActive,
    flushDigest,
    syncGlobalBadges,
    hydrateNotificationCenter
  };
"""
text = replace_once(text, old, new, 'in-app listener/public facade formatting')
write(path, text)


# 2) Expand executable adapter coverage through real public behavior only.
path = 'scripts/test-ux-notif-001-in-app-adapter.js'
text = read(path)
text = replace_once(
    text,
    "const listeners = new Map();\nconst windowListeners = new Map();",
    "const listeners = new Map();\nconst windowListeners = new Map();\nconst dispatchedEvents = [];",
    'adapter dispatched event ledger'
)
text = replace_once(
    text,
    "  dispatchEvent(event) {\n    for (const listener of listeners.get(event.type) || []) listener(event);",
    "  dispatchEvent(event) {\n    dispatchedEvents.push(event);\n    for (const listener of listeners.get(event.type) || []) listener(event);",
    'adapter document event ledger'
)
text = replace_once(
    text,
    "const center = Doke.notificationCenter;\nconst inApp = windowStub.DokeInAppNotifications;\nassert(center && inApp);",
    "const center = Doke.notificationCenter;\nconst inApp = windowStub.DokeInAppNotifications;\nassert(center, 'canonical notification center must be available');\nassert(inApp, 'in-app notification adapter must be available');",
    'adapter composite assertion'
)
text = replace_once(
    text,
    """  const published = inApp.publish({ id: 'alpha-live', eventKey: 'alpha-live', recipientAccountKey: currentUser.id, title: 'Live', read: false });
  assert.equal(published.id, 'alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 2);

  inApp.markAsRead('alpha-live');
""",
    """  const published = inApp.publish({ id: 'alpha-live', eventKey: 'alpha-live', recipientAccountKey: currentUser.id, title: 'Live', read: false });
  assert.equal(published.id, 'alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 2);

  const replayed = inApp.publish({
    id: 'alpha-live-replay',
    eventKey: 'alpha-live-replay',
    recipientAccountKey: currentUser.id,
    title: 'Live',
    body: 'Live updated',
    read: false
  });
  assert.equal(replayed.id, 'alpha-live', 'same presentation group must preserve canonical id');
  assert.equal(replayed.eventKey, 'alpha-live', 'same presentation group must preserve canonical event key');
  assert.equal(replayed.repeatCount, 2, 'same presentation group must increment repeat count');
  assert.equal(center.getSnapshot().unreadCount, 2, 'group replay must not duplicate unread state');

  inApp.markAsRead('alpha-live');
""",
    'adapter group replay coverage'
)
text = replace_once(
    text,
    """  inApp.publish({ id: 'alpha-dismiss', eventKey: 'alpha-dismiss', recipientAccountKey: currentUser.id, title: 'Dismiss', read: false });
  inApp.dismiss('alpha-dismiss');
  assert.equal(center.getSnapshot().items.some((item) => item.id === 'alpha-dismiss'), false);

  serviceItems = [
""",
    """  inApp.publish({ id: 'alpha-dismiss', eventKey: 'alpha-dismiss', recipientAccountKey: currentUser.id, title: 'Dismiss', read: false });
  inApp.dismiss('alpha-dismiss');
  assert.equal(center.getSnapshot().items.some((item) => item.id === 'alpha-dismiss'), false);

  const initialPrefs = inApp.getPreferences();
  assert.equal(initialPrefs.social, false);
  const mutedPrefs = inApp.muteScope('conversation-alpha', 'Conversa Alpha');
  assert.equal(mutedPrefs.mutedScopes.includes('conversation-alpha'), true);
  const unmutedPrefs = inApp.unmuteScope('conversation-alpha');
  assert.equal(unmutedPrefs.mutedScopes.includes('conversation-alpha'), false);

  const dndPrefs = inApp.setPreferences({
    social: true,
    digest: true,
    sound: false,
    dndEnabled: true,
    dndUntil: Date.now() + 60_000
  });
  assert.equal(inApp.isDndActive(dndPrefs), true);
  const queuedDuringDnd = inApp.show({
    id: 'alpha-digest',
    recipientAccountKey: currentUser.id,
    title: 'Digest me',
    type: 'social',
    createdAt: new Date().toISOString()
  });
  assert.equal(queuedDuringDnd, false);
  assert.equal(storage.has('doke.in-app-notification.digest.v1'), true, 'DND must queue digest instead of rendering DOM');

  const resumedPrefs = inApp.setPreferences({ social: false, digest: true, dndEnabled: false, dndUntil: 0 });
  assert.equal(inApp.isDndActive(resumedPrefs), false);
  inApp.flushDigest();
  assert.equal(storage.has('doke.in-app-notification.digest.v1'), false, 'digest flush must drain queued notifications');

  const actionCommand = inApp.publishAction({ kind: 'coverage-check', notificationId: 'alpha-reload' });
  assert.equal(actionCommand.kind, 'coverage-check');
  assert.equal(storage.has('doke.in-app-notification.action.v1'), true, 'quick-action bus must persist its command envelope');
  assert.equal(inApp.syncGlobalBadges(null, documentStub), center.getSnapshot().unreadCount);

  serviceItems = [
""",
    'adapter preferences digest action coverage'
)
text = replace_once(
    text,
    """  const storageListener = (windowListeners.get('storage') || [])[0];
  assert(storageListener, 'cross-tab storage listener must be registered');
  storageListener({
    key: 'doke.in-app-notification.bus.v1',
""",
    """  const storageListener = (windowListeners.get('storage') || [])[0];
  assert(storageListener, 'cross-tab storage listener must be registered');

  const actionEventsBefore = dispatchedEvents.filter((event) => event.type === 'doke:notification-action').length;
  storageListener({
    key: 'doke.in-app-notification.action.v1',
    newValue: JSON.stringify({ id: 'remote-action', originTabId: 'other-tab' })
  });
  assert.equal(
    dispatchedEvents.filter((event) => event.type === 'doke:notification-action').length,
    actionEventsBefore + 1,
    'cross-tab action storage event must be forwarded once'
  );

  const preferenceEventsBefore = dispatchedEvents.filter((event) => event.type === 'doke:notification-preferences-changed').length;
  storageListener({
    key: 'doke.in-app-notification.preferences.v1',
    newValue: JSON.stringify(inApp.getPreferences())
  });
  assert.equal(
    dispatchedEvents.filter((event) => event.type === 'doke:notification-preferences-changed').length,
    preferenceEventsBefore + 1,
    'cross-tab preference storage event must be forwarded once'
  );

  storageListener({
    key: 'doke.in-app-notification.bus.v1',
""",
    'adapter storage event coverage'
)
text = replace_once(
    text,
    """  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-sync'], 'repository sync must replace snapshot with current-account items only');

  inApp.markAllAsRead();
""",
    """  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-sync'], 'repository sync must replace snapshot with current-account items only');
  assert.deepEqual(inApp.list().map((item) => item.id), ['beta-sync'], 'adapter list must expose only current-account center items');

  const notificationsService = Doke.services.notifications;
  Doke.services.notifications.list = () => Promise.reject(new Error('offline'));
  const failedHydrationSnapshot = await inApp.hydrateNotificationCenter();
  assert.deepEqual(failedHydrationSnapshot.items.map((item) => item.id), ['beta-sync'], 'failed hydration must preserve canonical snapshot');

  Doke.services.notifications = null;
  const unavailableServiceSnapshot = await inApp.hydrateNotificationCenter();
  assert.deepEqual(unavailableServiceSnapshot.items.map((item) => item.id), ['beta-sync'], 'missing service must fail closed to canonical snapshot');
  Doke.services.notifications = notificationsService;

  inApp.markAllAsRead();
""",
    'adapter hydration failure coverage'
)
text = text.replace(
    "console.log('- reload hydration, publish/read/dismiss, account switch, repository sync and cross-tab delivery validated');",
    "console.log('- reload hydration, grouped replay, prefs/DND/digest, action bus, account switch, repository sync and failure paths validated');"
)
write(path, text)


# 3) Make static integration assertions independently actionable for Sonar and humans.
path = 'scripts/test-ux-notif-001-surface-contract.js'
text = read(path)
text = replace_once(
    text,
    "  assert(session >= 0 && accountStorage > session, `${file}: account storage must load after session`);",
    "  assert(session >= 0, `${file}: session script must be present`);\n  assert(accountStorage > session, `${file}: account storage must load after session`);",
    'surface composite assertion'
)
write(path, text)
