\set ON_ERROR_STOP on
-- P31-MSG-A05-ISOLATED-REGRESSION-001: repository-contract dependency baseline.
-- NOT a faithful staging replica. Hosted helper bodies, owners and complete KYC/ANA schemas are unproved.
-- Only a fresh, unlinked, disposable native Supabase stack may load this fixture.
-- Parent runner proves loopback endpoints/container ownership; a client GUC alone is not identity.
DO $gate$ BEGIN
 IF current_database()<>'postgres' OR current_user<>'postgres'
 OR current_setting('kontrat.isolated_storage_fixture',true) IS DISTINCT FROM 'true'
 OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 OR to_regprocedure('storage.allow_any_operation(text[])') IS NULL
 OR to_regprocedure('extensions.digest(bytea,text)') IS NULL
 OR to_regprocedure('extensions.gen_random_uuid()') IS NULL THEN
 RAISE EXCEPTION 'REFUSE_NON_NATIVE_DEPENDENCY_FIXTURE'; END IF;
END $gate$;

-- SOURCE fe74f69d1790ba44981c790f2939c29b18bce537:supabase/migrations/096_identity_helper_invoker_hardening.sql
-- Git-blob 6f545bab979d4509f4cbda0e7996697725ac6585; selected-LF-SHA256 2ccb30d155c87d69d15e34603c2337c48a0b2941d446018bad4ef0947a6037e7
-- Doke SEC-001 / identity batch 1.
-- Removes unnecessary RLS bypass from account-role helper functions.

create or replace function public.current_user_role()
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    return 'guest';
  end if;

  select case when u.status = 'active' then u.role else 'guest' end
    into v_role
    from public.users u
   where u.id = v_uid;

  return coalesce(v_role, 'guest');
end;
$$;

create or replace function public.is_active_admin_or_moderator()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.current_user_role() in ('admin', 'moderator')
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_active_admin_or_moderator() from public;
grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.is_active_admin_or_moderator() to anon, authenticated, service_role;

-- SOURCE fe74f69d1790ba44981c790f2939c29b18bce537:supabase/migrations/134_transaction_attachment_folder_depth_fix.sql
-- Git-blob 8a13e70d969b44891e296b6ac925fee9a9e2fbc6; selected-LF-SHA256 6891526f18212f0c9964495318edf41f43b33e5f74c4c62f14db8ce2a72a5d33
create or replace function private.can_access_transaction_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
  account_status text;
  parts text[];
  resource_kind text;
  resource_id uuid;
begin
  if actor_id is null then
    return false;
  end if;

  select pg_catalog.lower(account.status)
    into account_status
    from public.users account
   where account.id = actor_id;

  if account_status is distinct from 'active' then
    return false;
  end if;

  parts := storage.foldername(object_name);
  if coalesce(pg_catalog.array_length(parts, 1), 0) < 3 then
    return false;
  end if;

  resource_kind := parts[1];
  begin
    resource_id := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if resource_kind = 'orders' then
    return exists (
      select 1
        from public.orders order_row
       where order_row.id = resource_id
         and actor_id in (order_row.client_id, order_row.professional_id)
    );
  end if;

  if resource_kind = 'conversations' then
    return exists (
      select 1
        from public.conversations conversation
       where conversation.id = resource_id
         and actor_id in (conversation.client_id, conversation.professional_id)
    );
  end if;

  return false;
end;
$$;

revoke all privileges on function private.can_access_transaction_attachment(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_transaction_attachment(text) to authenticated;

-- Narrow KYC table scaffold: only columns consumed by the PR #489 read contract.
-- Excludes submissions, crypto secrets, intents, lifecycle, retention and physical GC.
CREATE TABLE public.professional_identity_verifications(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.users(id),
 documents jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(documents)='object')
);
ALTER TABLE public.professional_identity_verifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.professional_identity_verifications FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.professional_identity_verifications TO authenticated;
GRANT ALL ON public.professional_identity_verifications TO service_role;

-- SOURCE de8d7fea5dc56d309b94b90f0c67ed5fc366a10c:supabase/migrations/097_professional_kyc_table_authority.sql
-- Git-blob bc7b06616de369d065fcdf880520b149784b32db; selected-LF-SHA256 bcd87d461e103cd1895ee5190531910173389f23cf232ee8a493043012fc7b38
create policy professional_identity_verifications_owner_or_reviewer_read
on public.professional_identity_verifications
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'moderator')
  )
);

-- SOURCE de8d7fea5dc56d309b94b90f0c67ed5fc366a10c:docs/PROFESSIONAL-VERIFICATION-STORAGE-SETUP.md
-- Git-blob 9f609d46c5fbbaf1722226ce0b2305f4efbfa4e5; selected-LF-SHA256 cae72a8baff8590d8bc162161debed312f2d9ab7687a3277935dae30a78506ff
CREATE POLICY professional_verification_reference_read ON storage.objects
FOR SELECT TO authenticated USING (
bucket_id = 'professional-verification-media'
and storage.allow_any_operation(array[
  'storage.object.sign',
  'storage.object.get_authenticated'
])
and exists (
  select 1
  from public.professional_identity_verifications piv
  cross join lateral jsonb_each(coalesce(piv.documents, '{}'::jsonb)) as doc(field, payload)
  where doc.payload ->> 'bucket' = 'professional-verification-media'
    and doc.payload ->> 'path' = name
    and (
      piv.user_id = (select auth.uid())
      or public.is_active_admin_or_moderator()
    )
)
);

