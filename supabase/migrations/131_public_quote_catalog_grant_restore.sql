begin;

-- Migration 129 removes anonymous DML but public quote discovery still requires
-- read access. RLS remains the row-level authority for published/owned data.
grant select on table
  public.service_quote_templates,
  public.service_quote_questions
  to anon, authenticated;

notify pgrst, 'reload schema';
commit;
