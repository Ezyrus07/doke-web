-- Doke self-service operation dispatcher
-- Keeps existing domain RPC implementations intact while moving browser authority
-- behind a JWT-verified Edge Function and a service-role-only dispatcher.

create or replace function public.execute_self_service_operation_internal(
  p_actor_id uuid,
  p_operation text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_operation text := lower(btrim(coalesce(p_operation, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_result jsonb;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SELF_SERVICE_AUTH_REQUIRED';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SELF_SERVICE_PAYLOAD_INVALID';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_actor_id) then
    raise exception using errcode = '28000', message = 'DOKE_SELF_SERVICE_ACTOR_NOT_FOUND';
  end if;

  -- Reconstruct the authenticated JWT context for the existing, already-hardened
  -- self-service RPC implementations. The Edge Function derives p_actor_id from
  -- auth.getUser(); it is never accepted from the request body.
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
    true
  );

  case v_operation
    when 'get_account_onboarding_state' then
      v_result := public.get_account_onboarding_state();

    when 'complete_account_onboarding' then
      v_result := public.complete_account_onboarding(
        p_city := v_payload ->> 'p_city',
        p_state := v_payload ->> 'p_state',
        p_postal_code := v_payload ->> 'p_postal_code',
        p_bio := coalesce(v_payload ->> 'p_bio', ''),
        p_interests := coalesce(v_payload -> 'p_interests', '[]'::jsonb)
      );

    when 'update_account_profile' then
      v_result := public.update_account_profile(
        p_display_name := v_payload ->> 'p_display_name',
        p_username := v_payload ->> 'p_username',
        p_city := coalesce(v_payload ->> 'p_city', ''),
        p_state := coalesce(v_payload ->> 'p_state', ''),
        p_bio := coalesce(v_payload ->> 'p_bio', ''),
        p_interests := coalesce(v_payload -> 'p_interests', '[]'::jsonb),
        p_avatar_url := coalesce(v_payload ->> 'p_avatar_url', ''),
        p_cover_url := coalesce(v_payload ->> 'p_cover_url', '')
      );

    when 'create_transaction_notification' then
      select to_jsonb(public.create_transaction_notification(
        p_external_id := v_payload ->> 'p_external_id',
        p_recipient_id := nullif(v_payload ->> 'p_recipient_id', '')::uuid,
        p_type := v_payload ->> 'p_type',
        p_category := v_payload ->> 'p_category',
        p_title := v_payload ->> 'p_title',
        p_body := coalesce(v_payload ->> 'p_body', ''),
        p_event_key := v_payload ->> 'p_event_key',
        p_target_url := v_payload ->> 'p_target_url',
        p_action_label := v_payload ->> 'p_action_label',
        p_order_external_id := v_payload ->> 'p_order_external_id',
        p_conversation_external_id := v_payload ->> 'p_conversation_external_id',
        p_service_external_id := v_payload ->> 'p_service_external_id',
        p_data := coalesce(v_payload -> 'p_data', '{}'::jsonb)
      )) into v_result;

    when 'update_own_notification_state' then
      select to_jsonb(public.update_own_notification_state(
        p_notification_ref := v_payload ->> 'p_notification_ref',
        p_mark_read := case when v_payload ? 'p_mark_read' then (v_payload ->> 'p_mark_read')::boolean else null end,
        p_dismiss := case when v_payload ? 'p_dismiss' then (v_payload ->> 'p_dismiss')::boolean else null end
      )) into v_result;

    when 'save_professional_profile_setup' then
      v_result := public.save_professional_profile_setup(
        p_payload := coalesce(v_payload -> 'p_payload', '{}'::jsonb),
        p_current_step := coalesce(nullif(v_payload ->> 'p_current_step', '')::integer, 1),
        p_complete := coalesce(nullif(v_payload ->> 'p_complete', '')::boolean, false)
      );

    when 'save_professional_verification_draft' then
      v_result := public.save_professional_verification_draft(
        p_payload := coalesce(v_payload -> 'p_payload', '{}'::jsonb),
        p_current_step := coalesce(nullif(v_payload ->> 'p_current_step', '')::integer, 1)
      );

    when 'reopen_own_professional_identity_verification' then
      v_result := public.reopen_own_professional_identity_verification();

    when 'list_service_moderation_history' then
      v_result := public.list_service_moderation_history(
        p_service_id := nullif(v_payload ->> 'p_service_id', '')::uuid,
        p_external_id := v_payload ->> 'p_external_id'
      );

    when 'submit_service_for_review' then
      v_result := public.submit_service_for_review(
        p_external_id := v_payload ->> 'p_external_id',
        p_snapshot := coalesce(v_payload -> 'p_snapshot', '{}'::jsonb),
        p_change_class := coalesce(v_payload ->> 'p_change_class', 'major')
      );

    when 'save_wallet_bank_account' then
      select to_jsonb(public.save_wallet_bank_account(
        p_account_holder := v_payload ->> 'p_account_holder',
        p_document := v_payload ->> 'p_document',
        p_bank_name := v_payload ->> 'p_bank_name',
        p_bank_code := v_payload ->> 'p_bank_code',
        p_branch := v_payload ->> 'p_branch',
        p_account_number := v_payload ->> 'p_account_number',
        p_account_type := coalesce(v_payload ->> 'p_account_type', 'checking'),
        p_pix_key := v_payload ->> 'p_pix_key',
        p_metadata := coalesce(v_payload -> 'p_metadata', '{}'::jsonb)
      )) into v_result;

    when 'request_wallet_withdrawal' then
      v_result := public.request_wallet_withdrawal(
        p_external_id := v_payload ->> 'p_external_id',
        p_event_key := v_payload ->> 'p_event_key',
        p_amount_cents := nullif(v_payload ->> 'p_amount_cents', '')::integer,
        p_metadata := coalesce(v_payload -> 'p_metadata', '{}'::jsonb)
      );

    when 'open_wallet_dispute' then
      v_result := public.open_wallet_dispute(
        p_external_id := v_payload ->> 'p_external_id',
        p_event_key := v_payload ->> 'p_event_key',
        p_order_external_id := v_payload ->> 'p_order_external_id',
        p_payment_external_id := v_payload ->> 'p_payment_external_id',
        p_transaction_external_id := v_payload ->> 'p_transaction_external_id',
        p_reason := v_payload ->> 'p_reason',
        p_reason_code := v_payload ->> 'p_reason_code',
        p_metadata := coalesce(v_payload -> 'p_metadata', '{}'::jsonb)
      );

    when 'respond_wallet_dispute' then
      v_result := public.respond_wallet_dispute(
        p_dispute_external_id := v_payload ->> 'p_dispute_external_id',
        p_response := v_payload ->> 'p_response'
      );

    else
      raise exception using errcode = '22023', message = 'DOKE_SELF_SERVICE_OPERATION_INVALID';
  end case;

  return coalesce(v_result, '{}'::jsonb);
end;
$function$;

revoke all on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  to service_role;

comment on function public.execute_self_service_operation_internal(uuid, text, jsonb) is
  'Service-role-only dispatcher used by the JWT-verified self-service-operations Edge Function.';
