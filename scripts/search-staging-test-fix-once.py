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

changed = []

path_022 = 'supabase/tests/022_service_search_contract_validation.sql'
if replace_once(
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
): changed.append(path_022)

if replace_once(
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
): changed.append(path_022)

if replace_once(
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
): changed.append(path_022)

path_023 = 'supabase/tests/023_service_search_approved_snapshot_authority_validation.sql'
if replace_once(
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
): changed.append(path_023)

print('SEARCH staging tests reconciled:')
for path in dict.fromkeys(changed):
    print(f'- {path}')
