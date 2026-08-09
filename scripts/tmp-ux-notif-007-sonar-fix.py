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

# notification-delivery: optional chain + explicit storage failure handling + stable synthetic digest identity.
path = 'assets/js/core/notification-delivery.js'
text = read(path)
text = replace_exact(
    text,
    "  if (Doke.notificationDelivery && Doke.notificationDelivery.version === VERSION) return;",
    "  if (Doke.notificationDelivery?.version === VERSION) return;",
    'delivery optional chain'
)
text = replace_exact(
    text,
    "    } catch (_error) {\n      return fallback;\n    }",
    "    } catch {\n      console.warn('[Doke.notificationDelivery] account storage read failed');\n      return fallback;\n    }",
    'delivery read catch'
)
text = replace_exact(
    text,
    "    } catch (_error) {\n      return false;\n    }",
    "    } catch {\n      console.warn('[Doke.notificationDelivery] account storage write failed');\n      return false;\n    }",
    'delivery write catch'
)
text = replace_exact(
    text,
    "    } catch (_error) {\n      return false;\n    }",
    "    } catch {\n      console.warn('[Doke.notificationDelivery] account storage remove failed');\n      return false;\n    }",
    'delivery remove catch'
)
text = replace_exact(
    text,
    "    const payload = Object.freeze({\n      id: `digest-${Date.now()}`,\n      eventKey: `digest-${Date.now()}`,",
    "    const digestId = `digest-${Date.now()}`;\n    const payload = Object.freeze({\n      id: digestId,\n      eventKey: digestId,",
    'delivery digest identity'
)
write(path, text)

# notification-toast: extract delivery routing from show() to reduce cognitive complexity.
path = 'assets/js/core/notification-toast.js'
text = read(path)
old = """  const show = (payload, options = {}) => {
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

    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;
"""
new = """  const deliveryAllows = (payload, options) => {
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

    const renderer = typeof config.renderToast === 'function' ? config.renderToast : defaultRender;
"""
text = replace_exact(text, old, new, 'toast delivery extraction')
write(path, text)

# in-app adapter: expand one-line sound/publish blocks and handle failures explicitly.
path = 'assets/js/features/in-app-notifications.js'
text = read(path)
text = replace_exact(
    text,
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
  };""",
    'adapter playSound'
)
text = replace_exact(
    text,
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
  };""",
    'adapter publish'
)
write(path, text)

print('UX-NOTIF-007 Sonar cleanup patch applied')
