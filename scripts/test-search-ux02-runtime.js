'use strict';

const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const read = (path) => fs.readFileSync(path, 'utf8');
const card = read('assets/js/components/public-service-card.js');
const interactions = read('assets/js/components/ad-card-interactions.js');
const surface = read('assets/js/pages/search/server-results-surface.js');
const migration = read('supabase/migrations/20260729143000_service_search_intent_recovery_v1.sql');
const noMatchFix = read('supabase/migrations/20260729144500_service_search_intent_no_match_fix.sql');

// Parse all changed browser files before checking their contracts.
new vm.Script(card, { filename: 'public-service-card.js' });
new vm.Script(interactions, { filename: 'ad-card-interactions.js' });
new vm.Script(surface, { filename: 'server-results-surface.js' });

assert(
  card.includes('service.serviceId || service.remoteId || service.remote_id || service.id'),
  'Rendered cards must prefer the canonical service UUID fields.'
);
assert(
  card.includes('favorite.dataset.favoriteServiceId = canonicalId'),
  'Favorite buttons must receive the canonical UUID.'
);
assert(
  interactions.includes('resolveCanonicalFavoriteId'),
  'Legacy/public card identifiers must resolve before favorite mutation.'
);
assert(
  interactions.includes("operation: 'resolve-service-id'"),
  'Favorite identifier failures must be observable.'
);
assert(
  surface.includes("? 'Outros anúncios'"),
  'Empty direct searches must render an explicit recommendation heading.'
);
assert(
  surface.includes("queryWithEditorialFallback"),
  'Fallback recommendations must be requested through the search service.'
);
assert(
  surface.includes("var fallbackRequest = buildRequest('', context.filters, '')"),
  'Fallback must preserve filters and use an empty server-side catalog query.'
);
assert(
  migration.includes('create extension if not exists pg_trgm with schema extensions'),
  'Bounded typo recovery requires pg_trgm in the extensions schema.'
);
assert(
  migration.includes('private.search_public_services_v2_core'),
  'The closed v2 implementation must remain isolated as the core authority.'
);
assert(
  migration.includes('prefix_synonym_or_typo_recovery'),
  'The response must identify recovered intent.'
);
assert(
  noMatchFix.includes("'mode', 'no_match'"),
  'Unsuccessful expansion must remain an explicit no-match outcome.'
);
assert(
  !migration.includes('views_count') && !migration.includes('contacts_count'),
  'Intent recovery must not introduce manipulable behavioral ranking signals.'
);

console.log('SEARCH-UX02 runtime and migration contracts passed.');
