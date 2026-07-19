-- Doke account onboarding materialization.
-- Ensures every Supabase Auth user owns a matching public account/profile.

create or replace function public.materialize_auth_account(
  p_user_id uuid,
  p_email text,
  p_phone text,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_name text;
  v_handle text;
  v_role text;
begin
  v_name := nullif(trim(coalesce(p_metadata->>'name', p_metadata->>'full_name', split_part(coalesce(p_email, 'Conta Doke'), '@', 1))), '');
  v_name := coalesce(v_name, 'Conta Doke');
  v_handle := lower(regexp_replace(coalesce(nullif(trim(p_metadata->>'handle'), ''), split_part(coalesce(p_email, p_user_id::text), '@', 1)), '[^a-zA-Z0-9._]+', '', 'g'));
  if char_length(v_handle) < 3 then v_handle := 'user_' || left(replace(p_user_id::text, '-', ''), 12); end if;
  v_role := lower(coalesce(nullif(p_metadata->>'role', ''), 'client'));
  if v_role not in ('client', 'professional', 'moderator', 'admin') then v_role := 'client'; end if;

  insert into public.users (id, email, phone, role, status, onboarding_status, settings, created_at, updated_at)
  values (p_user_id, lower(p_email), nullif(p_phone, ''), v_role, 'active', 'in_progress', '{}'::jsonb, now(), now())
  on conflict (id) do update set
    email = excluded.email,
    phone = coalesce(excluded.phone, public.users.phone),
    updated_at = now();

  insert into public.user_profiles (user_id, display_name, username, country, interests, created_at, updated_at)
  values (p_user_id, v_name, v_handle, 'BR', '[]'::jsonb, now(), now())
  on conflict (user_id) do update set
    display_name = coalesce(nullif(public.user_profiles.display_name, ''), excluded.display_name),
    username = coalesce(public.user_profiles.username, excluded.username),
    updated_at = now();

  insert into public.client_profiles (user_id, created_at, updated_at)
  values (p_user_id, now(), now())
  on conflict (user_id) do nothing;
end;
$$;

revoke all on function public.materialize_auth_account(uuid, text, text, jsonb) from public;

create or replace function public.handle_new_auth_user_doke()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  perform public.materialize_auth_account(new.id, new.email, new.phone, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_doke on auth.users;
create trigger on_auth_user_created_doke
after insert on auth.users
for each row execute function public.handle_new_auth_user_doke();

-- Backfill users that already exist in Auth.
do $$
declare
  item record;
begin
  for item in select id, email, phone, raw_user_meta_data from auth.users loop
    perform public.materialize_auth_account(item.id, item.email, item.phone, coalesce(item.raw_user_meta_data, '{}'::jsonb));
  end loop;
end;
$$;

create or replace function public.complete_account_onboarding(
  p_city text,
  p_state text,
  p_postal_code text default null,
  p_bio text default '',
  p_interests jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user auth.users;
  v_profile public.user_profiles;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then raise exception 'Authenticated user not found'; end if;

  perform public.materialize_auth_account(v_user.id, v_user.email, v_user.phone, coalesce(v_user.raw_user_meta_data, '{}'::jsonb));

  update public.user_profiles
  set city = nullif(trim(p_city), ''),
      state = upper(nullif(trim(p_state), '')),
      bio = coalesce(trim(p_bio), ''),
      interests = coalesce(p_interests, '[]'::jsonb),
      updated_at = now()
  where user_id = auth.uid()
  returning * into v_profile;

  if v_profile.city is null or v_profile.state is null then
    raise exception 'City and state are required';
  end if;

  update public.users
  set onboarding_status = 'completed',
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('postalCode', regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g')),
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'userId', auth.uid(),
    'city', v_profile.city,
    'state', v_profile.state,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'onboardingStatus', 'completed'
  );
end;
$$;

revoke all on function public.complete_account_onboarding(text, text, text, text, jsonb) from public;
grant execute on function public.complete_account_onboarding(text, text, text, text, jsonb) to authenticated;
