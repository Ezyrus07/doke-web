begin;

drop policy if exists professional_quote_templates_owner_insert on public.professional_quote_templates;
create policy professional_quote_templates_owner_insert
  on public.professional_quote_templates
  for insert
  to authenticated
  with check (
    (select auth.uid()) = professional_id
    and exists (
      select 1
      from public.users u
      join public.professional_profiles p on p.user_id = u.id
      where u.id = (select auth.uid())
        and u.role = 'professional'
        and u.status = 'active'
        and u.onboarding_status = 'completed'
        and p.setup_status = 'active'
        and p.verification_status = 'verified'
        and p.document_status = 'verified'
    )
  );

drop policy if exists professional_quote_templates_owner_update on public.professional_quote_templates;
create policy professional_quote_templates_owner_update
  on public.professional_quote_templates
  for update
  to authenticated
  using ((select auth.uid()) = professional_id)
  with check (
    (select auth.uid()) = professional_id
    and exists (
      select 1
      from public.users u
      join public.professional_profiles p on p.user_id = u.id
      where u.id = (select auth.uid())
        and u.role = 'professional'
        and u.status = 'active'
        and u.onboarding_status = 'completed'
        and p.setup_status = 'active'
        and p.verification_status = 'verified'
        and p.document_status = 'verified'
    )
  );

create or replace function public.enforce_professional_quote_template_limit()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(hashtext(new.professional_id::text));

  if (
    select count(*)
    from public.professional_quote_templates t
    where t.professional_id = new.professional_id
  ) >= 30 then
    raise exception 'PROFESSIONAL_QUOTE_TEMPLATE_LIMIT_REACHED'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_professional_quote_template_limit
  on public.professional_quote_templates;
create trigger trg_enforce_professional_quote_template_limit
before insert on public.professional_quote_templates
for each row execute function public.enforce_professional_quote_template_limit();

revoke execute on function public.enforce_professional_quote_template_limit()
  from public, anon, authenticated;

commit;
