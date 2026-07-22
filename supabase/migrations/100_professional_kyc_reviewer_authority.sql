-- Doke SEC-001 / professional KYC reviewer authority.
-- Reviewer operations are service-role-only and receive an independently authenticated actor id from the Edge Function.

create or replace function private.assert_professional_kyc_reviewer(p_actor_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_KYC_REVIEWER_AUTH_REQUIRED';
  end if;

  select u.role into v_role
  from public.users u
  where u.id = p_actor_id
    and u.status = 'active'
    and u.role in ('admin', 'moderator');

  if v_role is null then
    raise exception using errcode = '42501', message = 'DOKE_KYC_REVIEWER_REQUIRED';
  end if;

  return v_role;
end;
$$;

revoke all on function private.assert_professional_kyc_reviewer(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.resolve_professional_kyc_verification_id(p_verification_id text)
returns uuid
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_input text := trim(coalesce(p_verification_id, ''));
  v_candidate uuid;
  v_id uuid;
begin
  if v_input = '' then
    raise exception using errcode = '22023', message = 'DOKE_KYC_VERIFICATION_ID_REQUIRED';
  end if;

  if v_input like 'professional_verification_%' then
    v_input := substring(v_input from char_length('professional_verification_') + 1);
  end if;

  begin
    v_candidate := v_input::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = '22023', message = 'DOKE_KYC_VERIFICATION_ID_INVALID';
  end;

  select v.id into v_id
  from public.professional_identity_verifications v
  where v.id = v_candidate
     or v.user_id = v_candidate
     or v.professional_profile_user_id = v_candidate
  order by case when v.id = v_candidate then 0 else 1 end, v.updated_at desc
  limit 1;

  if v_id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_KYC_VERIFICATION_NOT_FOUND';
  end if;

  return v_id;
end;
$$;

revoke all on function private.resolve_professional_kyc_verification_id(text)
  from public, anon, authenticated, service_role;

create or replace function public.list_professional_identity_verifications_internal(
  p_actor_id uuid,
  p_status text default null,
  p_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_status text := nullif(lower(trim(coalesce(p_status, ''))), '');
  v_limit integer := greatest(1, least(coalesce(p_limit, 100), 200));
  v_result jsonb;
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);

  if v_status is not null
     and v_status not in ('submitted', 'under_review', 'verified', 'rejected') then
    raise exception using errcode = '22023', message = 'DOKE_KYC_STATUS_INVALID';
  end if;

  select coalesce(jsonb_agg(item order by updated_at desc), '[]'::jsonb)
    into v_result
    from (
      select
        v.updated_at,
        to_jsonb(v)
          || jsonb_build_object(
            'public_verification_id', 'professional_verification_' || v.user_id::text,
            'reviewer_role', reviewer.role,
            'reviewer_name', coalesce(nullif(trim(reviewer_profile.display_name), ''), null)
          ) as item
      from public.professional_identity_verifications v
      left join public.users reviewer on reviewer.id = v.reviewer_id
      left join public.user_profiles reviewer_profile on reviewer_profile.user_id = v.reviewer_id
      where v.status in ('submitted', 'under_review', 'verified', 'rejected')
        and (v_status is null or v.status = v_status)
      order by v.updated_at desc
      limit v_limit
    ) rows_for_review;

  return v_result;
end;
$$;

create or replace function public.get_professional_identity_verification_internal(
  p_actor_id uuid,
  p_verification_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_id uuid;
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := now();
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);
  v_id := private.resolve_professional_kyc_verification_id(p_verification_id);

  select * into v_row
  from public.professional_identity_verifications v
  where v.id = v_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    p_actor_id,
    'professional_verification_detail_viewed',
    'professional_identity_verification',
    v_row.id,
    jsonb_build_object('user_id', v_row.user_id, 'actor_role', v_role),
    v_now
  );

  return to_jsonb(v_row)
    || jsonb_build_object(
      'public_verification_id', 'professional_verification_' || v_row.user_id::text
    );
end;
$$;

create or replace function public.start_professional_identity_review_internal(
  p_actor_id uuid,
  p_verification_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_id uuid;
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := now();
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);
  v_id := private.resolve_professional_kyc_verification_id(p_verification_id);

  select * into v_row
  from public.professional_identity_verifications v
  where v.id = v_id
  for update;

  if v_row.status = 'under_review' then
    if v_row.reviewer_id = p_actor_id or v_role = 'admin' then
      return jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'reviewerId', v_row.reviewer_id,
        'updatedAt', v_row.updated_at
      );
    end if;
    raise exception using errcode = '55000', message = 'DOKE_KYC_ALREADY_CLAIMED';
  end if;

  if v_row.status <> 'submitted' then
    raise exception using errcode = '55000', message = 'DOKE_KYC_REVIEW_START_NOT_ALLOWED';
  end if;

  update public.professional_identity_verifications
     set status = 'under_review',
         reviewer_id = p_actor_id,
         review_started_at = coalesce(review_started_at, v_now),
         updated_at = v_now
   where id = v_row.id
   returning * into v_row;

  update public.professional_profiles
     set verification_status = 'under_review',
         updated_at = v_now
   where user_id = v_row.user_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    p_actor_id,
    'professional_verification_review_started',
    'professional_identity_verification',
    v_row.id,
    jsonb_build_object('user_id', v_row.user_id, 'actor_role', v_role),
    v_now
  );

  return jsonb_build_object(
    'id', v_row.id,
    'status', 'under_review',
    'reviewerId', p_actor_id,
    'updatedAt', v_now
  );
