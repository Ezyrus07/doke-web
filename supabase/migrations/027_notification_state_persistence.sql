-- DOKE — 027 Notification state persistence

create or replace function public.update_own_notification_state(
  p_notification_ref text,
  p_mark_read boolean default null,
  p_dismiss boolean default null
)
returns public.notifications
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.notifications;
  v_now timestamptz := now();
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  update public.notifications n
     set read_at = case
          when p_dismiss is true then coalesce(n.read_at, v_now)
          when p_mark_read is true then coalesce(n.read_at, v_now)
          when p_mark_read is false then null
          else n.read_at
        end,
         dismissed_at = case
          when p_dismiss is true then coalesce(n.dismissed_at, v_now)
          when p_dismiss is false then null
          else n.dismissed_at
        end,
         updated_at = v_now
   where n.user_id = v_uid
     and (n.external_id = p_notification_ref or n.id::text = p_notification_ref)
  returning n.* into v_row;

  if v_row.id is null then
    raise exception 'NOTIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_row;
end;
$$;

revoke all on function public.update_own_notification_state(text, boolean, boolean) from public;
grant execute on function public.update_own_notification_state(text, boolean, boolean) to authenticated;

notify pgrst, 'reload schema';
