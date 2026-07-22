import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  deliverOptionalWebhook,
  normalizeLimit,
  normalizeWorkerError,
  retryDelaySeconds,
} from "./worker.mjs";

const FUNCTION_NAME = "order-event-worker";
const jsonResponse = (status: number, payload: unknown, headers: Record<string, string> = {}) => new Response(
  JSON.stringify(payload),
  { status, headers: { "Content-Type": "application/json; charset=utf-8", ...headers } },
);

const text = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const sourceValue = (value: unknown) => {
  const source = text(value, 20).toLowerCase();
  return ["cron", "manual", "test", "recovery"].includes(source) ? source : "manual";
};

type ServiceClient = ReturnType<typeof createClient>;
type ClaimedEvent = {
  event_id: string;
  event_key: string;
  order_id: string;
  sequence_no: number;
  event_type: string;
  payload: Record<string, unknown>;
  cache_tags: string[];
  delivery_attempts: number;
  max_delivery_attempts: number;
  created_at: string;
};

const serviceClient = () => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";
  if (!supabaseUrl || !secretKey) return null;
  return createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const authorize = async (client: ServiceClient, req: Request) => {
  const token = text(req.headers.get("x-doke-worker-token"), 256);
  if (!token) return false;
  const { data, error } = await client.rpc("verify_order_event_worker_token", { p_token: token });
  return !error && data === true;
};

const completeEvent = async (
  client: ServiceClient,
  event: ClaimedEvent,
  runId: string,
  result: Record<string, unknown>,
) => {
  const { data, error } = await client.rpc("complete_order_domain_event_delivery", {
    p_event_key: event.event_key,
    p_worker_run_id: runId,
    p_result: result,
  });
  if (error || data !== true) {
    const failure = new Error("complete_order_domain_event_delivery failed");
    (failure as Error & { code?: string }).code = "DOKE_ORDER_EVENT_COMPLETION_FAILED";
    throw failure;
  }
};

const failEvent = async (
  client: ServiceClient,
  event: ClaimedEvent,
  runId: string,
  errorCode: string,
  result: Record<string, unknown>,
) => {
  const { data, error } = await client.rpc("fail_order_domain_event_delivery", {
    p_event_key: event.event_key,
    p_worker_run_id: runId,
    p_error_code: errorCode,
    p_retry_after_seconds: retryDelaySeconds(event.delivery_attempts),
    p_result: result,
  });
  if (error) return "failed";
  return text(data, 30) || "failed";
};

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });

  const client = serviceClient();
  if (!client) return jsonResponse(503, { error: "SERVER_CONFIGURATION_MISSING" });
  if (!await authorize(client, req)) return jsonResponse(401, { error: "WORKER_AUTH_REQUIRED" });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const limit = normalizeLimit(body.limit);
  const source = sourceValue(body.source || req.headers.get("x-doke-worker-source"));
  const invocationId = text(req.headers.get("x-deno-execution-id"), 180) || crypto.randomUUID();
  const startedAt = Date.now();

  const { data: runId, error: beginError } = await client.rpc("begin_order_event_worker_run", {
    p_invocation_id: invocationId,
    p_source: source,
    p_metadata: { function: FUNCTION_NAME, limit },
  });
  if (beginError || !runId) return jsonResponse(500, { error: "WORKER_RUN_START_FAILED" });

  const { data: claimedRows, error: claimError } = await client.rpc("claim_order_domain_events_for_worker", {
    p_limit: limit,
    p_worker_run_id: runId,
  });

  if (claimError) {
    await client.rpc("finish_order_event_worker_run", {
      p_run_id: runId,
      p_status: "failed",
      p_claimed_count: 0,
      p_completed_count: 0,
      p_failed_count: 1,
      p_dead_letter_count: 0,
      p_metadata: { errorCode: "DOKE_ORDER_EVENT_CLAIM_FAILED" },
    });
    return jsonResponse(500, { error: "DOKE_ORDER_EVENT_CLAIM_FAILED" });
  }

  const events = (Array.isArray(claimedRows) ? claimedRows : []) as ClaimedEvent[];
  let completedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;
  const results: Record<string, unknown>[] = [];

  for (const event of events) {
    try {
      const webhook = await deliverOptionalWebhook(event, {
        url: Deno.env.get("ORDER_EVENT_WEBHOOK_URL") || "",
        secret: Deno.env.get("ORDER_EVENT_WEBHOOK_SECRET") || "",
        invocationId,
      });
      const result = {
        cacheTags: event.cache_tags || [],
        webhook,
        processedAt: new Date().toISOString(),
      };
      await completeEvent(client, event, runId, result);
      completedCount += 1;
      results.push({ eventKey: event.event_key, status: "completed", webhook: webhook.status });
    } catch (error) {
      const errorCode = normalizeWorkerError(error);
      const status = await failEvent(client, event, runId, errorCode, {
        errorCode,
        failedAt: new Date().toISOString(),
      });
      if (status === "dead_letter") deadLetterCount += 1;
      else failedCount += 1;
      results.push({ eventKey: event.event_key, status, errorCode });
    }
  }

  const runStatus = deadLetterCount > 0 || failedCount > 0
    ? (completedCount > 0 ? "partial" : "failed")
    : "completed";
  await client.rpc("finish_order_event_worker_run", {
    p_run_id: runId,
    p_status: runStatus,
    p_claimed_count: events.length,
    p_completed_count: completedCount,
    p_failed_count: failedCount,
    p_dead_letter_count: deadLetterCount,
    p_metadata: { durationMs: Date.now() - startedAt },
  });

  console.info(JSON.stringify({
    function: FUNCTION_NAME,
    invocationId,
    runId,
    claimed: events.length,
    completed: completedCount,
    failed: failedCount,
    deadLetter: deadLetterCount,
  }));

  return jsonResponse(200, {
    ok: runStatus !== "failed",
    runId,
    claimed: events.length,
    completed: completedCount,
    failed: failedCount,
    deadLetter: deadLetterCount,
    results,
  }, {
    "x-doke-claimed-events": String(events.length),
    "x-doke-completed-events": String(completedCount),
    "x-doke-failed-events": String(failedCount + deadLetterCount),
  });
});

console.info(`${FUNCTION_NAME} loaded`);
