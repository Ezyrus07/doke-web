begin;

create table if not exists public.professional_quote_templates (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  category text,
  template_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint professional_quote_templates_name_check
    check (char_length(trim(name)) between 3 and 60),
  constraint professional_quote_templates_category_check
    check (category is null or char_length(trim(category)) <= 80),
  constraint professional_quote_templates_payload_object_check
    check (jsonb_typeof(template_payload) = 'object'),
  constraint professional_quote_templates_questions_array_check
    check (jsonb_typeof(coalesce(template_payload -> 'questions', '[]'::jsonb)) = 'array'),
  constraint professional_quote_templates_questions_count_check
    check (jsonb_array_length(coalesce(template_payload -> 'questions', '[]'::jsonb)) between 1 and 10)
);

create unique index if not exists professional_quote_templates_owner_name_key
  on public.professional_quote_templates(professional_id, lower(trim(name)));

create index if not exists idx_professional_quote_templates_owner_updated
  on public.professional_quote_templates(professional_id, updated_at desc);

alter table public.professional_quote_templates enable row level security;

drop policy if exists professional_quote_templates_owner_read on public.professional_quote_templates;
create policy professional_quote_templates_owner_read
  on public.professional_quote_templates
  for select
  to authenticated
  using ((select auth.uid()) = professional_id);

drop policy if exists professional_quote_templates_owner_insert on public.professional_quote_templates;
create policy professional_quote_templates_owner_insert
  on public.professional_quote_templates
  for insert
  to authenticated
  with check ((select auth.uid()) = professional_id);

drop policy if exists professional_quote_templates_owner_update on public.professional_quote_templates;
create policy professional_quote_templates_owner_update
  on public.professional_quote_templates
  for update
  to authenticated
  using ((select auth.uid()) = professional_id)
  with check ((select auth.uid()) = professional_id);

drop policy if exists professional_quote_templates_owner_delete on public.professional_quote_templates;
create policy professional_quote_templates_owner_delete
  on public.professional_quote_templates
  for delete
  to authenticated
  using ((select auth.uid()) = professional_id);

create or replace function public.touch_professional_quote_template_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_professional_quote_template_updated_at on public.professional_quote_templates;
create trigger trg_touch_professional_quote_template_updated_at
before update on public.professional_quote_templates
for each row execute function public.touch_professional_quote_template_updated_at();

revoke all on table public.professional_quote_templates from anon;
grant select, insert, update, delete on table public.professional_quote_templates to authenticated;

revoke execute on function public.touch_professional_quote_template_updated_at() from public, anon, authenticated;

commit;
