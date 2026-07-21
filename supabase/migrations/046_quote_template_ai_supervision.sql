-- Supervised generative optimization for professional quote templates.
-- The OpenAI key is consumed only by the Edge Function; no client receives it.

create table if not exists public.quote_template_ai_runs (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  service_external_id text,
  template_identity text not null default 'custom',
  template_source text not null default 'custom',
  template_category text,
  engine text not null check (engine in ('openai', 'rules')),
  model text,
  status text not null default 'completed' check (status in ('completed', 'failed')),
  input_hash text not null,
  input_snapshot jsonb not null default '{}'::jsonb,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  provider_request_id text,
  error_code text,
  selected_suggestion_ids jsonb not null default '[]'::jsonb,
  applied_template_signature text,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint quote_template_ai_runs_suggestions_array
    check (jsonb_typeof(suggestions) = 'array'),
  constraint quote_template_ai_runs_selected_array
    check (jsonb_typeof(selected_suggestion_ids) = 'array')
);

create index if not exists idx_quote_template_ai_runs_owner_created
  on public.quote_template_ai_runs (professional_id, created_at desc);

create index if not exists idx_quote_template_ai_runs_service_created
  on public.quote_template_ai_runs (service_id, created_at desc)
  where service_id is not null;

create index if not exists idx_quote_template_ai_runs_input_hash
  on public.quote_template_ai_runs (professional_id, input_hash, created_at desc);

alter table public.quote_template_ai_runs enable row level security;

revoke all on table public.quote_template_ai_runs from anon;
revoke insert, update, delete on table public.quote_template_ai_runs from authenticated;
grant select on table public.quote_template_ai_runs to authenticated;

comment on table public.quote_template_ai_runs is
  'Append-oriented audit of supervised quote-template optimization generations and the suggestions selected by the professional.';
comment on column public.quote_template_ai_runs.input_snapshot is
  'Privacy-minimized template snapshot. It must never contain customer answers, addresses, notes or attachments.';
