begin;

create or replace function public.list_service_review_queue()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'versionId', v.id,
    'serviceId', s.id,
    'externalId', s.external_id,
    'versionNumber', v.version_number,
    'source', v.source,
    'changeClass', v.change_class,
    'reviewStatus', v.review_status,
    'submittedAt', v.submitted_at,
    'snapshot', v.snapshot,
    'changeSummary', v.change_summary,
    'professionalId', v.professional_id,
    'professionalName', coalesce(nullif(p.setup_payload ->> 'displayName', ''), nullif(p.setup_payload ->> 'fullName', ''), u.email, 'Profissional Doke'),
    'professionalEmail', u.email,
    'currentTitle', s.title,
    'publicStatus', s.status,
    'moderationStatus', s.moderation_status,
    'approvedVersionId', s.approved_version_id,
    'approvedVersionNumber', av.version_number,
    'approvedSnapshot', coalesce(av.snapshot, '{}'::jsonb)
  ) order by v.submitted_at asc), '[]'::jsonb)
  into v_result
  from public.service_versions v
  join public.services s on s.id = v.service_id
  join public.users u on u.id = v.professional_id
  left join public.professional_profiles p on p.user_id = v.professional_id
  left join public.service_versions av on av.id = s.approved_version_id
  where v.review_status = 'pending_review';

  return v_result;
end;
$$;

revoke execute on function public.list_service_review_queue() from public, anon;
grant execute on function public.list_service_review_queue() to authenticated;

commit;
