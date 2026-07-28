-- SEARCH-001 / SEARCH-A07
-- Versioned, bounded and rollback-safe service search ranking contract.
-- Candidate only: this migration does not activate ranking v1 in the public search RPC.

create table if not exists private.service_search_ranking_versions (
  version text primary key,
  strategy text not null,
  config jsonb not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint service_search_ranking_strategy_check
    check (strategy in ('legacy_updated_at', 'bounded_quality_v1'))
);

create table if not exists private.service_search_ranking_state (
  singleton boolean primary key default true,
  active_version text not null references private.service_search_ranking_versions(version),
  updated_at timestamptz not null default pg_catalog.now(),
  updated_by uuid,
  constraint service_search_ranking_state_singleton_check check (singleton)
);

create table if not exists private.service_search_ranking_state_events (
  id bigint generated always as identity primary key,
  previous_version text not null references private.service_search_ranking_versions(version),
  active_version text not null references private.service_search_ranking_versions(version),
  reason text,
  changed_at timestamptz not null default pg_catalog.now(),
  changed_by uuid
);

revoke all on table private.service_search_ranking_versions from public, anon, authenticated;
revoke all on table private.service_search_ranking_state from public, anon, authenticated;
revoke all on table private.service_search_ranking_state_events from public, anon, authenticated;

grant select on table private.service_search_ranking_versions to service_role;
grant select on table private.service_search_ranking_state to service_role;
grant select on table private.service_search_ranking_state_events to service_role;

create or replace function private.validate_service_search_ranking_version()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog'
as $$
declare
  v_allowed_top_level text[] := array[
    'weights',
    'reviewPrior',
    'availabilityWindowDays',
    'recencyFullDays',
    'recencyZeroDays',
    'behavioralSignalsEnabled',
    'scorePrecision'
  ];
  v_allowed_weights text[] := array['text', 'reviews', 'availability', 'recency'];
  v_weights jsonb;
  v_prior jsonb;
  v_text_weight numeric;
  v_reviews_weight numeric;
  v_availability_weight numeric;
  v_recency_weight numeric;
  v_weight_sum numeric;
  v_prior_mean numeric;
  v_prior_weight integer;
  v_availability_window integer;
  v_recency_full integer;
  v_recency_zero integer;
  v_score_precision integer;
begin
  if pg_catalog.jsonb_typeof(new.config) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_CONFIG_INVALID';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(new.config) as config_key(key)
    where not (config_key.key = any(v_allowed_top_level))
  ) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_CONFIG_UNKNOWN_FIELD';
  end if;

  v_weights := new.config -> 'weights';
  v_prior := new.config -> 'reviewPrior';

  if pg_catalog.jsonb_typeof(v_weights) <> 'object'
     or pg_catalog.jsonb_typeof(v_prior) <> 'object'
     or exists (
       select 1
       from pg_catalog.jsonb_object_keys(v_weights) as weight_key(key)
       where not (weight_key.key = any(v_allowed_weights))
     ) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_CONFIG_INVALID';
  end if;

  v_text_weight := (v_weights ->> 'text')::numeric;
  v_reviews_weight := (v_weights ->> 'reviews')::numeric;
  v_availability_weight := (v_weights ->> 'availability')::numeric;
  v_recency_weight := (v_weights ->> 'recency')::numeric;
  v_weight_sum := v_text_weight + v_reviews_weight + v_availability_weight + v_recency_weight;

  if v_text_weight < 0 or v_text_weight > 1
     or v_reviews_weight < 0 or v_reviews_weight > 1
     or v_availability_weight < 0 or v_availability_weight > 1
     or v_recency_weight < 0 or v_recency_weight > 1
     or pg_catalog.abs(v_weight_sum - 1) > 0.000001 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_WEIGHTS_INVALID';
  end if;

  v_prior_mean := (v_prior ->> 'mean')::numeric;
  v_prior_weight := (v_prior ->> 'weight')::integer;
  v_availability_window := (new.config ->> 'availabilityWindowDays')::integer;
  v_recency_full := (new.config ->> 'recencyFullDays')::integer;
  v_recency_zero := (new.config ->> 'recencyZeroDays')::integer;
  v_score_precision := (new.config ->> 'scorePrecision')::integer;

  if v_prior_mean < 0 or v_prior_mean > 5
     or v_prior_weight < 1 or v_prior_weight > 100
     or v_availability_window < 1 or v_availability_window > 30
     or v_recency_full < 0 or v_recency_full > 30
     or v_recency_zero <= v_recency_full or v_recency_zero > 365
     or v_score_precision < 4 or v_score_precision > 9
     or coalesce((new.config ->> 'behavioralSignalsEnabled')::boolean, true) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_CONFIG_INVALID';
  end if;

  return new;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_CONFIG_INVALID';
