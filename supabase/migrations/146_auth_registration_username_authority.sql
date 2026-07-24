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
begin
  v_username := public.normalize_username(new.username);

  if not public.is_valid_username(v_username) then
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
-- for new claims by the RPC and the registration trigger below.
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

create or replace function private.enforce_requested_auth_username_doke()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_requested_raw text;
  v_requested text;
  v_materialized text;
begin
  v_requested_raw := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'handle', '')), '');

  -- OAuth or future provider-created users may arrive without a requested handle;
  -- the existing materializer keeps its deterministic fallback for that case.
  if v_requested_raw is null then
    return new;
  end if;

  v_requested := public.normalize_username(v_requested_raw);

  if not public.is_valid_username(v_requested) then
    raise exception using
      errcode = '22023',
      message = 'DOKE_IDENTITY_USERNAME_INVALID';
  end if;

  select p.username
    into v_materialized
    from public.user_profiles p
   where p.user_id = new.id;

  -- The existing materializer appends a suffix on collision. Registration must
  -- not silently assign a username the user did not request, so the auth insert
  -- is rolled back when the materialized value differs.
  if v_materialized is distinct from v_requested then
    raise exception using
      errcode = '23505',
      message = 'DOKE_IDENTITY_USERNAME_TAKEN';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_requested_auth_username_doke() from public, anon, authenticated;

drop trigger if exists zz_enforce_requested_auth_username_doke on auth.users;
create trigger zz_enforce_requested_auth_username_doke
after insert on auth.users
for each row execute function private.enforce_requested_auth_username_doke();

comment on function public.check_username_availability(text) is
  'AUTH-A04 public registration contract. Returns canonical validity and availability without reserving or mutating identity data.';
comment on trigger zz_enforce_requested_auth_username_doke on auth.users is
  'Fails the auth.users transaction when a requested registration username was invalid or lost an availability race.';
