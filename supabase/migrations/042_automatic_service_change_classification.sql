begin;

alter table public.service_versions
  add column if not exists risk_flags jsonb not null default '[]'::jsonb,
  add column if not exists classification_reasons jsonb not null default '[]'::jsonb,
  add column if not exists visibility_action text not null default 'keep_public';

alter table public.service_versions drop constraint if exists service_versions_risk_flags_array_check;
alter table public.service_versions add constraint service_versions_risk_flags_array_check
  check (jsonb_typeof(risk_flags) = 'array');
alter table public.service_versions drop constraint if exists service_versions_classification_reasons_array_check;
alter table public.service_versions add constraint service_versions_classification_reasons_array_check
  check (jsonb_typeof(classification_reasons) = 'array');
alter table public.service_versions drop constraint if exists service_versions_visibility_action_check;
alter table public.service_versions add constraint service_versions_visibility_action_check
  check (visibility_action in ('not_public_until_approved', 'keep_public', 'take_down_until_decision'));

create or replace function public.classify_service_version_change(
  p_current jsonb,
  p_candidate jsonb,
  p_is_new boolean default false
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  v_current jsonb := coalesce(p_current, '{}'::jsonb);
  v_candidate jsonb := coalesce(p_candidate, '{}'::jsonb);
  v_changed text[] := array[]::text[];
  v_reasons text[] := array[]::text[];
  v_flags text[] := array[]::text[];
  v_class text := 'minor';
  v_visibility text := 'keep_public';
  v_old_description text := trim(coalesce(v_current ->> 'description', v_current ->> 'fullDescription', ''));
  v_new_description text := trim(coalesce(v_candidate ->> 'description', v_candidate ->> 'fullDescription', ''));
  v_old_region text := trim(coalesce(v_current ->> 'serviceRegion', v_current ->> 'location', ''));
  v_new_region text := trim(coalesce(v_candidate ->> 'serviceRegion', v_candidate ->> 'location', ''));
  v_candidate_text text;
  v_title_changed boolean := false;
  v_description_changed boolean := false;
  v_images_changed boolean := false;
  v_major_change boolean := false;
  v_critical_change boolean := false;
begin
  if jsonb_typeof(v_candidate) <> 'object' then
    raise exception 'SERVICE_SNAPSHOT_INVALID' using errcode = '22023';
  end if;

  if trim(coalesce(v_current ->> 'title', '')) is distinct from trim(coalesce(v_candidate ->> 'title', '')) then
    v_changed := array_append(v_changed, 'title');
    v_title_changed := true;
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'category', '')) is distinct from trim(coalesce(v_candidate ->> 'category', '')) then
    v_changed := array_append(v_changed, 'category');
    v_reasons := array_append(v_reasons, 'category_changed');
    v_flags := array_append(v_flags, 'service_identity_changed');
    v_critical_change := true;
  end if;
  if trim(coalesce(v_current ->> 'specialty', '')) is distinct from trim(coalesce(v_candidate ->> 'specialty', '')) then
    v_changed := array_append(v_changed, 'specialty');
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'shortDescription', '')) is distinct from trim(coalesce(v_candidate ->> 'shortDescription', '')) then
    v_changed := array_append(v_changed, 'shortDescription');
    v_major_change := true;
  end if;
  if v_old_description is distinct from v_new_description then
    v_changed := array_append(v_changed, 'description');
    v_description_changed := true;
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'priceType', '')) is distinct from trim(coalesce(v_candidate ->> 'priceType', ''))
     or trim(coalesce(v_current ->> 'priceLabel', '')) is distinct from trim(coalesce(v_candidate ->> 'priceLabel', ''))
     or trim(coalesce(v_current ->> 'billingUnit', '')) is distinct from trim(coalesce(v_candidate ->> 'billingUnit', '')) then
    v_changed := array_append(v_changed, 'price');
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'serviceMode', '')) is distinct from trim(coalesce(v_candidate ->> 'serviceMode', '')) then
    v_changed := array_append(v_changed, 'serviceMode');
    if trim(coalesce(v_current ->> 'serviceMode', '')) <> '' then
      v_reasons := array_append(v_reasons, 'service_mode_changed');
      v_flags := array_append(v_flags, 'delivery_model_changed');
      v_critical_change := true;
    else
      v_major_change := true;
    end if;
  end if;
  if v_old_region is distinct from v_new_region then
    v_changed := array_append(v_changed, 'serviceRegion');
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'city', '')) is distinct from trim(coalesce(v_candidate ->> 'city', '')) then
    v_changed := array_append(v_changed, 'city');
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'state', '')) is distinct from trim(coalesce(v_candidate ->> 'state', '')) then
    v_changed := array_append(v_changed, 'state');
    if trim(coalesce(v_current ->> 'state', '')) <> '' then
      v_reasons := array_append(v_reasons, 'state_changed');
      v_flags := array_append(v_flags, 'service_area_changed');
      v_critical_change := true;
    else
      v_major_change := true;
    end if;
  end if;
  if trim(coalesce(v_current ->> 'includedItems', '')) is distinct from trim(coalesce(v_candidate ->> 'includedItems', '')) then
    v_changed := array_append(v_changed, 'includedItems');
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'excludedItems', '')) is distinct from trim(coalesce(v_candidate ->> 'excludedItems', '')) then
    v_changed := array_append(v_changed, 'excludedItems');
    v_major_change := true;
  end if;
  if coalesce(v_current -> 'images', '[]'::jsonb) is distinct from coalesce(v_candidate -> 'images', '[]'::jsonb) then
    v_changed := array_append(v_changed, 'images');
    v_images_changed := true;
    v_major_change := true;
  end if;
  if trim(coalesce(v_current ->> 'quoteMode', 'default')) is distinct from trim(coalesce(v_candidate ->> 'quoteMode', 'default')) then
    v_changed := array_append(v_changed, 'quoteMode');
    v_major_change := true;
  end if;
  if coalesce(v_current -> 'quoteTemplate', '{}'::jsonb) is distinct from coalesce(v_candidate -> 'quoteTemplate', '{}'::jsonb) then
    v_changed := array_append(v_changed, 'quoteTemplate');
    v_major_change := true;
  end if;
  if coalesce(v_current -> 'availabilitySchedule', '[]'::jsonb) is distinct from coalesce(v_candidate -> 'availabilitySchedule', '[]'::jsonb) then
    v_changed := array_append(v_changed, 'availabilitySchedule');
  end if;
  if coalesce(v_current -> 'tags', '[]'::jsonb) is distinct from coalesce(v_candidate -> 'tags', '[]'::jsonb) then
    v_changed := array_append(v_changed, 'tags');
  end if;

  v_candidate_text := lower(concat_ws(' ',
    v_candidate ->> 'title',
    v_candidate ->> 'shortDescription',
    v_new_description,
    v_candidate ->> 'includedItems',
    v_candidate ->> 'excludedItems',
    coalesce(v_candidate -> 'quoteTemplate', '{}'::jsonb)::text
  ));

  if v_candidate_text ~ '(whatsapp|chama no whats|me chama no insta|instagram[[:space:]]*:|telegram|t[.]me/)' 
     or v_candidate_text ~ '[a-z0-9._%+-]+@[a-z0-9.-]+[.][a-z]{2,}'
     or v_candidate_text ~ '(https?://|www[.])'
     or v_candidate_text ~ '(^|[^0-9])([+]?55[[:space:]-]*)?([(]?[0-9]{2}[)]?[[:space:]-]*)?[0-9]{4,5}[[:space:]-]*[0-9]{4}([^0-9]|$)' then
    v_reasons := array_append(v_reasons, 'external_contact_detected');
    v_flags := array_append(v_flags, 'external_contact');
    v_critical_change := true;
  end if;

  if v_candidate_text ~ '(aceito pix|pague por pix|pagamento por fora|pagar por fora|transferência direta|transferencia direta)' then
    v_reasons := array_append(v_reasons, 'external_payment_detected');
    v_flags := array_append(v_flags, 'external_payment');
    v_critical_change := true;
  end if;

  if v_candidate_text ~ '(instalação de gás|instalacao de gas|gasista|alta tensão|alta tensao|procedimento médico|procedimento medico|cirurgia|consulta médica|consulta medica|advocacia|serviço jurídico|servico juridico|transporte de passageiros)' then
    v_reasons := array_append(v_reasons, 'regulated_service_detected');
    v_flags := array_append(v_flags, 'regulated_service');
    v_critical_change := true;
  end if;

  if v_title_changed and v_description_changed and v_images_changed then
    v_reasons := array_append(v_reasons, 'listing_identity_shift');
    v_flags := array_append(v_flags, 'service_identity_changed');
    v_critical_change := true;
  end if;

  if p_is_new then
    v_class := 'critical';
    v_visibility := 'not_public_until_approved';
    v_reasons := array_prepend('new_listing', v_reasons);
  elsif v_critical_change then
    v_class := 'critical';
    v_visibility := 'take_down_until_decision';
  elsif v_major_change then
    v_class := 'major';
    v_visibility := 'keep_public';
    v_reasons := array_append(v_reasons, 'commercial_content_changed');
  else
    v_class := 'minor';
    v_visibility := 'keep_public';
    v_reasons := array_append(v_reasons, case when cardinality(v_changed) = 0 then 'no_material_change' else 'operational_details_changed' end);
  end if;

  return jsonb_build_object(
    'changeClass', v_class,
    'visibilityAction', v_visibility,
    'changedFields', coalesce(to_jsonb(v_changed), '[]'::jsonb),
    'reasons', coalesce(to_jsonb(v_reasons), '[]'::jsonb),
    'riskFlags', coalesce(to_jsonb(v_flags), '[]'::jsonb)
  );
