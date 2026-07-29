create or replace function public.get_service_search_observability_v2(
  p_window_minutes integer default 60
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_window_minutes integer := coalesce(p_window_minutes, 60);
  v_to timestamptz := pg_catalog.clock_timestamp();
begin
  if v_window_minutes < 5 or v_window_minutes > 43200 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVABILITY_WINDOW_INVALID';
  end if;

  return private.calculate_service_search_observability_v2(
    v_to - pg_catalog.make_interval(mins => v_window_minutes),
    v_to
  );
end;
$$;

revoke all on function public.get_service_search_observability_v2(integer) from public, anon, authenticated;
grant execute on function public.get_service_search_observability_v2(integer) to service_role;

create or replace function public.refresh_service_search_observability_v2(
  p_window_minutes integer default 60
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_window_minutes integer := coalesce(p_window_minutes, 60);
  v_to timestamptz := pg_catalog.clock_timestamp();
  v_snapshot jsonb;
  v_hash text;
  v_snapshot_id uuid;
begin
  if v_window_minutes < 5 or v_window_minutes > 43200 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVABILITY_WINDOW_INVALID';
  end if;

  v_snapshot := private.calculate_service_search_observability_v2(
    v_to - pg_catalog.make_interval(mins => v_window_minutes),
    v_to
  );
  v_hash := pg_catalog.encode(extensions.digest(v_snapshot::text, 'sha256'), 'hex');

  insert into private.service_search_observability_snapshots_v2 (
    window_minutes,
    health_state,
    sample_count,
    snapshot,
    source_hash,
    observed_at
  ) values (
    v_window_minutes,
    coalesce(v_snapshot ->> 'health', 'no_data'),
    coalesce((v_snapshot ->> 'sampleCount')::bigint, 0),
    v_snapshot,
    v_hash,
    v_to
  )
  returning id into v_snapshot_id;

  return v_snapshot || pg_catalog.jsonb_build_object(
    'snapshotId', v_snapshot_id,
    'sourceHash', v_hash,
    'persistedAt', v_to
  );
end;
$$;

revoke all on function public.refresh_service_search_observability_v2(integer) from public, anon, authenticated;
grant execute on function public.refresh_service_search_observability_v2(integer) to service_role;

create or replace function public.prune_service_search_observability_v2(
  p_before timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_retention_days integer;
  v_before timestamptz;
  v_observations_deleted bigint := 0;
  v_snapshots_deleted bigint := 0;
begin
  select policy.retention_days
    into v_retention_days
  from private.service_search_observability_policies_v2 policy
  where policy.singleton = true;

  v_before := coalesce(
    p_before,
    pg_catalog.clock_timestamp() - pg_catalog.make_interval(days => coalesce(v_retention_days, 30))
  );

  delete from private.service_search_observations_v2 observation
  where observation.observed_at < v_before;
  get diagnostics v_observations_deleted = row_count;

  delete from private.service_search_observability_snapshots_v2 snapshot
  where snapshot.observed_at < v_before;
  get diagnostics v_snapshots_deleted = row_count;

  return pg_catalog.jsonb_build_object(
    'before', v_before,
    'observationsDeleted', v_observations_deleted,
    'snapshotsDeleted', v_snapshots_deleted
  );
end;
$$;

revoke all on function public.prune_service_search_observability_v2(timestamptz) from public, anon, authenticated;
grant execute on function public.prune_service_search_observability_v2(timestamptz) to service_role;

comment on table private.service_search_observations_v2 is
  'SEARCH-A09 server-authoritative search observations. Stores no raw query, cursor, IP address, user ID or ranking score.';

comment on table private.service_search_observability_snapshots_v2 is
  'SEARCH-A09 persisted monitoring snapshots for latency, errors, cursor conflicts, zero-result rate and ranking-version distribution.';

comment on function public.record_service_search_observation_v2(jsonb) is
  'SEARCH-A09 service-role-only observation recorder used by the search Edge proxy. Browser roles cannot submit telemetry.';

comment on function public.get_service_search_observability_v2(integer) is
  'SEARCH-A09 service-role-only current observability snapshot. Zero-result rate is informational and never enters ranking.';

comment on function public.refresh_service_search_observability_v2(integer) is
  'SEARCH-A09 persists a server-authoritative monitoring snapshot for operational review.';

comment on function public.prune_service_search_observability_v2(timestamptz) is
  'SEARCH-A09 service-role-only retention authority. No cron is activated by this migration.';
