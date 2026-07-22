-- Doke SEC-001 identity authority validation.
-- Execute only in local/staging. All role simulations are transaction-scoped.

begin;

-- Anonymous callers can read intended public profile fields but no account rows.
set local role anon;
do $$
begin
  if has_table_privilege('anon', 'public.users', 'SELECT') then
    raise exception 'Grant failure: anon can read public.users.';
  end if;
  if not has_table_privilege('anon', 'public.user_profiles', 'SELECT') then
    raise exception 'Grant failure: anon cannot read intended public profiles.';
  end if;
  if has_table_privilege('anon', 'public.users', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: anon can mutate public.users.';
  end if;
  if has_function_privilege('anon', 'public.complete_account_onboarding(text,text,text,text,jsonb)', 'EXECUTE') then
    raise exception 'Grant failure: anon can execute complete_account_onboarding.';
  end if;
end
$$;
reset role;

-- Authenticated identities can read only their own account row and cannot mutate tables directly.
select set_config('request.jwt.claim.sub', (
  select id::text from public.users order by created_at limit 1
), true);
set local role authenticated;
do $$
declare
  v_uid uuid := auth.uid();
  v_visible integer;
begin
  select count(*) into v_visible from public.users;
  if v_visible <> 1 then
    raise exception 'RLS failure: authenticated identity sees % account rows instead of one.', v_visible;
  end if;
  if not exists (select 1 from public.users where id = v_uid) then
    raise exception 'RLS failure: authenticated identity cannot read its own account.';
  end if;
  if has_table_privilege('authenticated', 'public.users', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: authenticated can mutate public.users directly.';
  end if;
  if has_table_privilege('authenticated', 'public.user_profiles', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: authenticated can mutate public.user_profiles directly.';
  end if;
end
$$;
reset role;

-- Materialization entrypoints are private and user-editable role claims are not authoritative.
do $$
begin
  if to_regprocedure('public.materialize_auth_account(uuid,text,text,jsonb)') is not null then
    raise exception 'Authority failure: public materialize_auth_account still exists.';
  end if;
  if to_regprocedure('public.handle_new_auth_user_doke()') is not null then
    raise exception 'Authority failure: public auth trigger function still exists.';
  end if;
  if exists (
    select 1
    from auth.users a
    join public.users u on u.id = a.id
    where coalesce(a.raw_app_meta_data ->> 'role', '') <> u.role
       or coalesce(a.raw_app_meta_data ->> 'account_status', '') <> u.status
       or a.raw_user_meta_data ?| array['role','type','account_role','account_status']
  ) then
    raise exception 'Authority failure: auth metadata is not synchronized to public.users.';
  end if;
end
$$;

rollback;
