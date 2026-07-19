-- Doke: authoritative admin decision for professional identity verification.
-- Applies approval/rejection atomically against the authenticated admin account.

create or replace function public.decide_professional_identity_verification(
  p_verification_id uuid,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_reviewer_role text;
  v_verification public.professional_identity_verifications%rowtype;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(trim(coalesce(p_rejection_reason, '')), '');
  v_now timestamptz := now();
begin
  if v_reviewer_id is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select role into v_reviewer_role
  from public.users
  where id = v_reviewer_id and status = 'active';

  if v_reviewer_role not in ('admin', 'moderator') then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  if v_decision not in ('approve', 'reject') then
    raise exception 'INVALID_DECISION' using errcode = '22023';
  end if;

  select * into v_verification
  from public.professional_identity_verifications
  where id = p_verification_id
  for update;

  if not found then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_decision = 'reject' and (v_reason is null or char_length(v_reason) < 10) then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  if v_decision = 'approve' then
    update public.professional_identity_verifications
    set status = 'verified',
        reviewer_id = v_reviewer_id,
        review_started_at = coalesce(review_started_at, v_now),
        decided_at = v_now,
        rejection_reason = null,
        updated_at = v_now
    where id = p_verification_id;

    insert into public.professional_profiles (user_id, document_status, updated_at)
    values (v_verification.user_id, 'verified', v_now)
    on conflict (user_id) do update
      set document_status = 'verified', updated_at = excluded.updated_at;

    update public.users
    set role = 'professional', status = 'active', updated_at = v_now
    where id = v_verification.user_id;

    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'role', 'professional',
        'account_type', 'professional',
        'identity_verified', true,
        'professional_verified', true
      ),
      updated_at = v_now
    where id = v_verification.user_id;

    insert into public.verification_events (user_id, type, status, reviewer_id, reason, created_at)
    values (v_verification.user_id, 'professional_document', 'approved', v_reviewer_id, null, v_now);
  else
    update public.professional_identity_verifications
    set status = 'rejected',
        reviewer_id = v_reviewer_id,
        review_started_at = coalesce(review_started_at, v_now),
        decided_at = v_now,
        rejection_reason = v_reason,
        updated_at = v_now
    where id = p_verification_id;

    insert into public.professional_profiles (user_id, document_status, updated_at)
    values (v_verification.user_id, 'rejected', v_now)
    on conflict (user_id) do update
      set document_status = 'rejected', updated_at = excluded.updated_at;

    insert into public.verification_events (user_id, type, status, reviewer_id, reason, created_at)
    values (v_verification.user_id, 'professional_document', 'rejected', v_reviewer_id, v_reason, v_now);
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  values (
    v_reviewer_id,
    case when v_decision = 'approve' then 'professional_verification_approved' else 'professional_verification_rejected' end,
    'professional_identity_verification',
    p_verification_id,
    jsonb_build_object('user_id', v_verification.user_id, 'decision', v_decision),
    v_now
  );

  return jsonb_build_object(
    'verificationId', p_verification_id,
    'userId', v_verification.user_id,
    'status', case when v_decision = 'approve' then 'verified' else 'rejected' end,
    'role', case when v_decision = 'approve' then 'professional' else null end,
    'reviewerId', v_reviewer_id,
    'decidedAt', v_now
  );
end;
$$;

revoke all on function public.decide_professional_identity_verification(uuid, text, text) from public;
grant execute on function public.decide_professional_identity_verification(uuid, text, text) to authenticated;
