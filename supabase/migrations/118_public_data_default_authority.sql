-- Doke — fail-closed default privileges for future public data objects.

begin;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  grant usage, select, update on sequences to service_role;

notify pgrst, 'reload schema';

commit;