end;
$$;

create or replace function public.decide_professional_identity_verification_internal(
  p_actor_id uuid,
  p_verification_id text,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_id uuid;
  v_verification public.professional_identity_verifications%rowtype;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(regexp_replace(trim(coalesce(p_rejection_reason, '')), '\s+', ' ', 'g'), '');
  v_status text;
  v_now timestamptz := now();
  v_title text;
  v_body text;
  v_target_url text;
  v_action_label text;
  v_event_key text;
  v_external_id text;
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);
  v_id := private.resolve_professional_kyc_verification_id(p_verification_id);

  if v_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'DOKE_KYC_DECISION_INVALID';
  end if;
  if v_decision = 'reject' and (v_reason is null or char_length(v_reason) < 10) then
    raise exception using errcode = '22023', message = 'DOKE_KYC_REJECTION_REASON_REQUIRED';
  end if;

  select * into v_verification
  from public.professional_identity_verifications v
  where v.id = v_id
  for update;

  if (v_verification.status = 'verified' and v_decision = 'approve')
     or (v_verification.status = 'rejected' and v_decision = 'reject') then
    return jsonb_build_object(
      'verificationId', v_verification.id,
      'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
      'userId', v_verification.user_id,
      'status', v_verification.status,
      'role', case when v_verification.status = 'verified' then 'professional' else null end,
      'reviewerId', v_verification.reviewer_id,
      'decidedAt', v_verification.decided_at,
      'idempotent', true
    );
  end if;

  if v_verification.status = 'submitted' then
    update public.professional_identity_verifications
       set status = 'under_review',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           updated_at = v_now
     where id = v_verification.id
     returning * into v_verification;
  end if;

  if v_verification.status <> 'under_review' then
    raise exception using errcode = '55000', message = 'DOKE_KYC_DECISION_NOT_ALLOWED';
  end if;
  if v_verification.reviewer_id is distinct from p_actor_id and v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'DOKE_KYC_REVIEW_OWNER_REQUIRED';
  end if;

  if v_decision = 'approve' then
    v_status := 'verified';

    update public.professional_identity_verifications
       set status = 'verified',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           decided_at = v_now,
           rejection_reason = null,
           decision_version = decision_version + 1,
           updated_at = v_now
     where id = v_verification.id;

    update public.professional_profiles
       set document_status = 'verified',
           setup_status = 'active',
           verification_status = 'verified',
           updated_at = v_now
     where user_id = v_verification.user_id;

    update public.users
       set role = 'professional',
           status = 'active',
           updated_at = v_now
     where id = v_verification.user_id;

    update auth.users
       set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             - 'role' - 'type' - 'account_role' - 'account_status',
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
             || jsonb_build_object('professional_verified', true),
           updated_at = v_now
     where id = v_verification.user_id;

    insert into public.verification_events (
      user_id, type, status, reviewer_id, reason, created_at
    ) values (
      v_verification.user_id, 'professional_document', 'approved', p_actor_id, null, v_now
    );

    v_title := 'Perfil profissional aprovado';
    v_body := 'Sua identidade foi verificada e seu perfil profissional já está ativo.';
    v_target_url := 'perfil-profissional.html';
    v_action_label := 'Abrir perfil profissional';
  else
    v_status := 'rejected';

    update public.professional_identity_verifications
       set status = 'rejected',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           decided_at = v_now,
           rejection_reason = left(v_reason, 500),
           decision_version = decision_version + 1,
           updated_at = v_now
     where id = v_verification.id;

    update public.professional_profiles
       set document_status = 'rejected',
           setup_status = 'pending_verification',
           verification_status = 'rejected',
           updated_at = v_now
     where user_id = v_verification.user_id;

    insert into public.verification_events (
      user_id, type, status, reviewer_id, reason, created_at
    ) values (
      v_verification.user_id, 'professional_document', 'rejected', p_actor_id, left(v_reason, 500), v_now
    );

    v_title := 'Verificação profissional rejeitada';
    v_body := 'Revise os documentos e envie novamente. Motivo: ' || left(v_reason, 300);
    v_target_url := 'verificacao-profissional.html';
    v_action_label := 'Corrigir e reenviar';
  end if;

  v_event_key := 'professional_verification:' || v_verification.id::text || ':' || v_status;
  v_external_id := 'notif_' || replace(v_event_key, ':', '_');

  insert into public.notifications (
    external_id, user_id, actor_id, type, category, event_key,
    title, body, target_url, action_label, data,
    read_at, dismissed_at, created_at, updated_at
  ) values (
    v_external_id,
    v_verification.user_id,
    p_actor_id,
    case when v_status = 'verified'
      then 'professional_verification_approved'
      else 'professional_verification_rejected'
    end,
    'account',
    v_event_key,
    v_title,
    v_body,
    v_target_url,
    v_action_label,
    jsonb_build_object(
      'verificationId', v_verification.id,
      'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
      'status', v_status,
      'reason', v_reason,
      'reviewerId', p_actor_id
    ),
    null, null, v_now, v_now
  )
  on conflict (user_id, event_key) where event_key is not null and event_key <> ''
  do update set
    actor_id = excluded.actor_id,
    type = excluded.type,
    category = excluded.category,
    title = excluded.title,
    body = excluded.body,
    target_url = excluded.target_url,
    action_label = excluded.action_label,
    data = excluded.data,
    read_at = null,
    dismissed_at = null,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    p_actor_id,
    case when v_decision = 'approve'
      then 'professional_verification_approved'
      else 'professional_verification_rejected'
    end,
    'professional_identity_verification',
    v_verification.id,
    jsonb_build_object(
      'user_id', v_verification.user_id,
      'decision', v_decision,
      'actor_role', v_role,
      'notification_event_key', v_event_key
    ),
    v_now
  );

  return jsonb_build_object(
    'verificationId', v_verification.id,
    'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
    'userId', v_verification.user_id,
    'status', v_status,
    'role', case when v_status = 'verified' then 'professional' else null end,
    'reviewerId', p_actor_id,
    'notificationEventKey', v_event_key,
    'decidedAt', v_now,
    'idempotent', false
  );
end;
$$;

-- Remove the browser-callable reviewer API. The Edge Function calls only the internal service-role contracts.
drop function if exists public.list_professional_identity_verifications_for_admin(text);
drop function if exists public.get_professional_identity_verification_for_admin(text);
drop function if exists public.start_professional_identity_review(text);
drop function if exists public.decide_professional_identity_verification(text, text, text);

revoke all on function public.list_professional_identity_verifications_internal(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.get_professional_identity_verification_internal(uuid, text)
  from public, anon, authenticated;
revoke all on function public.start_professional_identity_review_internal(uuid, text)
  from public, anon, authenticated;
revoke all on function public.decide_professional_identity_verification_internal(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.list_professional_identity_verifications_internal(uuid, text, integer)
  to service_role;
grant execute on function public.get_professional_identity_verification_internal(uuid, text)
  to service_role;
grant execute on function public.start_professional_identity_review_internal(uuid, text)
  to service_role;
grant execute on function public.decide_professional_identity_verification_internal(uuid, text, text, text)
  to service_role;

comment on function public.decide_professional_identity_verification_internal(uuid, text, text, text) is
  'Service-role-only KYC decision authority. The actor identity is independently authenticated by the Edge Function.';
