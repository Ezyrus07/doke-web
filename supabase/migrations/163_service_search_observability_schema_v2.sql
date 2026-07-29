-- SEARCH-001 / SEARCH-A09
-- Server-authoritative observability for the versioned public search RPC v2.
-- The browser remains on search_public_services_v1 and search-rank-v0 remains active.

create table if not exists private.service_search_observability_policies_v2 (
  singleton boolean primary key default true,
  retention_days integer not null default 30,
  minimum_samples integer not null default 20,
  target_success_percent numeric(7,4) not null default 99.5000,
  max_p95_latency_ms numeric(12,3) not null default 1200.000,
  max_cursor_conflict_percent numeric(7,4) not null default 0.5000,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint service_search_observability_policy_singleton_check check (singleton),
  constraint service_search_observability_policy_retention_check check (retention_days between 7 and 365),
  constraint service_search_observability_policy_samples_check check (minimum_samples between 1 and 100000),
  constraint service_search_observability_policy_success_check check (target_success_percent > 0 and target_success_percent <= 100),
  constraint service_search_observability_policy_latency_check check (max_p95_latency_ms between 1 and 120000),
  constraint service_search_observability_policy_cursor_check check (max_cursor_conflict_percent >= 0 and max_cursor_conflict_percent <= 100)
);

insert into private.service_search_observability_policies_v2 (
  singleton,
  retention_days,
  minimum_samples,
  target_success_percent,
  max_p95_latency_ms,
  max_cursor_conflict_percent
)
values (true, 30, 20, 99.5000, 1200.000, 0.5000)
on conflict (singleton) do nothing;

create table if not exists private.service_search_observations_v2 (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  source text not null,
  actor_class text not null,
  outcome text not null,
  error_class text not null,
  error_code text,
  latency_ms numeric(12,3) not null,
  ranking_version text references private.service_search_ranking_versions(version) on update restrict on delete restrict,
  ranking_strategy text,
  cursor_present boolean not null,
  first_page boolean not null,
  page_size integer,
  query_present boolean not null,
  category_count integer not null,
  location_scope text not null,
  service_mode text not null,
  item_count integer,
  zero_result boolean not null,
  has_next boolean,
  observed_at timestamptz not null default pg_catalog.clock_timestamp(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint service_search_observations_source_check check (source in ('edge_search_proxy_v2', 'staging_canary')),
  constraint service_search_observations_actor_check check (actor_class in ('anon', 'authenticated', 'unknown')),
  constraint service_search_observations_outcome_check check (outcome in ('success', 'error')),
  constraint service_search_observations_error_class_check check (error_class in ('none', 'client', 'cursor_invalid', 'cursor_conflict', 'rate_limit', 'server')),
  constraint service_search_observations_error_code_check check (error_code is null or pg_catalog.char_length(error_code) between 1 and 120),
  constraint service_search_observations_latency_check check (latency_ms >= 0 and latency_ms <= 120000),
  constraint service_search_observations_ranking_strategy_check check (ranking_strategy is null or ranking_strategy in ('legacy_updated_at', 'bounded_quality_v1')),
  constraint service_search_observations_page_size_check check (page_size is null or page_size between 1 and 24),
  constraint service_search_observations_category_count_check check (category_count between 0 and 10),
  constraint service_search_observations_location_scope_check check (location_scope in ('none', 'state', 'city', 'neighborhood')),
  constraint service_search_observations_service_mode_check check (service_mode in ('any', 'local', 'online', 'invalid')),
  constraint service_search_observations_item_count_check check (item_count is null or item_count between 0 and 24),
  constraint service_search_observations_success_shape_check check (
    (outcome = 'success' and error_class = 'none' and error_code is null and item_count is not null and has_next is not null)
    or
    (outcome = 'error' and error_class <> 'none' and error_code is not null and item_count is null and has_next is null and zero_result = false)
  ),
  constraint service_search_observations_zero_result_check check (
    zero_result = (outcome = 'success' and first_page and item_count = 0)
  )
);

create table if not exists private.service_search_observability_snapshots_v2 (
  id uuid primary key default extensions.gen_random_uuid(),
  window_minutes integer not null,
  health_state text not null,
  sample_count bigint not null,
  snapshot jsonb not null,
  source_hash text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint service_search_observability_snapshots_window_check check (window_minutes between 5 and 43200),
  constraint service_search_observability_snapshots_health_check check (health_state in ('no_data', 'healthy', 'warning', 'critical')),
  constraint service_search_observability_snapshots_sample_check check (sample_count >= 0),
  constraint service_search_observability_snapshots_hash_check check (source_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists idx_service_search_observations_observed_at
  on private.service_search_observations_v2 (observed_at desc);

create index if not exists idx_service_search_observations_outcome_time
  on private.service_search_observations_v2 (outcome, error_class, observed_at desc);

create index if not exists idx_service_search_observations_ranking_time
  on private.service_search_observations_v2 (ranking_version, observed_at desc)
  where ranking_version is not null;

create index if not exists idx_service_search_observations_cursor_conflict
  on private.service_search_observations_v2 (observed_at desc)
  where error_class in ('cursor_invalid', 'cursor_conflict');

create index if not exists idx_service_search_observations_zero_result
  on private.service_search_observations_v2 (observed_at desc)
  where zero_result = true;

create index if not exists idx_service_search_observability_snapshots_time
  on private.service_search_observability_snapshots_v2 (observed_at desc);

revoke all on table private.service_search_observability_policies_v2 from public, anon, authenticated, service_role;
revoke all on table private.service_search_observations_v2 from public, anon, authenticated, service_role;
revoke all on table private.service_search_observability_snapshots_v2 from public, anon, authenticated, service_role;

create or replace function private.normalize_service_search_error_class_v2(
  p_error_code text,
  p_error_class text default null
)
returns text
language plpgsql
immutable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_code text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_error_code, '')));
  v_requested text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_error_class, '')));
begin
  if v_requested in ('client', 'cursor_invalid', 'cursor_conflict', 'rate_limit', 'server') then
    return v_requested;
  end if;

  if v_code = 'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT' then
    return 'cursor_conflict';
  end if;
  if v_code like 'DOKE_SEARCH_CURSOR_%' then
    return 'cursor_invalid';
  end if;
  if v_code = 'DOKE_RATE_LIMITED' then
    return 'rate_limit';
  end if;
  if v_code like 'DOKE_SEARCH_REQUEST_%'
     or v_code in (
       'DOKE_SEARCH_CATEGORIES_INVALID',
       'DOKE_SEARCH_PAGE_SIZE_INVALID',
       'DOKE_SEARCH_MIN_RATING_INVALID',
       'DOKE_SEARCH_SERVICE_MODE_INVALID'
     ) then
    return 'client';
  end if;
  return 'server';
end;
$$;

revoke all on function private.normalize_service_search_error_class_v2(text, text) from public, anon, authenticated;

