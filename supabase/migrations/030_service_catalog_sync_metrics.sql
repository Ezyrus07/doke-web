-- Doke service catalog synchronization and owner metrics runtime.
-- Fixes PostgREST upsert conflict inference for external_id and records
-- deduplicated service views/contact intents without allowing direct counter edits.

-- PostgREST `on_conflict=external_id` requires a non-partial unique index.
-- PostgreSQL unique indexes already allow multiple NULL values.
drop index if exists public.idx_services_external_id;
create unique index if not exists idx_services_external_id
  on public.services(external_id);

create table if not exists public.service_metric_events (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  event_type text not null check (event_type in ('view', 'budget', 'message')),
  actor_id uuid references public.users(id) on delete set null,
  visitor_key text not null check (char_length(visitor_key) between 8 and 160),
  occurred_on date not null default (timezone('utc', now())::date),
  created_at timestamptz not null default now(),
  constraint service_metric_events_daily_unique
    unique (service_id, event_type, visitor_key, occurred_on)
);

create index if not exists idx_service_metric_events_service_created
  on public.service_metric_events(service_id, created_at desc);

create index if not exists idx_service_metric_events_actor_created
  on public.service_metric_events(actor_id, created_at desc)
  where actor_id is not null;

alter table public.service_metric_events enable row level security;

revoke all on table public.service_metric_events from anon, authenticated;
grant insert on table public.service_metric_events to anon, authenticated;
grant select on table public.service_metric_events to authenticated;

drop policy if exists service_metric_events_record on public.service_metric_events;
create policy service_metric_events_record
  on public.service_metric_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.services s
      where s.id = service_metric_events.service_id
        and s.status = 'published'
        and s.professional_id is distinct from auth.uid()
    )
    and (actor_id is null or actor_id = auth.uid())
    and (
      event_type = 'view'
      or (
        event_type in ('budget', 'message')
        and auth.uid() is not null
        and actor_id = auth.uid()
      )
    )
  );

drop policy if exists service_metric_events_owner_read on public.service_metric_events;
create policy service_metric_events_owner_read
  on public.service_metric_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.services s
      where s.id = service_metric_events.service_id
        and s.professional_id = auth.uid()
    )
  );

drop view if exists public.service_metric_totals;
create view public.service_metric_totals
with (security_invoker = true)
as
select
  service_id,
  count(*) filter (where event_type = 'view')::bigint as views_count,
  count(*) filter (where event_type in ('budget', 'message'))::bigint as contacts_count,
  count(*) filter (where event_type = 'budget')::bigint as budget_count,
  count(*) filter (where event_type = 'message')::bigint as message_count,
  max(created_at) as last_event_at
from public.service_metric_events
group by service_id;

revoke all on table public.service_metric_totals from anon, authenticated;
grant select on table public.service_metric_totals to authenticated;
