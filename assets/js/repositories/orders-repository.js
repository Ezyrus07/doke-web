/* Doke Orders Repository
   Responsibility: local/mock persistence boundary for order entities.
   Backend migration rule: pages/services must call this repository instead of localStorage directly. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});

  var STORAGE_KEY = 'doke.orders.local.v1';
  var LEGACY_STORAGE_KEY = 'doke.orders';
  var FALLBACK_URL = 'assets/data/mock-orders.json';
  var cache = null;

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
    if (typeof raw === 'string') {
      return {
        name: raw,
        type: '',
        size: 0,
        url: '',
        previewable: false
      };
    }

    if (typeof raw !== 'object') return null;
    return {
      name: normalizeText(raw.name || raw.filename || 'anexo'),
      type: normalizeText(raw.type || raw.mimeType || ''),
      size: Number(raw.size) || 0,
      url: compactDataUrl(raw.url || raw.dataUrl || raw.preview || ''),
      previewable: Boolean(raw.previewable || raw.url || raw.dataUrl || raw.preview) && Boolean(compactDataUrl(raw.url || raw.dataUrl || raw.preview || '')),
      tooLarge: Boolean(raw.tooLarge),
      error: Boolean(raw.error)
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
      in_progress: 'Em andamento',
      completed: 'Concluído',
      cancelled: 'Cancelado',
      disputed: 'Em disputa',
      conversation: 'Pedido aceito',
      responded: 'Respondido'
    };
    return labels[normalizedStatus] || 'Aguardando resposta';
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

    return Object.assign({}, raw, {
      id: normalizeText(raw.id) || makeId(),
      clientId: raw.clientId || '',
      clientName: raw.clientName || raw.customerName || 'Cliente Doke',
      clientInitials: raw.clientInitials || raw.customerInitials || 'CL',
      professionalId: raw.professionalId || raw.providerId || '',
      providerId: raw.providerId || raw.professionalId || '',
      serviceId: raw.serviceId || '',
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
      statusLabel: statusLabel,
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

  function load(options) {
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
    return clone(readLocal().filter(function (item) {
      if (filters.currentUser !== false && !matchesCurrentUser(item, currentUser)) return false;
      if (filters.status && item.status !== filters.status) return false;
      return true;
    }));
  }

  function getById(orderId) {
    var id = normalizeText(orderId);
    if (!id) return Promise.resolve(null);
    return load({ currentUser: false }).then(function (items) {
      return clone((items || []).find(function (item) { return String(item.id) === id; }) || null);
    });
  }

  function save(order) {
    var normalized = normalizeOrder(order);
    var local = readLocal().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.unshift(normalized);
    writeLocal(local);
    return Promise.resolve(clone(normalized));
  }

  function remove(orderId) {
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
    readLocal: readLocal,
    listLocal: listLocal,
    load: load,
    list: list,
    getById: getById,
    save: save,
    remove: remove,
    writeLocal: writeLocal,
    clearLocal: function () { writeLocal([]); }
  });
})();