end;
$$;

create or replace function public.submit_service_for_review(
  p_external_id text,
  p_snapshot jsonb,
  p_change_class text default 'major'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_external_id text := trim(coalesce(p_external_id, ''));
  v_service public.services%rowtype;
  v_version public.service_versions%rowtype;
  v_version_number integer;
  v_title text;
  v_slug text;
  v_description text;
  v_price_mode text;
  v_price_cents integer;
  v_city text;
  v_state text;
  v_is_new boolean := false;
  v_source text := 'edit';
  v_approved_snapshot jsonb := '{}'::jsonb;
  v_classification jsonb := '{}'::jsonb;
  v_change_class text := 'major';
  v_visibility_action text := 'keep_public';
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if v_external_id = '' or char_length(v_external_id) > 140 then
    raise exception 'SERVICE_EXTERNAL_ID_INVALID' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = v_user and u.role = 'professional' and u.status = 'active'
      and u.onboarding_status = 'completed' and p.setup_status = 'active'
      and p.verification_status = 'verified' and p.document_status = 'verified'
  ) then
    raise exception 'PROFESSIONAL_APPROVAL_REQUIRED' using errcode = '42501';
  end if;

  perform public.validate_service_review_snapshot(p_snapshot);
  v_title := public.service_snapshot_text(p_snapshot, 'title');
  v_slug := trim(both '-' from lower(regexp_replace(v_title, '[^[:alnum:]]+', '-', 'g')));
  if v_slug = '' then v_slug := 'servico'; end if;
  v_description := coalesce(nullif(public.service_snapshot_text(p_snapshot, 'description'), ''), public.service_snapshot_text(p_snapshot, 'fullDescription'));
  v_price_mode := lower(public.service_snapshot_text(p_snapshot, 'remotePriceMode', 'quote'));
  if v_price_mode not in ('quote', 'fixed', 'from') then v_price_mode := 'quote'; end if;
  v_price_cents := public.doke_price_cents_from_snapshot(p_snapshot);
  v_city := public.service_snapshot_text(p_snapshot, 'city');
  v_state := public.service_snapshot_text(p_snapshot, 'state');

  select * into v_service from public.services where external_id = v_external_id limit 1 for update;

  if v_service.id is null then
    v_is_new := true;
    v_source := 'create';
    perform set_config('doke.service_moderation_apply', 'on', true);
    insert into public.services (
      professional_id, external_id, title, slug, description, price_mode, price_cents,
      currency, status, city, state, metadata, moderation_status, review_submitted_at
    ) values (
      v_user, v_external_id, v_title,
      left(v_slug || '-' || right(replace(v_external_id, '-', ''), 10), 96),
      v_description, v_price_mode, v_price_cents, 'BRL', 'draft', v_city, v_state,
      p_snapshot, 'pending_review', now()
    ) returning * into v_service;
  elsif v_service.professional_id <> v_user then
    raise exception 'SERVICE_OWNERSHIP_REQUIRED' using errcode = '42501';
  else
    v_source := case when v_service.moderation_status = 'changes_required' then 'resubmit' else 'edit' end;
    if v_service.approved_version_id is not null then
      select snapshot into v_approved_snapshot from public.service_versions where id = v_service.approved_version_id;
    else
      v_approved_snapshot := coalesce(v_service.metadata, '{}'::jsonb);
    end if;
  end if;

  v_classification := public.classify_service_version_change(v_approved_snapshot, p_snapshot, v_is_new or v_service.approved_version_id is null);
  v_change_class := coalesce(v_classification ->> 'changeClass', 'major');
  v_visibility_action := coalesce(v_classification ->> 'visibilityAction', 'keep_public');

  update public.service_versions
  set review_status = 'superseded', updated_at = now()
  where service_id = v_service.id and review_status in ('pending_review', 'changes_required');

  select coalesce(max(version_number), 0) + 1 into v_version_number
  from public.service_versions where service_id = v_service.id;

  insert into public.service_versions (
    service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, risk_flags,
    classification_reasons, visibility_action, submitted_at
  ) values (
    v_service.id, v_user, v_version_number, v_source, v_change_class,
    'pending_review', p_snapshot,
    v_classification || jsonb_build_object(
      'titleChanged', coalesce(v_approved_snapshot ->> 'title', '') is distinct from v_title,
      'categoryChanged', coalesce(v_approved_snapshot ->> 'category', '') is distinct from public.service_snapshot_text(p_snapshot, 'category'),
      'priceChanged', public.doke_price_cents_from_snapshot(v_approved_snapshot) is distinct from v_price_cents,
      'imagesChanged', coalesce(v_approved_snapshot -> 'images', '[]'::jsonb) is distinct from coalesce(p_snapshot -> 'images', '[]'::jsonb),
      'quoteChanged', coalesce(v_approved_snapshot -> 'quoteTemplate', '{}'::jsonb) is distinct from coalesce(p_snapshot -> 'quoteTemplate', '{}'::jsonb)
    ),
    coalesce(v_classification -> 'riskFlags', '[]'::jsonb),
    coalesce(v_classification -> 'reasons', '[]'::jsonb),
    v_visibility_action,
    now()
  ) returning * into v_version;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set pending_version_id = v_version.id,
      status = case
        when approved_version_id is null then 'draft'
        when v_visibility_action = 'take_down_until_decision' then 'paused'
        else 'published'
      end,
      moderation_status = case when approved_version_id is null then 'pending_review' else 'changes_pending_review' end,
      review_reason = null,
      review_submitted_at = now(),
      reviewed_at = null,
      updated_at = now()
  where id = v_service.id
  returning * into v_service;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'versionId', v_version.id,
    'versionNumber', v_version.version_number,
    'moderationStatus', v_service.moderation_status,
    'publicStatus', v_service.status,
    'isNew', v_is_new,
    'submittedAt', v_version.submitted_at,
    'changeClass', v_version.change_class,
    'visibilityAction', v_version.visibility_action,
    'riskFlags', v_version.risk_flags,
    'classificationReasons', v_version.classification_reasons
  );
