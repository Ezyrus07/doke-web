-- Doke Stage 21: messaging, scheduling, wallet, notifications, communities and moderation.

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'archived', 'blocked')),
  last_message_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read', 'removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  file_url text not null,
  mime_type text,
  size_bytes int check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'available' check (status in ('available', 'blocked', 'booked')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.wallets (
  user_id uuid primary key references public.users(id) on delete cascade,
  balance_cents int not null default 0,
  pending_cents int not null default 0,
  currency text not null default 'BRL',
  updated_at timestamptz not null default now(),
  check (balance_cents >= 0),
  check (pending_cents >= 0)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid not null references public.wallets(user_id) on delete cascade,
  order_id uuid references public.orders(id),
  type text not null check (type in ('payment', 'platform_fee', 'payout', 'refund', 'adjustment')),
  amount_cents int not null,
  currency text not null default 'BRL',
  status text not null default 'pending' check (status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled')),
  provider text,
  provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.users(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  visibility text not null default 'public' check (visibility in ('public', 'private', 'invite_only')),
  city text,
  state text,
  created_at timestamptz not null default now()
);

create table if not exists public.community_members (
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  created_at timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.users(id) on delete cascade,
  title text,
  body text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.users(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_conversations_participants on public.conversations(client_id, professional_id);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
create index if not exists idx_community_members_user on public.community_members(user_id);
create index if not exists idx_transactions_wallet_status on public.transactions(wallet_user_id, status);