-- Native storage.allow_any_operation()/foldername() are deliberately NOT redefined.
-- Snapshot confirms four transaction policies; generator installs those separately.
-- ANA source tables only: extract DDL/indexes/ACL, NOT order command/projection triggers from migration 053.
-- services/service_versions are explicit ID-only scaffolds, not certified CAT implementations.

-- SOURCE 6eb8e55317a20f88f8ecb0f083c00c101b2afc59:supabase/migrations/053_order_transaction_events.sql
-- Git-blob 57abe8c5b48cec970085e5c34fc976d86db821de; selected-LF-SHA256 ad10e1e753acc62db305d1add542305598008b1535d54d8c21d096dbb80ebbbe
-- Doke: transactional order domain events and synchronous projections.
-- Every accepted order status transition now produces one canonical event and
-- projects history, conversation metadata, notifications and metrics inside
-- the same database transaction.

create table if not exists private.order_domain_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  sequence_no bigint not null check (sequence_no > 0),
  event_type text not null check (event_type in (
    'order.requested',
    'order.accepted',
    'order.quoted',
    'order.scheduled',
    'order.started',
    'order.completed',
    'order.cancelled',
    'order.disputed'
  )),
  previous_status text,
  next_status text not null,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  cache_tags text[] not null default '{}'::text[],
  delivery_status text not null default 'ready' check (delivery_status in ('ready', 'processing', 'completed', 'failed')),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (order_id, sequence_no)
);

create index if not exists idx_order_domain_events_delivery
  on private.order_domain_events(delivery_status, available_at, created_at)
  where delivery_status in ('ready', 'failed');

create index if not exists idx_order_domain_events_order_created
  on private.order_domain_events(order_id, created_at desc);

create table if not exists private.order_metric_events (
  id uuid primary key default gen_random_uuid(),
  order_event_id uuid not null unique references private.order_domain_events(id) on delete cascade,
  event_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null,
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_metric_events_professional_created
  on private.order_metric_events(professional_id, created_at desc)
  where professional_id is not null;

create index if not exists idx_order_metric_events_service_created
  on private.order_metric_events(service_id, created_at desc)
  where service_id is not null;

revoke all on private.order_domain_events from public, anon, authenticated;
revoke all on private.order_metric_events from public, anon, authenticated;
grant select, update on private.order_domain_events to service_role;
grant select on private.order_metric_events to service_role;

-- SOURCE 6eb8e55317a20f88f8ecb0f083c00c101b2afc59:supabase/migrations/20260918232000_ana_a03_behavioral_event_ledger.sql
-- Git-blob 89f92c627799d66b997346ca713264c8a5af39ab; selected-LF-SHA256 10b5652207db29450d4722891b9e0f098a67d9f6f4db17a903877e1a918806e8
-- ANA-001 / ANA-A03
-- Private behavioral analytics ledger and service-role-only recorder.
-- Repository migration only until explicitly applied in staging.

create table if not exists private.analytics_behavior_events_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  event_name text not null,
  event_schema_version integer not null default 1,
  taxonomy_version text not null default 'ana-event-taxonomy-v1',
  client_event_id uuid,
  payload_hash text not null,
  semantic_key text not null unique,
  actor_class text not null,
  actor_id uuid,
  analytics_session_id uuid,
  service_id uuid references public.services(id) on delete set null,
  search_request_id uuid,
  quote_session_id uuid,
  order_id uuid references public.orders(id) on delete set null,
  source_surface text not null,
  dimensions jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null,
  received_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_behavior_event_name_check check (event_name in (
    'search.executed',
    'search.result_impression',
    'search.result_clicked',
    'service.detail_viewed',
    'service.budget_cta_clicked',
    'service.message_cta_clicked',
    'quote.started',
    'quote.progressed',
    'quote.completed',
    'quote.submitted'
  )),
  constraint analytics_behavior_event_schema_check check (event_schema_version = 1),
  constraint analytics_behavior_taxonomy_check check (taxonomy_version = 'ana-event-taxonomy-v1'),
  constraint analytics_behavior_payload_hash_check check (payload_hash ~ '^[0-9a-f]{64}$'),
  constraint analytics_behavior_semantic_key_check check (length(semantic_key) between 8 and 300),
  constraint analytics_behavior_actor_class_check check (actor_class in ('anon', 'authenticated')),
  constraint analytics_behavior_actor_shape_check check (
    (actor_class = 'authenticated' and actor_id is not null)
    or (actor_class = 'anon' and actor_id is null)
  ),
  constraint analytics_behavior_surface_check check (source_surface in ('search', 'direct', 'service_detail', 'quote', 'unknown')),
  constraint analytics_behavior_time_check check (occurred_at = received_at),
  constraint analytics_behavior_dimensions_object_check check (pg_catalog.jsonb_typeof(dimensions) = 'object')
);

create unique index if not exists analytics_behavior_client_event_unique
  on private.analytics_behavior_events_v1 (analytics_session_id, client_event_id)
  where analytics_session_id is not null and client_event_id is not null;

create index if not exists analytics_behavior_event_time_idx
  on private.analytics_behavior_events_v1 (event_name, occurred_at desc);

