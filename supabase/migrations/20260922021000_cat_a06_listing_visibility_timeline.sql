-- CAT-001 / CAT-A06: append-only listing visibility timeline for supply analytics.
-- This ledger is owned by CAT. ANA may consume it but must not become lifecycle authority.

begin;

create table if not exists private.cat_listing_visibility_ledger_state_v1 (
  contract_id text primary key,
  schema_version integer not null,
  activated_at timestamptz not null,
  coverage_before_activation text not null,
  existing_listing_baseline_policy text not null,
  created_at timestamptz not null default now(),
  constraint cat_listing_visibility_ledger_state_contract_check
    check (contract_id = 'cat-a06-listing-visibility-timeline-v1'),
  constraint cat_listing_visibility_ledger_state_schema_check
    check (schema_version = 1),
  constraint cat_listing_visibility_ledger_state_coverage_check
    check (coverage_before_activation = 'partial'),
  constraint cat_listing_visibility_ledger_state_baseline_check
    check (existing_listing_baseline_policy in ('not_performed_synthetic_only', 'explicitly_authorized'))
);

create table if not exists private.cat_listing_visibility_events_v1 (
  id bigint generated always as identity primary key,
  service_id uuid not null,
  sequence_no bigint not null,
  occurred_at timestamptz not null,
  transaction_id bigint not null,
  source_authority text not null,
  source_transition_key text not null,
  eligible_before boolean not null,
  eligible_after boolean not null,
  visible_version_id_before uuid,
  visible_version_id_after uuid,
  dimension_snapshot_before jsonb,
  dimension_snapshot_after jsonb,
  coverage_kind text not null default 'observed_transition',
  created_at timestamptz not null default now(),
  constraint cat_listing_visibility_events_sequence_check check (sequence_no > 0),
  constraint cat_listing_visibility_events_source_check check (char_length(btrim(source_authority)) > 0),
  constraint cat_listing_visibility_events_key_check check (char_length(btrim(source_transition_key)) > 0),
  constraint cat_listing_visibility_events_coverage_check
    check (coverage_kind in ('observed_transition', 'activation_baseline')),
  constraint cat_listing_visibility_events_before_dimensions_check
    check (dimension_snapshot_before is null or jsonb_typeof(dimension_snapshot_before) = 'object'),
  constraint cat_listing_visibility_events_after_dimensions_check
    check (dimension_snapshot_after is null or jsonb_typeof(dimension_snapshot_after) = 'object'),
  constraint cat_listing_visibility_events_service_sequence_key unique (service_id, sequence_no),
  constraint cat_listing_visibility_events_transition_key unique (source_transition_key)
);

create index if not exists idx_cat_listing_visibility_events_service_time
  on private.cat_listing_visibility_events_v1(service_id, occurred_at, sequence_no);
create index if not exists idx_cat_listing_visibility_events_time
  on private.cat_listing_visibility_events_v1(occurred_at, service_id);
create index if not exists idx_cat_listing_visibility_events_version_after
  on private.cat_listing_visibility_events_v1(visible_version_id_after)
  where visible_version_id_after is not null;

alter table private.cat_listing_visibility_ledger_state_v1 enable row level security;
alter table private.cat_listing_visibility_events_v1 enable row level security;

revoke all on table private.cat_listing_visibility_ledger_state_v1
  from public, anon, authenticated, service_role;
revoke all on table private.cat_listing_visibility_events_v1
  from public, anon, authenticated, service_role;

grant select on table private.cat_listing_visibility_ledger_state_v1 to service_role;
grant select on table private.cat_listing_visibility_events_v1 to service_role;

