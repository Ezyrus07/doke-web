import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  const expectedSecret = Deno.env.get("DOKE_ATTACHMENT_CLEANUP_SECRET") || "";
  const suppliedSecret = req.headers.get("x-doke-cleanup-secret") || "";
  if (!expectedSecret) return json(503, { error: "DOKE_ATTACHMENT_CLEANUP_NOT_CONFIGURED" });
  if (suppliedSecret !== expectedSecret) return json(401, { error: "DOKE_ATTACHMENT_CLEANUP_UNAUTHORIZED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !secretKey) {
    return json(503, { error: "SERVER_CONFIGURATION_MISSING" });
  }

  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: candidates, error: listError } = await serviceClient.rpc(
    "list_transaction_attachment_cleanup_candidates_internal",
    { p_limit: 100 },
  );
  if (listError) return json(500, { error: "DOKE_ATTACHMENT_CLEANUP_LIST_FAILED" });

  let removed = 0;
  let failed = 0;
  for (const candidate of Array.isArray(candidates) ? candidates : []) {
    const attachmentId = String(candidate.attachment_id || "");
    const bucket = String(candidate.bucket_id || "transaction-attachments");
    const objectPath = String(candidate.object_path || "");
    if (!attachmentId || !objectPath) continue;

    const { error: removeError } = await serviceClient.storage
      .from(bucket)
      .remove([objectPath]);

    const { error: markError } = await serviceClient.rpc(
      "mark_transaction_attachment_cleanup_result_internal",
      {
        p_attachment_id: attachmentId,
        p_removed: !removeError,
        p_error: removeError ? String(removeError.message || removeError) : null,
      },
    );

    if (!removeError && !markError) removed += 1;
    else failed += 1;
  }

  console.info(JSON.stringify({
    function: "transaction-attachment-cleanup",
    removed,
    failed,
  }));
  return json(200, { removed, failed });
});
