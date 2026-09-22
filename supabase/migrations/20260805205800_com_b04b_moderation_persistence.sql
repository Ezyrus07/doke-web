begin;

create schema if not exists com_moderation_private;
revoke all on schema com_moderation_private from public, anon, authenticated, service_role;

create table if not exists com_moderation_private.case_projection (
  case_id uuid primary key,
  community_id uuid not null,
  case_kind text not null check (case_kind in ('content_report','member_report','media_review')),
  case_state text not null check (case_state in (
    'open','triage','evidence_collection','decision_pending_approval','decision_approved',
    'remediation_pending','appeal_open','appeal_review','appeal_pending_approval',
    'resolved','closed','conflicted'
  )),
  reporter_id uuid not null,
  target_type text not null check (target_type in ('community_post','channel_message','media_asset','community_member')),
  target_id uuid not null,
  revision bigint not null check (revision > 0),
  ledger_head_hash text not null check (ledger_head_hash ~ '^[a-f0-9]{64}$'),
  projection jsonb not null check (jsonb_typeof(projection) = 'object'),
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists com_moderation_private.case_event (
  case_id uuid not null,
  revision bigint not null check (revision > 0),
  event_id text not null check (event_id ~ '^evt-[a-f0-9]{24}$'),
  community_id uuid not null,
  actor_id uuid not null,
  action text not null check (length(action) between 3 and 96),
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  previous_event_hash text null check (previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$'),
  intent_fingerprint text not null check (intent_fingerprint ~ '^[a-f0-9]{64}$'),
  policy_fingerprint text not null check (policy_fingerprint ~ '^[a-f0-9]{64}$'),
  details jsonb not null check (jsonb_typeof(details) = 'object'),
  occurred_at timestamptz not null,
  inserted_at timestamptz not null default now(),
  primary key (case_id, revision),
  unique (event_id),
  unique (event_hash),
  foreign key (case_id) references com_moderation_private.case_projection(case_id) deferrable initially deferred
);

create table if not exists com_moderation_private.command_idempotency (
  actor_id uuid not null,
  client_request_id uuid not null,
  case_id uuid not null,
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  intent_fingerprint text not null check (intent_fingerprint ~ '^[a-f0-9]{64}$'),
  status text not null check (status in ('pending','committed')),
  result jsonb null check (result is null or jsonb_typeof(result) = 'object'),
  claimed_at timestamptz not null default now(),
  committed_at timestamptz null,
  primary key (actor_id, client_request_id),
  unique (actor_id, idempotency_key)
);

create table if not exists com_moderation_private.evidence_record (
  evidence_id uuid primary key,
  case_id uuid not null references com_moderation_private.case_projection(case_id),
  event_revision bigint not null check (event_revision > 0),
  evidence_kind text not null check (evidence_kind in (
    'report_statement','content_snapshot','moderator_note','media_scan','policy_reference','prior_event'
  )),
  opaque_reference text not null check (
    opaque_reference ~ '^opaque:[A-Za-z0-9][A-Za-z0-9:_-]{7,180}$' and opaque_reference !~ '[?&#=@]'
  ),
  digest text not null check (digest ~ '^[a-f0-9]{64}$'),
  retention_class text not null check (retention_class in ('standard','extended','legal_hold')),
  collected_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (case_id, digest),
  foreign key (case_id, event_revision) references com_moderation_private.case_event(case_id, revision)
);

create table if not exists com_moderation_private.decision_record (
  record_hash text primary key check (record_hash ~ '^[a-f0-9]{64}$'),
  case_id uuid not null references com_moderation_private.case_projection(case_id),
  event_revision bigint not null check (event_revision > 0),
  record_type text not null check (record_type in ('recommendation','approval','appeal_recommendation','appeal_approval')),
  outcome text not null check (length(outcome) between 3 and 48),
  recommender_id uuid null,
  approver_id uuid null,
  policy_fingerprint text not null check (policy_fingerprint ~ '^[a-f0-9]{64}$'),
  record jsonb not null check (jsonb_typeof(record) = 'object'),
  recorded_at timestamptz not null,
  foreign key (case_id, event_revision) references com_moderation_private.case_event(case_id, revision)
);

create table if not exists com_moderation_private.sanction_event (
  sanction_id uuid not null,
  sequence bigint not null check (sequence > 0),
  case_id uuid not null references com_moderation_private.case_projection(case_id),
  event_revision bigint not null check (event_revision > 0),
  sanction_type text not null check (sanction_type in ('warning','mute','restriction','ban')),
  subject_id uuid not null,
  transition_from text null,
  transition_to text not null check (transition_to in ('proposed','approved','active','expired','reversed','replaced')),
  starts_at timestamptz null,
  expires_at timestamptz null,
  permanent boolean not null default false,
  authorized_by_hash text not null check (authorized_by_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  recorded_at timestamptz not null,
  primary key (sanction_id, sequence),
  foreign key (case_id, event_revision) references com_moderation_private.case_event(case_id, revision),
  check (not permanent or (sanction_type = 'ban' and expires_at is null)),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create table if not exists com_moderation_private.appeal_event (
  appeal_id uuid not null,
  sequence bigint not null check (sequence > 0),
  case_id uuid not null references com_moderation_private.case_projection(case_id),
  event_revision bigint not null check (event_revision > 0),
  action text not null check (length(action) between 3 and 96),
  actor_id uuid not null,
  prior_decision_hash text not null check (prior_decision_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  primary key (appeal_id, sequence),
  foreign key (case_id, event_revision) references com_moderation_private.case_event(case_id, revision)
);

create table if not exists com_moderation_private.media_review_event (
  media_asset_id uuid not null,
  sequence bigint not null check (sequence > 0),
  case_id uuid not null references com_moderation_private.case_projection(case_id),
  event_revision bigint not null check (event_revision > 0),
  action text not null check (length(action) between 3 and 96),
  content_digest text not null check (content_digest ~ '^[a-f0-9]{64}$'),
  scanner_id_hash text null check (scanner_id_hash is null or scanner_id_hash ~ '^[a-f0-9]{64}$'),
  scan_result text null check (scan_result is null or scan_result in ('clean','suspicious','malicious','unavailable')),
  final_decision_created boolean not null default false,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null,
  primary key (media_asset_id, sequence),
  foreign key (case_id, event_revision) references com_moderation_private.case_event(case_id, revision)
);

create index if not exists case_projection_community_state_idx
  on com_moderation_private.case_projection(community_id, case_state, updated_at desc);
create index if not exists case_event_case_occurred_idx
  on com_moderation_private.case_event(case_id, occurred_at desc);
create index if not exists sanction_event_subject_idx
  on com_moderation_private.sanction_event(subject_id, recorded_at desc);

alter table com_moderation_private.case_projection enable row level security;
alter table com_moderation_private.case_projection force row level security;
alter table com_moderation_private.case_event enable row level security;
alter table com_moderation_private.case_event force row level security;
alter table com_moderation_private.command_idempotency enable row level security;
alter table com_moderation_private.command_idempotency force row level security;
alter table com_moderation_private.evidence_record enable row level security;
alter table com_moderation_private.evidence_record force row level security;
alter table com_moderation_private.decision_record enable row level security;
alter table com_moderation_private.decision_record force row level security;
alter table com_moderation_private.sanction_event enable row level security;
alter table com_moderation_private.sanction_event force row level security;
alter table com_moderation_private.appeal_event enable row level security;
alter table com_moderation_private.appeal_event force row level security;
alter table com_moderation_private.media_review_event enable row level security;
alter table com_moderation_private.media_review_event force row level security;

revoke all on all tables in schema com_moderation_private from public, anon, authenticated, service_role;
revoke all on all sequences in schema com_moderation_private from public, anon, authenticated, service_role;

create or replace function com_moderation_private.reject_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, com_moderation_private
as $$
begin
  raise exception 'IMMUTABLE_MODERATION_LEDGER';
end;
$$;

create trigger case_event_immutable before update or delete on com_moderation_private.case_event
for each row execute function com_moderation_private.reject_ledger_mutation();
create trigger evidence_record_immutable before update or delete on com_moderation_private.evidence_record
for each row execute function com_moderation_private.reject_ledger_mutation();
create trigger decision_record_immutable before update or delete on com_moderation_private.decision_record
for each row execute function com_moderation_private.reject_ledger_mutation();
create trigger sanction_event_immutable before update or delete on com_moderation_private.sanction_event
for each row execute function com_moderation_private.reject_ledger_mutation();
create trigger appeal_event_immutable before update or delete on com_moderation_private.appeal_event
for each row execute function com_moderation_private.reject_ledger_mutation();
create trigger media_review_event_immutable before update or delete on com_moderation_private.media_review_event
for each row execute function com_moderation_private.reject_ledger_mutation();

create or replace function public.com_moderation_load_case_v1(p_case_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog, com_moderation_private
as $$
  select jsonb_build_object(
    'caseId', case_id,
    'communityId', community_id,
    'kind', case_kind,
    'state', case_state,
    'reporterId', reporter_id,
    'targetType', target_type,
    'targetId', target_id,
    'revision', revision,
    'ledgerHeadHash', ledger_head_hash,
    'projection', projection,
    'updatedAt', updated_at
  )
  from com_moderation_private.case_projection
  where case_id = p_case_id;
$$;

create or replace function public.com_moderation_commit_case_command_v1(
  p_case_id uuid,
  p_community_id uuid,
  p_actor_id uuid,
  p_client_request_id uuid,
  p_idempotency_key text,
  p_intent_fingerprint text,
  p_expected_revision bigint,
  p_event_id text,
  p_event_action text,
  p_event_hash text,
  p_previous_event_hash text,
  p_policy_fingerprint text,
  p_occurred_at timestamptz,
  p_case_kind text,
  p_case_state text,
  p_reporter_id uuid,
  p_target_type text,
  p_target_id uuid,
  p_projection jsonb,
  p_event_details jsonb,
  p_evidence_record jsonb,
  p_decision_record jsonb,
  p_sanction_event jsonb,
  p_appeal_event jsonb,
  p_media_review_event jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, com_moderation_private
as $$
declare
  current_case com_moderation_private.case_projection%rowtype;
  existing_idempotency com_moderation_private.command_idempotency%rowtype;
  next_revision bigint;
  write_count integer;
  result_payload jsonb;
begin
  if p_idempotency_key !~ '^[a-f0-9]{64}$' or p_intent_fingerprint !~ '^[a-f0-9]{64}$' or
     p_event_hash !~ '^[a-f0-9]{64}$' or p_policy_fingerprint !~ '^[a-f0-9]{64}$' or
     (p_previous_event_hash is not null and p_previous_event_hash !~ '^[a-f0-9]{64}$') then
    raise exception 'INVALID_MODERATION_HASH';
  end if;
  if jsonb_typeof(p_projection) <> 'object' or jsonb_typeof(coalesce(p_event_details, '{}'::jsonb)) <> 'object' then
    raise exception 'INVALID_MODERATION_JSON';
  end if;

  insert into com_moderation_private.command_idempotency(
    actor_id, client_request_id, case_id, idempotency_key, intent_fingerprint, status
  ) values (
    p_actor_id, p_client_request_id, p_case_id, p_idempotency_key, p_intent_fingerprint, 'pending'
  ) on conflict (actor_id, client_request_id) do nothing;

  select * into existing_idempotency
  from com_moderation_private.command_idempotency
  where actor_id = p_actor_id and client_request_id = p_client_request_id
  for update;

  if existing_idempotency.intent_fingerprint <> p_intent_fingerprint or
     existing_idempotency.idempotency_key <> p_idempotency_key or
     existing_idempotency.case_id <> p_case_id then
    raise exception 'IDEMPOTENCY_INTENT_MISMATCH';
  end if;
  if existing_idempotency.status = 'committed' then
    return jsonb_build_object('replay', true, 'result', existing_idempotency.result);
  end if;

  select * into current_case
  from com_moderation_private.case_projection
  where case_id = p_case_id
  for update;

  if p_expected_revision = 0 then
    if current_case.case_id is not null then raise exception 'CASE_ALREADY_EXISTS'; end if;
    if p_previous_event_hash is not null then raise exception 'NEW_CASE_PREVIOUS_HASH_MUST_BE_NULL'; end if;
    next_revision := 1;
    insert into com_moderation_private.case_projection(
      case_id, community_id, case_kind, case_state, reporter_id, target_type, target_id,
      revision, ledger_head_hash, projection, created_at, updated_at
    ) values (
      p_case_id, p_community_id, p_case_kind, p_case_state, p_reporter_id, p_target_type, p_target_id,
      next_revision, p_event_hash, p_projection, p_occurred_at, p_occurred_at
    );
  else
    if current_case.case_id is null then raise exception 'MODERATION_CASE_NOT_FOUND'; end if;
    if current_case.revision <> p_expected_revision then raise exception 'CASE_REVISION_CONFLICT'; end if;
    if current_case.community_id <> p_community_id then raise exception 'CASE_COMMUNITY_MISMATCH'; end if;
    if current_case.ledger_head_hash is distinct from p_previous_event_hash then
      raise exception 'EVENT_HASH_CHAIN_CONFLICT';
    end if;
    next_revision := current_case.revision + 1;
    update com_moderation_private.case_projection
    set case_state = p_case_state,
        revision = next_revision,
        ledger_head_hash = p_event_hash,
        projection = p_projection,
        updated_at = p_occurred_at
    where case_id = p_case_id and revision = p_expected_revision;
    get diagnostics write_count = row_count;
    if write_count <> 1 then raise exception 'CASE_COMPARE_AND_SWAP_FAILED'; end if;
  end if;

  insert into com_moderation_private.case_event(
    case_id, revision, event_id, community_id, actor_id, action, event_hash,
    previous_event_hash, intent_fingerprint, policy_fingerprint, details, occurred_at
  ) values (
    p_case_id, next_revision, p_event_id, p_community_id, p_actor_id, p_event_action, p_event_hash,
    p_previous_event_hash, p_intent_fingerprint, p_policy_fingerprint,
    coalesce(p_event_details, '{}'::jsonb), p_occurred_at
  );

  if p_evidence_record is not null and p_evidence_record <> 'null'::jsonb then
    insert into com_moderation_private.evidence_record(
      evidence_id, case_id, event_revision, evidence_kind, opaque_reference, digest,
      retention_class, collected_at, metadata
    ) values (
      (p_evidence_record->>'id')::uuid, p_case_id, next_revision,
      p_evidence_record->>'kind', p_evidence_record->>'reference', p_evidence_record->>'digest',
      p_evidence_record->>'retentionClass', (p_evidence_record->>'collectedAt')::timestamptz,
      coalesce(p_evidence_record->'metadata', '{}'::jsonb)
    );
  end if;

  if p_decision_record is not null and p_decision_record <> 'null'::jsonb then
    insert into com_moderation_private.decision_record(
      record_hash, case_id, event_revision, record_type, outcome, recommender_id, approver_id,
      policy_fingerprint, record, recorded_at
    ) values (
      p_decision_record->>'recordHash', p_case_id, next_revision,
      p_decision_record->>'recordType', p_decision_record->>'outcome',
      nullif(p_decision_record->>'recommenderId', '')::uuid,
      nullif(p_decision_record->>'approverId', '')::uuid,
      p_policy_fingerprint, p_decision_record, p_occurred_at
    );
  end if;

  if p_sanction_event is not null and p_sanction_event <> 'null'::jsonb then
    insert into com_moderation_private.sanction_event(
      sanction_id, sequence, case_id, event_revision, sanction_type, subject_id,
      transition_from, transition_to, starts_at, expires_at, permanent,
      authorized_by_hash, payload, recorded_at
    ) values (
      (p_sanction_event->>'sanctionId')::uuid, (p_sanction_event->>'sequence')::bigint,
      p_case_id, next_revision, p_sanction_event->>'type', (p_sanction_event->>'subjectId')::uuid,
      nullif(p_sanction_event->>'transitionFrom', ''), p_sanction_event->>'transitionTo',
      nullif(p_sanction_event->>'startsAt', '')::timestamptz,
      nullif(p_sanction_event->>'expiresAt', '')::timestamptz,
      coalesce((p_sanction_event->>'permanent')::boolean, false),
      p_sanction_event->>'authorizedByHash', p_sanction_event, p_occurred_at
    );
  end if;

  if p_appeal_event is not null and p_appeal_event <> 'null'::jsonb then
    insert into com_moderation_private.appeal_event(
      appeal_id, sequence, case_id, event_revision, action, actor_id,
      prior_decision_hash, payload, occurred_at
    ) values (
      (p_appeal_event->>'appealId')::uuid, (p_appeal_event->>'sequence')::bigint,
      p_case_id, next_revision, p_appeal_event->>'action', p_actor_id,
      p_appeal_event->>'priorDecisionHash', p_appeal_event, p_occurred_at
    );
  end if;

  if p_media_review_event is not null and p_media_review_event <> 'null'::jsonb then
    insert into com_moderation_private.media_review_event(
      media_asset_id, sequence, case_id, event_revision, action, content_digest,
      scanner_id_hash, scan_result, final_decision_created, payload, occurred_at
    ) values (
      (p_media_review_event->>'mediaAssetId')::uuid, (p_media_review_event->>'sequence')::bigint,
      p_case_id, next_revision, p_media_review_event->>'action',
      p_media_review_event->>'contentDigest', nullif(p_media_review_event->>'scannerIdHash', ''),
      nullif(p_media_review_event->>'scanResult', ''),
      coalesce((p_media_review_event->>'finalDecisionCreated')::boolean, false),
      p_media_review_event, p_occurred_at
    );
  end if;

  result_payload := jsonb_build_object(
    'caseId', p_case_id,
    'revision', next_revision,
    'eventHash', p_event_hash,
    'replay', false
  );

  update com_moderation_private.command_idempotency
  set status = 'committed', result = result_payload, committed_at = now()
  where actor_id = p_actor_id and client_request_id = p_client_request_id and status = 'pending';
  get diagnostics write_count = row_count;
  if write_count <> 1 then raise exception 'IDEMPOTENCY_COMMIT_FAILED'; end if;

  return result_payload;
end;
$$;

revoke all on function public.com_moderation_load_case_v1(uuid) from public, anon, authenticated;
revoke all on function public.com_moderation_commit_case_command_v1(
  uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,
  text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb
) from public, anon, authenticated;
grant execute on function public.com_moderation_load_case_v1(uuid) to service_role;
grant execute on function public.com_moderation_commit_case_command_v1(
  uuid,uuid,uuid,uuid,text,text,bigint,text,text,text,text,text,timestamptz,
  text,text,uuid,text,uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb
) to service_role;

commit;
