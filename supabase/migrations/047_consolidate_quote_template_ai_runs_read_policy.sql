-- Keep one explicit owner/admin read policy. Writes remain server-side only.

drop policy if exists quote_template_ai_runs_owner_read on public.quote_template_ai_runs;
drop policy if exists quote_template_ai_runs_admin_read on public.quote_template_ai_runs;
drop policy if exists quote_template_ai_runs_authorized_read on public.quote_template_ai_runs;

create policy quote_template_ai_runs_authorized_read
on public.quote_template_ai_runs
for select
to authenticated
using (
  (select auth.uid()) = professional_id
  or public.is_active_admin_or_moderator()
);
