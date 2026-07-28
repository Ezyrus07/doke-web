#!/usr/bin/env node
'use strict';

const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');

(async () => {
  const moduleUrl = pathToFileURL(path.resolve(__dirname, '../supabase/functions/service-moderation-operations/media-cleanup.mjs')).href;
  const { executeServiceMediaCleanup } = await import(moduleUrl);

  const removed = [];
  const rpcCalls = [];
  const context = {
    actorId: '11111111-1111-4111-8111-111111111111',
    serviceClient: {
      storage: {
        from(bucket) {
          return {
            async remove(paths) {
              removed.push({ bucket, paths });
              return paths[0].includes('fail')
                ? { error: new Error('STORAGE_DELETE_FAILED') }
                : { error: null };
            }
          };
        }
      }
    }
  };

  const rpc = async (_context, name, params) => {
    rpcCalls.push({ name, params });
    if (name === 'prepare_service_media_cleanup_batch_internal') {
      return {
        reconciliation: { expiredIntents: 1, abandonedUploads: 2 },
        items: [
          {
            itemId: '22222222-2222-4222-8222-222222222222',
            bucket: 'service-media',
            path: 'pending/actor/intent/01-ok.png',
            attempt: 1,
            reason: 'abandoned_upload'
          },
          {
            itemId: '33333333-3333-4333-8333-333333333333',
            bucket: 'service-media',
            path: 'pending/actor/intent/02-fail.png',
            attempt: 2,
            reason: 'unreferenced_superseded'
          }
        ]
      };
    }
    assert.strictEqual(name, 'complete_service_media_cleanup_batch_internal');
    assert.deepStrictEqual(params.p_results, [
      {
        itemId: '22222222-2222-4222-8222-222222222222',
        success: true,
        error: ''
      },
      {
        itemId: '33333333-3333-4333-8333-333333333333',
        success: false,
        error: 'STORAGE_DELETE_FAILED'
      }
    ]);
    return { deleted: 1, failed: 1, processed: 2 };
  };

  const result = await executeServiceMediaCleanup({ context, limit: 20, rpc });

  assert.strictEqual(rpcCalls[0].name, 'prepare_service_media_cleanup_batch_internal');
  assert.strictEqual(rpcCalls[0].params.p_actor_id, context.actorId);
  assert.strictEqual(rpcCalls[0].params.p_limit, 20);
  assert.deepStrictEqual(removed, [
    { bucket: 'service-media', paths: ['pending/actor/intent/01-ok.png'] },
    { bucket: 'service-media', paths: ['pending/actor/intent/02-fail.png'] }
  ]);
  assert.strictEqual(result.claimed, 2);
  assert.strictEqual(result.deleted, 1);
  assert.strictEqual(result.failed, 1);
  assert.strictEqual(result.processed, 2);
  assert.deepStrictEqual(result.reconciliation, { expiredIntents: 1, abandonedUploads: 2 });

  console.log('[CAT-A04-CLEANUP] controlled Storage API cleanup runtime passed.');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
