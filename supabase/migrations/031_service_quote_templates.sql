create table if not exists public.service_quote_templates (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  version integer not null check (version > 0),
  status text not null default 'active' check (status in ('active','archived','default')),
  source_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(service_id, version)
);

create table if not exists public.service_quote_questions (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.service_quote_templates(id) on delete cascade,
  question_key text not null,
  type text not null check (type in ('short_text','long_text','single_choice','multiple_choice','yes_no','number','date')),
  label text not null check (char_length(label) between 1 and 120),
  help_text text not null default '' check (char_length(help_text) <= 180),
  required boolean not null default false,
  position integer not null check (position between 0 and 9),
  options jsonb not null default '[]'::jsonb,
  validation_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique(template_id, position)
);

alter table public.service_quote_templates enable row level security;
alter table public.service_quote_questions enable row level security;

drop policy if exists service_quote_templates_public_read on public.service_quote_templates;
create policy service_quote_templates_public_read on public.service_quote_templates for select
to anon, authenticated
using (exists(select 1 from public.services s where s.id = service_id and (s.status = 'published' or s.professional_id = auth.uid())));

drop policy if exists service_quote_templates_owner_write on public.service_quote_templates;
create policy service_quote_templates_owner_write on public.service_quote_templates for all
to authenticated
using (professional_id = auth.uid()) with check (professional_id = auth.uid());

drop policy if exists service_quote_questions_public_read on public.service_quote_questions;
create policy service_quote_questions_public_read on public.service_quote_questions for select
to anon, authenticated
using (exists(select 1 from public.service_quote_templates t join public.services s on s.id=t.service_id where t.id = template_id and (s.status='published' or s.professional_id=auth.uid())));

drop policy if exists service_quote_questions_owner_write on public.service_quote_questions;
create policy service_quote_questions_owner_write on public.service_quote_questions for all
to authenticated
using (exists(select 1 from public.service_quote_templates t where t.id=template_id and t.professional_id=auth.uid()))
with check (exists(select 1 from public.service_quote_templates t where t.id=template_id and t.professional_id=auth.uid()));

create or replace function public.sync_service_quote_template_from_metadata()
returns trigger language plpgsql security invoker set search_path = public as $$
declare
  incoming jsonb := coalesce(new.metadata->'quoteTemplate', '{}'::jsonb);
  questions jsonb := coalesce(incoming->'questions', '[]'::jsonb);
  last_snapshot jsonb;
  next_version integer;
  template_uuid uuid;
  question jsonb;
  idx integer := 0;
begin
  if jsonb_typeof(questions) <> 'array' then questions := '[]'::jsonb; end if;
  select source_snapshot into last_snapshot from public.service_quote_templates where service_id=new.id order by version desc limit 1;
  if last_snapshot is not distinct from incoming then return new; end if;
  select coalesce(max(version),0)+1 into next_version from public.service_quote_templates where service_id=new.id;
  update public.service_quote_templates set status='archived' where service_id=new.id and status='active';
  insert into public.service_quote_templates(service_id, professional_id, version, status, source_snapshot)
  values(new.id,new.professional_id,next_version,case when jsonb_array_length(questions)>0 then 'active' else 'default' end,incoming)
  returning id into template_uuid;
  for question in select value from jsonb_array_elements(questions) loop
    exit when idx >= 10;
    if nullif(trim(question->>'label'),'') is not null then
      insert into public.service_quote_questions(template_id,question_key,type,label,help_text,required,position,options,validation_config)
      values(template_uuid,coalesce(nullif(question->>'id',''),'question_'||idx),
        case when question->>'type' in ('short_text','long_text','single_choice','multiple_choice','yes_no','number','date') then question->>'type' else 'short_text' end,
        left(trim(question->>'label'),120),left(coalesce(question->>'helpText',''),180),coalesce((question->>'required')::boolean,false),idx,
        case when jsonb_typeof(question->'options')='array' then question->'options' else '[]'::jsonb end,
        jsonb_build_object('maxLength',least(1000,greatest(1,coalesce((question->>'maxLength')::integer,180)))));
      idx := idx+1;
    end if;
  end loop;
  return new;
end $$;

drop trigger if exists sync_service_quote_template_after_service_write on public.services;
create trigger sync_service_quote_template_after_service_write
after insert or update of metadata on public.services
for each row execute function public.sync_service_quote_template_from_metadata();

create index if not exists idx_service_quote_templates_service_version on public.service_quote_templates(service_id,version desc);
create index if not exists idx_service_quote_questions_template_position on public.service_quote_questions(template_id,position);
