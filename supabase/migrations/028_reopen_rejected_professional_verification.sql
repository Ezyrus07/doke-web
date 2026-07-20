-- DOKE — 028 Reopen Rejected Professional Verification
-- Permite ao próprio usuário reabrir uma verificação rejeitada para correção e reenvio.

create or replace function public.reopen_own_professional_identity_verification()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := now();
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
    return jsonb_build_object(
      'id', v_row.id,
      'userId', v_row.user_id,
      'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
      'status', v_row.status,
      'currentStep', v_row.current_step,
      'payload', coalesce(v_row.payload, '{}'::jsonb),
      'updatedAt', v_row.updated_at
    );
  end if;

  update public.professional_identity_verifications
  set
    status = 'not_started',
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
  set
    document_status = 'not_started',
    verification_status = 'not_started',
    updated_at = v_now
  where user_id = v_uid;

  insert into public.verification_events (user_id, type, status, created_at)
  values (v_uid, 'professional_document', 'not_started', v_now);

  return jsonb_build_object(
    'id', v_row.id,
    'userId', v_row.user_id,
    'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
    'status', 'not_started',
    'currentStep', 1,
    'payload', coalesce(v_row.payload, '{}'::jsonb),
    'updatedAt', v_now
  );
end;
$$;

revoke all on function public.reopen_own_professional_identity_verification() from public;
grant execute on function public.reopen_own_professional_identity_verification() to authenticated;

notify pgrst, 'reload schema';
