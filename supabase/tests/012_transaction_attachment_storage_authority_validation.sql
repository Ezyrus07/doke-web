-- Doke private transaction attachment Storage authority validation.

select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'transaction-attachments';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'transaction_attachments_%'
order by policyname;

select n.nspname as schema_name,
       p.proname,
       p.prosecdef as security_definer,
       p.proconfig,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'private'
  and p.proname = 'can_access_transaction_attachment';

select p.proname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'can_access_transaction_attachment';