end;
$$;

revoke all on function private.validate_service_search_ranking_version() from public, anon, authenticated;

drop trigger if exists trg_validate_service_search_ranking_version on private.service_search_ranking_versions;
create trigger trg_validate_service_search_ranking_version
before insert on private.service_search_ranking_versions
for each row execute function private.validate_service_search_ranking_version();

create or replace function private.reject_service_search_ranking_version_mutation()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog'
as $$
begin
  raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_VERSION_IMMUTABLE';
end;
$$;

revoke all on function private.reject_service_search_ranking_version_mutation() from public, anon, authenticated;

drop trigger if exists trg_reject_service_search_ranking_version_mutation on private.service_search_ranking_versions;
create trigger trg_reject_service_search_ranking_version_mutation
before update or delete on private.service_search_ranking_versions
for each row execute function private.reject_service_search_ranking_version_mutation();

insert into private.service_search_ranking_versions (version, strategy, config)
values
  (
    'search-rank-v0',
    'legacy_updated_at',
    pg_catalog.jsonb_build_object(
      'weights', pg_catalog.jsonb_build_object(
        'text', 0,
        'reviews', 0,
        'availability', 0,
        'recency', 1
      ),
      'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.0, 'weight', 5),
      'availabilityWindowDays', 14,
      'recencyFullDays', 0,
      'recencyZeroDays', 365,
      'behavioralSignalsEnabled', false,
      'scorePrecision', 8
    )
  ),
  (
    'search-rank-v1',
    'bounded_quality_v1',
    pg_catalog.jsonb_build_object(
      'weights', pg_catalog.jsonb_build_object(
        'text', 0.65,
        'reviews', 0.20,
        'availability', 0.05,
        'recency', 0.10
      ),
      'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.0, 'weight', 5),
      'availabilityWindowDays', 14,
      'recencyFullDays', 14,
      'recencyZeroDays', 90,
      'behavioralSignalsEnabled', false,
      'scorePrecision', 8
    )
  )
on conflict (version) do nothing;

insert into private.service_search_ranking_state (singleton, active_version)
values (true, 'search-rank-v0')
on conflict (singleton) do nothing;

create or replace function private.current_service_search_ranking_version()
returns text
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_version text;
begin
  select state.active_version
    into v_version
  from private.service_search_ranking_state state
  where state.singleton = true;

  if v_version is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_STATE_MISSING';
  end if;

  return v_version;
end;
$$;

revoke all on function private.current_service_search_ranking_version() from public, anon, authenticated;
grant execute on function private.current_service_search_ranking_version() to service_role;

create or replace function private.activate_service_search_ranking_version(
  p_version text,
  p_expected_current text default null,
  p_reason text default null
)
returns text
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_target text := pg_catalog.btrim(coalesce(p_version, ''));
  v_current text;
  v_actor uuid := auth.uid();
begin
  if v_target = '' or pg_catalog.char_length(v_target) > 80 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_VERSION_INVALID';
  end if;

  if p_reason is not null and pg_catalog.char_length(p_reason) > 240 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_REASON_INVALID';
  end if;

  if not exists (
    select 1
    from private.service_search_ranking_versions version_row
    where version_row.version = v_target
  ) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_VERSION_UNKNOWN';
  end if;

  select state.active_version
    into v_current
  from private.service_search_ranking_state state
  where state.singleton = true
  for update;

  if v_current is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_STATE_MISSING';
  end if;

  if p_expected_current is not null and v_current <> p_expected_current then
    raise exception using errcode = '40001', message = 'DOKE_SEARCH_RANKING_VERSION_CONFLICT';
  end if;

  if v_current = v_target then
    return v_current;
  end if;

  update private.service_search_ranking_state
  set active_version = v_target,
      updated_at = pg_catalog.now(),
      updated_by = v_actor
  where singleton = true;

  insert into private.service_search_ranking_state_events (
    previous_version,
    active_version,
    reason,
    changed_by
  ) values (
    v_current,
    v_target,
    nullif(pg_catalog.btrim(coalesce(p_reason, '')), ''),
    v_actor
  );

  return v_target;
