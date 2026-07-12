(() => {
  const PREF_KEY = 'doke.browser-notifications.v1';
  const safeParse = (value, fallback = {}) => { try { return JSON.parse(value); } catch (_error) { return fallback; } };
  const readPrefs = () => ({ enabled: false, dismissed: false, ...safeParse(localStorage.getItem(PREF_KEY), {}) });
  const writePrefs = (next) => { const prefs = { ...readPrefs(), ...next }; localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); return prefs; };
  const supported = () => 'Notification' in window;
  const permission = () => supported() ? Notification.permission : 'unsupported';
  const canNotify = () => supported() && permission() === 'granted' && readPrefs().enabled;

  const ensurePrompt = () => {
    if (!supported() || permission() !== 'default' || readPrefs().dismissed || document.querySelector('[data-browser-notification-prompt]')) return;
    const prompt = document.createElement('section');
    prompt.className = 'doke-browser-notification-prompt';
    prompt.dataset.browserNotificationPrompt = '';
    prompt.setAttribute('role', 'status');
    prompt.innerHTML = '<div><strong>Receba alertas mesmo fora desta aba</strong><span>Ative as notificações do navegador para mensagens, menções e eventos.</span></div><div class="doke-browser-notification-prompt__actions"><button class="doke-btn doke-btn--primary" type="button" data-browser-notification-enable>Ativar</button><button class="doke-btn doke-btn--ghost" type="button" data-browser-notification-dismiss>Agora não</button></div>';
    document.body.appendChild(prompt);
    prompt.querySelector('[data-browser-notification-enable]')?.addEventListener('click', async () => {
      const result = await Notification.requestPermission();
      writePrefs({ enabled: result === 'granted', dismissed: result !== 'granted' });
      prompt.remove();
      document.dispatchEvent(new CustomEvent('doke:browser-notification-permission', { detail: { permission: result } }));
    });
    prompt.querySelector('[data-browser-notification-dismiss]')?.addEventListener('click', () => { writePrefs({ dismissed: true }); prompt.remove(); });
  };

  const showBrowserNotification = (payload = {}) => {
    if (!canNotify() || document.visibilityState === 'visible') return false;
    const title = String(payload.title || 'Doke');
    const body = String(payload.body || payload.message || 'Você recebeu uma nova notificação.');
    const notification = new Notification(title, { body, tag: String(payload.groupKey || payload.id || payload.type || 'doke-notification'), renotify: Boolean(payload.priority === 'high'), silent: payload.priority === 'silent' });
    notification.onclick = () => { window.focus(); if (payload.targetUrl) window.location.href = payload.targetUrl; notification.close(); };
    return true;
  };

  document.addEventListener('doke:in-app-notification', (event) => showBrowserNotification(event.detail || {}));
  window.addEventListener('storage', (event) => {
    if (event.key !== 'doke.in-app-notification.bus.v1' || !event.newValue) return;
    showBrowserNotification(safeParse(event.newValue, {}));
  });
  document.addEventListener('DOMContentLoaded', () => window.setTimeout(ensurePrompt, 1600));

  window.DokeBrowserNotifications = { supported, permission, canNotify, enable: async () => { if (!supported()) return 'unsupported'; const result = await Notification.requestPermission(); writePrefs({ enabled: result === 'granted', dismissed: result !== 'granted' }); return result; }, disable: () => writePrefs({ enabled: false }), getPreferences: readPrefs };
})();