create or replace function private.cat_listing_supply_row_eligible_v1(
  p_status text,
  p_moderation_status text,
  p_approved_version_id uuid
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $function$
  select
    p_status = 'published'
    and p_approved_version_id is not null
    and p_moderation_status in ('published', 'changes_pending_review', 'changes_required');
$function$;

create or replace function private.cat_listing_supply_version_valid_v1(
  p_service_id uuid,
  p_professional_id uuid,
  p_version_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $function$
  select exists (
    select 1
    from public.service_versions version_row
    where version_row.id = p_version_id
      and version_row.service_id = p_service_id
      and version_row.professional_id = p_professional_id
      and version_row.review_status = 'approved'
  );
$function$;

create or replace function private.cat_listing_supply_dimensions_v1(
  p_service_id uuid,
  p_professional_id uuid,
  p_category_id uuid,
  p_service_metadata jsonb,
  p_city text,
  p_state text,
  p_version_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_snapshot jsonb := '{}'::jsonb;
  v_category_name text;
  v_category_slug text;
begin
  if p_version_id is not null then
    select version_row.snapshot
      into v_snapshot
    from public.service_versions version_row
    where version_row.id = p_version_id
      and version_row.service_id = p_service_id
      and version_row.professional_id = p_professional_id;
  end if;

  if p_category_id is not null then
    select category_row.name, category_row.slug
      into v_category_name, v_category_slug
    from public.service_categories category_row
    where category_row.id = p_category_id;
  end if;

  return pg_catalog.jsonb_build_object(
    'categoryId', p_category_id,
    'category', coalesce(
      nullif(v_snapshot ->> 'category', ''),
      nullif(v_category_name, ''),
      nullif(coalesce(p_service_metadata, '{}'::jsonb) ->> 'category', ''),
      ''
    ),
    'categorySlug', coalesce(
      nullif(v_category_slug, ''),
      nullif(v_snapshot ->> 'categorySlug', ''),
      nullif(coalesce(p_service_metadata, '{}'::jsonb) ->> 'categorySlug', ''),
      ''
    ),
    'state', coalesce(nullif(v_snapshot ->> 'state', ''), nullif(p_state, ''), ''),
    'city', coalesce(nullif(v_snapshot ->> 'city', ''), nullif(p_city, ''), '')
  );
end;
$function$;

create or replace function private.capture_cat_listing_visibility_transition_v1()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_service_id uuid;
  v_professional_id uuid;
  v_before_eligible boolean := false;
  v_after_eligible boolean := false;
  v_before_version uuid;
  v_after_version uuid;
  v_before_dimensions jsonb;
  v_after_dimensions jsonb;
  v_sequence bigint;
  v_transaction_id bigint := pg_catalog.txid_current();
  v_source_authority text;
  v_source_transition_key text;
  v_should_record boolean := false;
begin
  if tg_op = 'INSERT' then
    v_service_id := new.id;
    v_professional_id := new.professional_id;
    v_after_version := new.approved_version_id;
    v_after_eligible :=
      private.cat_listing_supply_row_eligible_v1(new.status, new.moderation_status, new.approved_version_id)
      and private.cat_listing_supply_version_valid_v1(new.id, new.professional_id, new.approved_version_id);
    v_after_dimensions := private.cat_listing_supply_dimensions_v1(
      new.id, new.professional_id, new.category_id, new.metadata, new.city, new.state, new.approved_version_id
    );
    v_source_authority := 'CAT-001/public.services.insert';
    v_should_record := v_after_eligible;
  elsif tg_op = 'DELETE' then
    v_service_id := old.id;
    v_professional_id := old.professional_id;
    v_before_version := old.approved_version_id;
    v_before_eligible := private.cat_listing_supply_row_eligible_v1(
      old.status, old.moderation_status, old.approved_version_id
    );
    v_before_dimensions := private.cat_listing_supply_dimensions_v1(
      old.id, old.professional_id, old.category_id, old.metadata, old.city, old.state, old.approved_version_id
    );
    v_source_authority := 'CAT-001/public.services.delete';
    v_should_record := v_before_eligible;
  else
    v_service_id := new.id;
    v_professional_id := new.professional_id;
    v_before_version := old.approved_version_id;
    v_after_version := new.approved_version_id;

    -- OLD is the previously committed CAT row-state contract. Do not re-evaluate
    -- its version review_status after a same-transaction supersede.
    v_before_eligible := private.cat_listing_supply_row_eligible_v1(
      old.status, old.moderation_status, old.approved_version_id
    );
    v_after_eligible :=
      private.cat_listing_supply_row_eligible_v1(new.status, new.moderation_status, new.approved_version_id)
      and private.cat_listing_supply_version_valid_v1(new.id, new.professional_id, new.approved_version_id);

    v_before_dimensions := private.cat_listing_supply_dimensions_v1(
      old.id, old.professional_id, old.category_id, old.metadata, old.city, old.state, old.approved_version_id
    );
    v_after_dimensions := private.cat_listing_supply_dimensions_v1(
      new.id, new.professional_id, new.category_id, new.metadata, new.city, new.state, new.approved_version_id
    );

    v_source_authority := 'CAT-001/public.services.update';
    v_should_record :=
      v_before_eligible is distinct from v_after_eligible
      or (
        v_before_eligible
        and v_after_eligible
        and (
          v_before_version is distinct from v_after_version
          or v_before_dimensions is distinct from v_after_dimensions
        )
      );
  end if;

  if not v_should_record then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select coalesce(max(event_row.sequence_no), 0) + 1
    into v_sequence
  from private.cat_listing_visibility_events_v1 event_row
  where event_row.service_id = v_service_id;

  v_source_transition_key := pg_catalog.format(
    'cat-a06:%s:%s:%s:%s',
    v_service_id,
    v_transaction_id,
    v_sequence,
    pg_catalog.lower(tg_op)
  );

  insert into private.cat_listing_visibility_events_v1 (
    service_id,
    sequence_no,
    occurred_at,
    transaction_id,
    source_authority,
    source_transition_key,
    eligible_before,
    eligible_after,
    visible_version_id_before,
    visible_version_id_after,
    dimension_snapshot_before,
    dimension_snapshot_after,
    coverage_kind
  ) values (
    v_service_id,
    v_sequence,
    pg_catalog.transaction_timestamp(),
    v_transaction_id,
    v_source_authority,
    v_source_transition_key,
    v_before_eligible,
    v_after_eligible,
    v_before_version,
    v_after_version,
    case when v_before_eligible then v_before_dimensions else null end,
    case when v_after_eligible then v_after_dimensions else null end,
    'observed_transition'
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.cat_listing_supply_row_eligible_v1(text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.cat_listing_supply_version_valid_v1(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.cat_listing_supply_dimensions_v1(uuid, uuid, uuid, jsonb, text, text, uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.capture_cat_listing_visibility_transition_v1()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_cat_listing_visibility_insert_v1 on public.services;
create trigger trg_cat_listing_visibility_insert_v1
after insert on public.services
for each row execute function private.capture_cat_listing_visibility_transition_v1();

drop trigger if exists trg_cat_listing_visibility_update_v1 on public.services;
create trigger trg_cat_listing_visibility_update_v1
after update of status, moderation_status, approved_version_id, professional_id, category_id, city, state, metadata
on public.services
for each row execute function private.capture_cat_listing_visibility_transition_v1();

drop trigger if exists trg_cat_listing_visibility_delete_v1 on public.services;
create trigger trg_cat_listing_visibility_delete_v1
before delete on public.services
for each row execute function private.capture_cat_listing_visibility_transition_v1();

insert into private.cat_listing_visibility_ledger_state_v1 (
  contract_id,
  schema_version,
  activated_at,
  coverage_before_activation,
  existing_listing_baseline_policy
) values (
  'cat-a06-listing-visibility-timeline-v1',
  1,
  pg_catalog.transaction_timestamp(),
  'partial',
  'not_performed_synthetic_only'
)
on conflict (contract_id) do nothing;

comment on table private.cat_listing_visibility_events_v1 is
  'CAT-A06 append-only server-owned listing visibility/version transition ledger. No historical visibility is inferred from mutable current service state.';
comment on table private.cat_listing_visibility_ledger_state_v1 is
  'CAT-A06 immutable activation boundary. Existing pre-activation listing coverage remains partial unless separately authorized.';
comment on function private.capture_cat_listing_visibility_transition_v1() is
  'CAT-A06 recorder attached to the canonical CAT services row authority; it does not mutate listing lifecycle state.';

commit;
