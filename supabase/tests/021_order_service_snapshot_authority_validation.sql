-- CAT-001 / CAT-B04 validation.
-- Execute in staging inside a transaction. Every synthetic row is rolled back.

begin;

do $$
declare
  v_client_id uuid := 'b0400000-0000-4000-8000-000000000001';
  v_professional_id uuid := 'b0400000-0000-4000-8000-000000000002';
  v_forged_professional_id uuid := 'b0400000-0000-4000-8000-000000000003';
  v_service_id uuid := 'b0400000-0000-4000-8000-000000000010';
  v_version_one_id uuid := 'b0400000-0000-4000-8000-000000000011';
  v_version_two_id uuid := 'b0400000-0000-4000-8000-000000000012';
  v_order_one_id uuid := 'b0400000-0000-4000-8000-000000000020';
  v_order_two_id uuid := 'b0400000-0000-4000-8000-000000000021';
  v_order public.orders%rowtype;
  v_tamper_blocked boolean := false;
  v_projection_tamper_blocked boolean := false;
  v_own_service_blocked boolean := false;
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'service_version_id'
  ) then
    raise exception 'CAT-B04 service_version_id column missing';
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'orders' and column_name = 'service_snapshot'
  ) then
    raise exception 'CAT-B04 service_snapshot column missing';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.orders'::regclass
      and tgname = 'trg_orders_service_snapshot_authority'
      and not tgisinternal
  ) then
    raise exception 'CAT-B04 snapshot authority trigger missing';
  end if;

  if has_function_privilege('anon', 'private.canonicalize_order_service_snapshot()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.canonicalize_order_service_snapshot()', 'EXECUTE') then
    raise exception 'Browser roles can execute the private snapshot trigger function';
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_client_id, 'authenticated', 'authenticated', 'cat-b04-client@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_professional_id, 'authenticated', 'authenticated', 'cat-b04-professional@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_forged_professional_id, 'authenticated', 'authenticated', 'cat-b04-forged@example.invalid', '', now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  insert into public.users (id, email, role, status, onboarding_status)
  values
    (v_client_id, 'cat-b04-client@example.invalid', 'client', 'active', 'completed'),
    (v_professional_id, 'cat-b04-professional@example.invalid', 'professional', 'active', 'completed'),
    (v_forged_professional_id, 'cat-b04-forged@example.invalid', 'professional', 'active', 'completed')
  on conflict (id) do update
    set role = excluded.role,
        status = excluded.status,
        onboarding_status = excluded.onboarding_status;

  insert into public.services (
    id, professional_id, title, slug, description, price_mode, price_cents,
    currency, status, city, state, external_id, metadata, moderation_status
  ) values (
    v_service_id, v_professional_id, 'Versão aprovada um', 'cat-b04-snapshot-test',
    'Serviço sintético criado apenas dentro da transação de validação CAT-B04.',
    'fixed', 12500, 'BRL', 'published', 'Salvador', 'BA',
    'cat-b04-snapshot-service', '{}'::jsonb, 'published'
  );

  insert into public.service_versions (
    id, service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at, reviewed_at,
    risk_flags, classification_reasons, visibility_action
  ) values (
    v_version_one_id, v_service_id, v_professional_id, 1, 'create', 'critical',
    'approved',
    jsonb_build_object(
      'id', 'cat-b04-snapshot-service',
      'title', 'Versão aprovada um',
      'priceValue', 125,
      'priceLabel', 'R$ 125',
      'images', jsonb_build_array('https://example.invalid/v1.jpg'),
      'providerName', 'Profissional Snapshot'
    ),
    '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb,
    'not_public_until_approved'
  );

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
     set approved_version_id = v_version_one_id,
         status = 'published',
         moderation_status = 'published'
   where id = v_service_id;
  perform set_config('doke.service_moderation_apply', 'off', true);

  insert into public.orders (
    id, client_id, professional_id, service_id, title, description, status, metadata
  ) values (
    v_order_one_id,
    v_client_id,
    v_forged_professional_id,
    v_service_id,
    'Pedido snapshot um',
    'Pedido criado com profissional e snapshot forjados pelo chamador.',
    'requested',
    jsonb_build_object(
      'serviceSnapshot', jsonb_build_object('title', 'FORGED'),
      'serviceVersionId', v_version_two_id::text,
      'serviceSnapshotAuthority', 'browser'
    )
  ) returning * into v_order;

  if v_order.professional_id is distinct from v_professional_id then
    raise exception 'Canonical professional identity was not enforced';
  end if;
  if v_order.service_version_id is distinct from v_version_one_id then
    raise exception 'Approved service version was not frozen';
  end if;
  if v_order.service_snapshot ->> 'title' is distinct from 'Versão aprovada um' then
    raise exception 'Canonical approved snapshot did not replace the forged snapshot';
  end if;
  if v_order.service_snapshot ->> 'snapshotAuthority' is distinct from 'approved_service_version' then
    raise exception 'Snapshot authority marker missing';
  end if;
  if v_order.metadata -> 'serviceSnapshot' is distinct from v_order.service_snapshot then
    raise exception 'Compatibility serviceSnapshot projection diverged';
  end if;
  if v_order.metadata ->> 'serviceVersionId' is distinct from v_version_one_id::text then
    raise exception 'Compatibility serviceVersionId projection diverged';
  end if;

  insert into public.service_versions (
    id, service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at, reviewed_at,
    risk_flags, classification_reasons, visibility_action,
    baseline_version_id
  ) values (
    v_version_two_id, v_service_id, v_professional_id, 2, 'edit', 'major',
    'approved',
    jsonb_build_object(
      'id', 'cat-b04-snapshot-service',
      'title', 'Versão aprovada dois',
      'priceValue', 250,
      'priceLabel', 'R$ 250',
      'images', jsonb_build_array('https://example.invalid/v2.jpg'),
      'providerName', 'Profissional Snapshot'
    ),
    '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb,
    'keep_public', v_version_one_id
  );

  update public.service_versions
     set review_status = 'superseded'
   where id = v_version_one_id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
     set approved_version_id = v_version_two_id,
         title = 'Versão aprovada dois',
         price_cents = 25000,
         status = 'published',
         moderation_status = 'published'
   where id = v_service_id;
  perform set_config('doke.service_moderation_apply', 'off', true);

  select * into v_order from public.orders where id = v_order_one_id;
  if v_order.service_version_id is distinct from v_version_one_id
     or v_order.service_snapshot ->> 'title' is distinct from 'Versão aprovada um'
     or v_order.service_snapshot ->> 'priceValue' is distinct from '125' then
    raise exception 'Historical order snapshot changed after a new service version was approved';
  end if;

  begin
    update public.orders
       set service_snapshot = jsonb_build_object('title', 'TAMPERED')
     where id = v_order_one_id;
  exception when check_violation then
    if sqlerrm = 'DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE' then
      v_tamper_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_tamper_blocked then
    raise exception 'Dedicated snapshot tampering was not blocked';
  end if;

  begin
    update public.orders
       set metadata = jsonb_set(metadata, '{serviceSnapshot,title}', '"TAMPERED"'::jsonb, true)
     where id = v_order_one_id;
  exception when check_violation then
    if sqlerrm = 'DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE' then
      v_projection_tamper_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_projection_tamper_blocked then
    raise exception 'Compatibility snapshot projection tampering was not blocked';
  end if;

  insert into public.orders (
    id, client_id, professional_id, service_id, title, description, status, metadata
  ) values (
    v_order_two_id, v_client_id, v_forged_professional_id, v_service_id,
    'Pedido snapshot dois', 'Pedido após nova versão aprovada.', 'requested', '{}'::jsonb
  ) returning * into v_order;

  if v_order.service_version_id is distinct from v_version_two_id
     or v_order.service_snapshot ->> 'title' is distinct from 'Versão aprovada dois'
     or v_order.service_snapshot ->> 'priceValue' is distinct from '250' then
    raise exception 'New order did not freeze the current approved version';
  end if;

  begin
    insert into public.orders (
      client_id, professional_id, service_id, title, status, metadata
    ) values (
      v_professional_id, v_professional_id, v_service_id,
      'Pedido do próprio serviço', 'requested', '{}'::jsonb
    );
  exception when check_violation then
    if sqlerrm = 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN' then
      v_own_service_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_own_service_blocked then
    raise exception 'Own-service order was not blocked';
  end if;
end;
$$;

rollback;