-- PROF-001 / PROF-B05 G4 validation
-- Transaction-scoped synthetic lifecycle validation. No Storage object is created.

begin;

do $test$
declare
  v_user_id uuid:=gen_random_uuid();
  v_reviewer_id uuid:=gen_random_uuid();
  v_other_verification_id uuid:=gen_random_uuid();
  v_email text:='prof-b05-ledger-'||replace(gen_random_uuid()::text,'-','')||'@example.test';
  v_reviewer_email text:='prof-b05-reviewer-'||replace(gen_random_uuid()::text,'-','')||'@example.test';
  v_handle text:='profb05_'||left(replace(gen_random_uuid()::text,'-',''),12);
  v_reviewer_handle text:='profb05r_'||left(replace(gen_random_uuid()::text,'-',''),10);
  v_verification_id uuid;
  v_s1 uuid:=gen_random_uuid();
  v_s2 uuid:=gen_random_uuid();
  v_other_set uuid:=gen_random_uuid();
  v_s1_manifest text:=repeat('a',64);
  v_s2_manifest text:=repeat('b',64);
  v_count integer;
  v_state text;
  v_review_sequence bigint;
  v_terminal_sequence bigint;
  v_reopen_sequence bigint;
begin
  if to_regclass('private.professional_kyc_evidence_sets') is null
     or to_regclass('private.professional_kyc_evidence_objects') is null
     or to_regclass('private.professional_kyc_evidence_events') is null
     or to_regclass('private.professional_kyc_current_evidence') is null then
    raise exception 'PROF_B05_EVIDENCE_SCHEMA_MISSING';
  end if;

  if not exists(
    select 1
    from information_schema.columns
    where table_schema='private'
      and table_name='professional_kyc_evidence_events'
      and column_name='event_sequence'
      and is_identity='YES'
  ) then
    raise exception 'PROF_B05_EVIDENCE_EVENT_SEQUENCE_MISSING';
  end if;

  if exists(
    select 1
    from private.professional_kyc_evidence_events
    where event_sequence is null
  ) then
    raise exception 'PROF_B05_EVIDENCE_EVENT_SEQUENCE_NULL';
  end if;

  if has_table_privilege('authenticated','private.professional_kyc_evidence_sets','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated','private.professional_kyc_evidence_objects','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated','private.professional_kyc_evidence_events','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated','private.professional_kyc_current_evidence','SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'PROF_B05_EVIDENCE_BROWSER_PRIVILEGE_LEAK';
  end if;

  insert into auth.users(
    id,aud,role,email,email_confirmed_at,
    raw_app_meta_data,raw_user_meta_data,created_at,updated_at,is_sso_user,is_anonymous
  ) values
  (
    v_user_id,'authenticated','authenticated',v_email,now(),
    '{"provider":"email","providers":["email"],"role":"client","account_status":"active"}'::jsonb,
    jsonb_build_object('name','PROF B05 Ledger','handle',v_handle),
    now(),now(),false,false
  ),
  (
    v_reviewer_id,'authenticated','authenticated',v_reviewer_email,now(),
    '{"provider":"email","providers":["email"],"role":"admin","account_status":"active"}'::jsonb,
    jsonb_build_object('name','PROF B05 Reviewer','handle',v_reviewer_handle),
    now(),now(),false,false
  );

  update public.users set role='client',status='active' where id=v_user_id;
  update public.users set role='admin',status='active' where id=v_reviewer_id;

  insert into public.professional_profiles(
    user_id,document_status,setup_status,setup_payload,setup_current_step,
    verification_status,created_at,updated_at
  ) values (
    v_user_id,'pending','pending_verification','{}'::jsonb,2,
    'submitted',now(),now()
  );

  insert into public.professional_identity_verifications(
    user_id,professional_profile_user_id,status,verification_type,documents,payload,
    current_step,submitted_at,created_at,updated_at
  ) values (
    v_user_id,v_user_id,'submitted','individual',
    jsonb_build_object('documentFront',jsonb_build_object(
      'bucket','professional-verification-media',
      'path','synthetic/s1/front.jpg',
      'type','image/jpeg',
      'size',128
    )),
    '{}'::jsonb,3,now(),now(),now()
  ) returning id into v_verification_id;

  insert into private.professional_kyc_evidence_sets(
    id,verification_id,user_id,verification_type,provenance_kind,
    submitted_at,manifest_sha256
  ) values (
    v_s1,v_verification_id,v_user_id,'individual','legacy_current_snapshot',
    now(),v_s1_manifest
  );

  insert into private.professional_kyc_evidence_objects(
    evidence_set_id,document_field,bucket_id,object_path,storage_object_id,
    storage_object_version,mime_type,byte_size
  ) values (
    v_s1,'documentFront','professional-verification-media',
    'synthetic/s1/front.jpg',gen_random_uuid(),'synthetic-v1','image/jpeg',128
  );

  insert into private.professional_kyc_evidence_events(
    evidence_set_id,event_kind,source_kind,source_event_key,occurred_at,metadata
  ) values (
    v_s1,'snapshot_imported','legacy_observation',
    v_s1::text||':snapshot_imported',now(),
    '{"observedStatus":"submitted"}'::jsonb
  );

  insert into private.professional_kyc_current_evidence(
    verification_id,evidence_set_id
  ) values (v_verification_id,v_s1);

  perform public.start_professional_identity_review_internal(
    v_reviewer_id,v_verification_id::text
  );

  perform public.decide_professional_identity_verification_internal(
    v_reviewer_id,v_verification_id::text,'reject',
    'Synthetic rejection for immutable evidence lifecycle validation.'
  );

  select count(*) into v_count
    from private.professional_kyc_evidence_events
   where evidence_set_id=v_s1
     and event_kind in ('review_started','rejected');
  if v_count<>2 then
    raise exception 'PROF_B05_S1_REVIEW_REJECT_EVENTS_MISSING:%',v_count;
  end if;

  select
    max(event_sequence) filter(where event_kind='review_started'),
    max(event_sequence) filter(where event_kind='rejected')
    into v_review_sequence,v_terminal_sequence
  from private.professional_kyc_evidence_events
  where evidence_set_id=v_s1;

  if v_review_sequence is null
     or v_terminal_sequence is null
     or v_review_sequence>=v_terminal_sequence then
    raise exception 'PROF_B05_S1_EVENT_ORDER_INVALID:%:%',v_review_sequence,v_terminal_sequence;
  end if;

  perform public.execute_self_service_operation_internal(
    v_user_id,'reopen_own_professional_identity_verification','{}'::jsonb
  );

  if exists (
    select 1 from private.professional_kyc_current_evidence
     where verification_id=v_verification_id
  ) then
    raise exception 'PROF_B05_REOPEN_CURRENT_MAPPING_REMAINS';
  end if;

  if not exists (
    select 1 from private.professional_kyc_evidence_events
     where evidence_set_id=v_s1 and event_kind='reopened'
  ) then
    raise exception 'PROF_B05_S1_REOPEN_EVENT_MISSING';
  end if;

  select max(event_sequence)
    into v_reopen_sequence
  from private.professional_kyc_evidence_events
  where evidence_set_id=v_s1
    and event_kind='reopened';

  if v_reopen_sequence is null or v_reopen_sequence<=v_terminal_sequence then
    raise exception 'PROF_B05_S1_REOPEN_ORDER_INVALID:%:%',v_terminal_sequence,v_reopen_sequence;
  end if;

  select status into v_state
    from public.professional_identity_verifications
   where id=v_verification_id;
  if v_state<>'not_started' then
    raise exception 'PROF_B05_REOPEN_STATE_INVALID:%',v_state;
  end if;

  -- Cross-verification pointer must fail closed.
  insert into private.professional_kyc_evidence_sets(
    id,verification_id,user_id,verification_type,provenance_kind,
    submitted_at,manifest_sha256
  ) values (
    v_other_set,v_other_verification_id,v_user_id,'individual',
    'legacy_current_snapshot',now(),repeat('c',64)
  );

  begin
    insert into private.professional_kyc_current_evidence(
      verification_id,evidence_set_id
    ) values (v_verification_id,v_other_set);
    raise exception 'PROF_B05_CROSS_VERIFICATION_POINTER_ALLOWED';
  exception
    when foreign_key_violation then null;
  end;

  -- Simulate a second valid submission after reopen without touching Storage.
  update public.professional_identity_verifications
     set status='submitted',
         documents=jsonb_build_object('documentFront',jsonb_build_object(
           'bucket','professional-verification-media',
           'path','synthetic/s2/front.jpg',
           'type','image/jpeg',
           'size',256
         )),
         current_step=3,
         submitted_at=now(),
         reviewer_id=null,
         rejection_reason=null,
         review_started_at=null,
         decided_at=null,
         updated_at=now()
   where id=v_verification_id;

  update public.professional_profiles
     set document_status='pending',
         verification_status='submitted',
         setup_status='pending_verification',
         updated_at=now()
   where user_id=v_user_id;

  insert into private.professional_kyc_evidence_sets(
    id,verification_id,user_id,verification_type,provenance_kind,
    submitted_at,manifest_sha256
  ) values (
    v_s2,v_verification_id,v_user_id,'individual',
    'legacy_current_snapshot',now(),v_s2_manifest
  );

  insert into private.professional_kyc_evidence_objects(
    evidence_set_id,document_field,bucket_id,object_path,storage_object_id,
    storage_object_version,mime_type,byte_size
  ) values (
    v_s2,'documentFront','professional-verification-media',
    'synthetic/s2/front.jpg',gen_random_uuid(),'synthetic-v2','image/jpeg',256
  );

  insert into private.professional_kyc_evidence_events(
    evidence_set_id,event_kind,source_kind,source_event_key,occurred_at,metadata
  ) values (
    v_s2,'snapshot_imported','legacy_observation',
    v_s2::text||':snapshot_imported',now(),
    '{"observedStatus":"submitted"}'::jsonb
  );

  insert into private.professional_kyc_current_evidence(
    verification_id,evidence_set_id
  ) values (v_verification_id,v_s2);

  -- Direct decision from submitted must record review_started and verified.
  perform public.decide_professional_identity_verification_internal(
    v_reviewer_id,v_verification_id::text,'approve',null
  );

  select count(*) into v_count
    from private.professional_kyc_evidence_events
   where evidence_set_id=v_s2
     and event_kind in ('review_started','verified');
  if v_count<>2 then
    raise exception 'PROF_B05_S2_DIRECT_DECISION_EVENTS_MISSING:%',v_count;
  end if;

  select
    max(event_sequence) filter(where event_kind='review_started'),
    max(event_sequence) filter(where event_kind='verified')
    into v_review_sequence,v_terminal_sequence
  from private.professional_kyc_evidence_events
  where evidence_set_id=v_s2;

  if v_review_sequence is null
     or v_terminal_sequence is null
     or v_review_sequence>=v_terminal_sequence then
    raise exception 'PROF_B05_S2_EVENT_ORDER_INVALID:%:%',v_review_sequence,v_terminal_sequence;
  end if;

  if not exists (
    select 1
      from private.professional_kyc_current_evidence
     where verification_id=v_verification_id and evidence_set_id=v_s2
  ) then
    raise exception 'PROF_B05_S2_CURRENT_MAPPING_INVALID';
  end if;

  if (select manifest_sha256 from private.professional_kyc_evidence_sets where id=v_s1)<>v_s1_manifest then
    raise exception 'PROF_B05_S1_MUTATED_AFTER_S2';
  end if;

  if (select count(*) from private.professional_kyc_evidence_objects where evidence_set_id=v_s1)<>1 then
    raise exception 'PROF_B05_S1_OBJECT_HISTORY_CHANGED';
  end if;

  -- Historical rows reject UPDATE.
  begin
    update private.professional_kyc_evidence_sets
       set manifest_sha256=repeat('d',64)
     where id=v_s1;
    raise exception 'PROF_B05_EVIDENCE_UPDATE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_EVIDENCE_IMMUTABLE' then raise; end if;
  end;

  -- Historical rows reject DELETE.
  begin
    delete from private.professional_kyc_evidence_objects
     where evidence_set_id=v_s1;
    raise exception 'PROF_B05_EVIDENCE_DELETE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_EVIDENCE_IMMUTABLE' then raise; end if;
  end;

  -- Historical tables reject TRUNCATE.
  begin
    execute 'truncate table private.professional_kyc_evidence_events';
    raise exception 'PROF_B05_EVIDENCE_TRUNCATE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_EVIDENCE_IMMUTABLE' then raise; end if;
  end;

  if (select count(*) from private.professional_kyc_evidence_events where evidence_set_id=v_s1)<4 then
    raise exception 'PROF_B05_S1_EVENT_HISTORY_INCOMPLETE';
  end if;
end;
$test$;

rollback;
