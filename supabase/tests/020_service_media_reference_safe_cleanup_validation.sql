-- CAT-001 / CAT-A04 reference-safe service-media cleanup validation.
-- No account or persistent synthetic entity is created. All mutations are rolled back.

begin;

do $validation$
declare
  v_definition text;
  v_actor uuid;
  v_batch jsonb;
begin
  if to_regprocedure('private.service_media_item_is_referenced(uuid)') is null then
    raise exception 'CAT_A04_MEDIA_REFERENCE_PROOF_MISSING';
  end if;
  if to_regprocedure('private.reconcile_service_media_cleanup_state()') is null then
    raise exception 'CAT_A04_MEDIA_RECONCILIATION_MISSING';
  end if;
  if to_regprocedure('public.prepare_service_media_cleanup_batch_internal(uuid,integer)') is null then
    raise exception 'CAT_A04_MEDIA_CLEANUP_PREPARE_MISSING';
  end if;
  if to_regprocedure('public.complete_service_media_cleanup_batch_internal(uuid,jsonb)') is null then
    raise exception 'CAT_A04_MEDIA_CLEANUP_COMPLETE_MISSING';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.service_versions'::regclass
      and tgname = 'service_media_item_version_status_sync'
      and not tgisinternal
  ) then
    raise exception 'CAT_A04_MEDIA_VERSION_STATUS_TRIGGER_MISSING';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'service_media_upload_items'
      and column_name = 'cleanup_claimed_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'service_media_upload_items'
      and column_name = 'cleanup_claimed_by'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'service_media_upload_items'
      and column_name = 'cleanup_attempts'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'service_media_upload_items'
      and column_name = 'last_cleanup_error'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'private' and table_name = 'service_media_upload_items'
      and column_name = 'deleted_at'
  ) then
    raise exception 'CAT_A04_MEDIA_CLEANUP_COLUMNS_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'private.service_media_upload_items'::regclass
      and conname = 'service_media_upload_items_status_check'
      and pg_get_constraintdef(oid) like '%cleanup_claimed%'
      and pg_get_constraintdef(oid) like '%delete_failed%'
  ) then
    raise exception 'CAT_A04_MEDIA_CLEANUP_STATUS_CONTRACT_MISSING';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'private' and tablename = 'service_media_upload_intents'
      and indexname = 'idx_service_media_upload_intents_service_id'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'private' and tablename = 'service_media_upload_intents'
      and indexname = 'idx_service_media_upload_intents_service_version_id'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'private' and tablename = 'service_media_upload_items'
      and indexname = 'idx_service_media_upload_items_actor_id'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'private' and tablename = 'service_media_upload_items'
      and indexname = 'idx_service_media_upload_items_service_id'
  ) or not exists (
    select 1 from pg_indexes
    where schemaname = 'private' and tablename = 'service_media_upload_items'
      and indexname = 'idx_service_media_upload_items_cleanup_claimed_by'
  ) then
    raise exception 'CAT_A04_MEDIA_CLEANUP_FK_INDEX_MISSING';
  end if;

  select pg_get_functiondef('private.service_media_item_is_referenced(uuid)'::regprocedure)
  into v_definition;
  if position('public.service_media' in v_definition) = 0
     or position('public.service_versions' in v_definition) = 0
     or position('public.services' in v_definition) = 0
     or position('mediaAssets' in v_definition) = 0 then
    raise exception 'CAT_A04_MEDIA_REFERENCE_PROOF_INCOMPLETE';
  end if;

  select pg_get_functiondef('private.reconcile_service_media_cleanup_state()'::regprocedure)
  into v_definition;
  if position('2 hours 15 minutes' in v_definition) = 0
     or position('30 days' in v_definition) = 0
     or position('DOKE_SERVICE_MEDIA_CLEANUP_STALE_CLAIM_RECOVERED' in v_definition) = 0 then
    raise exception 'CAT_A04_MEDIA_RECONCILIATION_CONTRACT_INCOMPLETE';
  end if;

  select pg_get_functiondef('public.prepare_service_media_cleanup_batch_internal(uuid,integer)'::regprocedure)
  into v_definition;
  if position('FOR UPDATE SKIP LOCKED' in upper(v_definition)) = 0
     or position('service_media_item_is_referenced' in v_definition) = 0 then
    raise exception 'CAT_A04_MEDIA_CLEANUP_CLAIM_CONTRACT_INCOMPLETE';
  end if;

  select pg_get_functiondef('public.complete_service_media_cleanup_batch_internal(uuid,jsonb)'::regprocedure)
  into v_definition;
  if position('delete from storage.objects' in lower(v_definition)) > 0 then
    raise exception 'CAT_A04_MEDIA_SQL_STORAGE_DELETE_FORBIDDEN';
  end if;

  if has_function_privilege('anon', 'public.prepare_service_media_cleanup_batch_internal(uuid,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.prepare_service_media_cleanup_batch_internal(uuid,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.complete_service_media_cleanup_batch_internal(uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.complete_service_media_cleanup_batch_internal(uuid,jsonb)', 'EXECUTE') then
    raise exception 'CAT_A04_MEDIA_BROWSER_CLEANUP_RPC_EXECUTE_REMAINS';
  end if;

  if not has_function_privilege('service_role', 'public.prepare_service_media_cleanup_batch_internal(uuid,integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.complete_service_media_cleanup_batch_internal(uuid,jsonb)', 'EXECUTE') then
    raise exception 'CAT_A04_MEDIA_SERVICE_ROLE_CLEANUP_RPC_MISSING';
  end if;

  select u.id into v_actor
  from public.users u
  where u.status = 'active' and u.role in ('admin','moderator')
  order by u.created_at
  limit 1;

  if v_actor is not null then
    v_batch := public.prepare_service_media_cleanup_batch_internal(v_actor, 5);
    if jsonb_typeof(v_batch) <> 'object'
       or jsonb_typeof(coalesce(v_batch -> 'items', 'null'::jsonb)) <> 'array' then
      raise exception 'CAT_A04_MEDIA_CLEANUP_BATCH_RUNTIME_INVALID';
    end if;
  end if;
end;
$validation$;

rollback;
