begin;

do $$
declare
  v_service public.services%rowtype;
  v_version_id uuid;
  v_version_number integer;
  v_snapshot jsonb;
begin
  for v_service in
    select *
    from public.services
    where status = 'published'
      and moderation_status = 'draft'
      and approved_version_id is null
    for update
  loop
    select coalesce(max(version_number), 0) + 1
      into v_version_number
    from public.service_versions
    where service_id = v_service.id;

    v_snapshot := coalesce(v_service.metadata, '{}'::jsonb) || jsonb_build_object(
      'id', coalesce(v_service.external_id, v_service.id::text),
      'externalId', coalesce(v_service.external_id, v_service.id::text),
      'title', v_service.title,
      'description', v_service.description,
      'fullDescription', coalesce(v_service.metadata ->> 'fullDescription', v_service.description),
      'category', coalesce(v_service.metadata ->> 'category', 'Serviço'),
      'priceMode', v_service.price_mode,
      'priceValue', case when v_service.price_cents is null then null else to_jsonb(v_service.price_cents::numeric / 100) end,
      'city', coalesce(v_service.city, ''),
      'state', coalesce(v_service.state, ''),
      'status', 'active',
      'moderationStatus', 'published'
    );

    insert into public.service_versions (
      service_id,
      professional_id,
      version_number,
      source,
      change_class,
      review_status,
      snapshot,
      change_summary,
      submitted_at,
      reviewed_at,
      reviewed_by
    ) values (
      v_service.id,
      v_service.professional_id,
      v_version_number,
      'create',
      'major',
      'approved',
      v_snapshot,
      jsonb_build_object('legacyBackfill', true),
      coalesce(v_service.created_at, now()),
      now(),
      null
    ) returning id into v_version_id;

    perform set_config('doke.service_moderation_apply', 'on', true);
    update public.services
    set moderation_status = 'published',
        approved_version_id = v_version_id,
        pending_version_id = null,
        review_reason = null,
        reviewed_at = now(),
        updated_at = greatest(updated_at, now())
    where id = v_service.id;
  end loop;
end;
$$;

commit;