create index if not exists analytics_behavior_service_time_idx
  on private.analytics_behavior_events_v1 (service_id, occurred_at desc)
  where service_id is not null;

create index if not exists analytics_behavior_search_time_idx
  on private.analytics_behavior_events_v1 (search_request_id, occurred_at desc)
  where search_request_id is not null;

revoke all on table private.analytics_behavior_events_v1 from public, anon, authenticated, service_role;
grant select on table private.analytics_behavior_events_v1 to service_role;

create or replace function public.record_analytics_behavior_event_v1(p_event jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_event jsonb := coalesce(p_event, '{}'::jsonb);
  v_dimensions jsonb := coalesce(v_event -> 'dimensions', '{}'::jsonb);
  v_existing private.analytics_behavior_events_v1%rowtype;
  v_id uuid;
  v_event_name text;
  v_actor_class text;
  v_actor_id uuid;
  v_client_event_id uuid;
  v_analytics_session_id uuid;
  v_service_id uuid;
  v_search_request_id uuid;
  v_quote_session_id uuid;
  v_order_id uuid;
  v_source_surface text;
  v_payload_hash text;
  v_semantic_key text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if pg_catalog.jsonb_typeof(v_event) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_event) as event_key(key)
    where event_key.key not in (
      'eventName','eventSchemaVersion','taxonomyVersion','clientEventId','payloadHash','semanticKey',
      'actorClass','actorId','analyticsSessionId','serviceId','searchRequestId','quoteSessionId',
      'orderId','sourceSurface','dimensions'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UNKNOWN_FIELD';
  end if;

  if pg_catalog.jsonb_typeof(v_dimensions) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSIONS_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_dimensions) as dimension_key(key)
    where dimension_key.key not in (
      'resultPosition','rankingVersion','stepIndex','questionCount','answeredQuestionCount',
      'queryPresent','categoryCount','locationScope','serviceMode','resultCount'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSION_UNKNOWN_FIELD';
  end if;

  v_event_name := pg_catalog.btrim(coalesce(v_event ->> 'eventName', ''));
  v_actor_class := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'actorClass', '')));
  v_source_surface := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'sourceSurface', 'unknown')));
  v_payload_hash := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'payloadHash', '')));
  v_semantic_key := pg_catalog.btrim(coalesce(v_event ->> 'semanticKey', ''));

  if v_event_name not in (
    'search.executed','search.result_impression','search.result_clicked','service.detail_viewed',
    'service.budget_cta_clicked','service.message_cta_clicked','quote.started','quote.progressed',
    'quote.completed','quote.submitted'
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_NAME_INVALID';
  end if;
  if coalesce((v_event ->> 'eventSchemaVersion')::integer, 0) <> 1
     or coalesce(v_event ->> 'taxonomyVersion', '') <> 'ana-event-taxonomy-v1' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_VERSION_INVALID';
  end if;
  if v_actor_class not in ('anon','authenticated')
     or v_source_surface not in ('search','direct','service_detail','quote','unknown')
     or v_payload_hash !~ '^[0-9a-f]{64}$'
     or length(v_semantic_key) not between 8 and 300 then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_SHAPE_INVALID';
  end if;

  begin
    v_actor_id := nullif(v_event ->> 'actorId', '')::uuid;
    v_client_event_id := nullif(v_event ->> 'clientEventId', '')::uuid;
    v_analytics_session_id := nullif(v_event ->> 'analyticsSessionId', '')::uuid;
    v_service_id := nullif(v_event ->> 'serviceId', '')::uuid;
    v_search_request_id := nullif(v_event ->> 'searchRequestId', '')::uuid;
    v_quote_session_id := nullif(v_event ->> 'quoteSessionId', '')::uuid;
    v_order_id := nullif(v_event ->> 'orderId', '')::uuid;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UUID_INVALID';
  end;

  if (v_actor_class = 'authenticated' and v_actor_id is null)
     or (v_actor_class = 'anon' and v_actor_id is not null) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_ACTOR_INVALID';
  end if;

  if v_analytics_session_id is not null and v_client_event_id is not null then
    select * into v_existing
    from private.analytics_behavior_events_v1
    where analytics_session_id = v_analytics_session_id
      and client_event_id = v_client_event_id;
    if found then
      if v_existing.payload_hash <> v_payload_hash then
        raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
      end if;
      return v_existing.id;
    end if;
  end if;

  select * into v_existing
  from private.analytics_behavior_events_v1
  where semantic_key = v_semantic_key;
  if found then
    return v_existing.id;
  end if;

  begin
    insert into private.analytics_behavior_events_v1 (
      event_name,event_schema_version,taxonomy_version,client_event_id,payload_hash,semantic_key,
      actor_class,actor_id,analytics_session_id,service_id,search_request_id,quote_session_id,
      order_id,source_surface,dimensions,occurred_at,received_at
    ) values (
      v_event_name,1,'ana-event-taxonomy-v1',v_client_event_id,v_payload_hash,v_semantic_key,
      v_actor_class,v_actor_id,v_analytics_session_id,v_service_id,v_search_request_id,v_quote_session_id,
      v_order_id,v_source_surface,v_dimensions,v_now,v_now
    )
    returning id into v_id;

    return v_id;
  exception when unique_violation then
    -- A concurrent retry or semantically duplicate event may have committed
    -- after the pre-insert checks. Re-resolve deterministically instead of
    -- leaking a transient uniqueness error to the caller.
    if v_analytics_session_id is not null and v_client_event_id is not null then
      select * into v_existing
      from private.analytics_behavior_events_v1
      where analytics_session_id = v_analytics_session_id
        and client_event_id = v_client_event_id;

      if found then
        if v_existing.payload_hash <> v_payload_hash then
          raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
        end if;
        return v_existing.id;
      end if;
    end if;

    select * into v_existing
    from private.analytics_behavior_events_v1
    where semantic_key = v_semantic_key;

    if found then
      return v_existing.id;
    end if;

    raise;
  end;
end;
$$;

revoke all on function public.record_analytics_behavior_event_v1(jsonb) from public, anon, authenticated;
grant execute on function public.record_analytics_behavior_event_v1(jsonb) to service_role;

comment on table private.analytics_behavior_events_v1 is
  'ANA-A03 private canonical behavioral event ledger. Browser roles have no direct access.';
comment on function public.record_analytics_behavior_event_v1(jsonb) is
  'ANA-A03 service-role-only canonical behavioral event recorder with idempotency and semantic deduplication.';

-- SOURCE 6eb8e55317a20f88f8ecb0f083c00c101b2afc59:supabase/migrations/20260919002000_ana_a03_server_event_idempotency_hardening.sql
-- Git-blob 59ff2a049a4a09fd0a340e2b131f92de6623cfd4; selected-LF-SHA256 acbf972c7cd40eaea408f4f14854bf7153e5df3106128eb5e09d8456626fe593
-- ANA-A03 follow-up hardening.
-- Applied after ana_a03_behavioral_event_ledger; preserves immutable migration history.
create unique index if not exists analytics_behavior_server_client_event_unique
  on private.analytics_behavior_events_v1 (client_event_id)
  where analytics_session_id is null and client_event_id is not null;

create or replace function public.record_analytics_behavior_event_v1(p_event jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_event jsonb := coalesce(p_event, '{}'::jsonb);
  v_dimensions jsonb := coalesce(v_event -> 'dimensions', '{}'::jsonb);
  v_existing private.analytics_behavior_events_v1%rowtype;
  v_id uuid;
  v_event_name text;
  v_actor_class text;
  v_actor_id uuid;
  v_client_event_id uuid;
  v_analytics_session_id uuid;
  v_service_id uuid;
  v_search_request_id uuid;
  v_quote_session_id uuid;
  v_order_id uuid;
  v_source_surface text;
  v_payload_hash text;
  v_semantic_key text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if pg_catalog.jsonb_typeof(v_event) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_event) as event_key(key)
    where event_key.key not in (
      'eventName','eventSchemaVersion','taxonomyVersion','clientEventId','payloadHash','semanticKey',
      'actorClass','actorId','analyticsSessionId','serviceId','searchRequestId','quoteSessionId',
      'orderId','sourceSurface','dimensions'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UNKNOWN_FIELD';
  end if;

  if pg_catalog.jsonb_typeof(v_dimensions) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSIONS_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_dimensions) as dimension_key(key)
    where dimension_key.key not in (
      'resultPosition','rankingVersion','stepIndex','questionCount','answeredQuestionCount',
      'queryPresent','categoryCount','locationScope','serviceMode','resultCount'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSION_UNKNOWN_FIELD';
  end if;

  v_event_name := pg_catalog.btrim(coalesce(v_event ->> 'eventName', ''));
  v_actor_class := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'actorClass', '')));
  v_source_surface := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'sourceSurface', 'unknown')));
  v_payload_hash := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'payloadHash', '')));
  v_semantic_key := pg_catalog.btrim(coalesce(v_event ->> 'semanticKey', ''));

  if v_event_name not in (
    'search.executed','search.result_impression','search.result_clicked','service.detail_viewed',
    'service.budget_cta_clicked','service.message_cta_clicked','quote.started','quote.progressed',
    'quote.completed','quote.submitted'
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_NAME_INVALID';
  end if;
  if coalesce((v_event ->> 'eventSchemaVersion')::integer, 0) <> 1
     or coalesce(v_event ->> 'taxonomyVersion', '') <> 'ana-event-taxonomy-v1' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_VERSION_INVALID';
  end if;
  if v_actor_class not in ('anon','authenticated')
     or v_source_surface not in ('search','direct','service_detail','quote','unknown')
     or v_payload_hash !~ '^[0-9a-f]{64}$'
     or length(v_semantic_key) not between 8 and 300 then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_SHAPE_INVALID';
  end if;

  begin
    v_actor_id := nullif(v_event ->> 'actorId', '')::uuid;
    v_client_event_id := nullif(v_event ->> 'clientEventId', '')::uuid;
    v_analytics_session_id := nullif(v_event ->> 'analyticsSessionId', '')::uuid;
    v_service_id := nullif(v_event ->> 'serviceId', '')::uuid;
    v_search_request_id := nullif(v_event ->> 'searchRequestId', '')::uuid;
    v_quote_session_id := nullif(v_event ->> 'quoteSessionId', '')::uuid;
    v_order_id := nullif(v_event ->> 'orderId', '')::uuid;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UUID_INVALID';
  end;

  if (v_actor_class = 'authenticated' and v_actor_id is null)
     or (v_actor_class = 'anon' and v_actor_id is not null) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_ACTOR_INVALID';
  end if;

  if v_client_event_id is not null then
    if v_analytics_session_id is null then
      select * into v_existing
      from private.analytics_behavior_events_v1
      where analytics_session_id is null
        and client_event_id = v_client_event_id;
    else
      select * into v_existing
      from private.analytics_behavior_events_v1
      where analytics_session_id = v_analytics_session_id
        and client_event_id = v_client_event_id;
    end if;

    if found then
      if v_existing.payload_hash <> v_payload_hash then
        raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
      end if;
      return v_existing.id;
    end if;
  end if;

  select * into v_existing
  from private.analytics_behavior_events_v1
  where semantic_key = v_semantic_key;
  if found then
    return v_existing.id;
  end if;

  begin
    insert into private.analytics_behavior_events_v1 (
      event_name,event_schema_version,taxonomy_version,client_event_id,payload_hash,semantic_key,
      actor_class,actor_id,analytics_session_id,service_id,search_request_id,quote_session_id,
      order_id,source_surface,dimensions,occurred_at,received_at
    ) values (
      v_event_name,1,'ana-event-taxonomy-v1',v_client_event_id,v_payload_hash,v_semantic_key,
      v_actor_class,v_actor_id,v_analytics_session_id,v_service_id,v_search_request_id,v_quote_session_id,
      v_order_id,v_source_surface,v_dimensions,v_now,v_now
    )
    returning id into v_id;

    return v_id;
  exception when unique_violation then
    -- A concurrent retry or semantically duplicate event may have committed
    -- after the pre-insert checks. Re-resolve deterministically instead of
    -- leaking a transient uniqueness error to the caller.
    if v_client_event_id is not null then
      if v_analytics_session_id is null then
        select * into v_existing
        from private.analytics_behavior_events_v1
        where analytics_session_id is null
          and client_event_id = v_client_event_id;
      else
        select * into v_existing
        from private.analytics_behavior_events_v1
        where analytics_session_id = v_analytics_session_id
          and client_event_id = v_client_event_id;
      end if;

      if found then
        if v_existing.payload_hash <> v_payload_hash then
          raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
        end if;
        return v_existing.id;
      end if;
    end if;

    select * into v_existing
    from private.analytics_behavior_events_v1
    where semantic_key = v_semantic_key;

    if found then
      return v_existing.id;
    end if;

    raise;
  end;
end;
$$;

comment on function public.record_analytics_behavior_event_v1(jsonb) is
  'ANA-A03 server-only behavioral event recorder with idempotency drift detection for both session-bound and server-originated client event IDs.';

-- SOURCE 6eb8e55317a20f88f8ecb0f083c00c101b2afc59:supabase/migrations/20260918234000_ana_a05_reconciliation_runtime.sql
-- Git-blob 3bc753fe72a9a031ca43664ac28c8a659920c7ac; selected-LF-SHA256 ab181980fd1ebf6406fe8d154d045dadbc9fc2e9e5f272468d2668d7b4ed7cd0
-- ANA-001 / ANA-A05
-- Canonical ORD reconciliation and low-cardinality analytics data-quality rollups.
-- Repository migration only until explicitly applied in staging.

create table if not exists private.analytics_reconciliation_runs_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  source_domain text not null,
  projection_domain text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  source_count bigint not null,
  projection_count bigint not null,
  reconciliation_state text not null,
  divergence_counts jsonb not null default '{}'::jsonb,
  source_fingerprint text not null,
  projection_fingerprint text not null,
  comparison_fingerprint text not null,
  observed_at timestamptz not null default pg_catalog.clock_timestamp(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_reconciliation_window_check check (window_end > window_start),
  constraint analytics_reconciliation_count_check check (source_count >= 0 and projection_count >= 0),
  constraint analytics_reconciliation_state_check check (reconciliation_state in ('matched','diverged','blocked','not_applicable')),
  constraint analytics_reconciliation_source_hash_check check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint analytics_reconciliation_projection_hash_check check (projection_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint analytics_reconciliation_comparison_hash_check check (comparison_fingerprint ~ '^[0-9a-f]{64}$')
);

create table if not exists private.analytics_data_quality_rollups_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  metric_key text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  sample_count bigint not null,
  value numeric,
  health_state text not null,
  source_run_id uuid references private.analytics_reconciliation_runs_v1(id) on delete cascade,
  observed_at timestamptz not null default pg_catalog.clock_timestamp(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_dq_window_check check (window_end > window_start),
  constraint analytics_dq_sample_check check (sample_count >= 0),
  constraint analytics_dq_health_check check (health_state in ('no_data','healthy','warning','critical'))
);

create index if not exists analytics_reconciliation_runs_time_idx
  on private.analytics_reconciliation_runs_v1 (observed_at desc);

create index if not exists analytics_dq_rollups_metric_time_idx
  on private.analytics_data_quality_rollups_v1 (metric_key, observed_at desc);

revoke all on table private.analytics_reconciliation_runs_v1 from public, anon, authenticated, service_role;
revoke all on table private.analytics_data_quality_rollups_v1 from public, anon, authenticated, service_role;
grant select on table private.analytics_reconciliation_runs_v1 to service_role;
grant select on table private.analytics_data_quality_rollups_v1 to service_role;

create or replace function public.run_analytics_order_reconciliation_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_source_count bigint;
  v_projection_count bigint;
  v_projection_missing bigint;
  v_source_missing bigint;
  v_event_type_mismatch bigint;
  v_subject_mismatch bigint;
  v_timestamp_mismatch bigint;
  v_dimension_mismatch bigint;
  v_source_payload jsonb;
  v_projection_payload jsonb;
  v_source_hash text;
  v_projection_hash text;
  v_divergences jsonb;
  v_comparison_hash text;
  v_state text;
  v_run_id uuid;
  v_missing_rate numeric;
  v_mismatch_rate numeric;
  v_mismatch_subject_count bigint;
  v_reconciliation_universe_count bigint;
  v_health text;
begin
  if p_window_end <= p_window_start then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_RECONCILIATION_WINDOW_INVALID';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.id,e.event_key,e.order_id,e.event_type,e.created_at,
      e.payload ->> 'serviceId',e.payload ->> 'clientId',e.payload ->> 'professionalId'
    ) order by e.id), '[]'::jsonb),
    count(*)
  into v_source_payload, v_source_count
  from private.order_domain_events e
  where e.created_at >= p_window_start and e.created_at < p_window_end;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.order_event_id,e.event_key,e.order_id,e.event_type,e.occurred_at,
      e.service_id,e.client_id,e.professional_id,e.dimensions
    ) order by e.order_event_id), '[]'::jsonb),
    count(*)
  into v_projection_payload, v_projection_count
  from private.order_metric_events e
  where e.occurred_at >= p_window_start and e.occurred_at < p_window_end;

  select count(*) into v_projection_missing
  from private.order_domain_events s
  left join private.order_metric_events p on p.order_event_id = s.id
  where s.created_at >= p_window_start and s.created_at < p_window_end
    and p.order_event_id is null;

  select count(*) into v_source_missing
  from private.order_metric_events p
  left join private.order_domain_events s on s.id = p.order_event_id
  where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
    and s.id is null;

  select
    count(*) filter (where s.event_type is distinct from p.event_type),
    count(*) filter (where s.order_id is distinct from p.order_id),
    count(*) filter (where s.created_at is distinct from p.occurred_at),
    count(*) filter (
      where coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
         or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
         or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
    )
  into v_event_type_mismatch, v_subject_mismatch, v_timestamp_mismatch, v_dimension_mismatch
  from private.order_domain_events s
  join private.order_metric_events p on p.order_event_id = s.id
  where s.created_at >= p_window_start and s.created_at < p_window_end;

  v_source_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_source_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_projection_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_projection_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_divergences := pg_catalog.jsonb_build_object(
    'projectionMissing',v_projection_missing,
    'sourceMissing',v_source_missing,
    'duplicateProjection',0,
    'eventTypeMismatch',v_event_type_mismatch,
    'subjectMismatch',v_subject_mismatch,
    'timestampMismatch',v_timestamp_mismatch,
    'dimensionMismatch',v_dimension_mismatch
  );
  with source_window as (
    select s.id,s.order_id,s.event_type,s.created_at,s.payload
    from private.order_domain_events s
    where s.created_at >= p_window_start and s.created_at < p_window_end
  ),
  projection_window as (
    select p.order_event_id,p.order_id,p.event_type,p.occurred_at,p.service_id,p.client_id,p.professional_id
    from private.order_metric_events p
    where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
  ),
  universe as (
    select id as event_id from source_window
    union
    select order_event_id as event_id from projection_window
  ),
  mismatched as (
    select s.id as event_id
    from source_window s
    left join private.order_metric_events p on p.order_event_id = s.id
    where p.order_event_id is null
       or s.event_type is distinct from p.event_type
       or s.order_id is distinct from p.order_id
       or s.created_at is distinct from p.occurred_at
       or coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
       or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
       or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
    union
    select p.order_event_id as event_id
    from projection_window p
    left join private.order_domain_events s on s.id = p.order_event_id
    where s.id is null
  )
  select
    (select count(*) from universe),
    (select count(*) from mismatched)
  into v_reconciliation_universe_count, v_mismatch_subject_count;

  v_state := case
    when v_projection_missing + v_source_missing + v_event_type_mismatch + v_subject_mismatch + v_timestamp_mismatch + v_dimension_mismatch = 0
      then 'matched'
    else 'diverged'
  end;
  v_comparison_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(pg_catalog.jsonb_build_object(
        'sourceHash',v_source_hash,'projectionHash',v_projection_hash,'divergences',v_divergences
      )::text,'UTF8'
    ),'sha256'),'hex'
  );

  insert into private.analytics_reconciliation_runs_v1 (
    source_domain,projection_domain,window_start,window_end,source_count,projection_count,
    reconciliation_state,divergence_counts,source_fingerprint,projection_fingerprint,comparison_fingerprint
  ) values (
    'ORD-001','ANA-001',p_window_start,p_window_end,v_source_count,v_projection_count,
    v_state,v_divergences,v_source_hash,v_projection_hash,v_comparison_hash
  ) returning id into v_run_id;

  v_missing_rate := case when v_source_count = 0 then null else v_projection_missing::numeric / v_source_count end;
  v_mismatch_rate := case when v_reconciliation_universe_count = 0 then null else
    v_mismatch_subject_count::numeric / v_reconciliation_universe_count end;
  v_health := case
    when v_source_count = 0 then 'no_data'
    when v_state = 'matched' then 'healthy'
    else 'warning'
  end;

  insert into private.analytics_data_quality_rollups_v1 (
    metric_key,window_start,window_end,sample_count,value,health_state,source_run_id
  ) values
    ('analytics_projection_missing_rate',p_window_start,p_window_end,v_source_count,v_missing_rate,v_health,v_run_id),
    ('analytics_reconciliation_mismatch_rate',p_window_start,p_window_end,v_reconciliation_universe_count,v_mismatch_rate,v_health,v_run_id);

  return pg_catalog.jsonb_build_object(
    'runId',v_run_id,
    'sourceDomain','ORD-001',
    'projectionDomain','ANA-001',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'sourceCount',v_source_count,
    'projectionCount',v_projection_count,
    'reconciliationUniverseCount',v_reconciliation_universe_count,
    'mismatchedEventCount',v_mismatch_subject_count,
    'reconciliationState',v_state,
    'divergenceCounts',v_divergences,
    'sourceFingerprint',v_source_hash,
    'projectionFingerprint',v_projection_hash,
    'comparisonFingerprint',v_comparison_hash
  );
