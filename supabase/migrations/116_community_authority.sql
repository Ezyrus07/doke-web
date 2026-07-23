-- Doke — community visibility, membership and post authority.

begin;

grant usage on schema private to authenticated;

create or replace function private.is_community_member(
  p_community_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p_user_id is not null and exists (
    select 1
      from public.community_members cm
     where cm.community_id = p_community_id
       and cm.user_id = p_user_id
  )
$$;

create or replace function private.is_community_manager(
  p_community_id uuid,
  p_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select p_user_id is not null and (
    exists (
      select 1
        from public.communities c
       where c.id = p_community_id
         and c.owner_id = p_user_id
    )
    or exists (
      select 1
        from public.community_members cm
       where cm.community_id = p_community_id
         and cm.user_id = p_user_id
         and cm.role in ('owner', 'moderator')
    )
    or exists (
      select 1
        from public.users u
       where u.id = p_user_id
         and u.status = 'active'
         and u.role in ('moderator', 'support', 'admin')
    )
  )
$$;

create or replace function private.ensure_community_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.owner_id is not null then
    insert into public.community_members(community_id, user_id, role, created_at)
    values(new.id, new.owner_id, 'owner', pg_catalog.now())
    on conflict(community_id, user_id) do update set role = 'owner';
  end if;
  return new;
end;
$$;

revoke all privileges on function private.is_community_member(uuid, uuid) from public, anon, authenticated, service_role;
revoke all privileges on function private.is_community_manager(uuid, uuid) from public, anon, authenticated, service_role;
revoke all privileges on function private.ensure_community_owner_membership() from public, anon, authenticated, service_role;
grant execute on function private.is_community_member(uuid, uuid) to authenticated;
grant execute on function private.is_community_manager(uuid, uuid) to authenticated;

drop trigger if exists trg_community_owner_membership on public.communities;
create trigger trg_community_owner_membership
after insert or update of owner_id on public.communities
for each row execute function private.ensure_community_owner_membership();

alter table public.communities enable row level security;
drop policy if exists communities_visible_select on public.communities;
drop policy if exists communities_owner_insert on public.communities;
drop policy if exists communities_owner_update on public.communities;
drop policy if exists communities_owner_delete on public.communities;

create policy communities_visible_select
  on public.communities
  for select
  to anon, authenticated
  using (
    visibility = 'public'
    or owner_id = (select auth.uid())
    or private.is_community_member(id, (select auth.uid()))
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

create policy communities_owner_insert
  on public.communities
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and public.current_user_role() <> 'guest'
  );

create policy communities_owner_update
  on public.communities
  for update
  to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy communities_owner_delete
  on public.communities
  for delete
  to authenticated
  using (owner_id = (select auth.uid()));

revoke all privileges on table public.communities from public, anon, authenticated, service_role;
grant select on table public.communities to anon, authenticated;
grant insert, update, delete on table public.communities to authenticated;
grant select, insert, update, delete on table public.communities to service_role;
create index if not exists idx_communities_owner
  on public.communities(owner_id)
  where owner_id is not null;

alter table public.community_members enable row level security;
drop policy if exists community_members_visible_select on public.community_members;
drop policy if exists community_members_join_insert on public.community_members;
drop policy if exists community_members_manager_update on public.community_members;
drop policy if exists community_members_leave_delete on public.community_members;

create policy community_members_visible_select
  on public.community_members
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.is_community_member(community_id, (select auth.uid()))
    or private.is_community_manager(community_id, (select auth.uid()))
  );

create policy community_members_join_insert
  on public.community_members
  for insert
  to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role = 'member'
      and exists (
        select 1 from public.communities c
         where c.id = community_members.community_id
           and c.visibility = 'public'
      )
    )
    or (
      private.is_community_manager(community_id, (select auth.uid()))
      and (
        role <> 'owner'
        or exists (
          select 1 from public.communities c
           where c.id = community_members.community_id
             and c.owner_id = (select auth.uid())
        )
        or public.current_user_role() = 'admin'
      )
    )
  );

create policy community_members_manager_update
  on public.community_members
  for update
  to authenticated
  using (
    private.is_community_manager(community_id, (select auth.uid()))
    and (
      not exists (
        select 1 from public.communities c
         where c.id = community_members.community_id
           and c.owner_id = community_members.user_id
      )
      or exists (
        select 1 from public.communities c
         where c.id = community_members.community_id
           and c.owner_id = (select auth.uid())
      )
      or public.current_user_role() = 'admin'
    )
  )
  with check (
    private.is_community_manager(community_id, (select auth.uid()))
    and (
      role <> 'owner'
      or exists (
        select 1 from public.communities c
         where c.id = community_members.community_id
           and c.owner_id = (select auth.uid())
      )
      or public.current_user_role() = 'admin'
    )
  );

create policy community_members_leave_delete
  on public.community_members
  for delete
  to authenticated
  using (
    (user_id = (select auth.uid()) and role <> 'owner')
    or (
      private.is_community_manager(community_id, (select auth.uid()))
      and (
        role <> 'owner'
        or exists (
          select 1 from public.communities c
           where c.id = community_members.community_id
             and c.owner_id = (select auth.uid())
        )
        or public.current_user_role() = 'admin'
      )
    )
  );

revoke all privileges on table public.community_members from public, anon, authenticated, service_role;
grant select, insert, delete on table public.community_members to authenticated;
grant update (role) on table public.community_members to authenticated;
grant select, insert, update, delete on table public.community_members to service_role;

alter table public.community_posts enable row level security;
drop policy if exists community_posts_visible_select on public.community_posts;
drop policy if exists community_posts_member_insert on public.community_posts;
drop policy if exists community_posts_author_update on public.community_posts;
drop policy if exists community_posts_author_or_manager_delete on public.community_posts;

create policy community_posts_visible_select
  on public.community_posts
  for select
  to anon, authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1
          from public.communities c
         where c.id = community_posts.community_id
           and (
             c.visibility = 'public'
             or c.owner_id = (select auth.uid())
             or private.is_community_member(c.id, (select auth.uid()))
           )
      )
    )
    or author_id = (select auth.uid())
    or private.is_community_manager(community_id, (select auth.uid()))
  );

create policy community_posts_member_insert
  on public.community_posts
  for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and (
      private.is_community_member(community_id, (select auth.uid()))
      or private.is_community_manager(community_id, (select auth.uid()))
    )
  );

create policy community_posts_author_update
  on public.community_posts
  for update
  to authenticated
  using (
    author_id = (select auth.uid())
    and status = 'published'
  )
  with check (
    author_id = (select auth.uid())
    and status = 'published'
    and (
      private.is_community_member(community_id, (select auth.uid()))
      or private.is_community_manager(community_id, (select auth.uid()))
    )
  );

create policy community_posts_author_or_manager_delete
  on public.community_posts
  for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or private.is_community_manager(community_id, (select auth.uid()))
  );

revoke all privileges on table public.community_posts from public, anon, authenticated, service_role;
grant select on table public.community_posts to anon, authenticated;
grant insert, delete on table public.community_posts to authenticated;
grant update (title, body) on table public.community_posts to authenticated;
grant select, insert, update, delete on table public.community_posts to service_role;
create index if not exists idx_community_posts_community_created
  on public.community_posts(community_id, created_at desc);
create index if not exists idx_community_posts_author_created
  on public.community_posts(author_id, created_at desc);

notify pgrst, 'reload schema';

commit;
