-- Doke SEC-001 / identity batch 1.
-- Removes user-editable metadata from authorization and moves account materialization to private authority.

create or replace function private.sync_auth_app_metadata_from_public_user()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update auth.users
     set raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' - 'account_status')
           || jsonb_build_object('role', new.role, 'account_status', new.status),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
           - 'role' - 'type' - 'account_role' - 'account_status',
         updated_at = now()
   where id = new.id;
  return new;
end;
$$;

revoke all on function private.sync_auth_app_metadata_from_public_user() from public, anon, authenticated;

drop trigger if exists trg_sync_auth_app_metadata_from_public_user on public.users;
create trigger trg_sync_auth_app_metadata_from_public_user
after insert or update of role, status on public.users
for each row execute function private.sync_auth_app_metadata_from_public_user();

create or replace function private.materialize_auth_account(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_auth auth.users%rowtype;
  v_name text;
  v_handle_base text;
  v_handle text;
  v_suffix text;
  v_attempt integer := 0;
  v_role text;
  v_status text;
begin
  if p_user_id is null then
    raise exception using errcode = '22023', message = 'DOKE_IDENTITY_USER_ID_REQUIRED';
  end if;

  select * into v_auth
  from auth.users
  where id = p_user_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_IDENTITY_AUTH_USER_NOT_FOUND';
  end if;

  v_name := nullif(trim(coalesce(
    v_auth.raw_user_meta_data ->> 'name',
    v_auth.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(v_auth.email, 'Conta Doke'), '@', 1)
  )), '');
  v_name := left(coalesce(v_name, 'Conta Doke'), 80);

  v_handle_base := lower(regexp_replace(coalesce(
    nullif(trim(v_auth.raw_user_meta_data ->> 'handle'), ''),
    split_part(coalesce(v_auth.email, p_user_id::text), '@', 1)
  ), '[^a-zA-Z0-9._]+', '', 'g'));
  v_handle_base := trim(both '._' from left(v_handle_base, 30));
  if char_length(v_handle_base) < 3 then
    v_handle_base := 'user_' || left(replace(p_user_id::text, '-', ''), 12);
  end if;

  v_handle := v_handle_base;
  v_suffix := left(replace(p_user_id::text, '-', ''), 8);
  while exists (
    select 1
    from public.user_profiles p
    where p.username = v_handle
      and p.user_id <> p_user_id
  ) loop
    v_attempt := v_attempt + 1;
    v_handle := left(v_handle_base, greatest(3, 20 - char_length(v_attempt::text)))
      || '_' || v_suffix || case when v_attempt = 1 then '' else '_' || v_attempt::text end;
    if v_attempt > 20 then
      raise exception using errcode = '23505', message = 'DOKE_IDENTITY_USERNAME_MATERIALIZATION_FAILED';
    end if;
  end loop;

  insert into public.users (
    id, email, phone, role, status, onboarding_status, settings, created_at, updated_at
  ) values (
    p_user_id,
    lower(v_auth.email),
    nullif(v_auth.phone, ''),
    'client',
    'active',
    'in_progress',
    '{}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.users.phone),
    updated_at = now();

  insert into public.user_profiles (
    user_id, display_name, username, country, interests, created_at, updated_at
  ) values (
    p_user_id, v_name, v_handle, 'BR', '[]'::jsonb, now(), now()
  )
  on conflict (user_id) do update set
    display_name = coalesce(nullif(public.user_profiles.display_name, ''), excluded.display_name),
    username = coalesce(public.user_profiles.username, excluded.username),
    updated_at = now();

  insert into public.client_profiles (user_id, created_at, updated_at)
  values (p_user_id, now(), now())
  on conflict (user_id) do nothing;

  select role, status into v_role, v_status
  from public.users
  where id = p_user_id;

  update auth.users
     set raw_app_meta_data = (coalesce(raw_app_meta_data, '{}'::jsonb) - 'role' - 'account_status')
           || jsonb_build_object('role', v_role, 'account_status', v_status),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
           - 'role' - 'type' - 'account_role' - 'account_status',
         updated_at = now()
   where id = p_user_id;
end;
$$;

revoke all on function private.materialize_auth_account(uuid) from public, anon, authenticated;
grant execute on function private.materialize_auth_account(uuid) to service_role;

create or replace function private.handle_new_auth_user_doke()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.materialize_auth_account(new.id);
  return new;
end;
$$;

revoke all on function private.handle_new_auth_user_doke() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_doke on auth.users;
create trigger on_auth_user_created_doke
after insert on auth.users
for each row execute function private.handle_new_auth_user_doke();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select coalesce((
    select case when u.status = 'active' then u.role else 'guest' end
    from public.users u
    where u.id = (select auth.uid())
  ), 'guest')
$$;

create or replace function public.is_support_or_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.current_user_role() in ('support', 'admin')
$$;

create or replace function public.is_internal_operator()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.current_user_role() in ('moderator', 'support', 'admin')
$$;

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.current_user_role() in ('moderator', 'support', 'admin')
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_support_or_admin() from public;
revoke all on function public.is_internal_operator() from public;
revoke all on function public.is_admin_or_moderator() from public;
grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.is_support_or_admin() to anon, authenticated, service_role;
grant execute on function public.is_internal_operator() to anon, authenticated, service_role;
grant execute on function public.is_admin_or_moderator() to anon, authenticated, service_role;

-- Backfill authoritative authorization claims and remove user-editable authorization keys.
update auth.users a
   set raw_app_meta_data = (coalesce(a.raw_app_meta_data, '{}'::jsonb) - 'role' - 'account_status')
         || jsonb_build_object('role', u.role, 'account_status', u.status),
       raw_user_meta_data = coalesce(a.raw_user_meta_data, '{}'::jsonb)
         - 'role' - 'type' - 'account_role' - 'account_status',
       updated_at = now()
  from public.users u
 where u.id = a.id;
