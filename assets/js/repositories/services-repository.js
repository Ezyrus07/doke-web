/* Doke Services Repository
   Responsibility: canonical persistence boundary for service listings.
   Production path: Supabase (shared across users/devices).
   Development fallback: localStorage, with best-effort remote synchronization. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STORAGE_KEY = 'doke.services.local.v1';
  var PROVIDER_ATTRIBUTE = 'data-doke-services-provider';
  var REMOTE_TABLE = 'services';
  var REMOTE_MEDIA_TABLE = 'service_media';
  var REMOTE_MEDIA_BUCKET = 'service-media';
  var REMOTE_METRIC_EVENTS_TABLE = 'service_metric_events';
  var REMOTE_METRIC_TOTALS_VIEW = 'service_metric_totals';
  var METRIC_VISITOR_STORAGE_KEY = 'doke.service-metrics.visitor.v1';
  var cache = null;
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

  function normalizeSearch(value) {
    return normalizeText(value).toLowerCase();
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function slugify(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64) || 'servico';
  }

  function setProviderState(provider) {
    try {
      document.documentElement.setAttribute(PROVIDER_ATTRIBUTE, provider);
    } catch (error) {
      // Non-browser test environments may not expose documentElement.
    }
  }

  function warnRemote(error, context) {
    lastRemoteError = error || new Error('Falha desconhecida no catálogo remoto.');
    setProviderState('local-fallback');
    if (root.console && typeof root.console.warn === 'function') {
      root.console.warn('[Doke services repository] Supabase indisponível em ' + context + '. Usando fallback local.', error);
    }
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;

    var config = root.DOKE_SUPABASE_CONFIG || {};
    var sdk = root.supabase;
    if (!config.enabled || config.servicesEnabled === false || !config.url || !config.anonKey) {
      supabaseClientAttempted = true;
      setProviderState('local');
      return null;
    }

    // The SDK is loaded asynchronously so a slow CDN can never hold the home
    // skeleton hostage. Do not permanently lock the repository in local mode;
    // retry after the SDK-ready lifecycle event.
    if (!sdk || typeof sdk.createClient !== 'function') {
      setProviderState('local');
      return null;
    }
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;

    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : sdk.createClient(config.url, config.anonKey);
      setProviderState('supabase');
    } catch (error) {
      warnRemote(error, 'bootstrap');
      supabaseClient = null;
    }
    return supabaseClient;
  }

  function readLocalServices() {
    try {
      var raw = root.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocalServices(items) {
    try {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
    } catch (error) {
      // localStorage can be unavailable in restricted contexts; repository remains readable.
    }
  }

  function toPublicStatus(value) {
    var status = normalizeSearch(value);
    if (status === 'published') return 'active';
    if (status === 'paused') return 'inactive';
    if (status === 'removed') return 'archived';
    return status || 'active';
  }

  function toRemoteStatus(value) {
    var status = normalizeSearch(value);
    if (status === 'active') return 'published';
    if (status === 'inactive') return 'paused';
    if (status === 'archived') return 'archived';
    if (status === 'draft') return 'draft';
    return 'published';
  }

  function toRemotePriceMode(value) {
    var mode = normalizeSearch(value);
    if (mode === 'fixed' || mode === 'preco_fixo' || mode === 'preço fixo') return 'fixed';
    if (mode === 'from' || mode === 'starting_at' || mode === 'a_partir' || mode === 'a partir de') return 'from';
    return 'quote';
  }

  function toPriceCents(service) {
    var value = service.priceValue;
    if (value == null && typeof service.price === 'number') value = service.price;
    if (typeof value === 'string') {
      value = Number(value.replace(/[^0-9,.-]/g, '').replace('.', '').replace(',', '.'));
    }
    return Number.isFinite(Number(value)) ? Math.max(0, Math.round(Number(value) * 100)) : null;
  }

  function normalizeService(service) {
    service = service || {};
    var price = service.price;
    var priceLabel = service.priceLabel || service.price;
    var category = service.category || service.catégory || 'Serviço';
    var state = service.state || service.staté || '';
    var city = service.city || '';
    var location = service.location || [city, state].filter(Boolean).join(', ');
    var providerId = service.ownerId || service.professionalId || service.providerId || '';
    var professionalProfileId = normalizeText(service.professionalProfileId || service.profileId);
    var id = normalizeText(service.id || service.externalId || service.external_id);

    return Object.assign({}, service, {
      id: id,
      externalId: id,
      kind: service.kind || 'service',
      status: toPublicStatus(service.status || 'active'),
      category: category,
      catégory: category,
      state: state,
      staté: state,
      city: city,
      location: location,
      ownerId: providerId,
      providerId: providerId,
      professionalId: providerId,
      professionalProfileId: professionalProfileId,
      providerName: service.providerName || service.professionalName || 'Profissional Doke',
      providerHandle: service.providerHandle || service.providerUsername || service.professionalHandle || service.professionalUsername || service.handle || service.username || '',
      providerUsername: service.providerUsername || service.providerHandle || service.professionalUsername || service.professionalHandle || service.username || service.handle || '',
      providerInitials: service.providerInitials || service.avatar || 'DK',
      price: typeof price === 'number' ? price : service.priceValue || price,
      priceValue: service.priceValue || (typeof price === 'number' ? price : null),
      priceLabel: typeof priceLabel === 'string' ? priceLabel : service.priceLabel,
      reviewsCount: Number(service.reviewsCount || service.reviews || 0) || 0,
      reviews: service.reviewsLabel || service.reviews || ((Number(service.reviewsCount) || 0) + ' avaliações'),
      href: service.href || (id ? 'detalhe-anuncio.html?id=' + encodeURIComponent(id) : 'detalhe-anuncio.html'),
      tags: Array.isArray(service.tags) ? service.tags : [],
      keywords: Array.isArray(service.keywords) ? service.keywords : [],
      images: Array.isArray(service.images) ? service.images : (service.image ? [service.image] : [])
    });
  }

  function mergeById(primary, secondary) {
    var map = Object.create(null);
    (primary || []).concat(secondary || []).forEach(function (item) {
      var normalized = normalizeService(item);
      if (!normalized.id) return;
      map[normalized.id] = Object.assign({}, map[normalized.id] || {}, normalized);
    });
    return Object.keys(map).map(function (id) { return map[id]; });
  }

  function serviceIdentifiers(service) {
    service = service || {};
    var identifiers = [
      service.id,
      service.externalId,
      service.external_id,
      service.remoteId,
      service.remote_id
    ].map(normalizeText).filter(Boolean);

    var href = normalizeText(service.href);
    if (href) {
      try {
        var parsed = new URL(href, root.location && root.location.href || 'https://doke.local/');
        identifiers.push(normalizeText(parsed.searchParams.get('id') || parsed.searchParams.get('serviceId') || parsed.searchParams.get('servico')));
      } catch (error) {}
    }

    return identifiers.filter(Boolean);
  }

  function matchesServiceId(service, serviceId) {
    var id = normalizeText(serviceId);
    if (!id) return false;
    return serviceIdentifiers(service).some(function (candidate) { return candidate === id; });
  }

  function mapRemoteRow(row) {
    row = row || {};
    var metadata = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    var media = Array.isArray(row.service_media) ? row.service_media.slice() : [];
    media.sort(function (a, b) { return Number(a.sort_order || 0) - Number(b.sort_order || 0); });
    var images = media.map(function (item) { return item.url; }).filter(Boolean);
    var externalId = normalizeText(row.external_id || metadata.id || row.id);
    var priceValue = row.price_cents == null ? null : Number(row.price_cents) / 100;

    return normalizeService(Object.assign({}, metadata, {
      id: externalId,
      externalId: externalId,
      external_id: externalId,
      remoteId: row.id,
      slug: row.slug || metadata.slug,
      ownerId: row.professional_id,
      professionalId: row.professional_id,
      providerId: row.professional_id,
      title: row.title || metadata.title,
      description: row.description || metadata.description,
      status: toPublicStatus(row.status),
      priceMode: row.price_mode || metadata.priceMode,
      priceValue: priceValue == null ? metadata.priceValue : priceValue,
      price: priceValue == null ? metadata.price : priceValue,
      city: row.city || metadata.city,
      state: row.state || metadata.state,
      images: images.length ? images : metadata.images,
      createdAt: row.created_at || metadata.createdAt,
      updatedAt: row.updated_at || metadata.updatedAt,
      syncedAt: new Date().toISOString(),
      syncStatus: 'synced'
    }));
  }

  function getCurrentSupabaseUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') return Promise.resolve(null);
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function fetchRemoteServices() {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));

    return Promise.resolve(client
      .from(REMOTE_TABLE)
      .select('*, service_media(id,url,thumbnail_url,alt_text,sort_order,media_type)'))
      .then(function (result) {
        if (result.error) throw result.error;
        setProviderState('supabase');
        lastRemoteError = null;
        return (result.data || []).map(mapRemoteRow);
      });
  }

  function fetchRemoteServiceById(serviceId) {
    var id = normalizeText(serviceId);
    var client = getSupabaseClient();
    if (!id || !client) return Promise.resolve(null);

    var select = '*, service_media(id,url,thumbnail_url,alt_text,sort_order,media_type)';
    var byExternalId = function () {
      return Promise.resolve(client.from(REMOTE_TABLE).select(select).eq('external_id', id).maybeSingle());
    };
    var byRemoteId = function () {
      if (!isUuid(id)) return Promise.resolve({ data: null, error: null });
      return Promise.resolve(client.from(REMOTE_TABLE).select(select).eq('id', id).maybeSingle());
    };

    return byExternalId().then(function (result) {
      if (result.error) throw result.error;
      if (result.data) return result.data;
      return byRemoteId().then(function (remoteResult) {
        if (remoteResult.error) throw remoteResult.error;
        return remoteResult.data || null;
      });
    }).then(function (row) {
      setProviderState('supabase');
      lastRemoteError = null;
      return row ? mapRemoteRow(row) : null;
    });
  }

  function upsertLocal(service, syncStatus) {
    var normalized = normalizeService(Object.assign({}, service, {
      syncStatus: syncStatus || service.syncStatus || 'local',
      updatedAt: service.updatedAt || new Date().toISOString()
    }));
    var local = readLocalServices().filter(function (item) { return String(item.id) !== String(normalized.id); });
    local.push(normalized);
    writeLocalServices(local);
    cache = null;
    return normalized;
  }

  function removeLocal(serviceId) {
    var id = normalizeText(serviceId);
    writeLocalServices(readLocalServices().filter(function (item) { return String(item.id) !== id; }));
    cache = null;
  }

  function sanitizeMetadata(service) {
    var metadata = clone(normalizeService(service));
    metadata.images = [];
    delete metadata.image;
    delete metadata.remoteId;
    delete metadata.syncError;
    return metadata;
  }

  function dataUrlToBlob(value) {
    var match = /^data:([^;,]+)?(;base64)?,(.*)$/i.exec(String(value || ''));
    if (!match) return null;
    var mime = match[1] || 'application/octet-stream';
    var encoded = match[3] || '';
    var binary = match[2] ? root.atob(encoded) : decodeURIComponent(encoded);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mime });
  }

  function extensionFromMime(mime) {
    var normalized = normalizeSearch(mime).split('/').pop().replace(/[^a-z0-9]/g, '');
    if (normalized === 'jpeg') return 'jpg';
    return normalized || 'bin';
  }

  function uploadServiceImages(client, userId, service) {
    var images = Array.isArray(service.images) ? service.images.filter(Boolean) : [];
    if (!images.length || !client.storage || typeof client.storage.from !== 'function') return Promise.resolve(images);

    return images.reduce(function (chain, image, index) {
      return chain.then(function (uploaded) {
        if (!/^data:/i.test(String(image))) {
          uploaded.push(image);
          return uploaded;
        }
        var blob = dataUrlToBlob(image);
        if (!blob) throw new Error('Imagem do anúncio inválida.');
        var safeServiceId = normalizeText(service.id).replace(/[^a-z0-9_-]/gi, '-').slice(0, 96);
        var objectPath = userId + '/' + safeServiceId + '/' + String(index + 1).padStart(2, '0') + '.' + extensionFromMime(blob.type);
        var bucket = client.storage.from(REMOTE_MEDIA_BUCKET);
        return bucket.upload(objectPath, blob, {
          upsert: true,
          contentType: blob.type,
          cacheControl: '3600'
        }).then(function (result) {
          if (result.error) throw result.error;
          var publicResult = bucket.getPublicUrl(objectPath);
          var publicUrl = publicResult && publicResult.data && publicResult.data.publicUrl;
          if (!publicUrl) throw new Error('Supabase Storage não retornou a URL pública da imagem.');
          uploaded.push(publicUrl);
          return uploaded;
        });
      });
    }, Promise.resolve([]));
  }

  function buildRemotePayload(service, userId) {
    var normalized = normalizeService(service);
    var suffix = normalized.id.replace(/[^a-z0-9]/gi, '').slice(-10).toLowerCase();
    return {
      external_id: normalized.id,
      professional_id: userId,
      title: normalized.title || 'Serviço Doke',
      slug: slugify(normalized.title) + (suffix ? '-' + suffix : ''),
      description: normalized.fullDescription || normalized.description || normalized.shortDescription || normalized.title || 'Serviço publicado na Doke.',
      price_mode: toRemotePriceMode(normalized.priceMode || normalized.pricingMode || normalized.priceType),
      price_cents: toPriceCents(normalized),
      currency: normalized.currency || 'BRL',
      status: toRemoteStatus(normalized.status),
      city: normalized.city || '',
      state: normalized.state || '',
      metadata: sanitizeMetadata(normalized),
      updated_at: new Date().toISOString()
    };
  }

  function syncMedia(client, remoteServiceId, service) {
    var images = Array.isArray(service.images) ? service.images.filter(Boolean) : [];
    return Promise.resolve(client.from(REMOTE_MEDIA_TABLE).delete().eq('service_id', remoteServiceId)).then(function (deleteResult) {
      if (deleteResult.error) throw deleteResult.error;
      if (!images.length) return [];
      var rows = images.map(function (url, index) {
        return {
          service_id: remoteServiceId,
          media_type: 'image',
          url: url,
          thumbnail_url: url,
          alt_text: (service.title || 'Serviço Doke') + ' — imagem ' + (index + 1),
          sort_order: index
        };
      });
      return client.from(REMOTE_MEDIA_TABLE).insert(rows).select();
    }).then(function (result) {
      if (result && result.error) throw result.error;
      return result && result.data || [];
    });
  }

  function saveRemote(service) {
    var client = getSupabaseClient();
    if (!client) return Promise.reject(new Error('Supabase client unavailable.'));

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) throw new Error('Faça login com uma conta Supabase para publicar o anúncio no catálogo compartilhado.');
      var normalized = normalizeService(Object.assign({}, service, {
        ownerId: user.id,
        professionalId: user.id,
        providerId: user.id
      }));
      return uploadServiceImages(client, user.id, normalized).then(function (uploadedImages) {
        normalized = normalizeService(Object.assign({}, normalized, { images: uploadedImages }));
        var payload = buildRemotePayload(normalized, user.id);
        return client.from(REMOTE_TABLE)
          .upsert(payload, { onConflict: 'external_id' })
          .select('*')
          .single()
          .then(function (result) {
            if (result.error) throw result.error;
            return syncMedia(client, result.data.id, normalized).then(function () {
              lastRemoteError = null;
              setProviderState('supabase');
              return Object.assign({}, normalized, {
                remoteId: result.data.id,
                syncStatus: 'synced',
                syncError: '',
                syncedAt: new Date().toISOString()
              });
            });
          });
      });
    });
  }

  function synchronizePending(items) {
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(items || []);
    var pending = (items || []).filter(function (item) {
      return item && item.id && item.syncStatus !== 'synced';
    });
    if (!pending.length) return Promise.resolve(items || []);

    return getCurrentSupabaseUser(client).then(function (user) {
      if (!user) return items || [];
      return pending.reduce(function (chain, item) {
        return chain.then(function () {
          var ownerId = normalizeText(item.ownerId || item.professionalId || item.providerId);
          if (ownerId && ownerId !== user.id) return null;
          return saveRemote(item).then(function (synced) {
            upsertLocal(synced, 'synced');
            return synced;
          }).catch(function (error) {
            warnRemote(error, 'sincronização pendente');
            return null;
          });
        });
      }, Promise.resolve()).then(function () { return readLocalServices(); });
    });
  }

  function load(options) {
    options = options || {};
    if (cache && !options.fresh) return Promise.resolve(clone(cache));

    var local = readLocalServices().map(normalizeService);
    var client = getSupabaseClient();
    if (!client) {
      cache = mergeById([], local);
      return Promise.resolve(clone(cache));
    }

    return fetchRemoteServices().then(function (remote) {
      var merged = mergeById(local, remote); // Remote rows win over stale local copies.
      cache = merged;
      remote.forEach(function (item) { upsertLocal(item, 'synced'); });
      return synchronizePending(merged).then(function () {
        cache = mergeById(readLocalServices(), remote);
        return clone(cache);
      });
    }).catch(function (error) {
      warnRemote(error, 'leitura');
      cache = mergeById([], local);
      return clone(cache);
    });
  }

  function list(filters) {
    filters = filters || {};
    var query = normalizeSearch(filters.query || filters.q || filters.search || filters.busca);
    var category = normalizeSearch(filters.category || filters.categoria);
    var city = normalizeSearch(filters.city || filters.cidade);
    var state = normalizeSearch(filters.state || filters.estado);
    var hasStatusFilter = Object.prototype.hasOwnProperty.call(filters, 'status');
    var status = hasStatusFilter ? filters.status : 'active';
    var statuses = Array.isArray(status) ? status.map(normalizeSearch).filter(Boolean) : [normalizeSearch(status)].filter(Boolean);
    var sort = normalizeSearch(filters.sort || 'updated_desc');
    var verified = filters.verified === true;
    var ownerId = normalizeText(filters.ownerId || filters.professionalId || filters.providerId);
    var professionalProfileId = normalizeText(filters.professionalProfileId || filters.profileId);
    var limit = Number(filters.limit || filters.take || 0);

    return load(filters).then(function (items) {
      var filtered = (items || []).filter(function (item) {
        var text = normalizeSearch([
          item.title,
          item.detailTitle,
          item.category,
          item.providerName,
          item.providerHandle,
          item.providerUsername,
          item.location,
          item.city,
          item.state,
          Array.isArray(item.tags) ? item.tags.join(' ') : '',
          Array.isArray(item.keywords) ? item.keywords.join(' ') : ''
        ].join(' '));

        if (statuses.length && statuses.indexOf(normalizeSearch(item.status)) === -1) return false;
        if (query && text.indexOf(query) === -1) return false;
        if (category && normalizeSearch(item.category) !== category) return false;
        if (city && normalizeSearch(item.city) !== city) return false;
        if (state && normalizeSearch(item.state) !== state) return false;
        if (verified && item.verified !== true) return false;
        if (ownerId && String(item.ownerId || item.professionalId || item.providerId || '') !== ownerId) return false;
        if (professionalProfileId && String(item.professionalProfileId || '') !== professionalProfileId) return false;
        return true;
      });

      filtered.sort(function (a, b) {
        var aTime = String(a.updatedAt || a.createdAt || '');
        var bTime = String(b.updatedAt || b.createdAt || '');
        if (sort === 'created_asc') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
        if (sort === 'created_desc') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
        if (sort === 'title_asc') return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
        return bTime.localeCompare(aTime);
      });
      return clone(limit > 0 ? filtered.slice(0, limit) : filtered);
    });
  }

  function getById(serviceId) {
    var id = normalizeText(serviceId);
    if (!id) return Promise.resolve(null);

    var localMatch = readLocalServices().map(normalizeService).find(function (item) {
      return matchesServiceId(item, id);
    }) || null;
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(clone(localMatch));

    return fetchRemoteServiceById(id).then(function (remoteMatch) {
      if (!remoteMatch) return clone(localMatch);
      var saved = upsertLocal(remoteMatch, 'synced');
      cache = null;
      return clone(saved);
    }).catch(function (error) {
      warnRemote(error, 'leitura do detalhe');
      if (localMatch) return clone(localMatch);
      throw error;
    });
  }

  function save(service) {
    var normalized = normalizeService(service);
    if (!normalized.id) throw new Error('Service id is required.');

    var localSaved = upsertLocal(normalized, 'pending');
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(clone(localSaved));

    return saveRemote(localSaved).then(function (remoteSaved) {
      var finalSaved = upsertLocal(remoteSaved, 'synced');
      cache = null;
      return clone(finalSaved);
    }).catch(function (error) {
      warnRemote(error, 'gravação');
      var fallback = upsertLocal(Object.assign({}, localSaved, {
        syncStatus: 'pending',
        syncError: normalizeText(error && error.message)
      }), 'pending');
      return clone(fallback);
    });
  }

  function listByProfessional(professionalId, filters) {
    var id = normalizeText(professionalId);
    if (!id) return Promise.resolve([]);
    return list(Object.assign({}, filters || {}, {
      ownerId: id,
      status: filters && filters.status !== undefined ? filters.status : ''
    }));
  }

  function update(serviceId, patch) {
    var id = normalizeText(serviceId);
    if (!id) return Promise.reject(new Error('Service id is required.'));
    return getById(id).then(function (current) {
      if (!current) throw new Error('Serviço não encontrado.');
      var next = normalizeService(Object.assign({}, current, patch || {}, {
        id: id,
        updatedAt: new Date().toISOString()
      }));
      return save(next);
    });
  }

  function deactivate(serviceId) {
    return update(serviceId, { status: 'inactive' });
  }

  function utcDateKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function createAnonymousVisitorKey() {
    var token = '';
    try {
      token = root.crypto && typeof root.crypto.randomUUID === 'function'
        ? root.crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (character) {
            var random = Math.floor(Math.random() * 16);
            var value = character === 'x' ? random : (random & 3) | 8;
            return value.toString(16);
          });
    } catch (error) {
      token = String(Date.now()) + '-' + Math.random().toString(16).slice(2);
    }
    return 'anon:' + token;
  }

  function getMetricVisitorKey(user) {
    if (user && isUuid(user.id)) return 'user:' + user.id;
    try {
      var stored = root.sessionStorage && root.sessionStorage.getItem(METRIC_VISITOR_STORAGE_KEY);
      if (stored) return stored;
      var created = createAnonymousVisitorKey();
      if (root.sessionStorage) root.sessionStorage.setItem(METRIC_VISITOR_STORAGE_KEY, created);
      return created;
    } catch (error) {
      return createAnonymousVisitorKey();
    }
  }

  function resolveRemoteMetricService(client, service) {
    service = normalizeService(service || {});
    var remoteId = normalizeText(service.remoteId || service.remote_id);
    if (isUuid(remoteId)) {
      return Promise.resolve({
        id: remoteId,
        professional_id: normalizeText(service.ownerId || service.professionalId || service.providerId),
        status: toRemoteStatus(service.status),
        external_id: service.id
      });
    }

    var externalId = normalizeText(service.id || service.externalId || service.external_id);
    if (!externalId) return Promise.resolve(null);
    return Promise.resolve(client.from(REMOTE_TABLE)
      .select('id,professional_id,status,external_id')
      .eq('external_id', externalId)
      .maybeSingle()).then(function (result) {
        if (result.error) throw result.error;
        if (result.data) return result.data;
        if (!isUuid(externalId)) return null;
        return Promise.resolve(client.from(REMOTE_TABLE)
          .select('id,professional_id,status,external_id')
          .eq('id', externalId)
          .maybeSingle()).then(function (remoteResult) {
            if (remoteResult.error) throw remoteResult.error;
            return remoteResult.data || null;
          });
      });
  }

  function resolveRemoteMetricServiceAfterSync(client, service) {
    return resolveRemoteMetricService(client, service).then(function (row) {
      if (row) return row;
      var localId = normalizeText(service && (service.id || service.externalId || service.external_id));
      var localMatch = readLocalServices().map(normalizeService).find(function (item) {
        return localId && matchesServiceId(item, localId) && item.syncStatus !== 'synced';
      });
      if (!localMatch) return null;
      return synchronizePending(readLocalServices()).then(function () {
        return resolveRemoteMetricService(client, localMatch);
      });
    });
  }

  function recordServiceMetric(service, eventType) {
    var type = normalizeSearch(eventType);
    if (['view', 'budget', 'message'].indexOf(type) === -1) {
      return Promise.reject(new Error('Tipo de métrica de serviço inválido.'));
    }
    var client = getSupabaseClient();
    if (!client) return Promise.resolve({ recorded: false, reason: 'local-provider' });

    return getCurrentSupabaseUser(client).then(function (user) {
      return resolveRemoteMetricService(client, service).then(function (remoteService) {
        if (!remoteService) return { recorded: false, reason: 'service-not-synced' };
        if (user && normalizeText(user.id) === normalizeText(remoteService.professional_id)) {
          return { recorded: false, reason: 'owner-view' };
        }
        if (type !== 'view' && (!user || !isUuid(user.id))) {
          return { recorded: false, reason: 'authentication-required' };
        }
        var payload = {
          service_id: remoteService.id,
          event_type: type,
          actor_id: user && isUuid(user.id) ? user.id : null,
          visitor_key: getMetricVisitorKey(user),
          occurred_on: utcDateKey()
        };
        return Promise.resolve(client.from(REMOTE_METRIC_EVENTS_TABLE).upsert(payload, {
          onConflict: 'service_id,event_type,visitor_key,occurred_on',
          ignoreDuplicates: true
        })).then(function (result) {
          if (result.error) throw result.error;
          return { recorded: true, eventType: type, remoteServiceId: remoteService.id };
        });
      });
    });
  }

  function getServiceMetricTotals(service) {
    var empty = {
      viewsCount: 0,
      contactsCount: 0,
      budgetCount: 0,
      messageCount: 0,
      remoteId: normalizeText(service && (service.remoteId || service.remote_id)),
      source: 'local'
    };
    var client = getSupabaseClient();
    if (!client) return Promise.resolve(empty);

    return getCurrentSupabaseUser(client).then(function (user) {
      return resolveRemoteMetricServiceAfterSync(client, service).then(function (remoteService) {
        if (!remoteService || !user || normalizeText(user.id) !== normalizeText(remoteService.professional_id)) {
          return empty;
        }
        return Promise.resolve(client.from(REMOTE_METRIC_TOTALS_VIEW)
          .select('service_id,views_count,contacts_count,budget_count,message_count,last_event_at')
          .eq('service_id', remoteService.id)
          .maybeSingle()).then(function (result) {
            if (result.error) throw result.error;
            var row = result.data || {};
            return {
              viewsCount: Number(row.views_count || 0) || 0,
              contactsCount: Number(row.contacts_count || 0) || 0,
              budgetCount: Number(row.budget_count || 0) || 0,
              messageCount: Number(row.message_count || 0) || 0,
              lastEventAt: row.last_event_at || '',
              remoteId: remoteService.id,
              syncStatus: 'synced',
              source: 'supabase'
            };
          });
      });
    }).catch(function (error) {
      if (root.console && typeof root.console.warn === 'function') {
        root.console.warn('[Doke service metrics] Não foi possível carregar as métricas do anúncio.', error);
      }
      return Object.assign({}, empty, { error: normalizeText(error && error.message) });
    });
  }


  if (root.document && typeof root.document.addEventListener === 'function') {
    root.document.addEventListener('doke:supabase-sdk-ready', function () {
      supabaseClientAttempted = false;
      supabaseClient = null;
      lastRemoteError = null;
      cache = null;
      getSupabaseClient();
      if (Doke.homePublicServices && typeof Doke.homePublicServices.refresh === 'function') {
        Doke.homePublicServices.refresh().catch(function (error) {
          warnRemote(error, 'atualização após carregamento do SDK');
        });
      }
    });
  }

  repositories.services = Object.freeze({
    storageKey: STORAGE_KEY,
    normalize: normalizeService,
    load: load,
    list: list,
    getById: getById,
    listByProfessional: listByProfessional,
    save: save,
    update: update,
    deactivate: deactivate,
    syncPending: function () { return synchronizePending(readLocalServices()); },
    getProviderStatus: function () {
      return Object.freeze({
        provider: getSupabaseClient() ? 'supabase' : 'local',
        fallbackActive: Boolean(lastRemoteError),
        lastError: lastRemoteError ? normalizeText(lastRemoteError.message) : ''
      });
    },
    clearCache: function () { cache = null; }
  });

  repositories.serviceMetrics = Object.freeze({
    recordView: function (service) { return recordServiceMetric(service, 'view'); },
    recordBudgetContact: function (service) { return recordServiceMetric(service, 'budget'); },
    recordMessageContact: function (service) { return recordServiceMetric(service, 'message'); },
    getTotals: getServiceMetricTotals
  });
})();
