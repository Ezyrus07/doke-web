begin;

drop policy if exists community_members_join_insert on public.community_members;
drop policy if exists community_members_manager_update on public.community_members;
drop policy if exists community_members_leave_delete on public.community_members;

create policy community_members_join_insert
  on public.community_members for insert to authenticated
  with check (
    (
      user_id = (select auth.uid())
      and role = 'member'
      and exists (
        select 1
        from public.communities community
        where community.id = community_members.community_id
          and community.visibility = 'public'
      )
    )
    or (
      private.is_community_manager(community_id, (select auth.uid()))
      and role in ('member', 'moderator')
    )
  );

create policy community_members_manager_update
  on public.community_members for update to authenticated
  using (
    private.is_community_manager(community_id, (select auth.uid()))
    and not exists (
      select 1
      from public.communities community
      where community.id = community_members.community_id
        and community.owner_id = community_members.user_id
    )
  )
  with check (
    private.is_community_manager(community_id, (select auth.uid()))
    and role in ('member', 'moderator')
    and not exists (
      select 1
      from public.communities community
      where community.id = community_members.community_id
        and community.owner_id = community_members.user_id
    )
  );

create policy community_members_leave_delete
  on public.community_members for delete to authenticated
  using (
    (
      user_id = (select auth.uid())
      and role <> 'owner'
    )
    or (
      private.is_community_manager(community_id, (select auth.uid()))
      and not exists (
        select 1
        from public.communities community
        where community.id = community_members.community_id
          and community.owner_id = community_members.user_id
      )
    )
  );

notify pgrst, 'reload schema';
commit;
