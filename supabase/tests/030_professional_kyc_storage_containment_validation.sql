-- PROF-001 / PROF-B05 G1 validation
-- Validates canonical KYC Storage containment without mutating Storage objects.

begin;

do $structural$
declare
  v_policy_count integer;
  v_mutation_count integer;
  v_definition text;
begin
  select count(*)
    into v_policy_count
    from pg_policy
   where polrelid = 'storage.objects'::regclass
     and (
       coalesce(pg_get_expr(polqual, polrelid), '') ilike '%professional-verification-media%'
       or coalesce(pg_get_expr(polwithcheck, polrelid), '') ilike '%professional-verification-media%'
     );

  if v_policy_count <> 1 then
    raise exception 'PROF_B05_STORAGE_POLICY_COUNT_MISMATCH:%', v_policy_count;
  end if;

  if not exists (
    select 1
      from pg_policy
     where polrelid = 'storage.objects'::regclass
       and polname = 'professional_verification_reference_read'
       and polcmd = 'r'
  ) then
    raise exception 'PROF_B05_CANONICAL_STORAGE_READ_POLICY_MISSING';
  end if;

  select count(*)
    into v_mutation_count
    from pg_policy
   where polrelid = 'storage.objects'::regclass
     and polcmd in ('a', 'w', 'd')
     and (
       coalesce(pg_get_expr(polqual, polrelid), '') ilike '%professional-verification-media%'
       or coalesce(pg_get_expr(polwithcheck, polrelid), '') ilike '%professional-verification-media%'
     );

  if v_mutation_count <> 0 then
    raise exception 'PROF_B05_BROWSER_STORAGE_MUTATION_POLICY_REMAINS:%', v_mutation_count;
  end if;

  select pg_get_expr(polqual, polrelid)
    into v_definition
    from pg_policy
   where polrelid = 'storage.objects'::regclass
     and polname = 'professional_verification_reference_read';

  if position('storage.object.sign' in v_definition) = 0
     or position('storage.object.get_authenticated' in v_definition) = 0
     or position('storage.allow_any_operation' in v_definition) = 0
     or position('professional_identity_verifications' in v_definition) = 0 then
    raise exception 'PROF_B05_CANONICAL_STORAGE_READ_POLICY_INVALID';
  end if;
end;
$structural$;

-- Capture one real referenced object as a read-only canary target.
select set_config(
  'doke.prof_b05.path',
  (
    select d.value ->> 'path'
      from public.professional_identity_verifications piv
      cross join lateral jsonb_each(coalesce(piv.documents, '{}'::jsonb)) d
     where d.value ->> 'bucket' = 'professional-verification-media'
       and exists (
         select 1
           from storage.objects o
          where o.bucket_id = 'professional-verification-media'
            and o.name = d.value ->> 'path'
       )
     limit 1
  ),
  true
);

select set_config(
  'doke.prof_b05.owner',
  (
    select piv.user_id::text
      from public.professional_identity_verifications piv
      cross join lateral jsonb_each(coalesce(piv.documents, '{}'::jsonb)) d
     where d.value ->> 'bucket' = 'professional-verification-media'
       and d.value ->> 'path' = current_setting('doke.prof_b05.path')
     limit 1
  ),
  true
);

do $target$
begin
  if nullif(current_setting('doke.prof_b05.path', true), '') is null
     or nullif(current_setting('doke.prof_b05.owner', true), '') is null then
    raise exception 'PROF_B05_REFERENCED_STORAGE_CANARY_MISSING';
  end if;
end;
$target$;

-- Owner can sign/get the exact referenced object but cannot list.
select set_config('request.jwt.claim.sub', current_setting('doke.prof_b05.owner'), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', current_setting('doke.prof_b05.owner'), 'role', 'authenticated')::text,
  true
);
select set_config('storage.operation', 'storage.object.sign', true);
set local role authenticated;

do $owner_sign$
begin
  if not exists (
    select 1
      from storage.objects
     where bucket_id = 'professional-verification-media'
       and name = current_setting('doke.prof_b05.path')
  ) then
    raise exception 'PROF_B05_OWNER_SIGN_READ_DENIED';
  end if;
end;
$owner_sign$;

reset role;
select set_config('storage.operation', 'storage.object.list', true);
set local role authenticated;

do $owner_list$
begin
  if exists (
    select 1
      from storage.objects
     where bucket_id = 'professional-verification-media'
       and name = current_setting('doke.prof_b05.path')
  ) then
    raise exception 'PROF_B05_OWNER_LIST_ALLOWED';
  end if;