end;
$$;

revoke all on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) to service_role;

comment on table private.analytics_reconciliation_runs_v1 is
  'ANA-A05 append-only reconciliation evidence comparing canonical source facts with analytics projections.';
comment on table private.analytics_data_quality_rollups_v1 is
  'ANA-A05 low-cardinality technical data-quality rollups. Business KPI changes are not incidents by themselves.';
comment on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) is
  'ANA-A05 deterministic ORD-to-ANA reconciliation. It never mutates the canonical ORD source.';

-- SOURCE 6eb8e55317a20f88f8ecb0f083c00c101b2afc59:supabase/migrations/20260919002100_ana_a05_reconciliation_dimension_hardening.sql
-- Git-blob 854aede3d41b3ae56855b2dca25db20fa62f9346; selected-LF-SHA256 3524eccbf812fb91accae5d6546380548ff0011b6a83fee19e7c8c45f0974f88
-- ANA-A05 follow-up hardening.
-- Applied after ana_a05_reconciliation_runtime; preserves immutable migration history.
create or replace function public.run_analytics_order_reconciliation_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_source_count bigint;
  v_projection_count bigint;
  v_projection_missing bigint;
  v_source_missing bigint;
  v_event_key_mismatch bigint;
  v_event_type_mismatch bigint;
  v_subject_mismatch bigint;
  v_timestamp_mismatch bigint;
  v_dimension_mismatch bigint;
  v_source_payload jsonb;
  v_projection_payload jsonb;
  v_source_hash text;
  v_projection_hash text;
  v_divergences jsonb;
  v_comparison_hash text;
  v_state text;
  v_run_id uuid;
  v_missing_rate numeric;
  v_mismatch_rate numeric;
  v_mismatch_subject_count bigint;
  v_reconciliation_universe_count bigint;
  v_health text;
