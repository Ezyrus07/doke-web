begin;

do $$
declare
  v_columns text[];
begin
  select array_agg(column_name order by ordinal_position)
    into v_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'public_profile_role_projection';

  if v_columns is distinct from array['user_id', 'role', 'updated_at']::text[] then
    raise exception 'projection_schema: unexpected columns: %', v_columns;
  end if;

  if not has_table_privilege('anon', 'public.public_profile_role_projection', 'SELECT')
     or not has_table_privilege('authenticated', 'public.public_profile_role_projection', 'SELECT') then
    raise exception 'browser_read_only: browser SELECT grant missing';
  end if;

  if has_table_privilege('anon', 'public.public_profile_role_projection', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.public_profile_role_projection', 'INSERT,UPDATE,DELETE') then
    raise exception 'browser_read_only: browser mutation privilege exposed';
  end if;

  if exists (
    select 1
    from public.public_profile_role_projection projection
    left join public.users account on account.id = projection.user_id
    where account.id is null
       or account.status <> 'active'
       or account.role not in ('client', 'professional')
       or account.role <> projection.role
  ) then
    raise exception 'active_role_consistency: projection drift detected';
  end if;

  if exists (
    select 1
    from public.users account
    where account.status = 'active'
      and account.role in ('client', 'professional')
      and not exists (
        select 1
        from public.public_profile_role_projection projection
        where projection.user_id = account.id
          and projection.role = account.role
      )
  ) then
    raise exception 'active_role_consistency: eligible account missing projection';
  end if;
end
$$;

do $$
declare
  v_user_id uuid;
  v_status text;
begin
  select id, status
    into v_user_id, v_status
  from public.users
  where status = 'active'
    and role in ('client', 'professional')
  order by created_at nulls last, id
  limit 1;

  if v_user_id is null then
    raise exception 'status_transition_sync: no eligible staging account available';
  end if;

  update public.users
     set status = 'suspended'
   where id = v_user_id;

  if exists (
    select 1
    from public.public_profile_role_projection
    where user_id = v_user_id
  ) then
    raise exception 'status_transition_sync: suspended account remained public';
  end if;

  update public.users
     set status = v_status
   where id = v_user_id;

  if not exists (
    select 1
    from public.public_profile_role_projection
    where user_id = v_user_id
  ) then
    raise exception 'status_transition_sync: reactivated account was not restored';
  end if;
end
$$;

rollback;
