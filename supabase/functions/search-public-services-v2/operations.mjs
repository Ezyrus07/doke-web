const SEARCH_CODE_PATTERN = /\b(DOKE_[A-Z0-9_]{3,120})\b/;
const CURSOR_INVALID_CODES = new Set([
  'DOKE_SEARCH_CURSOR_INVALID',
  'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID',
  'DOKE_SEARCH_CURSOR_REQUEST_MISMATCH',
  'DOKE_SEARCH_CURSOR_VERSION_INVALID',
]);
const CLIENT_CODES = new Set([
  'DOKE_SEARCH_REQUEST_INVALID',
  'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD',
  'DOKE_SEARCH_REQUEST_TOO_LONG',
  'DOKE_SEARCH_CATEGORIES_INVALID',
  'DOKE_SEARCH_PAGE_SIZE_INVALID',
  'DOKE_SEARCH_MIN_RATING_INVALID',
  'DOKE_SEARCH_SERVICE_MODE_INVALID',
  'DOKE_INVALID_JSON',
  'DOKE_INVALID_JSON_OBJECT',
  'DOKE_JSON_BODY_REQUIRED',
  'DOKE_JSON_CONTENT_TYPE_REQUIRED',
  'DOKE_REQUEST_TOO_LARGE',
  'METHOD_NOT_ALLOWED',
]);

export const normalizeText = (value, maxLength = 120) => String(value ?? '')
  .trim()
  .slice(0, Math.max(1, Math.trunc(maxLength)));

export const normalizeSearchError = (error) => {
  const candidates = [
    error && typeof error === 'object' ? error.message : '',
    error && typeof error === 'object' ? error.details : '',
    error && typeof error === 'object' ? error.hint : '',
    error && typeof error === 'object' ? error.code : '',
    error,
  ];
  for (const candidate of candidates) {
    const match = normalizeText(candidate, 500).toUpperCase().match(SEARCH_CODE_PATTERN);
    if (match?.[1]) return match[1];
  }
  return 'DOKE_SEARCH_INTERNAL_ERROR';
};

export const classifySearchError = (code) => {
  const normalized = normalizeText(code, 120).toUpperCase();
  if (normalized === 'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT') return 'cursor_conflict';
  if (CURSOR_INVALID_CODES.has(normalized) || normalized.startsWith('DOKE_SEARCH_CURSOR_')) return 'cursor_invalid';
  if (normalized === 'DOKE_RATE_LIMITED') return 'rate_limit';
  if (CLIENT_CODES.has(normalized) || normalized.startsWith('DOKE_SEARCH_REQUEST_')) return 'client';
  return 'server';
};

export const statusForSearchError = (code) => {
  const classification = classifySearchError(code);
  if (classification === 'cursor_conflict') return 409;
  if (classification === 'rate_limit') return 429;
  if (classification === 'client' || classification === 'cursor_invalid') return 400;
  if ([
    'DOKE_SEARCH_CURSOR_KEY_MISSING',
    'DOKE_SEARCH_RANKING_STATE_INVALID',
    'DOKE_SEARCH_RANKING_CONFIG_INVALID',
    'DOKE_RATE_LIMIT_UNAVAILABLE',
    'SERVER_CONFIGURATION_MISSING',
  ].includes(normalizeText(code, 120).toUpperCase())) return 503;
  return 500;
};

const hasText = (value) => normalizeText(value, 200).length > 0;

export const requestDimensions = (request) => {
  const source = request && typeof request === 'object' && !Array.isArray(request) ? request : {};
  const categories = Array.isArray(source.categories) ? source.categories : [];
  const cursorPresent = hasText(source.cursor);
  const locationScope = hasText(source.neighborhood)
    ? 'neighborhood'
    : hasText(source.city)
      ? 'city'
      : hasText(source.state)
        ? 'state'
        : 'none';
  const serviceModeCandidate = normalizeText(source.serviceMode || 'any', 20).toLowerCase();
  const serviceMode = ['any', 'local', 'online'].includes(serviceModeCandidate)
    ? serviceModeCandidate
    : 'invalid';
  const pageSizeValue = Number(source.pageSize ?? 12);
  const pageSize = Number.isInteger(pageSizeValue) && pageSizeValue >= 1 && pageSizeValue <= 24
    ? pageSizeValue
    : null;

  return Object.freeze({
    cursorPresent,
    firstPage: !cursorPresent,
    pageSize,
    queryPresent: hasText(source.query),
    categoryCount: Math.min(categories.length, 10),
    locationScope,
    serviceMode,
  });
};

export const responseDimensions = (payload) => {
  const source = payload && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
  const ranking = source.ranking && typeof source.ranking === 'object' ? source.ranking : {};
  const page = source.page && typeof source.page === 'object' ? source.page : {};
  const items = Array.isArray(source.items) ? source.items : [];
  return Object.freeze({
    rankingVersion: normalizeText(ranking.version, 80) || null,
    rankingStrategy: normalizeText(ranking.strategy, 80) || null,
    itemCount: items.length,
    zeroResult: items.length === 0,
    hasNext: page.hasNext === true,
  });
};

export const buildObservation = ({
  requestId,
  actorClass,
  outcome,
  latencyMs,
  request,
  response = null,
  errorCode = null,
  errorClass = null,
  source = 'edge_search_proxy_v2',
}) => {
  const dimensions = requestDimensions(request);
  const success = outcome === 'success';
  const responseShape = success ? responseDimensions(response) : {
    rankingVersion: null,
    rankingStrategy: null,
    itemCount: null,
    zeroResult: false,
    hasNext: null,
  };
  const normalizedCode = success ? null : normalizeText(errorCode, 120).toUpperCase() || 'DOKE_SEARCH_INTERNAL_ERROR';
  const normalizedClass = success ? 'none' : normalizeText(errorClass, 40).toLowerCase() || classifySearchError(normalizedCode);

  return Object.freeze({
    requestId: normalizeText(requestId, 80),
    source,
    actorClass: ['anon', 'authenticated'].includes(actorClass) ? actorClass : 'unknown',
    outcome: success ? 'success' : 'error',
    errorClass: normalizedClass,
    errorCode: normalizedCode,
    latencyMs: Math.max(0, Math.min(120000, Number.isFinite(Number(latencyMs)) ? Number(latencyMs) : 0)),
    rankingVersion: responseShape.rankingVersion,
    rankingStrategy: responseShape.rankingStrategy,
    cursorPresent: dimensions.cursorPresent,
    firstPage: dimensions.firstPage,
    pageSize: dimensions.pageSize,
    queryPresent: dimensions.queryPresent,
    categoryCount: dimensions.categoryCount,
    locationScope: dimensions.locationScope,
    serviceMode: dimensions.serviceMode,
    itemCount: responseShape.itemCount,
    zeroResult: success && dimensions.firstPage && responseShape.zeroResult,
    hasNext: responseShape.hasNext,
  });
};

export const observationContainsRawSearchData = (observation) => {
  const forbidden = ['query', 'cursor', 'state', 'city', 'neighborhood', 'userId', 'actorId', 'ip', 'rankScore'];
  const keys = Object.keys(observation || {});
  return forbidden.some((key) => keys.includes(key));
};
