/* Doke Search Repository
   Responsibility: canonical bounded service discovery boundary.
   Remote authority: public.search_public_services_v1.
   Fixture compatibility: current-runtime services only, with the same DTO and cursor limits. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var AUTHORITY = 'supabase-rpc-or-fixture-memory';
  var RPC_NAME = 'search_public_services_v1';
  var CONTRACT_VERSION = '1.0.0';
  var MAX_PAGE_SIZE = 24;
  var DEFAULT_PAGE_SIZE = 12;
  var MAX_QUERY_LENGTH = 120;
  var MAX_CURSOR_LENGTH = 512;
  var ALLOWED_FIELDS = Object.freeze([
    'query', 'categories', 'state', 'city', 'neighborhood', 'serviceMode',
    'minRating', 'guaranteed', 'emergency', 'availableToday', 'pageSize', 'cursor'
  ]);
  var supabaseClient = null;
  var supabaseClientAttempted = false;
  var lastError = null;

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function normalizeSearch(value) {
    return normalizeText(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function createError(code, message, cause) {
    var error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }

  function assertAllowedFields(request) {
    Object.keys(request || {}).forEach(function (key) {
      if (ALLOWED_FIELDS.indexOf(key) === -1) {
        throw createError('DOKE_SEARCH_REQUEST_UNKNOWN_FIELD', 'Campo de busca não permitido: ' + key);
      }
    });
  }

  function normalizeBoolean(value, field) {
    if (value == null) return false;
    if (typeof value !== 'boolean') {
      throw createError('DOKE_SEARCH_REQUEST_INVALID', 'O campo ' + field + ' deve ser booleano.');
    }
    return value;
  }

  function normalizeRequest(input) {
    var request = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
    assertAllowedFields(request);

    var query = normalizeText(request.query);
    var state = normalizeText(request.state);
    var city = normalizeText(request.city);
    var neighborhood = normalizeText(request.neighborhood);
    var cursor = normalizeText(request.cursor);
    var categories = Array.isArray(request.categories)
      ? request.categories.map(normalizeText).filter(Boolean)
      : request.categories == null ? [] : null;
    var serviceMode = normalizeSearch(request.serviceMode || 'any');
    var pageSize = request.pageSize == null ? DEFAULT_PAGE_SIZE : Number(request.pageSize);
    var minRating = request.minRating == null ? 0 : Number(request.minRating);

    if (!categories || categories.length > 10) {
      throw createError('DOKE_SEARCH_CATEGORIES_INVALID', 'A busca aceita no máximo 10 categorias.');
    }
    categories = Array.from(new Set(categories.map(normalizeSearch))).filter(Boolean);

    if (query.length > MAX_QUERY_LENGTH || state.length > 40 || city.length > 100 || neighborhood.length > 120) {
      throw createError('DOKE_SEARCH_REQUEST_TOO_LONG', 'Um dos campos da busca excedeu o limite permitido.');
    }
    if (cursor.length > MAX_CURSOR_LENGTH) {
      throw createError('DOKE_SEARCH_CURSOR_INVALID', 'Cursor de busca inválido.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
      throw createError('DOKE_SEARCH_PAGE_SIZE_INVALID', 'A página deve conter entre 1 e 24 resultados.');
    }
    if (!Number.isFinite(minRating) || minRating < 0 || minRating > 5) {
      throw createError('DOKE_SEARCH_MIN_RATING_INVALID', 'A avaliação mínima deve ficar entre 0 e 5.');
    }
    if (['any', 'local', 'online'].indexOf(serviceMode) === -1) {
      throw createError('DOKE_SEARCH_SERVICE_MODE_INVALID', 'Modo de atendimento inválido.');
    }

    return Object.freeze({
      query: query,
      categories: categories,
      state: state,
      city: city,
      neighborhood: neighborhood,
      serviceMode: serviceMode,
      minRating: minRating,
      guaranteed: normalizeBoolean(request.guaranteed, 'guaranteed'),
      emergency: normalizeBoolean(request.emergency, 'emergency'),
      availableToday: normalizeBoolean(request.availableToday, 'availableToday'),
      pageSize: pageSize,
      cursor: cursor
    });
  }

  function getSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    var config = root.DOKE_SUPABASE_CONFIG || {};
    if (!config.enabled || config.servicesEnabled === false || !config.url || !config.anonKey) return null;
    if (!root.supabase || typeof root.supabase.createClient !== 'function') {
      throw createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE', 'SDK remoto de busca indisponível.');
    }
    if (supabaseClientAttempted) return supabaseClient;
    supabaseClientAttempted = true;
    try {
      supabaseClient = root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
        ? root.DokeSupabase.getClient()
        : root.supabase.createClient(config.url, config.anonKey);
    } catch (error) {
      lastError = error;
      throw createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE', 'Não foi possível iniciar a autoridade remota de busca.', error);
    }
    return supabaseClient;
  }

  function validateResponse(response) {
    if (!response || response.authority !== 'public.search_public_services_v1' || response.contractVersion !== CONTRACT_VERSION) {
      throw createError('DOKE_SEARCH_RESPONSE_INVALID', 'A autoridade de busca retornou um contrato incompatível.');
    }
    if (!Array.isArray(response.items) || !response.page || typeof response.page !== 'object') {
      throw createError('DOKE_SEARCH_RESPONSE_INVALID', 'A autoridade de busca retornou uma página inválida.');
    }
    if (response.items.length > MAX_PAGE_SIZE) {
      throw createError('DOKE_SEARCH_RESPONSE_INVALID', 'A autoridade de busca excedeu o limite da página.');
    }
    return {
      authority: response.authority,
      contractVersion: response.contractVersion,
      request: clone(response.request || {}),
      items: response.items.map(clone),
      page: {
        pageSize: Number(response.page.pageSize || response.items.length || DEFAULT_PAGE_SIZE),
        hasNext: response.page.hasNext === true,
        nextCursor: normalizeText(response.page.nextCursor) || null
      }
    };
  }

  function queryRemote(request) {
    var client = getSupabaseClient();
    if (!client || typeof client.rpc !== 'function') {
      return Promise.reject(createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE', 'Autoridade remota de busca indisponível.'));
    }
    return Promise.resolve(client.rpc(RPC_NAME, { p_request: request })).then(function (result) {
      if (result && result.error) throw result.error;
      lastError = null;
      return validateResponse(result && result.data);
    }).catch(function (error) {
      lastError = error;
      if (error && error.code && /^DOKE_SEARCH_/.test(error.code)) throw error;
      throw createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE', 'A busca remota falhou fechado.', error);
    });
  }

  function encodeCursor(item) {
    var payload = JSON.stringify({ updatedAt: normalizeText(item.updatedAt), id: normalizeText(item.remoteId || item.serviceId || item.id) });
    if (typeof root.btoa === 'function') return root.btoa(unescape(encodeURIComponent(payload)));
    if (typeof Buffer !== 'undefined') return Buffer.from(payload, 'utf8').toString('base64');
    throw createError('DOKE_SEARCH_CURSOR_INVALID', 'Não foi possível gerar o cursor local.');
  }

  function decodeCursor(cursor) {
    if (!cursor) return null;
    try {
      var decoded = typeof root.atob === 'function'
        ? decodeURIComponent(escape(root.atob(cursor)))
        : Buffer.from(cursor, 'base64').toString('utf8');
      var payload = JSON.parse(decoded);
      if (!payload.updatedAt || !payload.id) throw new Error('invalid cursor');
      return payload;
    } catch (error) {
      throw createError('DOKE_SEARCH_CURSOR_INVALID', 'Cursor de busca inválido.', error);
    }
  }

  function fixtureSource() {
    var repository = Doke.repositories && Doke.repositories.services;
    if (!repository || typeof repository.list !== 'function') {
      return Promise.reject(createError('DOKE_SEARCH_AUTHORITY_UNAVAILABLE', 'Catálogo de fixture indisponível para a busca.'));
    }
    return Promise.resolve(repository.list({ status: 'active', sort: 'updated_desc' }));
  }

  function isTruthy(value) {
    return value === true || ['true', '1', 'yes', 'sim'].indexOf(normalizeSearch(value)) !== -1;
  }

  function fixtureGeographicMatch(item, request) {
    var online = isTruthy(item.online);
    if (online) return 'online';
    if (request.neighborhood) return 'neighborhood';
    if (request.city) return 'city';
    if (request.state) return 'state';
    return 'unrestricted';
  }

  function matchesFixture(item, request) {
    item = item || {};
    var online = isTruthy(item.online);
    var normalizedState = normalizeSearch(item.state || item.staté);
    var normalizedCity = normalizeSearch(item.city);
    var normalizedNeighborhood = normalizeSearch(item.neighborhood);
    var normalizedCategory = normalizeSearch(item.category || item.catégory);
    var queryText = normalizeSearch([
      item.title,
      item.description,
      normalizedCategory,
      item.providerName,
      item.location,
      item.city,
      item.state,
      Array.isArray(item.tags) ? item.tags.join(' ') : '',
      Array.isArray(item.keywords) ? item.keywords.join(' ') : ''
    ].join(' '));
    var hasLocation = Boolean(request.state || request.city || request.neighborhood);
    var localMatch = (!request.state || normalizedState === normalizeSearch(request.state))
      && (!request.city || normalizedCity === normalizeSearch(request.city))
      && (!request.neighborhood || normalizedNeighborhood === normalizeSearch(request.neighborhood));
    var modeMatch = request.serviceMode === 'online'
      ? online
      : request.serviceMode === 'local'
        ? !online && localMatch
        : !hasLocation || online || localMatch;

    return (!request.query || queryText.indexOf(normalizeSearch(request.query)) !== -1)
      && (!request.categories.length || request.categories.indexOf(normalizedCategory) !== -1 || request.categories.indexOf(normalizeSearch(item.categorySlug)) !== -1)
      && Number(item.rating || 0) >= request.minRating
      && (!request.guaranteed || isTruthy(item.guaranteed))
      && (!request.emergency || isTruthy(item.emergency))
      && (!request.availableToday || isTruthy(item.availableToday))
      && modeMatch;
  }

  function compareFixture(a, b) {
    var time = normalizeText(b.updatedAt || b.createdAt).localeCompare(normalizeText(a.updatedAt || a.createdAt));
    if (time) return time;
    return normalizeText(b.remoteId || b.id).localeCompare(normalizeText(a.remoteId || a.id));
  }

  function afterFixtureCursor(item, cursor) {
    if (!cursor) return true;
    var updatedAt = normalizeText(item.updatedAt || item.createdAt);
    var id = normalizeText(item.remoteId || item.id);
    return updatedAt < cursor.updatedAt || (updatedAt === cursor.updatedAt && id < cursor.id);
  }

  function toFixtureItem(item, request) {
    item = clone(item || {});
    item.geographicMatch = fixtureGeographicMatch(item, request);
    if (!item.remoteId) item.remoteId = item.serviceId || item.id;
    if (!item.serviceId) item.serviceId = item.remoteId || item.id;
    return item;
  }

  function queryFixture(request) {
    var cursor = decodeCursor(request.cursor);
    return fixtureSource().then(function (items) {
      var filtered = (Array.isArray(items) ? items : [])
        .filter(function (item) { return matchesFixture(item, request); })
        .sort(compareFixture)
        .filter(function (item) { return afterFixtureCursor(item, cursor); });
      var pageRows = filtered.slice(0, request.pageSize + 1);
      var visible = pageRows.slice(0, request.pageSize).map(function (item) { return toFixtureItem(item, request); });
      var hasNext = pageRows.length > request.pageSize;
      return {
        authority: 'fixture-memory.search_public_services_v1',
        contractVersion: CONTRACT_VERSION,
        request: clone(request),
        items: visible,
        page: {
          pageSize: request.pageSize,
          hasNext: hasNext,
          nextCursor: hasNext && visible.length ? encodeCursor(visible[visible.length - 1]) : null
        }
      };
    });
  }

  function queryPage(input) {
    var request;
    try {
      request = normalizeRequest(input);
    } catch (error) {
      return Promise.reject(error);
    }
    var config = root.DOKE_SUPABASE_CONFIG || {};
    var remoteConfigured = Boolean(config.enabled && config.servicesEnabled !== false && config.url && config.anonKey);
    return remoteConfigured ? queryRemote(request) : queryFixture(request);
  }

  repositories.search = Object.freeze({
    queryPage: queryPage,
    normalizeRequest: normalizeRequest,
    getLastError: function () { return lastError; },
    getContract: function () {
      return Object.freeze({
        authority: AUTHORITY,
        rpc: RPC_NAME,
        version: CONTRACT_VERSION,
        maxPageSize: MAX_PAGE_SIZE,
        defaultPageSize: DEFAULT_PAGE_SIZE,
        allowedFields: ALLOWED_FIELDS.slice()
      });
    }
  });
})();
