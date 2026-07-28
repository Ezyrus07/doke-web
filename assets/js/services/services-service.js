/* Doke Services Service
   Responsibility: business-facing API for service discovery and detail routing. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var services = Doke.services || (Doke.services = {});
  var mediaUploadServicePromise = null;

  var STATUS = Object.freeze({
    DRAFT: 'draft',
    ACTIVE: 'active',
    INACTIVE: 'inactive',
    ARCHIVED: 'archived'
  });

  var MODERATION_STATUS = Object.freeze({
    DRAFT: 'draft',
    PENDING_REVIEW: 'pending_review',
    PUBLISHED: 'published',
    CHANGES_PENDING_REVIEW: 'changes_pending_review',
    CHANGES_REQUIRED: 'changes_required',
    REJECTED: 'rejected',
    SUSPENDED: 'suspended'
  });

  var ALLOWED_TRANSITIONS = Object.freeze({
    draft: Object.freeze(['active', 'archived']),
    active: Object.freeze(['inactive', 'archived']),
    inactive: Object.freeze(['active', 'archived']),
    archived: Object.freeze([])
  });

  function getRepository() {
    return Doke.repositories && Doke.repositories.services;
  }

  function assertRepository() {
    var repository = getRepository();
    if (!repository) throw new Error('Services Repository não foi carregado.');
    return repository;
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeSearch(value) {
    return normalizeText(value).toLowerCase();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function isRemoteService(service) {
    service = service || {};
    return [service.id, service.remoteId, service.remote_id, service.ownerId, service.professionalId, service.providerId]
      .some(isUuid);
  }

  function usesRemoteAuthority(repository, service) {
    if (isRemoteService(service)) return true;
    if (!repository || typeof repository.getProviderStatus !== 'function') return false;
    try {
      return repository.getProviderStatus().provider === 'supabase';
    } catch (error) {
      return false;
    }
  }

  function getMediaUploadService() {
    return Doke.services && Doke.services.serviceMediaUploads || null;
  }

  function ensureMediaUploadService() {
    var current = getMediaUploadService();
    if (current && typeof current.submitForReview === 'function') return Promise.resolve(current);
    if (mediaUploadServicePromise) return mediaUploadServicePromise;
    if (!root.document || typeof root.document.createElement !== 'function') {
      return Promise.reject(new Error('A autoridade de upload assinado de mídia não foi carregada.'));
    }

    mediaUploadServicePromise = new Promise(function (resolve, reject) {
      var existing = root.document.querySelector && root.document.querySelector('script[data-doke-service-media-upload-authority]');
      var script = existing || root.document.createElement('script');
      var settled = false;
      var complete = function () {
        if (settled) return;
        settled = true;
        var authority = getMediaUploadService();
        if (!authority || typeof authority.submitForReview !== 'function') {
          mediaUploadServicePromise = null;
          reject(new Error('A autoridade de upload assinado de mídia não ficou disponível.'));
          return;
        }
        resolve(authority);
      };
      var fail = function () {
        if (settled) return;
        settled = true;
        mediaUploadServicePromise = null;
        reject(new Error('Não foi possível carregar a autoridade de upload assinado de mídia.'));
      };

      script.addEventListener('load', complete, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = 'assets/js/services/service-media-upload-service.js';
        script.async = true;
        script.setAttribute('data-doke-service-media-upload-authority', 'true');
        (root.document.head || root.document.documentElement).appendChild(script);
      } else {
        root.setTimeout(function () {
          if (getMediaUploadService()) complete();
          else fail();
        }, 0);
      }
    });
    return mediaUploadServicePromise;
  }

  function submitFixtureForReview(repository, service) {
    if (!repository || typeof repository.save !== 'function') {
      return Promise.reject(new Error('A autoridade de fixture do catálogo não está disponível.'));
    }
    var now = new Date().toISOString();
    return Promise.resolve(repository.save(Object.assign({}, service || {}, {
      status: STATUS.DRAFT,
      moderationStatus: MODERATION_STATUS.PENDING_REVIEW,
      syncStatus: 'fixture-memory',
      pendingVersionId: '',
      reviewSubmittedAt: now,
      updatedAt: now
    })));
  }

  function submitThroughCanonicalAuthority(repository, service, options) {
    if (!usesRemoteAuthority(repository, service)) {
      return submitFixtureForReview(repository, service);
    }
    return ensureMediaUploadService().then(function (authority) {
      return authority.submitForReview(service, options || {}, repository);
    });
  }

  function list(filters) {
    return assertRepository().list(filters || {});
  }

  function featured(limit) {
    return list({ verified: true, limit: Number(limit || 6) });
  }

  function getById(serviceId) {
    return assertRepository().getById(serviceId);
  }

  function currentUser() {
    return Doke.session && typeof Doke.session.getCurrentUser === 'function'
      ? Doke.session.getCurrentUser()
      : null;
  }

  function submitForReview(payload, options) {
    options = options || {};
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') {
      return Promise.reject(new Error('A autoridade de acesso profissional não foi carregada.'));
    }
    return access.assert(action).then(function (result) {
      var repository = assertRepository();
      var actor = result.user || currentUser() || {};
      var professionalProfile = result.professionalProfile || {};
      var now = new Date().toISOString();
      var service = Object.assign({}, payload || {}, {
        ownerId: actor.id || '',
        professionalId: actor.id || '',
        providerId: actor.id || '',
        professionalProfileId: professionalProfile.id || payload && payload.professionalProfileId || '',
        providerName: actor.name || actor.displayName || payload && payload.providerName || 'Profissional Doke',
        providerHandle: actor.handle || actor.username || payload && (payload.providerHandle || payload.providerUsername) || '',
        providerUsername: actor.handle || actor.username || payload && (payload.providerUsername || payload.providerHandle) || '',
        providerInitials: actor.initials || actor.avatarInitials || payload && payload.providerInitials || 'DK',
        verified: result.verification && result.verification.status === 'verified',
        status: payload && payload.approvedVersionId ? payload.status || STATUS.ACTIVE : STATUS.DRAFT,
        moderationStatus: payload && payload.approvedVersionId ? MODERATION_STATUS.CHANGES_PENDING_REVIEW : MODERATION_STATUS.PENDING_REVIEW,
        createdAt: payload && payload.createdAt || now,
        updatedAt: now
      });
      return submitThroughCanonicalAuthority(repository, service, options);
    });
  }

  function create(payload) {
    return submitForReview(payload, { editMode: false, changeClass: 'critical' });
  }

  function getOwnedReviewDraft(serviceId) {
    var repository = assertRepository();
    if (typeof repository.getOwnedReviewDraft !== 'function') return getById(serviceId);
    return repository.getOwnedReviewDraft(serviceId);
  }

  function listByProfessional(professionalId, filters) {
    var repository = assertRepository();
    if (typeof repository.listByProfessional === 'function') {
      return repository.listByProfessional(professionalId, filters || {});
    }
    return repository.list(Object.assign({}, filters || {}, { ownerId: professionalId }));
  }

  function normalizeStatus(value) {
    var status = normalizeText(value).toLowerCase();
    return Object.prototype.hasOwnProperty.call(ALLOWED_TRANSITIONS, status) ? status : STATUS.ACTIVE;
  }

  function canTransition(fromStatus, toStatus) {
    var from = normalizeStatus(fromStatus);
    var to = normalizeStatus(toStatus);
    return from === to || ALLOWED_TRANSITIONS[from].indexOf(to) !== -1;
  }

  function assertOwned(current, actor) {
    var ownerId = String(current && (current.ownerId || current.professionalId || current.providerId) || '');
    var actorId = String(actor && actor.id || '');
    if (!ownerId || !actorId || ownerId !== actorId) throw new Error('Você não pode alterar este serviço.');
    return current;
  }

  function lifecycleActionForStatus(status) {
    if (status === STATUS.INACTIVE) return 'pause';
    if (status === STATUS.ACTIVE) return 'reactivate';
    if (status === STATUS.ARCHIVED) return 'archive';
    return '';
  }

  function transitionOwned(serviceId, nextStatus) {
    var status = normalizeStatus(nextStatus);
    return Promise.all([
      Doke.services.professionalAccess.assert((Doke.services.professionalAccess.ACTIONS && Doke.services.professionalAccess.ACTIONS.PUBLISH_SERVICE) || 'publish_service'),
      getById(serviceId)
    ]).then(function (items) {
      var accessResult = items[0];
      var current = assertOwned(items[1], accessResult.user || currentUser());
      var currentStatus = normalizeStatus(current.status);
      if (!canTransition(currentStatus, status)) throw new Error('Transição de status inválida para este anúncio.');
      if (currentStatus === status) return current;
      var repository = assertRepository();
      var action = lifecycleActionForStatus(status);
      if (!action) throw new Error('Ação de ciclo de vida indisponível.');
      if (isRemoteService(current)) {
        if (typeof repository.transitionOwnedLifecycle !== 'function') throw new Error('Autoridade server-side de ciclo de vida indisponível.');
        return repository.transitionOwnedLifecycle(serviceId, action);
      }
      if (typeof repository.update !== 'function') throw new Error('Atualização de fixture indisponível.');
      return repository.update(serviceId, { status: status, statusChangedAt: new Date().toISOString() });
    });
  }

  function updateOwned(serviceId, patch) {
    var access = Doke.services && Doke.services.professionalAccess;
    var action = access && access.ACTIONS && access.ACTIONS.PUBLISH_SERVICE || 'publish_service';
    if (!access || typeof access.assert !== 'function') return Promise.reject(new Error('A autoridade de acesso profissional não foi carregada.'));
    patch = patch || {};
    return Promise.all([access.assert(action), getById(serviceId)]).then(function (items) {
      var result = items[0];
      var current = items[1];
      if (!current) throw new Error('Serviço não encontrado.');
      assertOwned(current, result.user || currentUser());

      if (Object.prototype.hasOwnProperty.call(patch, 'status')) {
        var contentKeys = Object.keys(patch).filter(function (key) { return key !== 'status' && key !== 'statusChangedAt'; });
        if (contentKeys.length) {
          var splitError = new Error('Edição de conteúdo e transição de status devem ser operações separadas.');
          splitError.code = 'DOKE_SERVICE_MUTATION_SPLIT_REQUIRED';
          throw splitError;
        }
        return transitionOwned(serviceId, patch.status);
      }

      if (normalizeStatus(current.status) === STATUS.ARCHIVED) {
        var archivedError = new Error('Serviço arquivado não pode ser editado.');
        archivedError.code = 'DOKE_SERVICE_ARCHIVED';
        throw archivedError;
      }

      var repository = assertRepository();
      if (!isRemoteService(current)) {
        if (typeof repository.update !== 'function') throw new Error('Edição de fixture indisponível.');
        return repository.update(serviceId, patch);
      }
      var candidate = Object.assign({}, current, patch, {
        id: current.id || serviceId,
        externalId: current.externalId || current.id || serviceId,
        status: current.status,
        updatedAt: new Date().toISOString()
      });
      return submitThroughCanonicalAuthority(repository, candidate, { editMode: true, changeClass: 'major' });
    });
  }

  function deactivateOwned(serviceId) { return transitionOwned(serviceId, STATUS.INACTIVE); }
  function reactivateOwned(serviceId) { return transitionOwned(serviceId, STATUS.ACTIVE); }
  function archiveOwned(serviceId) { return transitionOwned(serviceId, STATUS.ARCHIVED); }

  function getDetailUrl(serviceOrId) {
    var serviceId = typeof serviceOrId === 'object' ? serviceOrId && serviceOrId.id : serviceOrId;
    var id = normalizeText(serviceId);
    return id ? 'detalhe-anuncio.html?id=' + encodeURIComponent(id) : 'detalhe-anuncio.html';
  }

  function getBudgetUrl(serviceOrId) {
    var service = typeof serviceOrId === 'object' ? serviceOrId : null;
    var serviceId = service ? service.id : serviceOrId;
    var id = normalizeText(serviceId);
    var params = new URLSearchParams();
    if (id) params.set('serviceId', id);
    if (service && service.professionalId) params.set('professionalId', service.professionalId);
    return 'orcamento.html' + (params.toString() ? '?' + params.toString() : '');
  }

  function getFromUrl(params) {
    params = params || new URLSearchParams(root.location.search || '');
    return normalizeText(params.get('id') || params.get('serviceId') || params.get('servico'));
  }

  function fromLocationSearch() {
    var params = new URLSearchParams(root.location.search || '');
    return list({
      query: params.get('q') || params.get('busca') || params.get('query') || '',
      category: params.get('categoria') || params.get('category') || '',
      city: params.get('cidade') || params.get('city') || '',
      state: params.get('estado') || params.get('state') || ''
    });
  }

  function search(filters) {
    filters = filters || {};
    var query = normalizeSearch(filters.query || filters.q || filters.search || '');
    if (!query) return list(filters);

    return list(filters).then(function (items) {
      return (items || []).sort(function (a, b) {
        var aText = normalizeSearch([a.title, a.category, a.providerName, a.location, (a.tags || []).join(' '), (a.keywords || []).join(' ')].join(' '));
        var bText = normalizeSearch([b.title, b.category, b.providerName, b.location, (b.tags || []).join(' '), (b.keywords || []).join(' ')].join(' '));
        var aScore = aText.indexOf(query) === -1 ? 0 : 1;
        var bScore = bText.indexOf(query) === -1 ? 0 : 1;
        return bScore - aScore || (Number(b.rating) || 0) - (Number(a.rating) || 0);
      });
    });
  }

  services.services = Object.freeze({
    list: list,
    featured: featured,
    search: search,
    getById: getById,
    getOwnedReviewDraft: getOwnedReviewDraft,
    create: create,
    submitForReview: submitForReview,
    listByProfessional: listByProfessional,
    updateOwned: updateOwned,
    deactivateOwned: deactivateOwned,
    reactivateOwned: reactivateOwned,
    archiveOwned: archiveOwned,
    transitionOwned: transitionOwned,
    canTransition: canTransition,
    STATUS: STATUS,
    MODERATION_STATUS: MODERATION_STATUS,
    getFromUrl: getFromUrl,
    getDetailUrl: getDetailUrl,
    getBudgetUrl: getBudgetUrl,
    fromLocationSearch: fromLocationSearch
  });
})();