end;
$$;

create or replace function public.request_service_version_changes(p_version_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_version public.service_versions%rowtype;
  v_service public.services%rowtype;
begin
  if v_admin is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then raise exception 'REVIEW_REASON_INVALID' using errcode = '22023'; end if;

  select * into v_version from public.service_versions where id = p_version_id for update;
  if v_version.id is null then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_version.review_status <> 'pending_review' then raise exception 'SERVICE_VERSION_NOT_PENDING' using errcode = '22023'; end if;

  update public.service_versions
  set review_status = 'changes_required', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = v_admin, updated_at = now()
  where id = v_version.id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set status = case
        when approved_version_id is null then 'draft'
        when v_version.visibility_action = 'take_down_until_decision' then 'paused'
        else 'published'
      end,
      moderation_status = 'changes_required', review_reason = v_reason,
      reviewed_at = now(), updated_at = now()
  where id = v_version.service_id
  returning * into v_service;

  insert into public.notifications(user_id, type, title, body, data, external_id, category, event_key, target_url, action_label, service_id)
  values (
    v_version.professional_id, 'service_review_changes_required', 'Seu anúncio precisa de ajustes', v_reason,
    jsonb_build_object('serviceId', v_service.external_id, 'versionId', v_version.id, 'reason', v_reason),
    'service-review-changes-' || v_version.id::text, 'professional', 'service_review_changes_required',
    'anunciar-servico.html?mode=edit&edit=' || v_service.external_id, 'Corrigir anúncio', v_service.id
  ) on conflict do nothing;

  return jsonb_build_object('serviceId', v_service.id, 'externalId', v_service.external_id, 'moderationStatus', v_service.moderation_status, 'publicStatus', v_service.status, 'reason', v_reason);
end;
$$;

create or replace function public.reject_service_version(p_version_id uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_version public.service_versions%rowtype;
  v_service public.services%rowtype;
begin
  if v_admin is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then raise exception 'REVIEW_REASON_INVALID' using errcode = '22023'; end if;

  select * into v_version from public.service_versions where id = p_version_id for update;
  if v_version.id is null then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_version.review_status <> 'pending_review' then raise exception 'SERVICE_VERSION_NOT_PENDING' using errcode = '22023'; end if;

  update public.service_versions
  set review_status = 'rejected', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = v_admin, updated_at = now()
  where id = v_version.id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set pending_version_id = null,
      status = case when approved_version_id is null then 'draft' else 'published' end,
      moderation_status = case when approved_version_id is null then 'rejected' else 'published' end,
      review_reason = v_reason, reviewed_at = now(), updated_at = now()
  where id = v_version.service_id
  returning * into v_service;

  insert into public.notifications(user_id, type, title, body, data, external_id, category, event_key, target_url, action_label, service_id)
  values (
    v_version.professional_id, 'service_review_rejected', 'Anúncio não aprovado', v_reason,
    jsonb_build_object('serviceId', v_service.external_id, 'versionId', v_version.id, 'reason', v_reason),
    'service-review-rejected-' || v_version.id::text, 'professional', 'service_review_rejected',
    'perfil-profissional.html#profile-ads', 'Ver anúncios', v_service.id
  ) on conflict do nothing;

  return jsonb_build_object('serviceId', v_service.id, 'externalId', v_service.external_id, 'moderationStatus', v_service.moderation_status, 'publicStatus', v_service.status, 'reason', v_reason);
end;
$$;

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
    'visibilityAction', v.visibility_action,
    'riskFlags', v.risk_flags,
    'classificationReasons', v.classification_reasons,
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

revoke all on function public.classify_service_version_change(jsonb, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.classify_service_version_change(jsonb, jsonb, boolean) to service_role;
revoke execute on function public.submit_service_for_review(text, jsonb, text) from public, anon;
grant execute on function public.submit_service_for_review(text, jsonb, text) to authenticated;
revoke execute on function public.request_service_version_changes(uuid, text) from public, anon;
grant execute on function public.request_service_version_changes(uuid, text) to authenticated;
revoke execute on function public.reject_service_version(uuid, text) from public, anon;
grant execute on function public.reject_service_version(uuid, text) to authenticated;
revoke execute on function public.list_service_review_queue() from public, anon;
grant execute on function public.list_service_review_queue() to authenticated;

commit;
