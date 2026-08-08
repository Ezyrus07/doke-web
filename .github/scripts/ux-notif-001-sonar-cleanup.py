from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)


path = Path('assets/js/features/in-app-notifications.js')
text = path.read_text(encoding='utf-8')
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
text = replace_once(text, old, new, 'format in-app listener facade')
path.write_text(text, encoding='utf-8')

path = Path('scripts/test-ux-notif-001-in-app-adapter.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "assert(center && inApp);",
    "assert(center, 'canonical notification center must be available');\nassert(inApp, 'in-app notification adapter must be available');",
    'split adapter availability assertion'
)
path.write_text(text, encoding='utf-8')

path = Path('scripts/test-ux-notif-001-surface-contract.js')
text = path.read_text(encoding='utf-8')
text = replace_once(
    text,
    "  assert(session >= 0 && accountStorage > session, `${file}: account storage must load after session`);",
    "  assert(session >= 0, `${file}: session script must be present`);\n  assert(accountStorage > session, `${file}: account storage must load after session`);",
    'split surface script-order assertion'
)
path.write_text(text, encoding='utf-8')