end;
$$;

revoke all on function private.activate_service_search_ranking_version(text, text, text) from public, anon, authenticated;
grant execute on function private.activate_service_search_ranking_version(text, text, text) to service_role;

create or replace function private.compute_service_search_ranking_score(
  p_version text,
  p_text_rank numeric,
  p_review_sum numeric,
  p_review_count integer,
  p_has_available_slot boolean,
  p_approved_at timestamptz,
  p_as_of timestamptz default pg_catalog.statement_timestamp()
)
returns numeric
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_config jsonb;
  v_weights jsonb;
  v_prior jsonb;
  v_text_signal numeric;
  v_review_signal numeric;
  v_availability_signal numeric;
  v_recency_signal numeric;
  v_text_raw numeric := greatest(coalesce(p_text_rank, 0), 0);
  v_review_count integer := greatest(coalesce(p_review_count, 0), 0);
  v_review_sum numeric;
  v_prior_mean numeric;
  v_prior_weight integer;
  v_recency_full integer;
  v_recency_zero integer;
  v_age_days numeric;
  v_score numeric;
  v_precision integer;
begin
  select version_row.config
    into v_config
  from private.service_search_ranking_versions version_row
  where version_row.version = p_version;

  if v_config is null then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_RANKING_VERSION_UNKNOWN';
  end if;

  v_weights := v_config -> 'weights';
  v_prior := v_config -> 'reviewPrior';
  v_prior_mean := (v_prior ->> 'mean')::numeric;
  v_prior_weight := (v_prior ->> 'weight')::integer;
  v_recency_full := (v_config ->> 'recencyFullDays')::integer;
  v_recency_zero := (v_config ->> 'recencyZeroDays')::integer;
  v_precision := (v_config ->> 'scorePrecision')::integer;

  v_text_signal := least(1, v_text_raw / (1 + v_text_raw));
  v_review_sum := least(
    greatest(coalesce(p_review_sum, 0), 0),
    v_review_count * 5
  );
  v_review_signal := least(
    1,
    greatest(
      0,
      ((v_review_sum + (v_prior_mean * v_prior_weight)) / (v_review_count + v_prior_weight)) / 5
    )
  );
  v_availability_signal := case when coalesce(p_has_available_slot, false) then 1 else 0 end;

  if p_approved_at is null or p_as_of is null then
    v_recency_signal := 0;
  else
    v_age_days := greatest(
      0,
      extract(epoch from (p_as_of - p_approved_at)) / 86400
    );
    v_recency_signal := case
      when v_age_days <= v_recency_full then 1
      when v_age_days >= v_recency_zero then 0
      else (v_recency_zero - v_age_days) / (v_recency_zero - v_recency_full)
    end;
  end if;

  v_score :=
      ((v_weights ->> 'text')::numeric * v_text_signal)
    + ((v_weights ->> 'reviews')::numeric * v_review_signal)
    + ((v_weights ->> 'availability')::numeric * v_availability_signal)
    + ((v_weights ->> 'recency')::numeric * v_recency_signal);

  return pg_catalog.round(least(1, greatest(0, v_score)), v_precision);
end;
$$;

revoke all on function private.compute_service_search_ranking_score(text, numeric, numeric, integer, boolean, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function private.compute_service_search_ranking_score(text, numeric, numeric, integer, boolean, timestamptz, timestamptz) to service_role;

comment on table private.service_search_ranking_versions is
  'SEARCH-A07 immutable ranking configurations. Browser-originated behavioral counters are excluded from every version.';

comment on table private.service_search_ranking_state is
  'SEARCH-A07 singleton active-version pointer. The migration leaves search-rank-v0 active.';

comment on table private.service_search_ranking_state_events is
  'SEARCH-A07 append-only activation and rollback evidence.';

comment on function private.compute_service_search_ranking_score(text, numeric, numeric, integer, boolean, timestamptz, timestamptz) is
  'SEARCH-A07 bounded score: normalized text relevance, Bayesian order-backed review quality, binary near-term availability and capped approved-version recency.';

comment on function private.activate_service_search_ranking_version(text, text, text) is
  'SEARCH-A07 service-role-only compare-and-swap activation and rollback authority.';
