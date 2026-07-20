-- DOKE — 024 Admin Professional Verification Queue
-- Cria leitura administrativa segura da fila de verificações, sem depender da RLS direta.

create or replace function public.list_professional_identity_verifications_for_admin(
  p_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_result jsonb;
begin
  if v_admin is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.users u
    where u.id = v_admin
      and u.role in ('admin', 'moderator')
      and u.status = 'active'
  ) then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(v) order by v.updated_at desc), '[]'::jsonb)
  into v_result
  from public.professional_identity_verifications v
  where v.status in ('submitted', 'under_review', 'verified', 'rejected')
    and (p_status is null or p_status = '' or v.status = p_status);

  return v_result;
end;
$$;

revoke all on function public.list_professional_identity_verifications_for_admin(text) from public;
grant execute on function public.list_professional_identity_verifications_for_admin(text) to authenticated;

notify pgrst, 'reload schema';
