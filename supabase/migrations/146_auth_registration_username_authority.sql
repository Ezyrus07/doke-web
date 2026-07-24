-- Doke AUTH-001 / AUTH-A04.
-- Canonicalizes registration usernames, preserves legacy internal identities,
-- exposes a safe availability RPC and fails closed on signup races.

create extension if not exists unaccent with schema extensions;

create or replace function public.normalize_username(p_username text)
returns text
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select left(
    trim(both '._' from regexp_replace(
      lower(extensions.unaccent(regexp_replace(coalesce(p_username, ''), '^@+', '', 'g'))),
      '[^a-z0-9._]+',
      '',
      'g'
    )),
    30
  )
$$;

create or replace function public.is_reserved_username(p_username text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.normalize_username(p_username) = any (array[
    'admin', 'administrador', 'doke', 'suporte', 'support',
    'moderador', 'moderator', 'root', 'sistema', 'system'
  ]::text[])
$$;

create or replace function public.is_valid_username(p_username text)
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.normalize_username(p_username) ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
    and not public.is_reserved_username(p_username)
$$;

revoke all on function public.normalize_username(text) from public;
revoke all on function public.is_reserved_username(text) from public;
revoke all on function public.is_valid_username(text) from public;
grant execute on function public.normalize_username(text) to anon, authenticated, service_role;
grant execute on function public.is_reserved_username(text) to anon, authenticated, service_role;
grant execute on function public.is_valid_username(text) to anon, authenticated, service_role;

create or replace function private.enforce_user_profile_username()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_username text;
  v_grandfathered_reserved boolean := false;
begin
  v_username := public.normalize_username(new.username);
  v_grandfathered_reserved := tg_op = 'UPDATE'
    and old.username = v_username
    and public.is_reserved_username(v_username);

  if v_username !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
     or (public.is_reserved_username(v_username) and not v_grandfathered_reserved) then
    raise exception using
      errcode = '22023',
      message = 'DOKE_IDENTITY_USERNAME_INVALID';
  end if;

  new.username := v_username;
  return new;
end;
$$;

revoke all on function private.enforce_user_profile_username() from public, anon, authenticated;

drop trigger if exists trg_enforce_user_profile_username on public.user_profiles;
create trigger trg_enforce_user_profile_username
before insert or update of username on public.user_profiles
for each row execute function private.enforce_user_profile_username();

-- Abort rather than silently merging two legacy usernames into one canonical value.
do $$
begin
  if exists (
    select 1
    from public.user_profiles
    group by public.normalize_username(username)
    having count(*) > 1
  ) then
    raise exception using
      errcode = '23505',
      message = 'DOKE_IDENTITY_USERNAME_CANONICAL_COLLISION';
  end if;
end;
$$;

update public.user_profiles
set username = public.normalize_username(username)
where username is distinct from public.normalize_username(username);

alter table public.user_profiles
  alter column username set not null;

alter table public.user_profiles
  drop constraint if exists user_profiles_username_format_check;

-- Existing internal reserved identities remain valid. Reserved names are blocked
-- for new claims by the RPC and the canonical materializer below.
alter table public.user_profiles
  add constraint user_profiles_username_format_check
  check (
    username = lower(username)
    and username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
  );

create or replace function public.check_username_availability(p_username text)
returns table (
  username text,
  valid boolean,
  available boolean,
  reason text
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_username text := public.normalize_username(p_username);
  v_reserved boolean := public.is_reserved_username(p_username);
  v_taken boolean;
begin
  if v_reserved then
    return query select v_username, false, false, 'reserved';
    return;
  end if;

  if not public.is_valid_username(v_username) then
    return query select v_username, false, false, 'invalid_format';
    return;
  end if;

  select exists (
    select 1
    from public.user_profiles p
    where p.username = v_username
  ) into v_taken;

  return query
  select
    v_username,
    true,
    not v_taken,
    case when v_taken then 'taken' else 'available' end;
end;
$$;

revoke all on function public.check_username_availability(text) from public;
grant execute on function public.check_username_availability(text) to anon, authenticated, service_role;

-- Reuse the function already called by on_auth_user_created_doke. This keeps one
-- auth.users trigger authority and avoids requiring a second trigger on the
-- Supabase-owned auth relation.
create or replace function private.materialize_auth_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_auth auth.users%rowtype;
  v_name text;
  v_requested_raw text;
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

  v_requested_raw := nullif(trim(coalesce(v_auth.raw_user_meta_data ->> 'handle', '')), '');

  if v_requested_raw is not null then
    v_handle_base := public.normalize_username(v_requested_raw);
    if not public.is_valid_username(v_handle_base) then
      raise exception using errcode = '22023', message = 'DOKE_IDENTITY_USERNAME_INVALID';
    end if;
  else
    v_handle_base := public.normalize_username(
      split_part(coalesce(v_auth.email, p_user_id::text), '@', 1)
    );
    if not public.is_valid_username(v_handle_base) then
      v_handle_base := 'user_' || left(replace(p_user_id::text, '-', ''), 12);
    end if;
  end if;

  v_handle := v_handle_base;

  if v_requested_raw is not null then
    if exists (
      select 1
      from public.user_profiles p
      where p.username = v_handle
        and p.user_id <> p_user_id
    ) then
      raise exception using errcode = '23505', message = 'DOKE_IDENTITY_USERNAME_TAKEN';
    end if;
  else
    -- Provider-created identities without an explicit username retain the
    -- deterministic collision fallback used before AUTH-A04.
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
  end if;

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

comment on function public.check_username_availability(text) is
  'AUTH-A04 public registration contract. Returns canonical validity and availability without reserving or mutating identity data.';
comment on function private.materialize_auth_account(uuid) is
  'Canonical AUTH-A04 account materializer. Requested usernames fail atomically on invalid, reserved or taken values.';
