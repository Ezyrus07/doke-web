begin;

create index if not exists appeal_event_case_revision_idx
  on com_moderation_private.appeal_event(case_id, event_revision);

create index if not exists decision_record_case_revision_idx
  on com_moderation_private.decision_record(case_id, event_revision);

create index if not exists evidence_record_case_revision_idx
  on com_moderation_private.evidence_record(case_id, event_revision);

create index if not exists media_review_event_case_revision_idx
  on com_moderation_private.media_review_event(case_id, event_revision);

create index if not exists sanction_event_case_revision_idx
  on com_moderation_private.sanction_event(case_id, event_revision);

commit;
