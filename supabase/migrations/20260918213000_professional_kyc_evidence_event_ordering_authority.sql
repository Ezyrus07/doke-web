-- PROF-001 / PROF-B05 G4 forward fix
-- Adds deterministic append order to immutable KYC evidence events.
-- Existing rows receive an identity value during ADD COLUMN; no UPDATE/DELETE is used.

do $preflight$
begin
  if to_regclass('private.professional_kyc_evidence_events') is null then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_EVENTS_MISSING';
  end if;
  if exists(
    select 1
    from information_schema.columns
    where table_schema='private'
      and table_name='professional_kyc_evidence_events'
      and column_name='event_sequence'
  ) then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_EVENT_SEQUENCE_ALREADY_EXISTS';
  end if;
end
$preflight$;

alter table private.professional_kyc_evidence_events
  add column event_sequence bigint generated always as identity;

create unique index professional_kyc_evidence_events_sequence_uidx
  on private.professional_kyc_evidence_events(event_sequence);

create index professional_kyc_evidence_events_set_sequence_idx
  on private.professional_kyc_evidence_events(evidence_set_id,event_sequence);

comment on column private.professional_kyc_evidence_events.event_sequence is
  'Global monotonic append order for immutable KYC evidence lifecycle events.';

do $postcondition$
begin
  if exists(
    select 1
    from private.professional_kyc_evidence_events
    where event_sequence is null
  ) then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_EVENT_SEQUENCE_BACKFILL_FAILED';
  end if;
end
$postcondition$;
