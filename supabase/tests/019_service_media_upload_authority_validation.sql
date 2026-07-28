-- CAT-001 / CAT-A04 immutable service-media upload authority validation.
-- Structural only; no account or persistent synthetic entity is created.

begin;

do $validation$
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
    ) then
    raise exception 'CAT_A04_SERVICE_ROLE_EXECUTE_MISSING';
  end if;
end;
$validation$;

rollback;
