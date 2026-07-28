-- CAT-001 / CAT-A04: support deterministic intent consumption and later cleanup scans.

create index if not exists idx_service_media_upload_items_intent_status
  on private.service_media_upload_items(intent_id, status, sort_order);