end;
$owner_list$;

reset role;

-- An unrelated active non-reviewer cannot read the referenced object.
-- Provision a transaction-scoped actor only when the environment has no suitable canary.
do $unrelated_target$
declare
  v_id uuid;
  v_email text;
begin
  select u.id
    into v_id
    from public.users u
   where u.status='active'
     and u.role not in ('admin','moderator')
     and u.id::text<>current_setting('doke.prof_b05.owner')
   limit 1;

  if v_id is null then
    v_id:=gen_random_uuid();
    v_email:='prof-b05-storage-unrelated-'||replace(v_id::text,'-','')||'@example.test';

    insert into auth.users(
      id,aud,role,email,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
      is_sso_user,is_anonymous
    ) values(
      v_id,'authenticated','authenticated',v_email,now(),
      '{"provider":"email","providers":["email"],"role":"client","account_status":"active"}'::jsonb,
      jsonb_build_object('name','PROF B05 Storage Unrelated'),
      now(),now(),false,false
    );

    insert into public.users(id,email,role,status,created_at,updated_at)
    values(v_id,v_email,'client','active',now(),now())
    on conflict(id) do update
      set role='client',status='active',updated_at=excluded.updated_at;
  end if;

  perform set_config('doke.prof_b05.unrelated',v_id::text,true);
end;
$unrelated_target$;

select set_config('request.jwt.claim.sub', current_setting('doke.prof_b05.unrelated'), true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', current_setting('doke.prof_b05.unrelated'), 'role', 'authenticated')::text,
  true
);
select set_config('storage.operation', 'storage.object.sign', true);
set local role authenticated;

do $unrelated$
begin
  if exists (
    select 1
      from storage.objects
     where bucket_id = 'professional-verification-media'
       and name = current_setting('doke.prof_b05.path')
  ) then
    raise exception 'PROF_B05_UNRELATED_STORAGE_READ_ALLOWED';
  end if;
end;
$unrelated$;

reset role;

-- Active reviewer can read referenced evidence, but still cannot list.
-- Provision a transaction-scoped reviewer only when the environment has none.
do $reviewer_target$
declare
  v_id uuid;
  v_email text;
begin
  select u.id
    into v_id
    from public.users u
   where u.status='active'
     and u.role in ('admin','moderator')
   limit 1;

  if v_id is null then
    v_id:=gen_random_uuid();
    v_email:='prof-b05-storage-reviewer-'||replace(v_id::text,'-','')||'@example.test';

    insert into auth.users(
      id,aud,role,email,email_confirmed_at,
      raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
      is_sso_user,is_anonymous
    ) values(
      v_id,'authenticated','authenticated',v_email,now(),
      '{"provider":"email","providers":["email"],"role":"admin","account_status":"active"}'::jsonb,
      jsonb_build_object('name','PROF B05 Storage Reviewer'),
      now(),now(),false,false
    );

    insert into public.users(id,email,role,status,created_at,updated_at)
    values(v_id,v_email,'admin','active',now(),now())
    on conflict(id) do update
      set role='admin',status='active',updated_at=excluded.updated_at;
  end if;

  perform set_config('doke.prof_b05.reviewer',v_id::text,true);
end;
$reviewer_target$;

select set_config('request.jwt.claim.sub', current_setting('doke.prof_b05.reviewer'), true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('sub', current_setting('doke.prof_b05.reviewer'), 'role', 'authenticated')::text,
  true
);
select set_config('storage.operation', 'storage.object.get_authenticated', true);
set local role authenticated;

do $reviewer_get$
begin
  if not exists (
    select 1
      from storage.objects
     where bucket_id = 'professional-verification-media'
       and name = current_setting('doke.prof_b05.path')
  ) then
    raise exception 'PROF_B05_REVIEWER_REFERENCED_READ_DENIED';
  end if;
end;
$reviewer_get$;

reset role;
select set_config('storage.operation', 'storage.object.list', true);
set local role authenticated;

do $reviewer_list$
begin
  if exists (
    select 1
      from storage.objects
     where bucket_id = 'professional-verification-media'
       and name = current_setting('doke.prof_b05.path')
  ) then
    raise exception 'PROF_B05_REVIEWER_LIST_ALLOWED';
  end if;
end;
$reviewer_list$;

reset role;
rollback;
