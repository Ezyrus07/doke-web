-- Doke staging-only finance sandbox foundation.
-- The exact project gate prevents this authority from becoming a production PSP.

create or replace function private.finance_sandbox_amount_cents(p_value text)
returns integer
language plpgsql
immutable
security invoker
set search_path = pg_catalog
as $function$
declare
  v_raw text := regexp_replace(btrim(coalesce(p_value, '')), '[^0-9,.-]', '', 'g');
  v_normalized text;
  v_amount numeric;
begin
  if v_raw = '' then return 0; end if;

  if position(',' in v_raw) > 0 then
    v_normalized := replace(replace(v_raw, '.', ''), ',', '.');
  elsif v_raw ~ '\.[0-9]{1,2}$' then
    v_normalized := v_raw;
  else
    v_normalized := replace(v_raw, '.', '');
  end if;

  begin
    v_amount := v_normalized::numeric;
  exception when others then
    return 0;
  end;

  if v_amount <= 0 then return 0; end if;
  return round(v_amount * 100)::integer;
end;
$function$;

create or replace function private.assert_staging_finance_sandbox()
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_project_url text;
begin
  select secret.decrypted_secret
    into v_project_url
  from vault.decrypted_secrets secret
  where secret.name = 'doke_project_url'
  limit 1;

  if v_project_url is distinct from 'https://zwkczgewzbsorbrjuzpb.supabase.co' then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_DISABLED';
  end if;
end;
$function$;

create or replace function private.finance_sandbox_set_actor(p_actor_id uuid)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_role text;
begin
  perform private.assert_staging_finance_sandbox();

  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_FINANCE_SANDBOX_AUTH_REQUIRED';
  end if;

  select lower(account.role)
    into v_actor_role
  from public.users account
  where account.id = p_actor_id
    and account.status = 'active';

  if v_actor_role is null then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_ACTOR_INACTIVE';
  end if;

  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
    true
  );

  return v_actor_role;
end;
$function$;

create or replace function private.finance_sandbox_context(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_order_ref text;
  v_conversation_ref text;
  v_message_ref text;
  v_order public.orders%rowtype;
  v_conversation public.conversations%rowtype;
  v_message public.messages%rowtype;
begin
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_FINANCE_SANDBOX_PAYLOAD_INVALID';
  end if;

  v_order_ref := btrim(coalesce(v_payload ->> 'orderId', ''));
  v_conversation_ref := btrim(coalesce(v_payload ->> 'conversationId', ''));
  v_message_ref := btrim(coalesce(v_payload ->> 'messageId', v_payload ->> 'chargeMessageId', ''));

  if v_order_ref = '' then
    raise exception using errcode = '22023', message = 'DOKE_FINANCE_SANDBOX_ORDER_REQUIRED';
  end if;

  select order_row.*
    into v_order
  from public.orders order_row
  where order_row.external_id = v_order_ref
     or order_row.id::text = v_order_ref
  limit 1;

  if v_order.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_FINANCE_SANDBOX_ORDER_NOT_FOUND';
  end if;

  if v_conversation_ref <> '' then
    select conversation_row.*
      into v_conversation
    from public.conversations conversation_row
    where (conversation_row.external_id = v_conversation_ref or conversation_row.id::text = v_conversation_ref)
      and conversation_row.order_id = v_order.id
    limit 1;
  else
    select conversation_row.*
      into v_conversation
    from public.conversations conversation_row
    where conversation_row.order_id = v_order.id
    order by conversation_row.created_at desc
    limit 1;
  end if;

  if v_conversation.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_FINANCE_SANDBOX_CONVERSATION_NOT_FOUND';
  end if;

  if v_message_ref <> '' then
    select message_row.*
      into v_message
    from public.messages message_row
    where (message_row.external_id = v_message_ref or message_row.id::text = v_message_ref)
      and message_row.conversation_id = v_conversation.id
      and message_row.status <> 'removed'
    limit 1;
  else
    select message_row.*
      into v_message
    from public.messages message_row
    where message_row.conversation_id = v_conversation.id
      and message_row.message_type = 'charge'
      and message_row.status <> 'removed'
    order by message_row.created_at desc
    limit 1;
  end if;

  if v_message.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_FINANCE_SANDBOX_CHARGE_NOT_FOUND';
  end if;

  if lower(coalesce(v_message.message_type, v_message.metadata ->> 'type', '')) <> 'charge'
     or lower(coalesce(v_message.metadata ->> 'financialKind', 'charge')) = 'proposal' then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_CHARGE_INVALID';
  end if;

  return jsonb_build_object(
    'orderId', v_order.id,
    'conversationId', v_conversation.id,
    'messageId', v_message.id
  );
end;
$function$;

revoke all on function private.finance_sandbox_amount_cents(text)
  from public, anon, authenticated, service_role;
revoke all on function private.assert_staging_finance_sandbox()
  from public, anon, authenticated, service_role;
revoke all on function private.finance_sandbox_set_actor(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.finance_sandbox_context(jsonb)
  from public, anon, authenticated, service_role;
