/* Doke Orders Repository
   Responsibility: remote read mirror plus explicit browser-only draft/mock persistence.
   Submitted orders and lifecycle commands belong exclusively to the server command boundary. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.orders.local.v1';
  var LEGACY_STORAGE_KEY = 'doke.orders';
  var FALLBACK_URL = 'assets/data/mock-orders.json';
  var cache = null;
  var PROVIDER_ATTRIBUTE = 'data-doke-orders-provider';
  var REMOTE_TABLE = 'orders';
  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastRemoteError = null;

  function clone(value) {
    if (value == null) return value;
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function toCurrencyLabel(value) {
    var amount = Number(value || 0);
    if (!Number.isFinite(amount) || amount <= 0) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0
    }).format(amount);
  }

  function compactDataUrl(value) {
    var url = normalizeText(value || '');
    if (!url) return '';
    if (url.indexOf('data:') !== 0) return url;
    return url.length <= 160000 ? url : '';
  }

  function normalizeAttachment(raw) {
    if (!raw) return null;
    var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
    if (attachmentRepository && typeof attachmentRepository.normalize === 'function') {
      return attachmentRepository.normalize(raw);
    }
    if (typeof raw === 'string') {
      return {
        id: '',
        name: raw,
        type: '',
        size: 0,
        bucket: '',
        path: '',
        source: 'order',
        resourceId: '',
        uploadedBy: '',
        createdAt: '',
        url: '',
        dataUrl: '',
        downloadUrl: '',
        previewable: false,
        syncStatus: 'local'
      };
    }

    if (typeof raw !== 'object') return null;
    var url = compactDataUrl(raw.url || raw.dataUrl || raw.preview || '');
    return {
      id: normalizeText(raw.id || raw.attachmentId || ''),
      name: normalizeText(raw.name || raw.filename || raw.originalName || 'anexo'),
      type: normalizeText(raw.type || raw.mimeType || raw.contentType || ''),
      size: Number(raw.size || raw.sizeBytes) || 0,
      bucket: normalizeText(raw.bucket || ''),
      path: normalizeText(raw.path || raw.storagePath || raw.objectPath || ''),
      source: normalizeText(raw.source || raw.kind || 'order'),
      resourceId: normalizeText(raw.resourceId || raw.orderId || ''),
      uploadedBy: normalizeText(raw.uploadedBy || raw.uploaderId || ''),
      createdAt: raw.createdAt || '',
      url: url,
      dataUrl: /^data:/i.test(url) ? url : compactDataUrl(raw.dataUrl || ''),
      downloadUrl: normalizeText(raw.downloadUrl || ''),
      previewable: Boolean(raw.previewable || url) && Boolean(url),
      syncStatus: normalizeText(raw.syncStatus || '') || (raw.path ? 'synced' : 'local'),
      tooLarge: Boolean(raw.tooLarge),
      error: normalizeText(raw.error || '')
    };
  }

  function normalizeAttachments(value) {
    if (!Array.isArray(value)) return [];
    return value.map(normalizeAttachment).filter(Boolean).slice(0, 8);
  }

  function safeRead(key) {
    try {
      var raw = root.localStorage.getItem(key);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function stripAttachmentPreviews(items) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      var next = Object.assign({}, item);
      next.attachments = normalizeAttachments(next.attachments).map(function (attachment) {
        return Object.assign({}, attachment, {
          url: '',
          previewable: false,
          tooLarge: attachment.tooLarge || Boolean(attachment.url)
        });
      });
      return next;
    });
  }

  function safeWrite(key, items) {
    var normalized = Array.isArray(items) ? items : [];
    try {
      root.localStorage.setItem(key, JSON.stringify(normalized));
    } catch (error) {
      try {
        root.localStorage.setItem(key, JSON.stringify(stripAttachmentPreviews(normalized)));
      } catch (fallbackError) {
        // localStorage can be unavailable or full; reads still work with mocks.
      }
    }
  }

  function getSessionUser() {
    var user = Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;

    if (user) return user;

    try {
      var raw = root.localStorage.getItem('doke.auth.session.v1');
      var session = raw ? JSON.parse(raw) : null;
      return session && session.user ? session.user : null;
    } catch (error) {
      return null;
    }
  }

  function getRuntimeConfig() {
    return Doke.runtimeConfig && typeof Doke.runtimeConfig === 'object' ? Doke.runtimeConfig : {};
  }

  function getProviderPolicy() {
    var config = getRuntimeConfig();
    var environment = String(config.environment || '').toLowerCase();
    var provider = String(config.ordersReadProvider || config.ordersProvider || 'mock').trim().toLowerCase();
    var remoteReadActive = provider === 'supabase-read';
    var mockDevelopmentActive = config.ordersMockDevelopment === true
      || (environment === 'local' && provider === 'mock');
    return Object.freeze({
      provider: provider,
      environment: environment,
      remoteReadActive: remoteReadActive,
      mockDevelopmentActive: mockDevelopmentActive,
      fallbackAllowed: false
    });
  }

  function readAuthorityError(message) {
    var error = new Error(message || 'A autoridade remota de leitura de pedidos está indisponível.');
    error.code = 'DOKE_ORDER_READ_AUTHORITY_UNAVAILABLE';
    return error;
  }

  function assertMockDevelopment(operation) {
    var policy = getProviderPolicy();
    if (policy.mockDevelopmentActive) return policy;
    var error = new Error('Fixtures de pedidos só podem ser alteradas no modo local de desenvolvimento.');
    error.code = 'DOKE_ORDER_MOCK_DEVELOPMENT_REQUIRED';
    error.operation = operation || 'mock';
    throw error;
  }

  function normalizeStatus(value) {
    var status = normalizeText(value || '').toLowerCase();
    var aliases = {
      requested: 'pending',
      request_created: 'pending',
      budget_requested: 'pending',
      budget_sent: 'quoted',
      proposal_sent: 'quoted',
      charged: 'quoted',
      charge_created: 'quoted',
      paid: 'in_progress',
      payment_confirmed: 'in_progress',
      released: 'completed',
      refunded: 'completed',
      under_review: 'disputed',
      dispute_opened: 'disputed',
      dispute_under_review: 'disputed',
      refused: 'cancelled',
      declined: 'cancelled'
    };
    return aliases[status] || status || 'pending';
  }

  function getStatusLabel(status) {
    var normalizedStatus = normalizeStatus(status);
    var labels = {
      draft: 'Rascunho',
      pending: 'Aguardando resposta',
      quoted: 'Orçamento enviado',
      budget_sent: 'Orçamento enviado',
      accepted: 'Pedido aceito',
      scheduled: 'Agendado',
      in_progress: 'Em andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      disputed: 'Em disputa',
      conversation: 'Pedido aceito',
      responded: 'Respondido'
    };
    return labels[normalizedStatus] || 'Aguardando resposta';
  }


  function deriveScheduleAuthority(raw, normalizedStatus) {
    raw = raw || {};
    var scheduleReservationId = normalizeText(raw.scheduleReservationId || raw.schedule_reservation_id || '');
    var scheduledAt = normalizeText(raw.scheduledAt || raw.scheduled_at || '');
    var status = normalizeStatus(normalizedStatus || raw.status || '');
    var desiredDate = normalizeText(raw.desiredDate || raw.date || raw.daté || '');
    var hasReservation = Boolean(scheduleReservationId);
    var hasScheduledAt = Boolean(scheduledAt);
    var isScheduled = status === 'scheduled';
    var authority = 'none';

    if (hasReservation && hasScheduledAt && isScheduled) authority = 'canonical_confirmed';
    else if (hasReservation || hasScheduledAt || isScheduled) authority = 'incomplete_projection';
    else if (desiredDate) authority = 'client_intent';

    return Object.freeze({
      scheduleReservationId: scheduleReservationId,
      scheduledAt: scheduledAt,
      scheduleAuthority: authority,
      hasCanonicalSchedule: authority === 'canonical_confirmed'
    });
  }

  function makeId() {
    return 'order_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function normalizeOrder(raw) {
    raw = raw || {};
    var rawStatus = raw.status || 'pending';
    var status = normalizeStatus(rawStatus);
    var createdAt = raw.createdAt || raw.creatédAt || nowIso();
    var updatedAt = raw.updatedAt || createdAt;
    var provider = raw.providerName || raw.provider || raw.professionalName || 'Profissional Doke';
    var service = raw.serviceTitle || raw.service || raw.title || 'Serviço solicitado';
    var location = raw.location || raw.address || raw.detailAddress || '';
    var statusLabel = raw.statusLabel || getStatusLabel(status);
    var budgetLabel = raw.budget || raw.detailBudget || raw.budgetLabel || (raw.budgetAmount ? toCurrencyLabel(raw.budgetAmount) : 'A definir');
    var serviceSnapshot = raw.serviceSnapshot && typeof raw.serviceSnapshot === 'object' ? clone(raw.serviceSnapshot) : null;
    var snapshotImages = serviceSnapshot && Array.isArray(serviceSnapshot.images)
      ? serviceSnapshot.images.filter(Boolean).slice(0, 3)
      : [];
    if (!snapshotImages.length && serviceSnapshot && serviceSnapshot.image) snapshotImages.push(serviceSnapshot.image);
    var rawServiceImages = Array.isArray(raw.serviceImages) ? raw.serviceImages.filter(Boolean).slice(0, 3) : [];
    var serviceImages = rawServiceImages.length ? rawServiceImages : snapshotImages;
    var serviceAvailabilitySchedule = Array.isArray(raw.serviceAvailabilitySchedule)
      ? raw.serviceAvailabilitySchedule
      : (serviceSnapshot && Array.isArray(serviceSnapshot.availabilitySchedule) ? serviceSnapshot.availabilitySchedule : []);
    var scheduleProjection = deriveScheduleAuthority(raw, status);

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || makeId(),
      clientId: raw.clientId || '',
      clientName: raw.clientName || raw.customerName || 'Cliente Doke',
      clientInitials: raw.clientInitials || raw.customerInitials || 'CL',
      professionalId: raw.professionalId || raw.providerId || '',
      providerId: raw.providerId || raw.professionalId || '',
      professionalProfileId: raw.professionalProfileId || raw.profileId || '',
      serviceId: raw.serviceId || '',
      serviceImage: raw.serviceImage || serviceImages[0] || '',
      serviceImages: serviceImages,
      serviceCategory: raw.serviceCategory || serviceSnapshot && serviceSnapshot.category || '',
      servicePriceMode: raw.servicePriceMode || serviceSnapshot && serviceSnapshot.priceMode || '',
      servicePrice: raw.servicePrice == null
        ? (serviceSnapshot && serviceSnapshot.priceValue != null ? Number(serviceSnapshot.priceValue) : null)
        : Number(raw.servicePrice),
      servicePriceLabel: raw.servicePriceLabel || serviceSnapshot && serviceSnapshot.priceLabel || '',
      serviceRegion: raw.serviceRegion || serviceSnapshot && serviceSnapshot.location || '',
      serviceAvailabilitySchedule: serviceAvailabilitySchedule,
      serviceIncludedItems: raw.serviceIncludedItems || serviceSnapshot && serviceSnapshot.includedItems || '',
      serviceExcludedItems: raw.serviceExcludedItems || serviceSnapshot && serviceSnapshot.excludedItems || '',
      serviceMode: raw.serviceMode || serviceSnapshot && serviceSnapshot.serviceMode || '',
      serviceBillingUnit: raw.serviceBillingUnit || serviceSnapshot && serviceSnapshot.billingUnit || '',
      serviceShortDescription: raw.serviceShortDescription || serviceSnapshot && serviceSnapshot.shortDescription || '',
      serviceSnapshot: serviceSnapshot,
      title: raw.title || service,
      serviceTitle: service,
      service: service,
      providerName: provider,
      provider: provider,
      providerInitials: raw.providerInitials || raw.avatar || 'DK',
      description: raw.description || raw.details || '',
      details: raw.details || raw.description || '',
      status: status,
      backendStatus: raw.backendStatus || rawStatus,
      statusLabel: status === 'scheduled' ? 'Agendado' : statusLabel,
      scheduleReservationId: scheduleProjection.scheduleReservationId,
      scheduledAt: scheduleProjection.scheduledAt,
      scheduleAuthority: scheduleProjection.scheduleAuthority,
      hasCanonicalSchedule: scheduleProjection.hasCanonicalSchedule,
      createdAt: createdAt,
      creatédAt: createdAt,
      updatedAt: updatedAt,
      location: location,
      locationTitle: raw.locationTitle || raw.addressTitle || '',
      locationDetails: raw.locationDetails || {},
      scope: raw.scope || '',
      requestType: raw.requestType || 'Orçamento para execução',
      urgency: raw.urgency || 'Sem pressa',
      desiredDate: raw.desiredDate || raw.date || raw.daté || '',
      daté: raw.daté || raw.desiredDate || raw.date || '',
      shift: raw.shift || 'Flexível',
      attachments: normalizeAttachments(raw.attachments),
      budget: budgetLabel,
      detailBudget: raw.detailBudget || budgetLabel,
      nextAction: raw.nextAction || 'Acompanhar pedido',
      source: raw.source || 'budget'
    });
  }

  function mergeById() {
    var map = Object.create(null);
    Array.prototype.slice.call(arguments).forEach(function (items) {
      (items || []).forEach(function (item) {
        var normalized = normalizeOrder(item);
        if (!normalized.id) return;
        map[normalized.id] = Object.assign({}, map[normalized.id] || {}, normalized);
      });
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function readLocal() {
    return mergeById(safeRead(STORAGE_KEY), safeRead(LEGACY_STORAGE_KEY))
      .sort(function (a, b) { return new Date(b.createdAt || 0) - new Date(a.createdAt || 0); });
  }

  function writeLocal(items) {
    var normalized = (Array.isArray(items) ? items : []).map(normalizeOrder);
    safeWrite(STORAGE_KEY, normalized);
    safeWrite(LEGACY_STORAGE_KEY, normalized);
    cache = null;
    return clone(normalized);
  }

  function loadBase(options) {
    options = options || {};
    if (Doke.mockData && typeof Doke.mockData.load === 'function') {
      return Doke.mockData.load('orders', options);
    }

    return fetch(FALLBACK_URL, { cache: 'no-cache', credentials: 'same-origin' })
      .then(function (response) {
        if (!response.ok) throw new Error('Não foi possível carregar pedidos mockados.');
        return response.json();
      });
  }

  function loadLocal(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    return loadBase(options)
      .catch(function () { return []; })
      .then(function (base) {
        cache = mergeById(Array.isArray(base) ? base : [], readLocal());
        return clone(cache);
      });
  }

  function isDemoProfessional(user) {
    return Boolean(user && user.role === 'professional' && String(user.id) === 'user_profissional_demo');
  }

  function matchesCurrentUser(order, user) {
    if (!user || !user.id) return false;
    if (user.role === 'admin' || user.role === 'support') return true;
    if (user.role === 'professional') {
      if (String(order.professionalId || order.providerId) === String(user.id)) return true;
      // Backward-compatible mock rule: orders created from service-card provider IDs
      // must still be visible to the single demo professional account.
      return isDemoProfessional(user) && Boolean(order.id && (order.clientId || order.serviceId));
    }
    if (user.role === 'client') return String(order.clientId) === String(user.id);
    return false;
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function setProviderState(provider) {
    try { document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider); }
    catch (error) { /* test environments may not expose documentElement */ }
  }

  function warnRemote(error, context) {
    lastRemoteError = error || readAuthorityError();
    setProviderState('remote-error');
    if (root.console && typeof root.console.error === 'function') {
      root.console.error('[Doke orders repository] Falha na autoridade remota em ' + context + '.', error);
    }
  }

  function getSupabaseClient() {
    var policy = getProviderPolicy();
    if (!policy.remoteReadActive) {
      setProviderState(policy.mockDevelopmentActive ? 'mock-development' : 'blocked');
      return null;
    }
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.ordersEnabled === false || !config.url || !config.anonKey || !sdk || typeof sdk.createClient !== 'function') {
      setProviderState('remote-unavailable');
      return null;
    }
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase-read');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function getCurrentSupabaseUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') return Promise.resolve(null);
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function toRemoteStatus(value) {
    var status = normalizeStatus(value);
    if (status === 'pending') return 'requested';
    if (status === 'quoted') return 'quoted';
    if (status === 'accepted') return 'accepted';
    if (status === 'in_progress') return 'in_progress';
    if (status === 'completed') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    if (status === 'disputed') return 'disputed';
    return 'draft';
  }

  function mapRemoteRow(row, budgetRow) {
    row = row || {};
    budgetRow = budgetRow || null;
    var metadata = row.metadata && typeof row.metadata === 'object' ? clone(row.metadata) : {};
    var budgetAmount = budgetRow && Number.isFinite(Number(budgetRow.amount_cents))
      ? Number(budgetRow.amount_cents) / 100
      : Number(metadata.budgetAmount || 0);
    return normalizeOrder(Object.assign({}, metadata, {
      id: row.external_id || metadata.id || row.id,
      remoteId: row.id,
      clientId: row.client_id,
      professionalId: row.professional_id || metadata.professionalId,
      providerId: row.professional_id || metadata.providerId,
      remoteServiceId: row.service_id || '',
      title: row.title || metadata.title,
      description: row.description == null ? metadata.description : row.description,
      status: row.status,
      city: row.city || metadata.city,
      state: row.state || metadata.state,
      scheduleReservationId: row.schedule_reservation_id || '',
      scheduledAt: row.scheduled_at || '',
      createdAt: row.created_at || metadata.createdAt,
      updatedAt: row.updated_at || metadata.updatedAt,
      syncStatus: 'synced',
      budgetAmount: budgetAmount || null,
      budget: budgetAmount > 0 ? toCurrencyLabel(budgetAmount) : (metadata.budget || 'A definir'),
      budgetRecord: budgetRow ? clone(budgetRow) : null,
      syncedAt: new Date().toISOString()
    }));
  }

  function hydrateAttachmentUrls(order) {
    var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
    if (!order || !attachmentRepository || typeof attachmentRepository.resolveUrls !== 'function') return Promise.resolve(order);
    return attachmentRepository.resolveUrls(order.attachments || []).then(function (attachments) {
      return normalizeOrder(Object.assign({}, order, { attachments: attachments }));
    }).catch(function () { return order; });
  }

  function fetchRemoteBudgetMap(client, orderIds) {
    var ids = (orderIds || []).filter(Boolean);
    if (!ids.length) return Promise.resolve(Object.create(null));
    return client.from('budgets')
      .select('id,order_id,professional_id,amount_cents,currency,description,status,valid_until,created_at,updated_at')
      .in('order_id', ids)
      .order('created_at', { ascending: false })
      .then(function (result) {
        if (result.error) throw result.error;
        return (result.data || []).reduce(function (map, row) {
          if (!map[row.order_id]) map[row.order_id] = row;
          return map;
        }, Object.create(null));
      });
  }

  function fetchRemoteOrders() {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return [];
      return client.from(REMOTE_TABLE).select('*').order('created_at', { ascending: false }).then(function (result) {
        if (result.error) throw result.error;
        var rows = result.data || [];
        return fetchRemoteBudgetMap(client, rows.map(function (row) { return row.id; })).then(function (budgetMap) {
          setProviderState('supabase-read');
          return Promise.all(rows.map(function (row) {
            return hydrateAttachmentUrls(mapRemoteRow(row, budgetMap[row.id] || null));
          }));
        });
      });
    });
  }

  function fetchRemoteOrderById(orderId) {
    var client = getSupabaseClient();
    var id = normalizeText(orderId);
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    if (!id) return Promise.resolve(null);
    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) return null;
      var query = client.from(REMOTE_TABLE).select('*');
      query = isUuid(id) ? query.eq('id', id) : query.eq('external_id', id);
      return query.maybeSingle().then(function (result) {
        if (result.error) throw result.error;
        if (!result.data) return null;
        return fetchRemoteBudgetMap(client, [result.data.id]).then(function (budgetMap) {
          setProviderState('supabase-read');
          return hydrateAttachmentUrls(mapRemoteRow(result.data, budgetMap[result.data.id] || null));
        });
      });
    });
  }

  function resolveRemoteServiceId(client, serviceId) {
    var id = normalizeText(serviceId);
    if (!id) return Promise.resolve(null);
    if (isUuid(id)) return Promise.resolve(id);
    return client.from('services').select('id').eq('external_id', id).maybeSingle().then(function (result) {
      if (result.error) throw result.error;
      return result.data && result.data.id || null;
    });
  }

  function sanitizeMetadata(order) {
    var metadata = clone(normalizeOrder(order));
    var attachmentRepository = Doke.repositories && Doke.repositories.attachments;
    if (attachmentRepository && typeof attachmentRepository.toPersistedMetadata === 'function') {
      metadata.attachments = attachmentRepository.toPersistedMetadata(metadata.attachments || []);
    }
    delete metadata.remoteId;
    delete metadata.syncError;
    return metadata;
  }

  function commandBoundaryError(operation) {
    var error = new Error('Pedidos enviados devem usar o command boundary canônico.');
    error.code = 'DOKE_ORDER_COMMAND_BOUNDARY_REQUIRED';
    error.operation = operation || 'write';
    return error;
  }

  function saveRemote() {
    return Promise.reject(commandBoundaryError('save'));
  }

  function synchronizePending(items) {
    // Legacy pending snapshots are never replayed automatically. A remote
    // failure must be surfaced by the command caller instead of becoming
    // an eventual local success.
    return Promise.resolve(items || []);
  }

  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));
    var policy = getProviderPolicy();
    if (policy.mockDevelopmentActive) return loadLocal(options);
    if (!policy.remoteReadActive) return Promise.reject(readAuthorityError());
    var client = getSupabaseClient();
    if (!client) return Promise.reject(readAuthorityError('Cliente Supabase de pedidos indisponível.'));
    var localDrafts = readLocal().filter(function (item) {
      return normalizeStatus(item && item.status) === 'draft' || item && item.syncStatus === 'local-draft';
    });
    return fetchRemoteOrders().then(function (remote) {
      lastRemoteError = null;
      cache = mergeById(localDrafts, remote);
      return clone(cache);
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      throw error;
    });
  }

  function save(order) {
    var normalized = normalizeOrder(order);
    if (normalizeStatus(normalized.status) !== 'draft') {
      return Promise.reject(commandBoundaryError('save'));
    }
    return saveLocal(normalized, 'local-draft');
  }

  function saveMock(order) {
    assertMockDevelopment('saveMock');
    return saveLocal(normalizeOrder(order), 'mock');
  }

  function remove(orderId) {
    var id = normalizeText(orderId);
    var draft = readLocal().find(function (item) {
      return String(item.id) === id && (normalizeStatus(item.status) === 'draft' || item.syncStatus === 'local-draft');
    });
    if (!draft) return Promise.reject(commandBoundaryError('remove'));
    return removeLocal(id);
  }

  function removeMock(orderId) {
    assertMockDevelopment('removeMock');
    return removeLocal(orderId);
  }

  function list(filters) {
    filters = filters || {};
    var status = normalizeText(filters.status || '');
    var clientId = normalizeText(filters.clientId || '');
    var professionalId = normalizeText(filters.professionalId || filters.providerId || '');
    var serviceId = normalizeText(filters.serviceId || '');
    var currentUser = filters.currentUser === false ? null : getSessionUser();

    return load(filters).then(function (items) {
      return clone((items || []).filter(function (item) {
        if (status && item.status !== status) return false;
        if (clientId && item.clientId !== clientId) return false;
        if (professionalId && String(item.professionalId || item.providerId) !== professionalId) return false;
        if (serviceId && item.serviceId !== serviceId) return false;
        if (filters.currentUser !== false && !matchesCurrentUser(item, currentUser)) return false;
        return true;
      }));
    });
  }

  function listLocal(filters) {
    filters = filters || {};
    var currentUser = filters.currentUser === false ? null : getSessionUser();
    var policy = getProviderPolicy();
    var source = readLocal().filter(function (item) {
      return policy.mockDevelopmentActive
        || normalizeStatus(item && item.status) === 'draft'
        || item && item.syncStatus === 'local-draft';
    });
    return clone(source.filter(function (item) {
      if (filters.currentUser !== false && !matchesCurrentUser(item, currentUser)) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    }));
  }

  function getById(orderId) {
    var id = normalizeText(orderId);
    var policy = getProviderPolicy();
    if (!id) return Promise.resolve(null);
    if (policy.remoteReadActive) return fetchRemoteOrderById(id);
    if (!policy.mockDevelopmentActive) return Promise.reject(readAuthorityError());
    return loadLocal({ currentUser: false }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === id; }) || null);
    });
  }

  function saveLocal(order, syncStatus) {
    var normalized = normalizeOrder(Object.assign({}, order, { syncStatus: syncStatus || order.syncStatus || 'local' }));
    var local = readLocal().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.unshift(normalized);
    writeLocal(local);
    return Promise.resolve(clone(normalized));
  }

  function removeLocal(orderId) {
    var id = normalizeText(orderId);
    if (!id) return Promise.resolve(false);
    var next = readLocal().filter(function (item) { return String(item.id) !== id; });
    writeLocal(next);
    return Promise.resolve(true);
  }

  repositories.orders = Object.freeze({
    storageKey: STORAGE_KEY,
    legacyStorageKey: LEGACY_STORAGE_KEY,
    normalize: normalizeOrder,
    normalizeStatus: normalizeStatus,
    deriveScheduleAuthority: deriveScheduleAuthority,
    readLocal: readLocal,
    listLocal: listLocal,
    load: load,
    list: list,
    getById: getById,
    save: save,
    saveMock: saveMock,
    remove: remove,
    removeMock: removeMock,
    writeLocal: writeLocal,
    clearLocal: function () { writeLocal([]); },
    syncPending: function () { return synchronizePending(readLocal()); },
    getProviderStatus: function () {
      var policy = getProviderPolicy();
      return Object.freeze({
        provider: policy.remoteReadActive ? 'supabase-read' : policy.mockDevelopmentActive ? 'mock-development' : 'blocked',
        remoteReadActive: policy.remoteReadActive,
        mockDevelopmentActive: policy.mockDevelopmentActive,
        fallbackActive: false,
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''
      });
    },
    clearCache: function () { cache = null; }
  });
})();
