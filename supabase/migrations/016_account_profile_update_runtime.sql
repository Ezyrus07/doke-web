-- Doke authenticated account profile update runtime.
-- Materializes the authenticated account and updates only auth.uid().

create or replace function public.update_account_profile(
  p_display_name text,
  p_username text,
  p_city text default '',
  p_state text default '',
  p_bio text default '',
  p_interests jsonb default '[]'::jsonb,
  p_avatar_url text default '',
  p_cover_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth auth.users;
  v_profile public.user_profiles;
  v_username text;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;

  select * into v_auth from auth.users where id = auth.uid();
  if v_auth.id is null then raise exception 'Authenticated user not found'; end if;

  perform public.materialize_auth_account(
    v_auth.id,
    v_auth.email,
    v_auth.phone,
    coalesce(v_auth.raw_user_meta_data, '{}'::jsonb)
  );

  v_username := lower(regexp_replace(coalesce(trim(p_username), ''), '[^a-zA-Z0-9._]+', '', 'g'));
  if char_length(v_username) < 3 or char_length(v_username) > 30 then
    raise exception 'Invalid username';
  end if;

  if exists (
    select 1 from public.user_profiles
    where username = v_username and user_id <> auth.uid()
  ) then
    raise exception 'Username already in use';
  end if;

  update public.user_profiles
  set display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
      username = v_username,
      city = nullif(trim(p_city), ''),
      state = upper(nullif(trim(p_state), '')),
      bio = coalesce(trim(p_bio), ''),
      interests = coalesce(p_interests, '[]'::jsonb),
      avatar_url = coalesce(nullif(trim(p_avatar_url), ''), avatar_url),
      cover_url = coalesce(nullif(trim(p_cover_url), ''), cover_url),
      updated_at = now()
  where user_id = auth.uid()
  returning * into v_profile;

  update auth.users
  set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'name', v_profile.display_name,
        'full_name', v_profile.display_name,
        'handle', v_profile.username,
        'city', v_profile.city,
        'state', v_profile.state,
        'bio', v_profile.bio,
        'interests', v_profile.interests,
        'avatar_url', v_profile.avatar_url,
        'cover_url', v_profile.cover_url
      ),
      updated_at = now()
  where id = auth.uid();

  return jsonb_build_object(
    'profileId', v_profile.user_id,
    'displayName', v_profile.display_name,
    'username', v_profile.username,
    'city', v_profile.city,
    'state', v_profile.state,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'avatarUrl', v_profile.avatar_url,
    'coverUrl', v_profile.cover_url
  );
end;
$$;

revoke all on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) from public;
grant execute on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) to authenticated;
