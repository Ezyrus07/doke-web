-- CAT-001 / CAT-A04: give the upload-intent consumption invariant an explicit,
-- deterministic constraint name while preserving the existing behavior.

alter table private.service_media_upload_intents
  drop constraint if exists service_media_upload_intents_check;

alter table private.service_media_upload_intents
  add constraint service_media_upload_intents_consumption_check
  check (
    (status = 'consumed' and consumed_at is not null)
    or
    (status <> 'consumed' and consumed_at is null)
  );
