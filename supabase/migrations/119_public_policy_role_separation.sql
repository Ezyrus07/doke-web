begin;

-- Public catalog: anon never evaluates authenticated role helpers.
drop policy if exists service_categories_visible_select on public.service_categories;
create policy service_categories_anon_select
  on public.service_categories for select to anon
  using (is_active = true);
create policy service_categories_authenticated_select
  on public.service_categories for select to authenticated
  using (
    is_active = true
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

-- Availability: separate public projection from owner/operator visibility.
drop policy if exists availability_slots_visible_select on public.availability_slots;
create policy availability_slots_anon_select
  on public.availability_slots for select to anon
  using (status = 'available' and ends_at > pg_catalog.now());
create policy availability_slots_authenticated_select
  on public.availability_slots for select to authenticated
  using (
    (status = 'available' and ends_at > pg_catalog.now())
    or professional_id = (select auth.uid())
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

-- Reviews: published projection is public; private moderation context is authenticated.
drop policy if exists reviews_visible_select on public.reviews;
create policy reviews_anon_select
  on public.reviews for select to anon
  using (status = 'published');
create policy reviews_authenticated_select
  on public.reviews for select to authenticated
  using (
    status = 'published'
    or reviewer_id = (select auth.uid())
    or reviewed_user_id = (select auth.uid())
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

-- Communities: anonymous discovery never invokes membership helpers.
drop policy if exists communities_visible_select on public.communities;
create policy communities_anon_select
  on public.communities for select to anon
  using (visibility = 'public');
create policy communities_authenticated_select
  on public.communities for select to authenticated
  using (
    visibility = 'public'
    or owner_id = (select auth.uid())
    or private.is_community_member(id, (select auth.uid()))
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

-- Community posts: anonymous users only see published posts in public communities.
drop policy if exists community_posts_visible_select on public.community_posts;
create policy community_posts_anon_select
  on public.community_posts for select to anon
  using (
    status = 'published'
    and exists (
      select 1
      from public.communities community
      where community.id = community_posts.community_id
        and community.visibility = 'public'
    )
  );
create policy community_posts_authenticated_select
  on public.community_posts for select to authenticated
  using (
    (
      status = 'published'
      and exists (
        select 1
        from public.communities community
        where community.id = community_posts.community_id
          and (
            community.visibility = 'public'
            or community.owner_id = (select auth.uid())
            or private.is_community_member(community.id, (select auth.uid()))
          )
      )
    )
    or author_id = (select auth.uid())
    or private.is_community_manager(community_id, (select auth.uid()))
  );

notify pgrst, 'reload schema';
commit;
