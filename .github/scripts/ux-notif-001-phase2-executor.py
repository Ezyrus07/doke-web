from pathlib import Path
import re


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


# Relevant surfaces: session -> accountStorage -> notificationCenter -> in-app.
session_tag = '<script src="assets/js/core/session.js?v=20260501-auth-session-v1" defer></script>'
authority_tags = session_tag + '\n  <script src="assets/js/core/account-storage.js?v=20260804-ux-priv-001-v1" defer></script>\n  <script src="assets/js/core/notification-center.js?v=20260807-ux-notif-001-v1" defer></script>'
for html_path in ['notificacoes.html', 'mensagens.html', 'comunidade-interna.html']:
    html = read(html_path)
    if 'assets/js/core/notification-center.js?v=20260807-ux-notif-001-v1' not in html:
        html = replace_once(html, session_tag, authority_tags, f'{html_path} authority order')
    html = html.replace(
        'assets/js/features/in-app-notifications.js?v=20260719-single-blue-counter-v1',
        'assets/js/features/in-app-notifications.js?v=20260808-ux-notif-001-v2'
    )
    write(html_path, html)


# In-app feature delegates center/read/badge while preserving toast/actions/preferences/digest.
path = 'assets/js/features/in-app-notifications.js'
text = read(path)
text = replace_once(text, "  const CENTER_KEY = 'doke.in-app-notification.center.v1';\n", '', 'remove private center key')
old = "  const getAccountKeys = () => { const user = getCurrentUser() || {}; return [user.id, user.accountKey, user.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean); };\n  const normalizePrefs = (prefs = {}) => ({ ...DEFAULT_PREFS, ...prefs, mutedScopes: Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [] });\n  const readPrefs = () => normalizePrefs(safeParse(localStorage.getItem(PREFS_KEY), {}) || {});\n  const writePrefs = (prefs) => { const next = normalizePrefs(prefs); localStorage.setItem(PREFS_KEY, JSON.stringify(next)); document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: next })); return next; };\n  const readCenter = () => { const items = safeParse(localStorage.getItem(CENTER_KEY), []); return Array.isArray(items) ? items : []; };\n  const writeCenter = (items) => { try { localStorage.setItem(CENTER_KEY, JSON.stringify(items.slice(0, 250))); } catch (_error) {} document.dispatchEvent(new CustomEvent('doke:notification-center-changed', { detail: { items } })); syncGlobalBadges(items); };"
new = "  const getAccountKeys = () => { const user = getCurrentUser() || {}; return [user.id, user.accountKey, user.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean); };\n  const getNotificationCenter = () => window.Doke?.notificationCenter || null;\n  const normalizePrefs = (prefs = {}) => ({ ...DEFAULT_PREFS, ...prefs, mutedScopes: Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [] });\n  const readPrefs = () => normalizePrefs(safeParse(localStorage.getItem(PREFS_KEY), {}) || {});\n  const writePrefs = (prefs) => { const next = normalizePrefs(prefs); localStorage.setItem(PREFS_KEY, JSON.stringify(next)); document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: next })); return next; };\n  const readCenter = () => Array.from(getNotificationCenter()?.getSnapshot?.().items || []);"
text = replace_once(text, old, new, 'delegate center storage')

