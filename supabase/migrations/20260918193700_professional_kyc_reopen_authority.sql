-- PROF-001 / PROF-B05 G3
-- Re-materialize the staging-proven reopen authority in migration lineage.
-- Historical migration 028 remains untouched.

do $validation$
begin
  if pg_catalog.to_regclass('public.professional_identity_verifications') is null
     or pg_catalog.to_regclass('public.professional_profiles') is null
     or pg_catalog.to_regclass('public.verification_events') is null then
    raise exception using errcode = '55000', message = 'DOKE_KYC_REOPEN_SCHEMA_MISSING';
  end if;

  if pg_catalog.to_regprocedure('public.execute_self_service_operation_internal(uuid,text,jsonb)') is null then
    raise exception using errcode = '55000', message = 'DOKE_KYC_SELF_SERVICE_DISPATCHER_MISSING';
  end if;
end
$validation$;

create or replace function public.reopen_own_professional_identity_verification()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := pg_catalog.now();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select *
    into v_row
    from public.professional_identity_verifications
   where user_id = v_uid
   for update;

  if not found then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_row.status <> 'rejected' then
    return pg_catalog.jsonb_build_object(
      'id', v_row.id,
      'userId', v_row.user_id,
      'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
      'status', v_row.status,
      'currentStep', v_row.current_step,
      'payload', pg_catalog.coalesce(v_row.payload, '{}'::jsonb),
      'updatedAt', v_row.updated_at
    );
  end if;

  update public.professional_identity_verifications
     set status = 'not_started',
         current_step = 1,
         documents = '{}'::jsonb,
         reviewer_id = null,
         rejection_reason = null,
         review_started_at = null,
         decided_at = null,
         submitted_at = null,
         updated_at = v_now
   where id = v_row.id
   returning * into v_row;

  update public.professional_profiles
     set document_status = 'unverified',
         verification_status = 'not_started',
         updated_at = v_now
   where user_id = v_uid;

  insert into public.verification_events (
    user_id,
    type,
    status,
    reason,
    created_at
  ) values (
    v_uid,
    'professional_document',
    'pending',
    'Verificação reaberta pelo usuário para correção e novo envio.',
    v_now
  );

  return pg_catalog.jsonb_build_object(
    'id', v_row.id,
    'userId', v_row.user_id,
    'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
    'status', 'not_started',
    'currentStep', 1,
    'payload', pg_catalog.coalesce(v_row.payload, '{}'::jsonb),
    'updatedAt', v_now
  );
end;
$function$;

revoke all on function public.reopen_own_professional_identity_verification()
  from public, anon, authenticated, service_role;
grant execute on function public.reopen_own_professional_identity_verification()
  to service_role;

comment on function public.reopen_own_professional_identity_verification() is
  'Server-only KYC reopen authority. Rejected verification returns to not_started, clears mutable evidence pointers and emits a compatibility pending event.';

notify pgrst, 'reload schema';
