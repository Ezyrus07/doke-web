-- CAT-001 / CAT-A07 follow-up: fail closed on incomplete dimensions before baseline writes.
-- The base CAT-A07 migration is immutable after staging application.

begin;

create or replace function public.run_cat_listing_supply_coverage_baseline_v1(
  p_baseline_run_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_observed_at timestamptz := pg_catalog.transaction_timestamp();
  v_transaction_id bigint := pg_catalog.txid_current();
  v_existing private.cat_listing_supply_coverage_epochs_v1%rowtype;
  v_source_service_count bigint := 0;
  v_baseline_event_count bigint := 0;
  v_structural_defects bigint := 0;
  v_open_missing_source bigint := 0;
  v_state_drift bigint := 0;
  v_visible_snapshot_drift bigint := 0;
  v_current_dimension_defects bigint := 0;
  v_post_structural_defects bigint := 0;
  v_source_payload jsonb := '[]'::jsonb;
  v_ledger_payload jsonb := '[]'::jsonb;
  v_source_fingerprint text;
  v_ledger_fingerprint text;
begin
  if p_baseline_run_id is null then
    raise exception using errcode='22023', message='DOKE_CAT_A07_BASELINE_RUN_ID_REQUIRED';
  end if;

  select *
    into v_existing
  from private.cat_listing_supply_coverage_epochs_v1
  where baseline_run_id = p_baseline_run_id;

  if found then
    return pg_catalog.jsonb_build_object(
      'contractId','cat-a07-supply-coverage-baseline-v1',
      'baselineRunId',v_existing.baseline_run_id,
      'coverageCompleteFrom',v_existing.coverage_complete_from,
      'sourceServiceCount',v_existing.source_service_count,
      'baselineEventCount',v_existing.baseline_event_count,
      'sourceFingerprint',v_existing.source_fingerprint,
      'ledgerFingerprint',v_existing.ledger_fingerprint,
      'certificationState',v_existing.certification_state,
      'idempotentReplay',true
    );
  end if;

  if not exists (
    select 1
    from private.cat_listing_visibility_ledger_state_v1 s
    where s.contract_id='cat-a06-listing-visibility-timeline-v1'
      and s.coverage_before_activation='partial'
      and s.existing_listing_baseline_policy='not_performed_synthetic_only'
  ) then
    raise exception using errcode='55000', message='DOKE_CAT_A07_A06_ACTIVATION_STATE_DRIFT';
  end if;

  -- Freeze CAT source rows, the version/category inputs used for frozen dimensions,
  -- and the CAT-A06 ledger for one consistent forward observation.
  lock table public.services in share row exclusive mode;
  lock table public.service_versions in share row exclusive mode;
  lock table public.service_categories in share row exclusive mode;
  lock table private.cat_listing_visibility_events_v1 in share row exclusive mode;
  lock table private.cat_listing_supply_coverage_epochs_v1 in share row exclusive mode;

  -- Recheck run id after acquiring serialization locks.
  select *
    into v_existing
  from private.cat_listing_supply_coverage_epochs_v1
  where baseline_run_id = p_baseline_run_id;

  if found then
    return pg_catalog.jsonb_build_object(
      'contractId','cat-a07-supply-coverage-baseline-v1',
      'baselineRunId',v_existing.baseline_run_id,
      'coverageCompleteFrom',v_existing.coverage_complete_from,
      'sourceServiceCount',v_existing.source_service_count,
      'baselineEventCount',v_existing.baseline_event_count,
      'sourceFingerprint',v_existing.source_fingerprint,
      'ledgerFingerprint',v_existing.ledger_fingerprint,
      'certificationState',v_existing.certification_state,
      'idempotentReplay',true
    );
  end if;

  with ordered as (
    select
      e.*,
      pg_catalog.row_number() over(partition by e.service_id order by e.sequence_no) expected_sequence,
      pg_catalog.lag(e.eligible_after) over(partition by e.service_id order by e.sequence_no) previous_eligible_after,
      pg_catalog.lag(e.occurred_at) over(partition by e.service_id order by e.sequence_no) previous_occurred_at
    from private.cat_listing_visibility_events_v1 e
  )
  select count(*)::bigint
    into v_structural_defects
  from ordered o
  where o.sequence_no <> o.expected_sequence
     or (o.expected_sequence > 1 and o.eligible_before is distinct from o.previous_eligible_after)
     or (o.expected_sequence > 1 and o.occurred_at < o.previous_occurred_at)
     or (
       o.eligible_after and (
         coalesce(
           nullif(o.dimension_snapshot_after ->> 'categoryId',''),
           nullif(o.dimension_snapshot_after ->> 'categorySlug',''),
           nullif(o.dimension_snapshot_after ->> 'category','')
         ) is null
         or nullif(pg_catalog.upper(o.dimension_snapshot_after ->> 'state'),'') is null
       )
     );

  if v_structural_defects <> 0 then
    raise exception using errcode='55000', message='DOKE_CAT_A07_A06_STRUCTURAL_PREFLIGHT_FAILED';
  end if;

  with latest as (
    select distinct on (e.service_id)
      e.service_id,e.sequence_no,e.eligible_after,e.visible_version_id_after,e.dimension_snapshot_after
    from private.cat_listing_visibility_events_v1 e
    order by e.service_id,e.sequence_no desc
  )
  select count(*)::bigint
    into v_open_missing_source
  from latest l
  left join public.services s on s.id=l.service_id
  where s.id is null and l.eligible_after;

  if v_open_missing_source <> 0 then
    raise exception using errcode='55000', message='DOKE_CAT_A07_OPEN_LEDGER_SERVICE_MISSING';
  end if;

  with latest as (
    select distinct on (e.service_id)
      e.service_id,e.sequence_no,e.eligible_after,e.visible_version_id_after,e.dimension_snapshot_after
    from private.cat_listing_visibility_events_v1 e
    order by e.service_id,e.sequence_no desc
  ),
  current_state as (
    select
      s.id service_id,
      (
        private.cat_listing_supply_row_eligible_v1(s.status,s.moderation_status,s.approved_version_id)
        and private.cat_listing_supply_version_valid_v1(s.id,s.professional_id,s.approved_version_id)
      ) current_eligible,
      s.approved_version_id current_visible_version_id,
      private.cat_listing_supply_dimensions_v1(
        s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
      ) current_dimensions
    from public.services s
  )
  select
    count(*) filter (where l.service_id is not null and l.eligible_after is distinct from c.current_eligible)::bigint,
    count(*) filter (
      where l.service_id is not null
        and c.current_eligible
        and (
          l.visible_version_id_after is distinct from c.current_visible_version_id
          or l.dimension_snapshot_after is distinct from c.current_dimensions
        )
    )::bigint
  into v_state_drift,v_visible_snapshot_drift
  from current_state c
  left join latest l on l.service_id=c.service_id;

  if v_state_drift <> 0 then
    raise exception using errcode='55000', message='DOKE_CAT_A07_CURRENT_ELIGIBILITY_DRIFT';
  end if;
  if v_visible_snapshot_drift <> 0 then
    raise exception using errcode='55000', message='DOKE_CAT_A07_CURRENT_VISIBLE_SNAPSHOT_DRIFT';
  end if;

  -- A complete category/state coverage epoch cannot be certified when a currently
  -- eligible listing lacks frozen analytics dimensions. Do this before any ledger write.
  select count(*)::bigint
    into v_current_dimension_defects
  from public.services s
  where (
      private.cat_listing_supply_row_eligible_v1(s.status,s.moderation_status,s.approved_version_id)
      and private.cat_listing_supply_version_valid_v1(s.id,s.professional_id,s.approved_version_id)
    )
    and (
      coalesce(
        nullif(private.cat_listing_supply_dimensions_v1(
          s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
        ) ->> 'categoryId',''),
        nullif(private.cat_listing_supply_dimensions_v1(
          s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
        ) ->> 'categorySlug',''),
        nullif(private.cat_listing_supply_dimensions_v1(
          s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
        ) ->> 'category','')
      ) is null
      or nullif(pg_catalog.upper(private.cat_listing_supply_dimensions_v1(
        s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
      ) ->> 'state'),'') is null
    );

  if v_current_dimension_defects <> 0 then
    raise exception using
      errcode='55000',
      message='DOKE_CAT_A07_CURRENT_DIMENSIONS_INCOMPLETE',
      detail=pg_catalog.format('eligible_services_with_incomplete_dimensions=%s',v_current_dimension_defects);
  end if;

  with current_state as (
    select
      s.id service_id,
      (
        private.cat_listing_supply_row_eligible_v1(s.status,s.moderation_status,s.approved_version_id)
        and private.cat_listing_supply_version_valid_v1(s.id,s.professional_id,s.approved_version_id)
      ) current_eligible,
      s.approved_version_id current_visible_version_id,
      private.cat_listing_supply_dimensions_v1(
        s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
      ) current_dimensions
    from public.services s
  )
  select
    count(*)::bigint,
    coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_array(
        c.service_id,c.current_eligible,
        case when c.current_eligible then c.current_visible_version_id else null end,
        case when c.current_eligible then c.current_dimensions else null end
      )
      order by c.service_id
    ),'[]'::jsonb)
  into v_source_service_count,v_source_payload
  from current_state c;

  v_source_fingerprint := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_source_payload::text,'UTF8'),'sha256'),
    'hex'
  );

  with latest as (
    select distinct on (e.service_id)
      e.service_id,e.sequence_no,e.eligible_after,e.visible_version_id_after,e.dimension_snapshot_after
    from private.cat_listing_visibility_events_v1 e
    order by e.service_id,e.sequence_no desc
  ),
  current_state as (
    select
      s.id service_id,
      (
        private.cat_listing_supply_row_eligible_v1(s.status,s.moderation_status,s.approved_version_id)
        and private.cat_listing_supply_version_valid_v1(s.id,s.professional_id,s.approved_version_id)
      ) current_eligible,
      s.approved_version_id current_visible_version_id,
      private.cat_listing_supply_dimensions_v1(
        s.id,s.professional_id,s.category_id,s.metadata,s.city,s.state,s.approved_version_id
      ) current_dimensions
    from public.services s
  )
  insert into private.cat_listing_visibility_events_v1 (
    service_id,sequence_no,occurred_at,transaction_id,source_authority,source_transition_key,
    eligible_before,eligible_after,visible_version_id_before,visible_version_id_after,
    dimension_snapshot_before,dimension_snapshot_after,coverage_kind
  )
  select
    c.service_id,
    coalesce(l.sequence_no,0)+1,
    v_observed_at,
    v_transaction_id,
    'CAT-001/coverage-baseline',
    pg_catalog.format('cat-a07:baseline:%s:%s',p_baseline_run_id,c.service_id),
    coalesce(l.eligible_after,false),
    c.current_eligible,
    case when coalesce(l.eligible_after,false) then l.visible_version_id_after else null end,
    case when c.current_eligible then c.current_visible_version_id else null end,
    case when coalesce(l.eligible_after,false) then l.dimension_snapshot_after else null end,
    case when c.current_eligible then c.current_dimensions else null end,
    'activation_baseline'
  from current_state c
  left join latest l on l.service_id=c.service_id
  order by c.service_id;

  get diagnostics v_baseline_event_count = row_count;

  if v_baseline_event_count <> v_source_service_count then
    raise exception using errcode='55000', message='DOKE_CAT_A07_BASELINE_COUNT_MISMATCH';
  end if;

  with ordered as (
    select
      e.*,
      pg_catalog.row_number() over(partition by e.service_id order by e.sequence_no) expected_sequence,
      pg_catalog.lag(e.eligible_after) over(partition by e.service_id order by e.sequence_no) previous_eligible_after,
      pg_catalog.lag(e.occurred_at) over(partition by e.service_id order by e.sequence_no) previous_occurred_at
    from private.cat_listing_visibility_events_v1 e
  )
  select count(*)::bigint
    into v_post_structural_defects
  from ordered o
  where o.sequence_no <> o.expected_sequence
     or (o.expected_sequence > 1 and o.eligible_before is distinct from o.previous_eligible_after)
     or (o.expected_sequence > 1 and o.occurred_at < o.previous_occurred_at)
     or (
       o.eligible_after and (
         coalesce(
           nullif(o.dimension_snapshot_after ->> 'categoryId',''),
           nullif(o.dimension_snapshot_after ->> 'categorySlug',''),
           nullif(o.dimension_snapshot_after ->> 'category','')
         ) is null
         or nullif(pg_catalog.upper(o.dimension_snapshot_after ->> 'state'),'') is null
       )
     );

  if v_post_structural_defects <> 0 then
    raise exception using errcode='55000', message='DOKE_CAT_A07_POST_BASELINE_STRUCTURAL_FAILED';
  end if;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_array(
      e.service_id,e.sequence_no,e.occurred_at,e.source_transition_key,
      e.eligible_before,e.eligible_after,e.visible_version_id_before,e.visible_version_id_after,
      e.dimension_snapshot_before,e.dimension_snapshot_after,e.coverage_kind
    )
    order by e.service_id,e.sequence_no
  ),'[]'::jsonb)
  into v_ledger_payload
  from private.cat_listing_visibility_events_v1 e;

  v_ledger_fingerprint := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_ledger_payload::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into private.cat_listing_supply_coverage_epochs_v1 (
    baseline_run_id,contract_id,coverage_complete_from,source_service_count,baseline_event_count,
    source_fingerprint,ledger_fingerprint,certification_state
  ) values (
    p_baseline_run_id,'cat-a07-supply-coverage-baseline-v1',v_observed_at,
    v_source_service_count,v_baseline_event_count,v_source_fingerprint,v_ledger_fingerprint,'certified'
  );

  return pg_catalog.jsonb_build_object(
    'contractId','cat-a07-supply-coverage-baseline-v1',
    'baselineRunId',p_baseline_run_id,
    'coverageCompleteFrom',v_observed_at,
    'sourceServiceCount',v_source_service_count,
    'baselineEventCount',v_baseline_event_count,
    'sourceFingerprint',v_source_fingerprint,
    'ledgerFingerprint',v_ledger_fingerprint,
    'certificationState','certified',
    'structuralDefects',v_post_structural_defects,
    'idempotentReplay',false
  );
end;
$function$;

revoke all on function public.run_cat_listing_supply_coverage_baseline_v1(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.run_cat_listing_supply_coverage_baseline_v1(uuid)
  to service_role;

comment on function public.run_cat_listing_supply_coverage_baseline_v1(uuid) is
  'CAT-A07 server-only forward baseline with pre-write category/state completeness validation. It aborts before ledger writes when an eligible current service lacks canonical analytics dimensions.';

commit;
