-- CAT-001 / CAT-A04 immutable service-media upload authority validation.
-- Structural only; no account or persistent synthetic entity is created.

begin;

do $validation$
declare
  v_dispatcher_definition text;
  v_submit_definition text;
begin
  if to_regclass('private.service_media_upload_intents') is null then
    raise exception 'CAT_A04_UPLOAD_INTENTS_MISSING';
  end if;
  if to_regclass('private.service_media_upload_items') is null then
    raise exception 'CAT_A04_UPLOAD_ITEMS_MISSING';
  end if;
  if to_regprocedure('public.create_service_media_upload_intent_internal(uuid,text,jsonb)') is null then
    raise exception 'CAT_A04_CREATE_INTENT_FUNCTION_MISSING';
  end if;
  if to_regprocedure('public.get_service_media_upload_intent_internal(uuid,uuid)') is null then
    raise exception 'CAT_A04_GET_INTENT_FUNCTION_MISSING';
  end if;
  if to_regprocedure('public.submit_service_for_review_with_media_internal(uuid,text,jsonb,text,uuid,jsonb)') is null then
    raise exception 'CAT_A04_SUBMIT_WITH_MEDIA_FUNCTION_MISSING';
  end if;
  if to_regprocedure('public.execute_self_service_operation_internal_pre_cat_a04(uuid,text,jsonb)') is null then
    raise exception 'CAT_A04_PREVIOUS_DISPATCHER_MISSING';
  end if;

  select pg_get_functiondef('public.execute_self_service_operation_internal(uuid,text,jsonb)'::regprocedure)
  into v_dispatcher_definition;
  if position('DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED' in v_dispatcher_definition) = 0 then
    raise exception 'CAT_A04_LEGACY_SUBMIT_LOCKDOWN_MISSING';
  end if;

  select pg_get_functiondef('public.submit_service_for_review_with_media_internal(uuid,text,jsonb,text,uuid,jsonb)'::regprocedure)
  into v_submit_definition;
  if position('v_item_count < 1 or v_item_count > 3' in v_submit_definition) = 0 then
    raise exception 'CAT_A04_MEDIA_ITEM_COUNT_GUARD_MISSING';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'private.service_media_upload_intents'::regclass
      and conname = 'service_media_upload_intents_consumption_check'
  ) then
    raise exception 'CAT_A04_INTENT_CONSUMPTION_CONSTRAINT_MISSING';
  end if;

  if to_regclass('private.idx_service_media_upload_items_intent_status') is null then
    raise exception 'CAT_A04_INTENT_STATUS_INDEX_MISSING';
  end if;

  if has_table_privilege('anon', 'public.service_media', 'INSERT')
     or has_table_privilege('anon', 'public.service_media', 'UPDATE')
     or has_table_privilege('anon', 'public.service_media', 'DELETE')
     or has_table_privilege('authenticated', 'public.service_media', 'INSERT')
     or has_table_privilege('authenticated', 'public.service_media', 'UPDATE')
     or has_table_privilege('authenticated', 'public.service_media', 'DELETE') then
    raise exception 'CAT_A04_BROWSER_SERVICE_MEDIA_DML_REMAINS';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname in (
        'service_media_bucket_owner_insert',
        'service_media_bucket_owner_update',
        'service_media_bucket_owner_delete'
      )
  ) then
    raise exception 'CAT_A04_BROWSER_STORAGE_MUTATION_POLICY_REMAINS';
  end if;

  if has_function_privilege(
      'authenticated',
      'public.create_service_media_upload_intent_internal(uuid,text,jsonb)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.get_service_media_upload_intent_internal(uuid,uuid)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.submit_service_for_review_with_media_internal(uuid,text,jsonb,text,uuid,jsonb)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.execute_self_service_operation_internal(uuid,text,jsonb)',
      'EXECUTE'
    ) then
    raise exception 'CAT_A04_BROWSER_INTERNAL_RPC_EXECUTE_REMAINS';
  end if;

  if not has_function_privilege(
      'service_role',
      'public.create_service_media_upload_intent_internal(uuid,text,jsonb)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.get_service_media_upload_intent_internal(uuid,uuid)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.submit_service_for_review_with_media_internal(uuid,text,jsonb,text,uuid,jsonb)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'service_role',
      'public.execute_self_service_operation_internal(uuid,text,jsonb)',
      'EXECUTE'
    ) then
    raise exception 'CAT_A04_SERVICE_ROLE_EXECUTE_MISSING';
  end if;
end;
$validation$;

rollback;
