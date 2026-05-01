-- Doke Stage 21: marketplace core tables.
-- Categories, services, search metadata, orders, budgets and reviews.

create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.service_categories(id),
  name text not null,
  slug text not null unique,
  description text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  category_id uuid references public.service_categories(id),
  title text not null,
  slug text not null,
  description text not null,
  price_mode text not null default 'quote' check (price_mode in ('quote', 'fixed', 'from')),
  price_cents int check (price_cents is null or price_cents >= 0),
  currency text not null default 'BRL',
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'archived', 'removed')),
  city text,
  state text,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (professional_id, slug)
);

create table if not exists public.service_media (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video', 'before_after')),
  url text not null,
  thumbnail_url text,
  alt_text text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  user_id uuid not null references public.users(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, service_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id),
  service_id uuid references public.services(id),
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'requested', 'quoted', 'accepted', 'scheduled', 'in_progress', 'completed', 'cancelled', 'disputed')),
  city text,
  state text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  amount_cents int check (amount_cents is null or amount_cents >= 0),
  currency text not null default 'BRL',
  description text,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'declined', 'expired', 'cancelled')),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  actor_id uuid references public.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  reviewer_id uuid not null references public.users(id) on delete cascade,
  reviewed_user_id uuid not null references public.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  status text not null default 'published' check (status in ('published', 'hidden', 'removed')),
  created_at timestamptz not null default now(),
  unique (order_id, reviewer_id)
);

create index if not exists idx_services_status_category on public.services(status, category_id);
create index if not exists idx_services_city_state on public.services(city, state);
create index if not exists idx_orders_client_status on public.orders(client_id, status);
create index if not exists idx_orders_professional_status on public.orders(professional_id, status);
create index if not exists idx_budgets_order_status on public.budgets(order_id, status);
create index if not exists idx_reviews_reviewed_user on public.reviews(reviewed_user_id, status);
