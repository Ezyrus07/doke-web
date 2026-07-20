-- DOKE — 025 Admin Professional Verification Detail
-- Leitura administrativa segura de uma verificação específica, sem depender da RLS direta.

create or replace function public.get_professional_identity_verification_for_admin(
  p_verification_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_raw text := trim(coalesce(p_verification_id, ''));
  v_candidate uuid;
  v_row public.professional_identity_verifications%rowtype;
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

  if v_raw = '' then
    raise exception 'VERIFICATION_ID_REQUIRED' using errcode = '22023';
  end if;

  begin
    if v_raw like 'professional_verification_%' then
      v_candidate := replace(v_raw, 'professional_verification_', '')::uuid;
    else
      v_candidate := v_raw::uuid;
    end if;
  exception when invalid_text_representation then
    raise exception 'VERIFICATION_ID_INVALID' using errcode = '22023';
  end;

  select v.*
  into v_row
  from public.professional_identity_verifications v
  where v.id = v_candidate
     or v.user_id = v_candidate
  order by
    case when v.id = v_candidate then 0 else 1 end,
    v.updated_at desc
  limit 1;

  if v_row.id is null then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.get_professional_identity_verification_for_admin(text) from public;
grant execute on function public.get_professional_identity_verification_for_admin(text) to authenticated;

notify pgrst, 'reload schema';
