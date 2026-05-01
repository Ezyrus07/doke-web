-- Doke Stage 21: RLS foundation draft.
-- Review with Supabase auth claims before production execution.

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.services enable row level security;
alter table public.service_media enable row level security;
alter table public.favorites enable row level security;
alter table public.orders enable row level security;
alter table public.budgets enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.community_posts enable row level security;
alter table public.reports enable row level security;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.users where id = auth.uid()), 'guest')
$$;

create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('admin', 'moderator')
$$;

-- Profiles
create policy "users can read their own account" on public.users
  for select using (id = auth.uid() or public.is_admin_or_moderator());

create policy "users can update their own account" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "profiles are public readable" on public.user_profiles
  for select using (true);

create policy "users manage their profile" on public.user_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "professional profiles are public readable" on public.professional_profiles
  for select using (true);

create policy "professionals manage their profile" on public.professional_profiles
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Marketplace public reads
create policy "published services are public readable" on public.services
  for select using (status = 'published' or professional_id = auth.uid() or public.is_admin_or_moderator());

create policy "professionals manage own services" on public.services
  for all using (professional_id = auth.uid()) with check (professional_id = auth.uid());

create policy "service media follows service visibility" on public.service_media
  for select using (exists (
    select 1 from public.services s
    where s.id = service_media.service_id
      and (s.status = 'published' or s.professional_id = auth.uid() or public.is_admin_or_moderator())
  ));

create policy "professionals manage own service media" on public.service_media
  for all using (exists (
    select 1 from public.services s where s.id = service_media.service_id and s.professional_id = auth.uid()
  )) with check (exists (
    select 1 from public.services s where s.id = service_media.service_id and s.professional_id = auth.uid()
  ));

-- Private ownership / participant data
create policy "users manage own favorites" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "order participants can read orders" on public.orders
  for select using (client_id = auth.uid() or professional_id = auth.uid() or public.is_admin_or_moderator());

create policy "clients create own orders" on public.orders
  for insert with check (client_id = auth.uid());

create policy "order participants can update orders" on public.orders
  for update using (client_id = auth.uid() or professional_id = auth.uid())
  with check (client_id = auth.uid() or professional_id = auth.uid());

create policy "conversation participants can read" on public.conversations
  for select using (client_id = auth.uid() or professional_id = auth.uid() or public.is_admin_or_moderator());

create policy "conversation participants can insert messages" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.client_id = auth.uid() or c.professional_id = auth.uid())
    )
  );

create policy "conversation participants can read messages" on public.messages
  for select using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
      and (c.client_id = auth.uid() or c.professional_id = auth.uid() or public.is_admin_or_moderator())
  ));

create policy "users read own notifications" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin_or_moderator());

create policy "users update own notifications" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users read own wallet" on public.wallets
  for select using (user_id = auth.uid() or public.is_admin_or_moderator());

create policy "users read own transactions" on public.transactions
  for select using (wallet_user_id = auth.uid() or public.is_admin_or_moderator());

-- Community basics
create policy "public communities readable" on public.communities
  for select using (visibility = 'public' or owner_id = auth.uid() or public.is_admin_or_moderator());

create policy "community members readable by members" on public.community_members
  for select using (user_id = auth.uid() or public.is_admin_or_moderator());

create policy "published community posts readable" on public.community_posts
  for select using (status = 'published' or author_id = auth.uid() or public.is_admin_or_moderator());

create policy "members create posts" on public.community_posts
  for insert with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.community_members m
      where m.community_id = community_posts.community_id and m.user_id = auth.uid()
    )
  );

create policy "users create reports" on public.reports
  for insert with check (reporter_id = auth.uid());

create policy "moderators read reports" on public.reports
  for select using (public.is_admin_or_moderator());
