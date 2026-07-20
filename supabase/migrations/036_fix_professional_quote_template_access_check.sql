begin;

create schema if not exists private;

create or replace function private.is_active_verified_professional(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = p_user_id
      and u.id = auth.uid()
      and u.role = 'professional'
      and u.status = 'active'
      and u.onboarding_status = 'completed'
      and p.setup_status = 'active'
      and p.verification_status = 'verified'
      and p.document_status = 'verified'
  );
$$;

revoke all on function private.is_active_verified_professional(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.is_active_verified_professional(uuid) to authenticated;

drop policy if exists professional_quote_templates_owner_insert on public.professional_quote_templates;
create policy professional_quote_templates_owner_insert
  on public.professional_quote_templates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = professional_id
    and private.is_active_verified_professional(professional_id)
  );

drop policy if exists professional_quote_templates_owner_update on public.professional_quote_templates;
create policy professional_quote_templates_owner_update
  on public.professional_quote_templates
  for update
  to authenticated
  using ((select auth.uid()) = professional_id)
  with check (
    (select auth.uid()) = professional_id
    and private.is_active_verified_professional(professional_id)
  );

commit;
