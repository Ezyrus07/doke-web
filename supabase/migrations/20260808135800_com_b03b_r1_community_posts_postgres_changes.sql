-- COM-B03B-R1 — enable authenticated Postgres Changes for canonical community posts.
-- Repository-prepared only. Applying this migration to staging or production requires
-- the environment-specific authorization boundary; this file itself performs no DML.

do $$
begin
  if not exists (
    select 1
      from pg_publication
     where pubname = 'supabase_realtime'
  ) then
    raise exception 'COM_B03B_R1_SUPABASE_REALTIME_PUBLICATION_REQUIRED';
  end if;

  if to_regclass('public.community_posts') is null then
    raise exception 'COM_B03B_R1_COMMUNITY_POSTS_TABLE_REQUIRED';
  end if;

  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'community_posts'
  ) then
    alter publication supabase_realtime add table public.community_posts;
  end if;
end;
$$;