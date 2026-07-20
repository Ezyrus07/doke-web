(() => {
  const BUS_KEY = 'doke.in-app-notification.bus.v1';
  const ACTION_KEY = 'doke.in-app-notification.action.v1';
  const CENTER_KEY = 'doke.in-app-notification.center.v1';
  const PREFS_KEY = 'doke.in-app-notification.preferences.v1';
  const DIGEST_KEY = 'doke.in-app-notification.digest.v1';
  const TAB_ID = `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const DEFAULT_PREFS = { messages: true, reactions: true, mentions: true, events: true, social: true, sound: true, digest: true, dndEnabled: false, dndUntil: 0, priorityMin: 'silent', mutedScopes: [] };
  const PRIORITY_RANK = { silent: 0, normal: 1, high: 2 };
  const seen = new Set();
  const pendingActions = new Map();
  const toastRegistry = new Map();
  let host = null;

  const safeParse = (value, fallback = null) => { try { return JSON.parse(value); } catch (_error) { return fallback; } };
  const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const getCurrentUser = () => { try { return window.Doke?.session?.getCurrentUser?.() || window.DokeAuth?.service?.getCurrentUser?.() || safeParse(localStorage.getItem('doke.auth.session.v1'), {})?.user || null; } catch (_error) { return null; } };
  const getAccountKeys = () => { const user = getCurrentUser() || {}; return [user.id, user.accountKey, user.email].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean); };
  const normalizePrefs = (prefs = {}) => ({ ...DEFAULT_PREFS, ...prefs, mutedScopes: Array.isArray(prefs.mutedScopes) ? prefs.mutedScopes : [] });
  const readPrefs = () => normalizePrefs(safeParse(localStorage.getItem(PREFS_KEY), {}) || {});
  const writePrefs = (prefs) => { const next = normalizePrefs(prefs); localStorage.setItem(PREFS_KEY, JSON.stringify(next)); document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed', { detail: next })); return next; };
  const readCenter = () => { const items = safeParse(localStorage.getItem(CENTER_KEY), []); return Array.isArray(items) ? items : []; };
  const writeCenter = (items) => { try { localStorage.setItem(CENTER_KEY, JSON.stringify(items.slice(0, 250))); } catch (_error) {} document.dispatchEvent(new CustomEvent('doke:notification-center-changed', { detail: { items } })); syncGlobalBadges(items); };
  const typeGroup = (payload) => { const type = String(payload?.type || '').toLowerCase(); if (type.includes('mention')) return 'mentions'; if (type.includes('reaction')) return 'reactions'; if (type.includes('event')) return 'events'; if (type.includes('message') || payload?.category === 'messages') return 'messages'; return 'social'; };
  const priorityOf = (payload) => ['silent', 'normal', 'high'].includes(payload?.priority) ? payload.priority : (typeGroup(payload) === 'mentions' || String(payload?.type || '').includes('ban') ? 'high' : 'normal');
  const scopeOf = (payload) => String(payload?.scopeKey || payload?.conversationId || payload?.communityId || payload?.sourceKey || '').trim();
  const isForCurrentUser = (payload) => { const recipient = String(payload?.recipientAccountKey || payload?.userId || '').trim().toLowerCase(); return !recipient || getAccountKeys().includes(recipient); };
  const makeGroupKey = (payload) => String(payload.groupKey || [payload.recipientAccountKey || payload.userId || 'all', typeGroup(payload), payload.type || '', payload.targetUrl || '', payload.title || ''].join('|')).toLowerCase();
  const isDndActive = (prefs = readPrefs()) => Boolean(prefs.dndEnabled && Number(prefs.dndUntil || 0) > Date.now());
  const isMuted = (payload, prefs = readPrefs()) => { const scope = scopeOf(payload); return Boolean(scope && prefs.mutedScopes.includes(scope)); };
  const shouldToast = (payload, prefs = readPrefs()) => prefs[typeGroup(payload)] !== false && !isMuted(payload, prefs) && PRIORITY_RANK[priorityOf(payload)] >= PRIORITY_RANK[prefs.priorityMin || 'silent'];
  const persist = (payload) => {
    if (!isForCurrentUser(payload)) return payload;
    const items = readCenter(); const now = Date.now(); const groupKey = makeGroupKey(payload);
    const existing = items.find((item) => !item.dismissed && !item.read && item.groupKey === groupKey && now - Date.parse(item.updatedAt || item.createdAt || 0) < 86400000);
    if (existing) { existing.repeatCount = Number(existing.repeatCount || 1) + 1; existing.updatedAt = payload.createdAt || new Date().toISOString(); existing.createdAt = existing.updatedAt; existing.body = payload.body || payload.message || existing.body; existing.targetUrl = payload.targetUrl || existing.targetUrl; existing.actionLabel = payload.actionLabel || existing.actionLabel; existing.priority = priorityOf(payload); writeCenter(items.sort((a,b)=>Date.parse(b.createdAt||0)-Date.parse(a.createdAt||0))); return existing; }
    const item = { ...payload, priority: priorityOf(payload), groupKey, category: payload.category || (['messages','mentions','reactions'].includes(typeGroup(payload)) ? 'messages' : 'social'), read: false, dismissed: false, repeatCount: 1 };
    items.unshift(item); writeCenter(items); return item;
  };
  const ensureHost = () => { if (host?.isConnected) return host; host = document.createElement('section'); host.className='doke-live-toast-stack'; host.dataset.liveToastStack=''; host.setAttribute('aria-live','polite'); host.setAttribute('aria-label','Notificações recentes'); document.body.appendChild(host); return host; };
  const iconFor = (payload) => ({ mentions: '@', reactions: '♥', events: '◷', messages: '●' }[typeGroup(payload)] || '!');
  const markAsRead = (id) => { const items=readCenter(); const item=items.find((entry)=>String(entry.id)===String(id)); if(item)item.read=true; writeCenter(items); return item||null; };
  const dismiss = (id) => { const items=readCenter(); const item=items.find((entry)=>String(entry.id)===String(id)); if(item)item.dismissed=true; writeCenter(items); return item||null; };
  const syncGlobalBadges = (source=readCenter()) => {
    const count = source.filter((item) => !item.read && !item.dismissed && isForCurrentUser(item)).length;

    // A sidebar/header already expose the canonical blue notification counter.
    // Remove the legacy red overlay instead of creating a second authority.
    document.querySelectorAll('.doke-global-notification-badge').forEach((node) => node.remove());
    document.querySelectorAll('[data-notifications-unread-count]').forEach((node) => {
      if (node.classList.contains('doke-global-notification-badge')) {
        node.remove();
        return;
      }
      node.textContent = String(count);
      node.hidden = count === 0;
    });

    document.documentElement.style.setProperty('--doke-notifications-unread', String(count));
  };
  const openPayload = (payload) => { markAsRead(payload.id); const target=String(payload.targetUrl||'').trim(); if(target)window.location.href=target; };
  const playSound = (priority) => { if(priority==='silent'||!readPrefs().sound)return; try { const AudioContext=window.AudioContext||window.webkitAudioContext; if(!AudioContext)return; const ctx=new AudioContext(); const oscillator=ctx.createOscillator(); const gain=ctx.createGain(); oscillator.frequency.value=priority==='high'?760:620; gain.gain.setValueAtTime(.0001,ctx.currentTime); gain.gain.exponentialRampToValueAtTime(.045,ctx.currentTime+.015); gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.14); oscillator.connect(gain).connect(ctx.destination); oscillator.start(); oscillator.stop(ctx.currentTime+.15); } catch(_error){} };
  const queueDigest = (payload) => { const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); const items=Array.isArray(queue)?queue:[]; items.push({id:payload.id,title:payload.title,type:typeGroup(payload),createdAt:payload.createdAt}); localStorage.setItem(DIGEST_KEY,JSON.stringify(items.slice(-100))); };
  const flushDigest = () => { const prefs=readPrefs(); if(isDndActive(prefs)||!prefs.digest)return; const queue=safeParse(localStorage.getItem(DIGEST_KEY),[]); if(!Array.isArray(queue)||!queue.length)return; localStorage.removeItem(DIGEST_KEY); const groups=queue.reduce((acc,item)=>{acc[item.type]=(acc[item.type]||0)+1;return acc;},{}); const body=Object.entries(groups).map(([key,count])=>`${count} ${key}`).join(' · '); show({id:`digest-${Date.now()}`,title:`${queue.length} alertas acumulados`,body,targetUrl:'notificacoes.html',priority:'normal',type:'digest',duration:9000},{skipDigest:true}); };

  const recordActionResult = (notificationId, status, message, undoPayload = null) => {
    const items = readCenter();
    const item = items.find((entry) => String(entry.id) === String(notificationId));
    if (item) {
      item.read = true;
      item.actionStatus = status;
      item.actionMessage = String(message || '');
      item.actionUpdatedAt = new Date().toISOString();
      item.undoPayload = undoPayload || null;
      writeCenter(items);
    }
    pendingActions.delete(String(notificationId));
    document.dispatchEvent(new CustomEvent('doke:notification-action-result', {
      detail: { notificationId: String(notificationId || ''), status, message: String(message || ''), undoPayload: undoPayload || null }
    }));
    return item || null;
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
  const show = (payload, options={}) => {
    if(!payload||!isForCurrentUser(payload))return false;
    const id=String(payload.id||payload.eventKey||`${payload.type||'notification'}:${payload.createdAt||Date.now()}`);
    const prefs=readPrefs();
    if(seen.has(id)||!shouldToast(payload,prefs))return false;
    if(isDndActive(prefs)&&!options.skipDigest){queueDigest(payload);return false;}
    seen.add(id);
    const priority=priorityOf(payload);
    const toast=document.createElement('article');
    toast.className=`doke-live-toast doke-live-toast--${priority}`;
    toast.tabIndex=0;
    toast.dataset.liveToast=id;
    const repeat=Number(payload.repeatCount||1);
    const actions=resolveActions(payload);
    toast.innerHTML=`<span class="doke-live-toast__icon" aria-hidden="true">${iconFor(payload)}</span><span class="doke-live-toast__content"><strong>${escapeHtml(payload.title||'Nova notificação')}${repeat>1?` <em>×${repeat}</em>`:''}</strong><span>${escapeHtml(payload.body||payload.message||'')}</span>${actions.length?`<span class="doke-live-toast__actions">${actions.map((action,index)=>`<button type="button" data-toast-action="${index}">${escapeHtml(action.label)}</button>`).join('')}</span>`:''}<small class="doke-live-toast__status" data-toast-action-status aria-live="polite"></small></span><button class="doke-live-toast__close doke-close-button doke-icon-btn doke-icon-btn--flat" type="button" aria-label="Fechar notificação"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg></button>`;
    toastRegistry.set(String(payload.id||id), { toast, payload, actions });
    let timer = null;
    const close=()=>{if(timer)window.clearTimeout(timer);toastRegistry.delete(String(payload.id||id));toast.classList.add('is-leaving');window.setTimeout(()=>toast.remove(),180);};
    const restartTimer=()=>{if(timer)window.clearTimeout(timer);timer=window.setTimeout(close,Number(payload.duration|| (priority==='high'?10000:6500)));};
    toast.querySelector('.doke-live-toast__close')?.addEventListener('click',(event)=>{event.stopPropagation();close();});
    toast.querySelectorAll('[data-toast-action]').forEach((button)=>button.addEventListener('click',(event)=>{
      event.stopPropagation();
      const action=actions[Number(button.dataset.toastAction)];
      if(!action)return;
      if(isActionExpired(payload,action)){button.disabled=true;button.textContent='Expirada';recordActionResult(payload.id,'expired','Esta ação expirou.');return;}
      if(action.action==='mute-scope'){muteScope(scopeOf(payload),payload.scopeLabel||payload.communityName||payload.conversationName||'Origem');close();return;}
      if(['quick-reply','event-rsvp','request-decision','undo'].includes(action.action)){runQuickAction(toast,payload,action,close);restartTimer();return;}
      if(action.url){markAsRead(payload.id);window.location.href=action.url;}
      else if(action.eventName){document.dispatchEvent(new CustomEvent(action.eventName,{detail:{payload,action}}));close();}
    }));
    toast.addEventListener('click',(event)=>{if(event.target.closest('button,input,form'))return;payload.targetUrl?openPayload(payload):close();});
    toast.addEventListener('keydown',(event)=>{if(event.target.matches('input,button'))return;if(event.key==='Enter'||event.key===' '){event.preventDefault();payload.targetUrl?openPayload(payload):close();}if(event.key==='Escape')close();});
    ensureHost().prepend(toast);
    while(host.children.length>4)host.lastElementChild?.remove();
    playSound(priority);
    restartTimer();
    return true;
  };
  const publish = (payload={}) => { const envelope={...payload,id:payload.id||payload.eventKey||`live-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,createdAt:payload.createdAt||new Date().toISOString(),originTabId:TAB_ID};const stored=persist(envelope);try{localStorage.setItem(BUS_KEY,JSON.stringify(stored));}catch(_error){}document.dispatchEvent(new CustomEvent('doke:in-app-notification',{detail:stored}));return stored; };
  const muteScope = (scope,label='Origem') => { if(!scope)return readPrefs();const prefs=readPrefs();if(!prefs.mutedScopes.includes(scope))prefs.mutedScopes.push(scope);prefs.mutedScopeLabels={...(prefs.mutedScopeLabels||{}),[scope]:label};return writePrefs(prefs); };
  const unmuteScope = (scope) => { const prefs=readPrefs();prefs.mutedScopes=prefs.mutedScopes.filter((item)=>item!==scope);if(prefs.mutedScopeLabels)delete prefs.mutedScopeLabels[scope];return writePrefs(prefs); };

  document.addEventListener('doke:notification-action-result', (event) => {
    const detail = event.detail || {};
    const registered = toastRegistry.get(String(detail.notificationId || ''));
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
    const registered = toastRegistry.get(notificationId);
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

  window.addEventListener('storage',(event)=>{if(event.key===ACTION_KEY&&event.newValue){const action=safeParse(event.newValue,null);if(action&&action.originTabId!==TAB_ID)document.dispatchEvent(new CustomEvent('doke:notification-action',{detail:action}));}if(event.key===CENTER_KEY)syncGlobalBadges(safeParse(event.newValue,[]));if(event.key===PREFS_KEY)document.dispatchEvent(new CustomEvent('doke:notification-preferences-changed',{detail:readPrefs()}));if(event.key!==BUS_KEY||!event.newValue)return;const payload=safeParse(event.newValue,null);if(!payload||payload.originTabId===TAB_ID)return;show(payload);});
  document.addEventListener('doke:in-app-notification',(event)=>{const payload=event.detail;if(!payload||payload.originTabId===TAB_ID)return;show(payload);});
  document.addEventListener('DOMContentLoaded',()=>{syncGlobalBadges();flushDigest();window.setInterval(flushDigest,30000);});

  window.DokeInAppNotifications={publish,show,publishAction,recordActionResult,list:()=>readCenter().filter((item)=>isForCurrentUser(item)),markAsRead,dismiss,markAllAsRead(){const items=readCenter();items.forEach((item)=>{if(isForCurrentUser(item))item.read=true;});writeCenter(items);},getPreferences:readPrefs,setPreferences(next={}){return writePrefs({...readPrefs(),...next});},muteScope,unmuteScope,isDndActive,flushDigest,syncGlobalBadges};
})();
