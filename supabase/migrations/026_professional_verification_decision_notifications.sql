-- DOKE — 026 Professional verification decision notifications
-- Ensures approval/rejection and the recipient notification are committed atomically.

begin;

drop function if exists public.decide_professional_identity_verification(uuid, text, text);
drop function if exists public.decide_professional_identity_verification(text, text, text);

create or replace function public.decide_professional_identity_verification(
  p_verification_id text,
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
  v_input text := trim(coalesce(p_verification_id, ''));
  v_candidate_uuid uuid;
  v_now timestamptz := now();
  v_status text;
  v_title text;
  v_body text;
  v_target_url text;
  v_action_label text;
  v_event_key text;
  v_external_id text;
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

  if v_input = '' then
    raise exception 'VERIFICATION_ID_REQUIRED' using errcode = '22023';
  end if;

  if v_input like 'professional_verification_%' then
    v_input := substring(v_input from char_length('professional_verification_') + 1);
  end if;

  begin
    v_candidate_uuid := v_input::uuid;
  exception when invalid_text_representation then
    v_candidate_uuid := null;
  end;

  if v_candidate_uuid is null then
    raise exception 'INVALID_VERIFICATION_ID' using errcode = '22023';
  end if;

  select * into v_verification
  from public.professional_identity_verifications
  where id = v_candidate_uuid
     or user_id = v_candidate_uuid
     or professional_profile_user_id = v_candidate_uuid
  order by updated_at desc
  limit 1
  for update;

  if not found then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_decision = 'reject' and (v_reason is null or char_length(v_reason) < 10) then
    raise exception 'REJECTION_REASON_REQUIRED' using errcode = '22023';
  end if;

  if v_decision = 'approve' then
    v_status := 'verified';

    update public.professional_identity_verifications
    set status = 'verified',
        reviewer_id = v_reviewer_id,
        review_started_at = coalesce(review_started_at, v_now),
        decided_at = v_now,
        rejection_reason = null,
        updated_at = v_now
    where id = v_verification.id;

    insert into public.professional_profiles (
      user_id, document_status, setup_status, verification_status, updated_at
    )
    values (
      v_verification.user_id, 'verified', 'active', 'verified', v_now
    )
    on conflict (user_id) do update
      set document_status = 'verified',
          setup_status = 'active',
          verification_status = 'verified',
          updated_at = excluded.updated_at;

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

    v_title := 'Perfil profissional aprovado';
    v_body := 'Sua identidade foi verificada e seu perfil profissional já está ativo.';
    v_target_url := 'perfil-profissional.html';
    v_action_label := 'Abrir perfil profissional';
  else
    v_status := 'rejected';

    update public.professional_identity_verifications
    set status = 'rejected',
        reviewer_id = v_reviewer_id,
        review_started_at = coalesce(review_started_at, v_now),
        decided_at = v_now,
        rejection_reason = v_reason,
        updated_at = v_now
    where id = v_verification.id;

    insert into public.professional_profiles (
      user_id, document_status, setup_status, verification_status, updated_at
    )
    values (
      v_verification.user_id, 'rejected', 'pending_verification', 'rejected', v_now
    )
    on conflict (user_id) do update
      set document_status = 'rejected',
          setup_status = 'pending_verification',
          verification_status = 'rejected',
          updated_at = excluded.updated_at;

    insert into public.verification_events (user_id, type, status, reviewer_id, reason, created_at)
    values (v_verification.user_id, 'professional_document', 'rejected', v_reviewer_id, v_reason, v_now);

    v_title := 'Verificação profissional rejeitada';
    v_body := 'Revise os documentos e envie novamente. Motivo: ' || v_reason;
    v_target_url := 'verificacao-profissional.html';
    v_action_label := 'Corrigir e reenviar';
  end if;

  -- One logical notification per verification/status. Repeated administrative
  -- calls refresh the notification and make it unread again instead of duplicating it.
  v_event_key := 'professional_verification:' || v_verification.id::text || ':' || v_status;
  v_external_id := 'notif_' || replace(v_event_key, ':', '_');

  insert into public.notifications (
    external_id,
    user_id,
    actor_id,
    type,
    category,
    event_key,
    title,
    body,
    target_url,
    action_label,
    data,
    read_at,
    dismissed_at,
    created_at,
    updated_at
  )
  values (
    v_external_id,
    v_verification.user_id,
    v_reviewer_id,
    case when v_status = 'verified' then 'professional_verification_approved' else 'professional_verification_rejected' end,
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
      'reviewerId', v_reviewer_id
    ),
    null,
    null,
    v_now,
    v_now
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

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, metadata, created_at)
  values (
    v_reviewer_id,
    case when v_decision = 'approve' then 'professional_verification_approved' else 'professional_verification_rejected' end,
    'professional_identity_verification',
    v_verification.id,
    jsonb_build_object(
      'user_id', v_verification.user_id,
      'decision', v_decision,
      'received_identifier', p_verification_id,
      'notification_event_key', v_event_key
    ),
    v_now
  );

  return jsonb_build_object(
    'verificationId', v_verification.id,
    'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
    'userId', v_verification.user_id,
    'status', v_status,
    'role', case when v_decision = 'approve' then 'professional' else null end,
    'reviewerId', v_reviewer_id,
    'notificationEventKey', v_event_key,
    'decidedAt', v_now
  );
end;
$$;

revoke all on function public.decide_professional_identity_verification(text, text, text) from public;
grant execute on function public.decide_professional_identity_verification(text, text, text) to authenticated;

-- Backfill the latest already-decided verification per user so decisions made
-- before this migration also appear in the notification center.
with latest_decisions as (
  select distinct on (piv.user_id)
    piv.id,
    piv.user_id,
    piv.reviewer_id,
    piv.status,
    piv.rejection_reason,
    coalesce(piv.decided_at, piv.updated_at, now()) as decision_at
  from public.professional_identity_verifications piv
  where piv.status in ('verified', 'rejected')
  order by piv.user_id, coalesce(piv.decided_at, piv.updated_at, piv.created_at) desc
)
insert into public.notifications (
  external_id, user_id, actor_id, type, category, event_key,
  title, body, target_url, action_label, data,
  read_at, dismissed_at, created_at, updated_at
)
select
  'notif_professional_verification_' || ld.id::text || '_' || ld.status,
  ld.user_id,
  ld.reviewer_id,
  case when ld.status = 'verified' then 'professional_verification_approved' else 'professional_verification_rejected' end,
  'account',
  'professional_verification:' || ld.id::text || ':' || ld.status,
  case when ld.status = 'verified' then 'Perfil profissional aprovado' else 'Verificação profissional rejeitada' end,
  case
    when ld.status = 'verified' then 'Sua identidade foi verificada e seu perfil profissional já está ativo.'
    else 'Revise os documentos e envie novamente. Motivo: ' || coalesce(nullif(trim(ld.rejection_reason), ''), 'Consulte os dados da análise.')
  end,
  case when ld.status = 'verified' then 'perfil-profissional.html' else 'verificacao-profissional.html' end,
  case when ld.status = 'verified' then 'Abrir perfil profissional' else 'Corrigir e reenviar' end,
  jsonb_build_object(
    'verificationId', ld.id,
    'publicVerificationId', 'professional_verification_' || ld.user_id::text,
    'status', ld.status,
    'reason', ld.rejection_reason,
    'reviewerId', ld.reviewer_id
  ),
  null,
  null,
  ld.decision_at,
  ld.decision_at
from latest_decisions ld
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

notify pgrst, 'reload schema';

commit;
