-- Doke: shared orders runtime.
-- Makes marketplace orders visible to the authenticated client and professional
-- across browsers/devices while preserving the frontend snapshot in metadata.

alter table public.orders
  add column if not exists external_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_orders_external_id_unique
  on public.orders(external_id)
  where external_id is not null;

create index if not exists idx_orders_service_created
  on public.orders(service_id, created_at desc);

alter table public.orders enable row level security;

-- Replace previous broad/experimental policies with the participant contract.
drop policy if exists "orders_participants_select" on public.orders;
drop policy if exists "orders_client_insert" on public.orders;
drop policy if exists "orders_participants_update" on public.orders;
drop policy if exists "orders_client_delete_draft" on public.orders;

create policy "orders_participants_select"
on public.orders for select
to authenticated
using (auth.uid() = client_id or auth.uid() = professional_id);

create policy "orders_client_insert"
on public.orders for insert
to authenticated
with check (
  auth.uid() = client_id
  and client_id <> professional_id
  and professional_id is not null
);

create policy "orders_participants_update"
on public.orders for update
to authenticated
using (auth.uid() = client_id or auth.uid() = professional_id)
with check (
  auth.uid() = client_id or auth.uid() = professional_id
);

-- Physical deletion is restricted to an unsubmitted draft owned by the client.
-- Normal product flows should cancel/dispute instead of deleting history.
create policy "orders_client_delete_draft"
on public.orders for delete
to authenticated
using (auth.uid() = client_id and status = 'draft');

comment on column public.orders.external_id is
  'Stable public/frontend order identifier, for example order_abc123.';
comment on column public.orders.metadata is
  'Immutable/complementary marketplace snapshot and UI transaction data.';
