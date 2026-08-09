#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, content):
    (ROOT / path).write_text(content, encoding='utf-8')


def replace_exact(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 match, got {count}')
    return text.replace(old, new, 1)

# notification-delivery
path = 'assets/js/core/notification-delivery.js'
text = read(path)
text = replace_exact(text,
    "  if (Doke.notificationDelivery && Doke.notificationDelivery.version === VERSION) return;",
    "  if (Doke.notificationDelivery?.version === VERSION) return;",
    'delivery optional chain')
text = replace_exact(text,
"""  const readValue = (key, fallback) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.read) return fallback;
      const value = accountStorage.read({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return value == null ? fallback : value;
    } catch (_error) {
      return fallback;
    }
  };""",
"""  const readValue = (key, fallback) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.read) return fallback;
      const value = accountStorage.read({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return value == null ? fallback : value;
    } catch {
      console.warn('[Doke.notificationDelivery] account storage read failed');
      return fallback;
    }
  };""", 'delivery read handler')
text = replace_exact(text,
"""  const writeValue = (key, value) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.write) return false;
      accountStorage.write({ domain: DOMAIN, key, version: STORAGE_VERSION, value });
      return true;
    } catch (_error) {
      return false;
    }
  };""",
"""  const writeValue = (key, value) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.write) return false;
      accountStorage.write({ domain: DOMAIN, key, version: STORAGE_VERSION, value });
      return true;
    } catch {
      console.warn('[Doke.notificationDelivery] account storage write failed');
      return false;
    }
  };""", 'delivery write handler')
text = replace_exact(text,
"""  const removeValue = (key) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.remove) return false;
      accountStorage.remove({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return true;
    } catch (_error) {
      return false;
    }
  };""",
"""  const removeValue = (key) => {
    try {
      const accountStorage = storage();
      if (!accountStorage?.remove) return false;
      accountStorage.remove({ domain: DOMAIN, key, version: STORAGE_VERSION });
      return true;
    } catch {
      console.warn('[Doke.notificationDelivery] account storage remove failed');
      return false;
    }
  };""", 'delivery remove handler')
text = replace_exact(text,
"""    const payload = Object.freeze({
      id: `digest-${Date.now()}`,
      eventKey: `digest-${Date.now()}`,""",
"""    const digestId = `digest-${Date.now()}`;
    const payload = Object.freeze({
      id: digestId,
      eventKey: digestId,""", 'delivery digest identity')
write(path, text)

# notification-toast
path = 'assets/js/core/notification-toast.js'
text = read(path)
text = replace_exact(text,
"""  const show = (payload, options = {}) => {
    if (!payload || config.isForCurrentUser?.(payload) === false) return false;
    ensureAccountFence();
    if (!policyAllows(payload)) return false;
    const identity = identityOf(payload);
    if (!identity) return false;
    if (state.seen.has(identity) && options.force !== true) return false;
    if (typeof config.getDeliveryDecision === 'function' && options.skipDelivery !== true && options.skipDigest !== true) {
      const deliveryDecision = config.getDeliveryDecision(payload, options) || {};
      const outcome = normalizeText(deliveryDecision.outcome).toUpperCase();
      if (outcome === 'QUEUE_DIGEST') {
        config.onQueueDigest?.(payload, deliveryDecision);
        return false;
      }
      if (outcome !== 'ALLOW_TOAST') return false;
    } else if (typeof config.getDeliveryDecision !== 'function') {
      if (config.shouldToast?.(payload) === false) return false;
      if (config.isDndActive?.() === true && options.skipDigest !== true) {
        config.queueDigest?.(payload);
        return false;
      }
    }

    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;""",
"""  const deliveryAllows = (payload, options) => {
    if (typeof config.getDeliveryDecision === 'function') {
      if (options.skipDelivery === true || options.skipDigest === true) return true;
      const deliveryDecision = config.getDeliveryDecision(payload, options) || {};
      const outcome = normalizeText(deliveryDecision.outcome).toUpperCase();
      if (outcome === 'QUEUE_DIGEST') {
        config.onQueueDigest?.(payload, deliveryDecision);
        return false;
      }
      return outcome === 'ALLOW_TOAST';
    }
    if (config.shouldToast?.(payload) === false) return false;
    if (config.isDndActive?.() !== true || options.skipDigest === true) return true;
    config.queueDigest?.(payload);
    return false;
  };

  const show = (payload, options = {}) => {
    if (!payload || config.isForCurrentUser?.(payload) === false) return false;
    ensureAccountFence();
    if (!policyAllows(payload)) return false;
    const identity = identityOf(payload);
    if (!identity) return false;
    if (state.seen.has(identity) && options.force !== true) return false;
    if (!deliveryAllows(payload, options)) return false;

    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;""", 'toast delivery extraction')
write(path, text)

# in-app adapter
path = 'assets/js/features/in-app-notifications.js'
text = read(path)
text = replace_exact(text,
"  const playSound = (priority) => { if(priority==='silent'||getDeliveryManager()?.getPreferences?.().sound===false)return; try { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; const ctx=new AudioContext(); const oscillator=ctx.createOscillator(); const gain=ctx.createGain(); oscillator.frequency.value=priority==='high'?760:620; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.15); } catch(_error){} };",
"""  const playSound = (priority) => {
    if (priority === 'silent' || getDeliveryManager()?.getPreferences?.().sound === false) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = priority === 'high' ? 760 : 620;
      gain.gain.setValueAtTime(.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.045, ctx.currentTime + .015);
      gain.gain.exponentialRampToValueAtTime(.0001, ctx.currentTime + .14);
      oscillator.connect(gain).connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + .15);
    } catch {
      console.warn('[Doke.inAppNotifications] notification sound failed');
    }
  };""", 'adapter playSound')
text = replace_exact(text,
"  const publish = (payload={}) => { const envelope={...payload,id:payload.id||payload.eventKey||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:payload.createdAt||new Date().toISOString(),originTabId:TAB_ID};const stored=persist(envelope);try{localStorage.setItem(BUS_KEY,JSON.stringify(stored));}catch(_error){}document.dispatchEvent(new CustomEvent('doke:in-app-notification',{detail:stored}));return stored; };",
"""  const publish = (payload = {}) => {
    const envelope = {
      ...payload,
      id: payload.id || payload.eventKey || `live-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: payload.createdAt || new Date().toISOString(),
      originTabId: TAB_ID
    };
    const stored = persist(envelope);
    try {
      localStorage.setItem(BUS_KEY, JSON.stringify(stored));
    } catch {
      console.warn('[Doke.inAppNotifications] cross-tab notification publish failed');
    }
    document.dispatchEvent(new CustomEvent('doke:in-app-notification', { detail: stored }));
    return stored;
  };""", 'adapter publish')
write(path, text)

print('UX-NOTIF-007 Sonar cleanup patch applied')
