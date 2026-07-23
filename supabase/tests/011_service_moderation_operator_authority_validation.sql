-- Doke SEC-001 service moderation operator authority validation.

-- Browser roles cannot execute privileged moderation commands directly.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'list_service_review_queue','get_service_review_detail','list_service_moderation_audit',
    'approve_service_version','request_service_version_changes','reject_service_version',
    'list_service_review_queue_internal','get_service_review_detail_internal',
    'list_service_moderation_audit_internal','approve_service_version_internal',
    'request_service_version_changes_internal','reject_service_version_internal'
  )
order by p.proname;

-- Template ownership must match both canonical role and service ownership.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'service_quote_templates'
order by policyname;

-- Existing rows must preserve service/template ownership consistency.
select template.id,
       template.professional_id as template_professional_id,
       service.professional_id as service_professional_id
from public.service_quote_templates template
join public.services service on service.id = template.service_id
where template.professional_id is distinct from service.professional_id;
