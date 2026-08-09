(() => {
  const BUS_KEY = 'doke.in-app-notification.bus.v1';
  const ACTION_KEY = 'doke.in-app-notification.action.v1';
  const PREFS_KEY = 'doke.in-app-notification.preferences.v1';
  const DIGEST_KEY = 'doke.in-app-notification.digest.v1';
  const TAB_ID = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const DEFAULT_PREFS = { messages: true, reactions: true, mentions: true, events: true, social: true, sound: true, digest: true, dndEnabled: false, dndUntil: 0, priorityMin: 'silent', mutedScopes: [] };
  const PRIORITY_RANK = { silent: 0, normal: 1, high: 2 };
  const pendingActions = new Map();

  const safeParse = (value, fallback = null) => { try { return JSON.parse(value); } catch (_error) { return fallback; } };
  const getCurrentUser = () => { try { return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || safeParse(localStorage.getItem('doke.auth.session.v1'), {})?.user || null; } catch (_error) { return null; } };
  const getAccountKeys = () => { const user = getCurrentUser() || {}; return [user.id, user.accountKey, user.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean); };
  const getNotificationCenter = () => window.Doke?.notificationCenter || null;
  const getNotificationService = () => window.Doke?.services?.notifications || null;
  const getToastManager = () => window.Doke?.notificationToast || null;
  const normalizePrefs = (prefs = {}) => ({ ...DEFAULT_PREFS, ...prefs, mutedScopes: Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [] });
  const readPrefs = () => normalizePrefs(safeParse(localStorage.getItem(PREFS_KEY), {}) || {});
  const writePrefs = (prefs) => { const next = normalizePrefs(prefs); localStorage.setItem(PREFS_KEY, JSON.stringify(next)); document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: next })); return next; };
  const readCenter = () => Array.from(getNotificationCenter()?.getSnapshot?.().items || []);
  const typeGroup = (payload) => { const type = String(payload?.type || '').toLowerCase(); if (type.includes('mention')) return 'mentions'; if (type.includes('reaction')) return 'reactions'; if (type.includes('event')) return 'events'; if (type.includes('message') || payload?.category === 'messages') return 'messages'; return 'social'; };
  const priorityOf = (payload) => {
    const canonical = String(payload?.priority || '').trim().toLowerCase();
    if (canonical === 'critical') return 'high';
    if (canonical === 'low') return 'silent';
    if (['silent', 'normal', 'high'].includes(canonical)) return canonical;
    return typeGroup(payload) === 'mentions' || String(payload?.type || '').includes('ban') ? 'high' : 'normal';
  };
  const scopeOf = (payload) => String(payload?.scopeKey || payload?.conversationId || payload?.communityId || payload?.sourceKey || '').trim();
  const isForCurrentUser = (payload) => { const recipient = String(payload?.recipientAccountKey || payload?.userId || '').trim().toLowerCase(); return !recipient || getAccountKeys().includes(recipient); };
  const makeGroupKey = (payload) => String(payload.groupKey || [payload.recipientAccountKey || payload.userId || 'all', typeGroup(payload), payload.type || '', payload.targetUrl || '', payload.title || ''].join('|')).toLowerCase();
  const isDndActive = (prefs = readPrefs()) => Boolean(prefs.dndEnabled && Number(prefs.dndUntil || 0) > Date.now());
  const isMuted = (payload, prefs = readPrefs()) => { const scope = scopeOf(payload); return Boolean(scope && prefs.mutedScopes.includes(scope)); };
  const shouldToast = (payload, prefs = readPrefs()) => prefs[typeGroup(payload)] !== false && !isMuted(payload, prefs) && PRIORITY_RANK[priorityOf(payload)] >= PRIORITY_RANK[prefs.priorityMin || 'silent'];
  const persist = (payload) => {
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
  const iconFor = (payload) => ({ mentions: '@', reactions: '♥', events: '◷', messages: '●' }[typeGroup(payload)] || '!');
  const persistPresentationMutation = (id, kind, fence) => {
    const center = getNotificationCenter();
    const service = getNotificationService();
    const mutation = kind === 'dismiss' ? service?.dismiss : service?.markAsRead;
    if (!center || typeof mutation !== 'function') {
      center?.resolveMutation?.(id, kind, { status: 'PENDING_SYNC', errorCode: 'service-unavailable' }, fence ? { fence } : {});
      return;
    }
    Promise.resolve(mutation.call(service, id)).then((result) => {
      const status = String(result?.stateSyncStatus || '').toLowerCase() === 'pending' ? 'PENDING_SYNC' : 'SYNCED';
      center.resolveMutation?.(id, kind, { status, item: result || null }, fence ? { fence } : {});
    }).catch(() => {
      center.resolveMutation?.(id, kind, { status: 'PENDING_SYNC', errorCode: 'persistence-failed' }, fence ? { fence } : {});
    });
  };
  const markAsRead = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    const fence = center.createFence?.();
    center.markRead(id, { pendingSync: true });
    persistPresentationMutation(id, 'read', fence);
    return item ? { ...item, read: true, readSyncState: 'PENDING_SYNC' } : null;
  };
  const dismiss = (id) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const item = readCenter().find((entry) => String(entry.id) === String(id)) || null;
    const fence = center.createFence?.();
    center.dismiss(id, { pendingSync: true });
    persistPresentationMutation(id, 'dismiss', fence);
    return item ? { ...item, dismissed: true, dismissSyncState: 'PENDING_SYNC' } : null;
  };
  const syncGlobalBadges = (_source, scope = document) => getNotificationCenter()?.syncBadges?.(scope) ?? 0;
  const openPayload = (payload) => { markAsRead(payload.id); const target=String(payload.targetUrl||'').trim(); if(target)window.location.href=target; };
  const playSound = (priority) => { if(priority==='silent'||!readPrefs().sound)return; try { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; const ctx=new AudioContext(); const oscillator=ctx.createOscillator(); const gain=ctx.createGain(); oscillator.frequency.value=priority==='high'?760:620; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.15); } catch(_error){} };
  const queueDigest = (payload) => { const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); const items=Array.isArray(queue)?queue:[]; items.push({id:payload.id,title:payload.title,type:typeGroup(payload),createdAt:payload.createdAt}); localStorage.setItem(DIGEST_KEY,JSON.stringify(items.slice(-100))); };
  const flushDigest = () => { const prefs=readPrefs(); if(isDndActive(prefs)||!prefs.digest)return; const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); if(!Array.isArray(queue)||!queue.length)return; localStorage.removeItem(DIGEST_KEY); const groups=queue.reduce((acc,item)=>{acc[item.type]=(acc[item.type]||0)+1;return acc;},{}); const body=Object.entries(groups).map(([key,count])=>`${count} ${key}`).join(' · '); show({id:`digest-${Date.now()}`,title:`${queue.length} alertas acumulados`,body,targetUrl:'notificacoes.html',priority:'normal',type:'digest',duration:9000},{skipDigest:true}); };

  const recordActionResult = (notificationId, status, message, undoPayload = null) => {
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
  const publishAction = (payload) => {
    const command = { ...payload, id: payload.id || `notification-action-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, createdAt: new Date().toISOString(), originTabId: TAB_ID };
    try { localStorage.setItem(ACTION_KEY, JSON.stringify(command)); } catch (_error) {}
    document.dispatchEvent(new CustomEvent('doke:notification-action', { detail: command }));
    return command;
  };
  const isActionExpired = (payload, action) => {
    const raw = action.expiresAt || payload.actionExpiresAt || payload.expiresAt;
    if (!raw) return false;
    const timestamp = typeof raw === 'number' ? raw : Date.parse(raw);
    return Number.isFinite(timestamp) && timestamp <= Date.now();
  };
  const actionKeyFor = (payload, action) => [payload.id, action.action, action.eventId, action.requestId, action.conversationId].filter(Boolean).join(':');
  const publishQuickAction = (payload, action, extra = {}) => {
    const key = actionKeyFor(payload, action);
    if (pendingActions.has(key)) return false;
    if (isActionExpired(payload, action)) {
      recordActionResult(payload.id, 'expired', 'Esta ação expirou. Abra a notificação para conferir o estado atual.');
      return false;
    }
    pendingActions.set(key, Date.now());
    publishAction({
      kind: action.action,
      notificationId: payload.id,
      conversationId: action.conversationId || payload.conversationId,
      communityId: action.communityId || payload.communityId,
      eventId: action.eventId || payload.eventId,
      requestId: action.requestId || payload.requestId,
      attending: action.attending,
      decision: action.decision,
      targetUrl: payload.targetUrl,
      actionKey: key,
      ...extra
    });
    window.setTimeout(() => pendingActions.delete(key), 12000);
    return true;
  };
  const showInlineReply = (toast, payload, action) => {
    if (toast.querySelector('[data-toast-inline-reply]')) return;
    const form = document.createElement('form');
    form.className = 'doke-live-toast__reply';
    form.dataset.toastInlineReply = '';
    form.innerHTML = `<label><span class="sr-only">Resposta</span><input type="text" maxlength="500" placeholder="Digite uma resposta…" autocomplete="off"></label><button type="submit">Enviar</button><button type="button" data-toast-reply-cancel>Cancelar</button><small data-toast-reply-feedback aria-live="polite"></small>`;
    const content = toast.querySelector('.doke-live-toast__content');
    content?.appendChild(form);
    const input = form.querySelector('input');
    const feedback = form.querySelector('[data-toast-reply-feedback]');
    form.addEventListener('click', (event) => event.stopPropagation());
    form.querySelector('[data-toast-reply-cancel]')?.addEventListener('click', () => form.remove());
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const text = String(input?.value || '').trim();
      if (!text) { feedback.textContent = 'Digite uma resposta.'; input?.focus(); return; }
      const sent = publishQuickAction(payload, action, { text });
      if (!sent) { feedback.textContent = isActionExpired(payload, action) ? 'Ação expirada.' : 'Ação já em processamento.'; return; }
      input.disabled = true;
      form.querySelectorAll('button').forEach((button) => { button.disabled = true; });
      feedback.textContent = 'Enviando…';
      recordActionResult(payload.id, 'pending', 'Enviando resposta…');
    });
    window.setTimeout(() => input?.focus(), 0);
  };
  const runQuickAction = (toast, payload, action, close) => {
    const kind = String(action.action || '');
    if (kind === 'quick-reply') { showInlineReply(toast, payload, action); return; }
    if (kind === 'undo') {
      const undo = action.undoPayload || payload.undoPayload;
      if (!undo || !undo.kind) return;
      const sent = publishQuickAction(payload, { ...action, action: undo.kind }, { ...undo, isUndo: true });
      if (sent) recordActionResult(payload.id, 'pending', 'Desfazendo ação…');
      return;
    }
    const sent = publishQuickAction(payload, action);
    if (!sent) return;
    if (kind === 'event-rsvp') recordActionResult(payload.id, 'pending', action.attending === false ? 'Cancelando presença…' : 'Confirmando presença…');
    if (kind === 'request-decision') recordActionResult(payload.id, 'pending', action.decision === 'accepted' ? 'Aceitando solicitação…' : 'Recusando solicitação…');
  };

  const resolveActions = (payload) => { if(Array.isArray(payload.actions))return payload.actions.slice(0,3); const actions=[]; if(payload.targetUrl)actions.push({label:payload.actionLabel|| (typeGroup(payload)==='events'?'Ver evento':'Abrir'),url:payload.targetUrl}); if(scopeOf(payload))actions.push({label:'Silenciar origem',action:'mute-scope'}); return actions.slice(0,2); };
  const show = (payload, options = {}) => {
    const manager = getToastManager();
    if (!manager || typeof manager.show !== 'function') return false;
    return manager.show(payload, options);
  };
  const publish = (payload={}) => { const envelope={...payload,id:payload.id||payload.eventKey||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:payload.createdAt||new Date().toISOString(),originTabId:TAB_ID};const stored=persist(envelope);try{localStorage.setItem(BUS_KEY,JSON.stringify(stored));}catch(_error){}document.dispatchEvent(new CustomEvent('doke:in-app-notification',{detail:stored}));return stored; };
  const muteScope = (scope,label='Origem') => { if(!scope)return readPrefs();const prefs=readPrefs();if(!prefs.mutedScopes.includes(scope))prefs.mutedScopes.push(scope);prefs.mutedScopeLabels={...(prefs.mutedScopeLabels||{}),[scope]:label};return writePrefs(prefs); };
  const unmuteScope = (scope) => { const prefs=readPrefs();prefs.mutedScopes=prefs.mutedScopes.filter((item)=>item!==scope);if(prefs.mutedScopeLabels)delete prefs.mutedScopeLabels[scope];return writePrefs(prefs); };

  const configureToastManager = () => {
    const manager = getToastManager();
    if (!manager || typeof manager.configure !== 'function') return false;
    manager.configure({
      getAccountKey: () => getAccountKeys()[0] || 'anonymous',
      isForCurrentUser,
      shouldToast,
      isDndActive,
      queueDigest,
      priorityOf,
      iconFor,
      resolveActions,
      scopeOf,
      onMarkRead: markAsRead,
      onOpen: openPayload,
      onMuteScope: muteScope,
      onQuickAction: runQuickAction,
      onRecordActionResult: recordActionResult,
      onPublishAction: publishAction,
      onPlaySound: playSound,
      isActionExpired
    });
    return true;
  };
  configureToastManager();

  document.addEventListener('doke:notification-action-result', (event) => {
    const detail = event.detail || {};
    const registered = getToastManager()?.getRecord?.(String(detail.notificationId || '')) || null;
    if (!registered) return;
    const status = registered.toast.querySelector('[data-toast-action-status]');
    if (status) { status.textContent = detail.message || ''; status.dataset.status = detail.status || ''; }
    registered.toast.querySelectorAll('[data-toast-inline-reply] input, [data-toast-inline-reply] button').forEach((control) => { control.disabled = detail.status === 'pending'; });
    const actionsHost = registered.toast.querySelector('.doke-live-toast__actions');
    if (detail.status === 'completed' && detail.undoPayload && actionsHost && !actionsHost.querySelector('[data-toast-undo]')) {
      const undoButton = document.createElement('button');
      undoButton.type = 'button';
      undoButton.dataset.toastUndo = '';
      undoButton.textContent = 'Desfazer';
      undoButton.addEventListener('click', (clickEvent) => {
        clickEvent.stopPropagation();
        runQuickAction(registered.toast, { ...registered.payload, undoPayload: detail.undoPayload }, { action: 'undo', undoPayload: detail.undoPayload }, () => {});
        undoButton.disabled = true;
      });
      actionsHost.appendChild(undoButton);
    }
  });
  document.addEventListener('doke:notification-action-error', (event) => {
    const detail = event.detail || {};
    const notificationId = String(detail.notificationId || detail.id || '');
    const registered = getToastManager()?.getRecord?.(notificationId) || null;
    recordActionResult(notificationId, 'error', detail.message || detail.error || 'Não foi possível concluir a ação.');
    if (!registered) return;
    const status = registered.toast.querySelector('[data-toast-action-status]');
    if (status) { status.textContent = detail.message || detail.error || 'Não foi possível concluir a ação.'; status.dataset.status = 'error'; }
    const actionsHost = registered.toast.querySelector('.doke-live-toast__actions');
    if (actionsHost && detail.retryPayload && !actionsHost.querySelector('[data-toast-retry]')) {
      const retry = document.createElement('button');
      retry.type = 'button'; retry.dataset.toastRetry = ''; retry.textContent = 'Tentar novamente';
      retry.addEventListener('click', (clickEvent) => { clickEvent.stopPropagation(); publishAction(detail.retryPayload); retry.disabled = true; if(status)status.textContent='Tentando novamente…'; });
      actionsHost.appendChild(retry);
    }
  });

  const hydrateNotificationCenter = () => {
    const center = getNotificationCenter();
    const service = window.Doke?.services?.notifications;
    if (!center || typeof service?.list !== 'function') {
      center?.syncBadges?.();
      return Promise.resolve(center?.getSnapshot?.() || null);
    }
    const fence = center.createFence?.();
    return Promise.resolve(service.list({ dismissed: false, currentUser: true }))
      .then((items) => center.reconcile((Array.isArray(items) ? items : []).filter(isForCurrentUser), fence ? { fence, completeSnapshot: true } : { completeSnapshot: true }))
      .catch(() => {
        center.setBadgeMetadata?.({ freshness: 'DEGRADED', sourceAuthority: 'DERIVED_PRESENTATION' });
        return center.getSnapshot();
      });
  };
  const applySynchronizedItems = (detail = {}) => {
    const center = getNotificationCenter();
    if (!center) return null;
    const accountId = String(detail.accountId || '').trim().toLowerCase();
    const currentId = String(getCurrentUser()?.id || '').trim().toLowerCase();
    if (accountId && currentId && accountId !== currentId) return center.getSnapshot();
    return center.reconcile((Array.isArray(detail.items) ? detail.items : []).filter(isForCurrentUser), {
      completeSnapshot: detail.completeSnapshot !== false,
      freshness: detail.freshness || 'UNKNOWN',
      sourceAuthority: detail.sourceAuthority || 'DERIVED_PRESENTATION'
    });
  };

  window.addEventListener('storage', (event) => {
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
    applySynchronizedItems(event.detail || {});
  });
  document.addEventListener('doke:auth-session-change', () => {
    getToastManager()?.reset?.(getAccountKeys()[0] || 'anonymous');
    getNotificationCenter()?.refreshAccount?.();
    hydrateNotificationCenter();
  });
  document.addEventListener('DOMContentLoaded', () => {
    configureToastManager();
    hydrateNotificationCenter();
    syncGlobalBadges();
    flushDigest();
    window.setInterval(flushDigest, 30000);
  });

  window.DokeInAppNotifications = {
    publish,
    show,
    enqueueToast: show,
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
})();
