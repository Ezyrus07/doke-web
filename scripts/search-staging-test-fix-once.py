#!/usr/bin/env python3
from pathlib import Path


def replace_once(path, old, new):
    file = Path(path)
    text = file.read_text(encoding='utf-8')
    if new in text:
        return False
    if old not in text:
        raise RuntimeError(f'Expected marker missing in {path}: {old[:140]!r}')
    file.write_text(text.replace(old, new, 1), encoding='utf-8')
    return True


def record(changed, path, result):
    if result:
        changed.append(path)


changed = []

path_022 = 'supabase/tests/022_service_search_contract_validation.sql'
record(changed, path_022, replace_once(
    path_022,
    """  insert into public.users (id, email, role, status, onboarding_status)
  values
    (v_professional_local, 'search-a04-local@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_second, 'search-a04-second@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_online, 'search-a04-online@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_nearby, 'search-a04-nearby@example.invalid', 'professional', 'active', 'completed');
""",
    """  insert into public.users (id, email, role, status, onboarding_status)
  values
    (v_professional_local, 'search-a04-local@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_second, 'search-a04-second@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_online, 'search-a04-online@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_nearby, 'search-a04-nearby@example.invalid', 'professional', 'active', 'completed')
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        status = excluded.status,
        onboarding_status = excluded.onboarding_status;
"""
))
record(changed, path_022, replace_once(
    path_022,
    """  insert into public.user_profiles (user_id, display_name, username, city, state)
  values
    (v_professional_local, 'Profissional Local', 'search.a04.local', 'Salvador', 'BA'),
    (v_professional_second, 'Profissional Segundo', 'search.a04.second', 'Salvador', 'BA'),
    (v_professional_online, 'Profissional Online', 'search.a04.online', 'São Paulo', 'SP'),
    (v_professional_nearby, 'Profissional Próximo', 'search.a04.nearby', 'Lauro de Freitas', 'BA');
""",
    """  insert into public.user_profiles (user_id, display_name, username, city, state)
  values
    (v_professional_local, 'Profissional Local', 'search.a04.local', 'Salvador', 'BA'),
    (v_professional_second, 'Profissional Segundo', 'search.a04.second', 'Salvador', 'BA'),
    (v_professional_online, 'Profissional Online', 'search.a04.online', 'São Paulo', 'SP'),
    (v_professional_nearby, 'Profissional Próximo', 'search.a04.nearby', 'Lauro de Freitas', 'BA')
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        city = excluded.city,
        state = excluded.state;
"""
))
record(changed, path_022, replace_once(
    path_022,
    """  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values
    (v_professional_local, 'Eletricista residencial', 'verified', 4.9, 31, 20, 'active', 'verified'),
    (v_professional_second, 'Encanador residencial', 'verified', 4.7, 18, 12, 'active', 'verified'),
    (v_professional_online, 'Eletricista remoto', 'verified', 4.8, 22, 15, 'active', 'verified'),
    (v_professional_nearby, 'Eletricista metropolitano', 'verified', 4.6, 9, 7, 'active', 'verified');
""",
    """  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values
    (v_professional_local, 'Eletricista residencial', 'verified', 4.9, 31, 20, 'active', 'verified'),
    (v_professional_second, 'Encanador residencial', 'verified', 4.7, 18, 12, 'active', 'verified'),
    (v_professional_online, 'Eletricista remoto', 'verified', 4.8, 22, 15, 'active', 'verified'),
    (v_professional_nearby, 'Eletricista metropolitano', 'verified', 4.6, 9, 7, 'active', 'verified')
  on conflict (user_id) do update
    set headline = excluded.headline,
        document_status = excluded.document_status,
        average_rating = excluded.average_rating,
        reviews_count = excluded.reviews_count,
        completed_orders_count = excluded.completed_orders_count,
        setup_status = excluded.setup_status,
        verification_status = excluded.verification_status;
"""
))
record(changed, path_022, replace_once(
    path_022,
    """  if exists (
    select 1 from public.services
    where id in (v_service_local, v_service_second, v_service_online, v_service_nearby)
      and search_vector is null
  ) then
    raise exception 'SEARCH-A04 trigger did not materialize search_vector';
  end if;

  insert into public.service_versions (
""",
    """  if exists (
    select 1 from public.services
    where id in (v_service_local, v_service_second, v_service_online, v_service_nearby)
      and search_vector is not null
  ) then
    raise exception 'SEARCH-A04 service without an approved version acquired a search_vector';
  end if;

  insert into public.service_versions (
"""
))
record(changed, path_022, replace_once(
    path_022,
    """  perform set_config('doke.service_moderation_apply', 'off', true);

  select public.search_public_services_v1(jsonb_build_object(
""",
    """  perform set_config('doke.service_moderation_apply', 'off', true);

  if exists (
    select 1 from public.services
    where id in (v_service_local, v_service_second, v_service_online, v_service_nearby)
      and search_vector is null
  ) then
    raise exception 'SEARCH-A04 approved version transition did not materialize search_vector';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
"""
))

path_023 = 'supabase/tests/023_service_search_approved_snapshot_authority_validation.sql'
record(changed, path_023, replace_once(
    path_023,
    """  insert into public.users (id, email, role, status, onboarding_status)
  values (
    v_professional_id,
    'search-a04-approved-snapshot@example.invalid',
    'professional', 'active', 'completed'
  );
""",
    """  insert into public.users (id, email, role, status, onboarding_status)
  values (
    v_professional_id,
    'search-a04-approved-snapshot@example.invalid',
    'professional', 'active', 'completed'
  )
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        status = excluded.status,
        onboarding_status = excluded.onboarding_status;
"""
))
record(changed, path_023, replace_once(
    path_023,
    """  insert into public.user_profiles (user_id, display_name, username, city, state)
  values (
    v_professional_id,
    'Profissional Snapshot Aprovado',
    'search.a04.approved.snapshot',
    'Salvador', 'BA'
  );
""",
    """  insert into public.user_profiles (user_id, display_name, username, city, state)
  values (
    v_professional_id,
    'Profissional Snapshot Aprovado',
    'search.a04.approved.snapshot',
    'Salvador', 'BA'
  )
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        city = excluded.city,
        state = excluded.state;
"""
))
record(changed, path_023, replace_once(
    path_023,
    """  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values (
    v_professional_id,
    'Especialista de snapshot aprovado',
    'verified', 4.9, 12, 8, 'active', 'verified'
  );
""",
    """  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values (
    v_professional_id,
    'Especialista de snapshot aprovado',
    'verified', 4.9, 12, 8, 'active', 'verified'
  )
  on conflict (user_id) do update
    set headline = excluded.headline,
        document_status = excluded.document_status,
        average_rating = excluded.average_rating,
        reviews_count = excluded.reviews_count,
        completed_orders_count = excluded.completed_orders_count,
        setup_status = excluded.setup_status,
        verification_status = excluded.verification_status;
"""
))

print('SEARCH staging tests reconciled:')
for path in dict.fromkeys(changed):
    print(f'- {path}')