pattern = re.compile(r"  const persist = \(payload\) => \{\n.*?\n  \};\n  const ensureHost", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('persist block not found')
persist = """  const persist = (payload) => {
    if (!isForCurrentUser(payload)) return payload;
    const center = getNotificationCenter();
    if (!center) return payload;
    const items = readCenter();
    const now = Date.now();
    const groupKey = makeGroupKey(payload);
    const existing = items.find((item) => !item.dismissed && !item.read && item.groupKey === groupKey && now - Date.parse(item.updatedAt || item.createdAt || 0) < 86400000);
    if (existing) {
      const next = {
        ...existing,
        ...payload,
        id: existing.id,
        eventKey: existing.eventKey,
        groupKey,
        read: existing.read,
        dismissed: existing.dismissed,
        repeatCount: Number(existing.repeatCount || 1) + 1,
        updatedAt: payload.createdAt || new Date().toISOString(),
        createdAt: payload.createdAt || new Date().toISOString(),
        body: payload.body || payload.message || existing.body,
        targetUrl: payload.targetUrl || existing.targetUrl,
        actionLabel: payload.actionLabel || existing.actionLabel,
        priority: priorityOf(payload)
      };
      const state = center.upsert(next);
      return state.items.find((item) => item.id === existing.id) || next;
    }
    const item = { ...payload, priority: priorityOf(payload), groupKey, category: payload.category || (['messages','mentions','reactions'].includes(typeGroup(payload)) ? 'messages' : 'social'), read: false, dismissed: false, repeatCount: 1 };
    const state = center.upsert(item);
    return state.items.find((entry) => entry.id === item.id) || item;
  };
  const ensureHost"""
text = text[:match.start()] + persist + text[match.end():]

pattern = re.compile(r"  const markAsRead = \(id\) => \{.*?\n  const openPayload", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('read/dismiss/badge block not found')
state_block = """  const markAsRead = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    center.markRead(id);
    return item ? { ...item, read: true } : null;
  };
  const dismiss = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    center.dismiss(id);
    return item ? { ...item, dismissed: true } : null;
  };
  const syncGlobalBadges = (_source, scope = document) => getNotificationCenter()?.syncBadges?.(scope) ?? 0;
  const openPayload"""
text = text[:match.start()] + state_block + text[match.end():]

pattern = re.compile(r"  const recordActionResult = \(notificationId, status, message, undoPayload = null\) => \{\n.*?\n  \};\n  const publishAction", re.S)
match = pattern.search(text)
if not match:
    raise SystemExit('recordActionResult block not found')
action_block = """  const recordActionResult = (notificationId, status, message, undoPayload = null) => {
    const center = getNotificationCenter();
    const item = readCenter().find((entry) => String(entry.id) === String(notificationId)) || null;
    if (center && item) {
      center.upsert({
        ...item,
        read: true,
        actionStatus: status,
        actionMessage: String(message || ''),
        actionUpdatedAt: new Date().toISOString(),
        undoPayload: undoPayload || null
      });
    }
    pendingActions.delete(String(notificationId));
    document.dispatchEvent(new CustomEvent('doke:notification-action-result', {
      detail: { notificationId: String(notificationId || ''), status, message: String(message || ''), undoPayload: undoPayload || null }
    }));
    return item ? { ...item, read: true, actionStatus: status, actionMessage: String(message || ''), undoPayload: undoPayload || null } : null;
  };
  const publishAction"""
text = text[:match.start()] + action_block + text[match.end():]

old_tail = "  window.addEventListener('storage',(event)=>{if(event.key===ACTION_KEY&&event.newValue){const action=safeParse(event.newValue,null);if(action&&action.originTabId!==TAB_ID)document.dispatchEvent(new CustomEvent('doke:notification-action',{detail:action}));}if(event.key===CENTER_KEY)syncGlobalBadges(safeParse(event.newValue,[]));if(event.key===PREFS_KEY)document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed',{detail:readPrefs()}));if(event.key!==BUS_KEY||!event.newValue)return;const payload=safeParse(event.newValue,null);if(!payload||payload.originTabId===TAB_ID)return;show(payload);});\n  document.addEventListener('doke:in-app-notification',(event)=>{const payload=event.detail;if(!payload||payload.originTabId===TAB_ID)return;show(payload);});\n  document.addEventListener('DOMContentLoaded',()=>{syncGlobalBadges();flushDigest();window.setInterval(flushDigest,30000);});\n\n  window.DokeInAppNotifications={publish,show,publishAction,recordActionResult,list:()=>readCenter().filter((item)=>isForCurrentUser(item)),markAsRead,dismiss,markAllAsRead(){const items=readCenter();items.forEach((item)=>{if(isForCurrentUser(item))item.read=true;});writeCenter(items);},getPreferences:readPrefs,setPreferences(next={}){return writePrefs({...readPrefs(),...next});},muteScope,unmuteScope,isDndActive,flushDigest,syncGlobalBadges};"
new_tail = """  const hydrateNotificationCenter = () => {
    const center = getNotificationCenter();
    const service = window.Doke?.services?.notifications;
    if (!center || typeof service?.list !== 'function') {
      center?.syncBadges?.();
      return Promise.resolve(center?.getSnapshot?.() || null);
    }
    const fence = center.createFence?.();
    return Promise.resolve(service.list({ dismissed: false, currentUser: true }))
      .then((items) => center.replace((Array.isArray(items) ? items : []).filter(isForCurrentUser), fence ? { fence } : {}))
      .catch(() => center.getSnapshot());
  };
  const applySynchronizedItems = (items) => {
    const center = getNotificationCenter();
    if (!center) return null;
    return center.replace((Array.isArray(items) ? items : []).filter(isForCurrentUser));
  };

  window.addEventListener('storage',(event)=>{if(event.key===ACTION_KEY&&event.newValue){const action=safeParse(event.newValue,null);if(action&&action.originTabId!==TAB_ID)document.dispatchEvent(new CustomEvent('doke:notification-action',{detail:action}));}if(event.key===PREFS_KEY)document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed',{detail:readPrefs()}));if(event.key!==BUS_KEY||!event.newValue)return;const payload=safeParse(event.newValue,null);if(!payload||payload.originTabId===TAB_ID)return;const stored=persist(payload);show(stored);});
  document.addEventListener('doke:in-app-notification',(event)=>{const payload=event.detail;if(!payload||payload.originTabId===TAB_ID)return;show(payload);});
  document.addEventListener('doke:notifications-synced',(event)=>{applySynchronizedItems(event.detail?.items || []);});
  document.addEventListener('doke:auth-session-change',()=>{getNotificationCenter()?.refreshAccount?.();hydrateNotificationCenter();});
  document.addEventListener('DOMContentLoaded',()=>{hydrateNotificationCenter();syncGlobalBadges();flushDigest();window.setInterval(flushDigest,30000);});

  window.DokeInAppNotifications={publish,show,publishAction,recordActionResult,list:()=>readCenter().filter((item)=>isForCurrentUser(item)),markAsRead,dismiss,markAllAsRead(){const center=getNotificationCenter();if(!center)return null;readCenter().filter((item)=>isForCurrentUser(item)&&!item.read).forEach((item)=>center.markRead(item.id));return center.getSnapshot();},getPreferences:readPrefs,setPreferences(next={}){return writePrefs({...readPrefs(),...next});},muteScope,unmuteScope,isDndActive,flushDigest,syncGlobalBadges,hydrateNotificationCenter};"""
text = replace_once(text, old_tail, new_tail, 'replace in-app adapter tail')
if 'CENTER_KEY' in text or 'doke.in-app-notification.center.v1' in text:
    raise SystemExit('private center storage survived adapter migration')
write(path, text)


# Repository publishes current-user snapshots; it no longer writes UI/badges.
path = 'assets/js/repositories/notifications-repository.js'
text = read(path)
old = """  function syncGlobalBadges(items) {
    var center = root.DokeInAppNotifications;
    if (center && typeof center.syncGlobalBadges === 'function') {
      center.syncGlobalBadges((items || []).filter(function (item) { return item.dismissed !== true; }));
    }
  }
"""
new = """  function dispatchPresentationSnapshot(items, source) {
    var user = getSessionUser();
    var scoped = (Array.isArray(items) ? items : []).filter(function (item) {
      return item && item.dismissed !== true && matchesCurrentUser(item, user);
    });
    dispatchSynced(scoped, source || 'repository');
  }
"""
text = replace_once(text, old, new, 'repository badge writer removal')
text = text.replace('syncGlobalBadges(', 'dispatchPresentationSnapshot(')
text = text.replace("        dispatchSynced(cache, 'remote');\n", '')
if 'syncGlobalBadges' in text or 'DokeInAppNotifications' in text:
    raise SystemExit('repository still depends on presentation badge writer')
write(path, text)


# Notification page uses center snapshot/fences; DOM remains only local page metrics.
path = 'assets/js/pages/notificacoes.js'
text = read(path)
text = replace_once(
    text,
    "    const countNodes = [...document.querySelectorAll('[data-notifications-unread-count], [data-notifications-hero-count]')];",
    "    const countNodes = [...document.querySelectorAll('[data-notifications-hero-count]')];",
    'remove DOM global unread writer'
)
text = replace_once(
    text,
    "    const getNotificationsService = () => window.Doke?.services?.notifications || null;",
    "    const getNotificationsService = () => window.Doke?.services?.notifications || null;\n    const getNotificationCenter = () => window.Doke?.notificationCenter || null;",
    'page center helper'
)
text = replace_once(text, "      window.DokeInAppNotifications?.markAsRead?.(id);", "      getNotificationCenter()?.markRead?.(id);", 'confirmed mark-read center commit')

old = """      if (!id || !service || typeof service.dismiss !== 'function') {
        finalizeDismissNotification(card);
        return;
      }

      const mutation = window.Doke?.experience?.optimistic;
      if (!mutation?.mutate) {
        Promise.resolve(service.dismiss(id))
          .then(() => finalizeDismissNotification(card))
          .catch(() => restoreDismissedCard({ card, parent: card.parentElement, nextSibling: card.nextSibling }));
        return;
      }
"""
new = """      if (!id || !service || typeof service.dismiss !== 'function') {
        document.dispatchEvent(new CustomEvent('doke:notification-action-error', {
          detail: { action: 'dismiss', id, error: 'Serviço de notificações indisponível.' }
        }));
        return;
      }

      const mutation = window.Doke?.experience?.optimistic;
      if (!mutation?.mutate) {
        Promise.resolve(service.dismiss(id))
          .then((result) => {
            if (!result) throw new Error('A notificação não pôde ser dispensada.');
            getNotificationCenter()?.dismiss?.(id);
            finalizeDismissNotification(card);
          })
          .catch(() => restoreDismissedCard({ card, parent: card.parentElement, nextSibling: card.nextSibling }));
        return;
      }
"""
text = replace_once(text, old, new, 'dismiss fail-closed confirmation')
text = replace_once(
    text,
    "        commit: () => {\n          finalizeDismissNotification(card);",
    "        commit: () => {\n          getNotificationCenter()?.dismiss?.(id);\n          finalizeDismissNotification(card);",
    'optimistic dismiss center commit'
)

old = """      card.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.notification-card__inline-actions')) return;
        if (selectionEnabled) {
          if (target.closest(selectableCardInteractiveSelector)) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
          return;
        }
        const id = card.dataset.notificationId || '';
        if (id) { getNotificationsService()?.markAsRead?.(id); window.DokeInAppNotifications?.markAsRead?.(id); }
        const primaryAction = card.querySelector('[data-notification-action]');
        const href = primaryAction?.dataset.notificationTarget;
        if (href) navigateTo(href);
      });
"""
new = """      card.addEventListener('click', async (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        if (target.closest('.notification-card__inline-actions')) return;
        if (selectionEnabled) {
          if (target.closest(selectableCardInteractiveSelector)) return;
          event.preventDefault();
          toggleCardSelected(card);
          syncSelectedActions();
          return;
        }
        try {
          await setNotificationRead(card);
        } catch (error) {
          console.error('[Doke][notificacoes] Falha ao persistir leitura antes da navegação.', error);
        }
        const primaryAction = card.querySelector('[data-notification-action]');
        const href = primaryAction?.dataset.notificationTarget;
        if (href) navigateTo(href);
      });
"""
text = replace_once(text, old, new, 'card navigation read confirmation')

marker = """      hydration?.mark('local-notifications');
      return true;
    };

    const getNotificationsCacheKey = () => {
"""
replacement = """      hydration?.mark('local-notifications');
      return true;
    };

    const commitNotificationItems = (items, fence = null) => {
      const center = getNotificationCenter();
      if (!center) return renderNotificationItems(items);
      const snapshot = center.replace(Array.isArray(items) ? items : [], fence ? { fence } : {});
      return renderNotificationItems(snapshot.items);
    };

    const getNotificationsCacheKey = () => {
"""
text = replace_once(text, marker, replacement, 'page commit/render split')
text = replace_once(
    text,
    "      const center = window.DokeInAppNotifications;\n      if (!notificationsAccessAllowed) return Promise.resolve(false);",
    "      const center = getNotificationCenter();\n      const centerFence = center?.createFence?.() || null;\n      if (!notificationsAccessAllowed) return Promise.resolve(false);",
    'page center fence'
)
text = replace_once(text, "        const centerItems = center?.list?.() || [];", "        const centerItems = Array.from(center?.getSnapshot?.().items || []);", 'page canonical snapshot merge')
text = replace_once(text, "        return fetcher().then(renderNotificationItems);", "        return fetcher().then((items) => commitNotificationItems(items, centerFence));", 'page direct fetch commit')
text = replace_once(text, "        renderNotificationItems(result.data);", "        commitNotificationItems(result.data, centerFence);", 'page cache commit')
text = replace_once(text, "            .then((freshItems) => renderNotificationItems(freshItems))", "            .then((freshItems) => commitNotificationItems(freshItems, centerFence))", 'page revalidate commit')
text = replace_once(
    text,
    "    document.addEventListener('doke:notification-center-changed', () => refreshLocalNotifications({ force: true }));",
    "    document.addEventListener('doke:notification-center-changed', () => {\n      const center = getNotificationCenter();\n      if (center) renderNotificationItems(center.getSnapshot().items);\n    });",
    'avoid center event refetch loop'
)
if "querySelectorAll('[data-notifications-unread-count]" in text:
    raise SystemExit('notification page still writes global unread nodes')
write(path, text)


legacy = """const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('notificacoes.html');
const runtime = read('assets/js/features/in-app-notifications.js');
const page = read('assets/js/pages/notificacoes.js');
const repository = read('assets/js/repositories/notifications-repository.js');
const center = read('assets/js/core/notification-center.js');
const css = read('assets/css/components/in-app-notifications.css');
const checks = [
  [html.includes('data-notifications-settings-panel'), 'settings panel'],
  [html.includes('data-notifications-settings-toggle'), 'settings trigger'],
  [center.includes("CONTRACT = 'notification-center-v1'"), 'canonical notification center'],
  [runtime.includes('getNotificationCenter') && runtime.includes('hydrateNotificationCenter'), 'in-app center adapter'],
  [!runtime.includes('CENTER_KEY') && !runtime.includes('doke.in-app-notification.center.v1'), 'no private center storage'],
  [runtime.includes('repeatCount'), 'group repeated alerts'],
  [runtime.includes('markAsRead'), 'read state'],
  [runtime.includes('syncGlobalBadges'), 'compatibility badge facade'],
  [page.includes('doke:notification-center-changed'), 'live center render'],
  [!repository.includes('syncGlobalBadges') && !repository.includes('DokeInAppNotifications'), 'repository is not badge writer'],
  [page.includes('data-notification-pref'), 'preference save'],
  [css.includes('.doke-global-notification-badge'), 'legacy badge cleanup style']
];
const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  failed.forEach(([, name]) => console.error(`Missing: ${name}`));
  process.exit(1);
}
console.log('Notification center v2 contract: OK');
"""
write('scripts/test-notification-center-v2-contract.js', legacy)

surface = r"""#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const runtime = read('assets/js/features/in-app-notifications.js');
const page = read('assets/js/pages/notificacoes.js');
const repository = read('assets/js/repositories/notifications-repository.js');
const center = read('assets/js/core/notification-center.js');

for (const file of ['notificacoes.html', 'mensagens.html', 'comunidade-interna.html']) {
  const html = read(file);
  const session = html.indexOf('assets/js/core/session.js');
  const accountStorage = html.indexOf('assets/js/core/account-storage.js');
  const notificationCenter = html.indexOf('assets/js/core/notification-center.js');
  const inApp = html.indexOf('assets/js/features/in-app-notifications.js');
  assert(session >= 0 && accountStorage > session, `${file}: account storage must load after session`);
  assert(notificationCenter > accountStorage, `${file}: notification center must load after account storage`);
  assert(inApp > notificationCenter, `${file}: in-app adapter must load after notification center`);
}

assert(!runtime.includes('CENTER_KEY'));
assert(!runtime.includes('doke.in-app-notification.center.v1'));
assert(runtime.includes('getNotificationCenter'));
assert(runtime.includes('getSnapshot'));
assert(runtime.includes('hydrateNotificationCenter'));
assert(runtime.includes("doke:notifications-synced"));
assert(runtime.includes("doke:auth-session-change"));
assert(!runtime.includes("querySelectorAll('[data-notifications-unread-count]"));

assert(repository.includes('dispatchPresentationSnapshot'));
assert(!repository.includes('syncGlobalBadges'));
assert(!repository.includes('DokeInAppNotifications'));
assert(repository.includes("dispatchSynced(scoped, source || 'repository')"));

assert(page.includes("const getNotificationCenter = () => window.Doke?.notificationCenter || null"));
assert(page.includes('center?.createFence?.()'));
assert(page.includes('commitNotificationItems'));
assert(page.includes('center.replace'));
assert(page.includes("getNotificationCenter()?.markRead?.(id)"));
assert(page.includes("getNotificationCenter()?.dismiss?.(id)"));
assert(!page.includes("querySelectorAll('[data-notifications-unread-count]"));
assert(!page.includes("doke:notification-center-changed', () => refreshLocalNotifications"));
assert(center.includes("BADGE_SELECTOR = '[data-notifications-unread-count]'"));
assert(center.includes('node.dataset.notificationCenterWriter = CONTRACT'));

console.log('[ux-notif-001-surface-contract] ok');
console.log('- script order, single badge writer, repository separation, account fence and mutation commits validated');
"""
write('scripts/test-ux-notif-001-surface-contract.js', surface)

behavior = r"""#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');

const listeners = new Map();
const windowListeners = new Map();
let currentUser = { id: 'account_alpha_123456' };
let serviceItems = [{ id: 'alpha-reload', eventKey: 'alpha-reload', userId: currentUser.id, title: 'Reload', read: false }];
const badge = { textContent: '', hidden: true, dataset: {}, classList: { contains() { return false; } } };
const storage = new Map([
  ['doke.in-app-notification.preferences.v1', JSON.stringify({ social: false, messages: false, reactions: false, mentions: false, events: false, sound: false, digest: false })]
]);

class CustomEventStub {
  constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
}

const localStorageStub = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, String(value)); },
  removeItem(key) { storage.delete(key); },
  key(index) { return Array.from(storage.keys())[index] || null; },
  get length() { return storage.size; }
};

const documentStub = {
  readyState: 'loading',
  body: { appendChild() {} },
  querySelectorAll(selector) { return selector === '[data-notifications-unread-count]' ? [badge] : []; },
  addEventListener(type, listener) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(listener);
  },
  dispatchEvent(event) {
    for (const listener of listeners.get(event.type) || []) listener(event);
    return true;
  },
  createElement() { throw new Error('Toast DOM should not be created while test preferences disable delivery.'); },
  documentElement: { style: { setProperty() {} } }
};

const Doke = {
  session: { getCurrentUser() { return currentUser; } },
  accountStorage: {
    resolveScope() {
      return currentUser ? { scopeId: currentUser.id, kind: 'account' } : { scopeId: 'guest_scope_123456', kind: 'guest' };
    }
  },
  services: {
    notifications: {
      list() { return Promise.resolve(serviceItems.map((item) => ({ ...item }))); }
    }
  }
};

const windowStub = {
  Doke,
  document: documentStub,
  CustomEvent: CustomEventStub,
  localStorage: localStorageStub,
  setTimeout() { return 1; },
  clearTimeout() {},
  setInterval() { return 1; },
  clearInterval() {},
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  },
  location: { href: 'https://doke.test/notificacoes.html' }
};

global.window = windowStub;
global.document = documentStub;
global.CustomEvent = CustomEventStub;
global.localStorage = localStorageStub;

delete require.cache[require.resolve('../assets/js/core/notification-center.js')];
delete require.cache[require.resolve('../assets/js/features/in-app-notifications.js')];
require('../assets/js/core/notification-center.js');
require('../assets/js/features/in-app-notifications.js');

const center = Doke.notificationCenter;
const inApp = windowStub.DokeInAppNotifications;
assert(center && inApp);

async function flush() { await Promise.resolve(); await Promise.resolve(); }

(async () => {
  documentStub.dispatchEvent(new CustomEventStub('DOMContentLoaded'));
  await flush();
  assert.equal(center.getSnapshot().unreadCount, 1, 'reload hydration must populate canonical center');
  assert.equal(badge.dataset.notificationCenterWriter, 'notification-center-v1');

  const published = inApp.publish({ id: 'alpha-live', eventKey: 'alpha-live', recipientAccountKey: currentUser.id, title: 'Live', read: false });
  assert.equal(published.id, 'alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 2);

  inApp.markAsRead('alpha-live');
  assert.equal(center.getSnapshot().unreadCount, 1);
  inApp.recordActionResult('alpha-reload', 'completed', 'Concluído');
  assert.equal(center.getSnapshot().unreadCount, 0);

  inApp.publish({ id: 'alpha-dismiss', eventKey: 'alpha-dismiss', recipientAccountKey: currentUser.id, title: 'Dismiss', read: false });
  inApp.dismiss('alpha-dismiss');
  assert.equal(center.getSnapshot().items.some((item) => item.id === 'alpha-dismiss'), false);

  serviceItems = [
    { id: 'beta-1', eventKey: 'beta-1', userId: 'account_beta_654321', title: 'Beta', read: false },
    { id: 'alpha-stale', eventKey: 'alpha-stale', userId: 'account_alpha_123456', title: 'Alpha stale', read: false }
  ];
  currentUser = { id: 'account_beta_654321' };
  documentStub.dispatchEvent(new CustomEventStub('doke:auth-session-change'));
  await flush();
  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-1'], 'account switch must clear and rehydrate only current account');

  const storageListener = (windowListeners.get('storage') || [])[0];
  assert(storageListener, 'cross-tab storage listener must be registered');
  storageListener({
    key: 'doke.in-app-notification.bus.v1',
    newValue: JSON.stringify({ id: 'beta-cross-tab', eventKey: 'beta-cross-tab', recipientAccountKey: currentUser.id, title: 'Cross-tab', read: false, originTabId: 'other-tab' })
  });
  assert(center.getSnapshot().items.some((item) => item.id === 'beta-cross-tab'), 'cross-tab delivery must enter canonical center');

  documentStub.dispatchEvent(new CustomEventStub('doke:notifications-synced', {
    items: [
      { id: 'beta-sync', eventKey: 'beta-sync', userId: currentUser.id, title: 'Synced', read: false },
      { id: 'alpha-ignored', eventKey: 'alpha-ignored', userId: 'account_alpha_123456', title: 'Ignored', read: false }
    ]
  }));
  assert.deepEqual(center.getSnapshot().items.map((item) => item.id), ['beta-sync'], 'repository sync must replace snapshot with current-account items only');

  inApp.markAllAsRead();
  assert.equal(center.getSnapshot().unreadCount, 0);
  assert.equal(storage.has('doke.in-app-notification.center.v1'), false, 'private center storage must never be recreated');

  console.log('[ux-notif-001-in-app-adapter] ok');
  console.log('- reload hydration, publish/read/dismiss, account switch, repository sync and cross-tab delivery validated');
})().finally(() => {
  for (const key of ['window', 'document', 'CustomEvent', 'localStorage']) delete global[key];
});
"""
write('scripts/test-ux-notif-001-in-app-adapter.js', behavior)


# Permanent CI validates all modified notification surfaces and inherited interaction contracts.
path = '.github/workflows/ux-notif-001-notification-center.yml'
text = read(path)
anchor = "      - 'notificacoes.html'\n"
addition = "      - 'notificacoes.html'\n      - 'mensagens.html'\n      - 'comunidade-interna.html'\n"
if text.count(anchor) != 2:
    raise SystemExit(f'workflow html path anchor expected 2, found {text.count(anchor)}')
text = text.replace(anchor, addition)
anchor = "      - 'scripts/test-ux-notif-001-notification-center.js'\n"
addition = anchor + "      - 'scripts/test-ux-notif-001-in-app-adapter.js'\n      - 'scripts/test-ux-notif-001-surface-contract.js'\n      - 'scripts/test-notification-center-v2-contract.js'\n      - 'scripts/test-notification-quick-actions-contract.js'\n      - 'scripts/test-notification-quick-actions-v2-contract.js'\n      - 'scripts/test-notification-delivery-controls-contract.js'\n"
if text.count(anchor) != 2:
    raise SystemExit(f'workflow test path anchor expected 2, found {text.count(anchor)}')
text = text.replace(anchor, addition)
text = replace_once(
    text,
    "          node --check assets/js/core/notification-center.js\n          node --check scripts/test-ux-notif-001-notification-center.js\n          node --check scripts/test-notifications-supabase-repository-contract.js",
    "          node --check assets/js/core/notification-center.js\n          node --check assets/js/features/in-app-notifications.js\n          node --check assets/js/pages/notificacoes.js\n          node --check assets/js/repositories/notifications-repository.js\n          node --check scripts/test-ux-notif-001-notification-center.js\n          node --check scripts/test-ux-notif-001-in-app-adapter.js\n          node --check scripts/test-ux-notif-001-surface-contract.js\n          node --check scripts/test-notifications-supabase-repository-contract.js",
    'workflow syntax coverage'
)
text = replace_once(
    text,
    "      - name: Validate notification center behavior\n        run: node scripts/test-ux-notif-001-notification-center.js\n\n      - name: Preserve notification authority contracts",
    "      - name: Validate notification center behavior\n        run: |\n          node scripts/test-ux-notif-001-notification-center.js\n          node scripts/test-ux-notif-001-in-app-adapter.js\n          node scripts/test-ux-notif-001-surface-contract.js\n\n      - name: Preserve notification interaction contracts\n        run: |\n          node scripts/test-notification-center-v2-contract.js\n          node scripts/test-notification-quick-actions-contract.js\n          node scripts/test-notification-quick-actions-v2-contract.js\n          node scripts/test-notification-delivery-controls-contract.js\n\n      - name: Preserve notification authority contracts",
    'workflow phase2 behavior contracts'
)
text = replace_once(
    text,
    "            --test-coverage-include='assets/js/core/notification-center.js' \\\n            --test-reporter=spec",
    "            --test-coverage-include='assets/js/core/notification-center.js' \\\n            --test-coverage-include='assets/js/features/in-app-notifications.js' \\\n            --test-reporter=spec",
    'workflow in-app lcov include'
)
text = replace_once(
    text,
    "            scripts/test-ux-notif-001-notification-center.js",
    "            scripts/test-ux-notif-001-notification-center.js \\\n            scripts/test-ux-notif-001-in-app-adapter.js",
    'workflow lcov adapter test'
)
text = replace_once(
    text,
    "          grep -Fq 'SF:assets/js/core/notification-center.js' \"${REPORT}\"",
    "          grep -Fq 'SF:assets/js/core/notification-center.js' \"${REPORT}\"\n          grep -Fq 'SF:assets/js/features/in-app-notifications.js' \"${REPORT}\"",
    'workflow lcov file validation'
)
write(path, text)


# Keep UX-NOTIF-001 docs truthful about Phase 2 implementation boundary.
path = 'docs/ux/UX-NOTIF-001.md'
text = read(path)
status_anchor = "## Fases seguintes do mesmo PR\n\nSomente após a Fase 1 passar nos gates:\n"
status_new = "## Fase 2 — integração das superfícies\n\nA Fase 1 foi certificada no mesmo SHA antes da integração. A Fase 2 migra as superfícies para a autoridade única sem alterar backend:\n\n- `in-app-notifications.js` delega snapshot/read/dismiss/badge ao `Doke.notificationCenter`;\n- `notifications-repository.js` publica snapshots de domínio e deixa de escrever badge;\n- `notificacoes.js` usa account fence para commits assíncronos e não calcula o badge global pelo DOM;\n- `notificacoes.html`, `mensagens.html` e `comunidade-interna.html` carregam `session → account-storage → notification-center → in-app`;\n- o center continua memory-first e não cria storage privado.\n\n## Fases seguintes do mesmo PR\n\nApós os gates da Fase 2:\n"
text = replace_once(text, status_anchor, status_new, 'docs phase2 status')
write(path, text)
