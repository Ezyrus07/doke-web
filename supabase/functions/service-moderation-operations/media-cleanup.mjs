const normalizeText = (value, max = 1024) => String(value || '').trim().slice(0, max);

const normalizeCandidate = (value) => {
  const item = value && typeof value === 'object' ? value : {};
  return {
    itemId: normalizeText(item.itemId, 80),
    bucket: normalizeText(item.bucket, 100),
    path: normalizeText(item.path, 1024),
    reason: normalizeText(item.reason, 80),
    attempt: Math.max(0, Number(item.attempt || 0) || 0),
  };
};

const normalizeStorageError = (error) => normalizeText(
  error?.message || error?.error || error?.code || error || 'DOKE_SERVICE_MEDIA_STORAGE_DELETE_FAILED',
  500,
);

export const executeServiceMediaCleanup = async ({ context, limit, rpc }) => {
  const prepared = await rpc(context, 'prepare_service_media_cleanup_batch_internal', {
    p_actor_id: context.actorId,
    p_limit: limit,
  });
  const candidates = Array.isArray(prepared?.items)
    ? prepared.items.map(normalizeCandidate).filter((item) => item.itemId && item.bucket && item.path)
    : [];

  const results = [];
  for (const candidate of candidates) {
    try {
      const { error } = await context.serviceClient.storage
        .from(candidate.bucket)
        .remove([candidate.path]);
      if (error) throw error;
      results.push({ itemId: candidate.itemId, success: true, error: '' });
    } catch (error) {
      results.push({
        itemId: candidate.itemId,
        success: false,
        error: normalizeStorageError(error),
      });
    }
  }

  const completed = await rpc(context, 'complete_service_media_cleanup_batch_internal', {
    p_actor_id: context.actorId,
    p_results: results,
  });

  return {
    claimed: candidates.length,
    deleted: Number(completed?.deleted || 0) || 0,
    failed: Number(completed?.failed || 0) || 0,
    processed: Number(completed?.processed || 0) || 0,
    reconciliation: prepared?.reconciliation || {},
    candidates: candidates.map((item) => ({
      itemId: item.itemId,
      reason: item.reason,
      attempt: item.attempt,
    })),
  };
};
