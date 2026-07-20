-- Doke account onboarding state runtime.
-- Returns the authenticated account's authoritative onboarding state.

create or replace function public.get_account_onboarding_state()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user public.users;
  v_profile public.user_profiles;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into v_user
  from public.users
  where id = auth.uid();

  if v_user.id is null then
    raise exception 'Public account not found';
  end if;

  select * into v_profile
  from public.user_profiles
  where user_id = auth.uid();

  return jsonb_build_object(
    'userId', v_user.id,
    'onboardingStatus', coalesce(v_user.onboarding_status, 'not_started'),
    'onboardingCompletedAt', v_user.onboarding_completed_at,
    'profile', jsonb_build_object(
      'displayName', coalesce(v_profile.display_name, ''),
      'username', coalesce(v_profile.username, ''),
      'city', coalesce(v_profile.city, ''),
      'state', coalesce(v_profile.state, ''),
      'bio', coalesce(v_profile.bio, ''),
      'interests', coalesce(v_profile.interests, '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.get_account_onboarding_state() from public;
grant execute on function public.get_account_onboarding_state() to authenticated;