begin
  if p_window_end <= p_window_start then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_RECONCILIATION_WINDOW_INVALID';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.id,e.event_key,e.order_id,e.event_type,e.created_at,
      e.payload ->> 'serviceId',e.payload ->> 'clientId',e.payload ->> 'professionalId'
    ) order by e.id), '[]'::jsonb),
    count(*)
  into v_source_payload, v_source_count
  from private.order_domain_events e
  where e.created_at >= p_window_start and e.created_at < p_window_end;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.order_event_id,e.event_key,e.order_id,e.event_type,e.occurred_at,
      e.service_id,e.client_id,e.professional_id,e.dimensions
    ) order by e.order_event_id), '[]'::jsonb),
    count(*)
  into v_projection_payload, v_projection_count
  from private.order_metric_events e
  where e.occurred_at >= p_window_start and e.occurred_at < p_window_end;

  select count(*) into v_projection_missing
  from private.order_domain_events s
  left join private.order_metric_events p on p.order_event_id = s.id
  where s.created_at >= p_window_start and s.created_at < p_window_end
    and p.order_event_id is null;

  select count(*) into v_source_missing
  from private.order_metric_events p
  left join private.order_domain_events s on s.id = p.order_event_id
  where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
    and s.id is null;

  select
    count(*) filter (where s.event_key is distinct from p.event_key),
    count(*) filter (where s.event_type is distinct from p.event_type),
    count(*) filter (where s.order_id is distinct from p.order_id),
    count(*) filter (where s.created_at is distinct from p.occurred_at),
    count(*) filter (
      where coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
         or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
         or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
         or coalesce(o.service_snapshot ->> 'category','') is distinct from coalesce(p.dimensions ->> 'serviceCategory','')
         or coalesce(o.service_snapshot ->> 'city','') is distinct from coalesce(p.dimensions ->> 'serviceCity','')
         or coalesce(o.service_snapshot ->> 'state','') is distinct from coalesce(p.dimensions ->> 'serviceState','')
         or coalesce(o.service_version_id::text,'') is distinct from coalesce(p.dimensions ->> 'serviceVersionId','')
    )
  into v_event_key_mismatch, v_event_type_mismatch, v_subject_mismatch, v_timestamp_mismatch, v_dimension_mismatch
  from private.order_domain_events s
  join private.order_metric_events p on p.order_event_id = s.id
  join public.orders o on o.id = s.order_id
  where s.created_at >= p_window_start and s.created_at < p_window_end;

  v_source_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_source_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_projection_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_projection_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_divergences := pg_catalog.jsonb_build_object(
    'projectionMissing',v_projection_missing,
    'sourceMissing',v_source_missing,
    'duplicateProjection',0,
    'eventKeyMismatch',v_event_key_mismatch,
    'eventTypeMismatch',v_event_type_mismatch,
    'subjectMismatch',v_subject_mismatch,
    'timestampMismatch',v_timestamp_mismatch,
    'dimensionMismatch',v_dimension_mismatch
  );
  with source_window as (
    select s.id,s.event_key,s.order_id,s.event_type,s.created_at,s.payload
    from private.order_domain_events s
    where s.created_at >= p_window_start and s.created_at < p_window_end
  ),
  projection_window as (
    select p.order_event_id,p.order_id,p.event_type,p.occurred_at,p.service_id,p.client_id,p.professional_id
    from private.order_metric_events p
    where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
  ),
  universe as (
    select id as event_id from source_window
    union
    select order_event_id as event_id from projection_window
  ),
  mismatched as (
    select s.id as event_id
    from source_window s
    left join private.order_metric_events p on p.order_event_id = s.id
    left join public.orders o on o.id = s.order_id
    where p.order_event_id is null
       or s.event_key is distinct from p.event_key
       or s.event_type is distinct from p.event_type
       or s.order_id is distinct from p.order_id
       or s.created_at is distinct from p.occurred_at
       or coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
       or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
       or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
       or coalesce(o.service_snapshot ->> 'category','') is distinct from coalesce(p.dimensions ->> 'serviceCategory','')
       or coalesce(o.service_snapshot ->> 'city','') is distinct from coalesce(p.dimensions ->> 'serviceCity','')
       or coalesce(o.service_snapshot ->> 'state','') is distinct from coalesce(p.dimensions ->> 'serviceState','')
       or coalesce(o.service_version_id::text,'') is distinct from coalesce(p.dimensions ->> 'serviceVersionId','')
    union
    select p.order_event_id as event_id
    from projection_window p
    left join private.order_domain_events s on s.id = p.order_event_id
    where s.id is null
  )
  select
    (select count(*) from universe),
    (select count(*) from mismatched)
  into v_reconciliation_universe_count, v_mismatch_subject_count;

  v_state := case
    when v_projection_missing + v_source_missing + v_event_key_mismatch + v_event_type_mismatch + v_subject_mismatch + v_timestamp_mismatch + v_dimension_mismatch = 0
      then 'matched'
    else 'diverged'
  end;
  v_comparison_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(pg_catalog.jsonb_build_object(
        'sourceHash',v_source_hash,'projectionHash',v_projection_hash,'divergences',v_divergences
      )::text,'UTF8'
    ),'sha256'),'hex'
  );

  insert into private.analytics_reconciliation_runs_v1 (
    source_domain,projection_domain,window_start,window_end,source_count,projection_count,
    reconciliation_state,divergence_counts,source_fingerprint,projection_fingerprint,comparison_fingerprint
  ) values (
    'ORD-001','ANA-001',p_window_start,p_window_end,v_source_count,v_projection_count,
    v_state,v_divergences,v_source_hash,v_projection_hash,v_comparison_hash
  ) returning id into v_run_id;

  v_missing_rate := case when v_source_count = 0 then null else v_projection_missing::numeric / v_source_count end;
  v_mismatch_rate := case when v_reconciliation_universe_count = 0 then null else
    v_mismatch_subject_count::numeric / v_reconciliation_universe_count end;
  v_health := case
    when v_source_count = 0 then 'no_data'
    when v_state = 'matched' then 'healthy'
    else 'warning'
  end;

  insert into private.analytics_data_quality_rollups_v1 (
    metric_key,window_start,window_end,sample_count,value,health_state,source_run_id
  ) values
    ('analytics_projection_missing_rate',p_window_start,p_window_end,v_source_count,v_missing_rate,v_health,v_run_id),
    ('analytics_reconciliation_mismatch_rate',p_window_start,p_window_end,v_reconciliation_universe_count,v_mismatch_rate,v_health,v_run_id);

  return pg_catalog.jsonb_build_object(
    'runId',v_run_id,
    'sourceDomain','ORD-001',
    'projectionDomain','ANA-001',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'sourceCount',v_source_count,
    'projectionCount',v_projection_count,
    'reconciliationUniverseCount',v_reconciliation_universe_count,
    'mismatchedEventCount',v_mismatch_subject_count,
    'reconciliationState',v_state,
    'divergenceCounts',v_divergences,
    'sourceFingerprint',v_source_hash,
    'projectionFingerprint',v_projection_hash,
    'comparisonFingerprint',v_comparison_hash
  );
end;
$$;

comment on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) is
  'ANA-A05 deterministic ORD-to-ANA reconciliation including event-key parity and immutable service-dimension parity. It never mutates canonical ORD sources.';

-- Preserve exact definitions/ACLs above. No Edge runtime, scheduler, live ingestion or feature activation.
-- Snapshot records ANA deployed IDs 20260919000818 / 20260919000826 / 20260919003220 / 20260919003223.
-- Agreement of migration IDs/names is not proof of installed body equivalence.
