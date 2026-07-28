import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  enforceActorRateLimit,
  jsonResponse,
  preflightResponse,
  readJsonObject,
  rejectDisallowedOrigin,
} from "../_shared/http-security.ts";
import {
  normalizeAction,
  normalizeOperationError,
  normalizePayload,
  statusForOperationError,
} from "./operations.mjs";

const FUNCTION_NAME = "self-service-operations";
const MAX_BODY_BYTES = 64_000;

const normalizeText = (value: unknown, maxLength = 2048) =>
  String(value ?? "").trim().slice(0, maxLength);

const rpc = async (
  client: ReturnType<typeof createClient>,
  name: string,
  params: Record<string, unknown>,
) => {
  const { data, error } = await client.rpc(name, params);
  if (error) throw error;
  return data;
};

const ratePolicyForAction = (action: string) => {
  if (action === "prepare_service_media_uploads") return { limit: 10, windowSeconds: 600 };
  if (action === "submit_service_for_review") return { limit: 10, windowSeconds: 600 };
  return { limit: 30, windowSeconds: 60 };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const originRejection = rejectDisallowedOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "METHOD_NOT_ALLOWED" });

  const bodyResult = await readJsonObject(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !publicKey || !secretKey) {
    return jsonResponse(req, 503, { error: "SERVER_CONFIGURATION_MISSING" });
  }

  const authorization = req.headers.get("Authorization") || "";
  const authClient = createClient(supabaseUrl, publicKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  const actor = authData?.user;
  if (authError || !actor?.id) {
    return jsonResponse(req, 401, { error: "DOKE_SELF_SERVICE_AUTH_REQUIRED" });
  }

  const body = bodyResult.value;
  const action = normalizeAction(body.action);
  if (!action) return jsonResponse(req, 400, { error: "DOKE_SELF_SERVICE_OPERATION_INVALID" });

  const policy = ratePolicyForAction(action);
  const rateLimitResponse = await enforceActorRateLimit({
    req,
    client: serviceClient,
    functionName: FUNCTION_NAME,
    actorId: actor.id,
    action,
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
  });
  if (rateLimitResponse) return rateLimitResponse;

  const params = normalizePayload(body.params);

  try {
    if (action === "prepare_service_media_uploads") {
      const intent = await rpc(serviceClient, "create_service_media_upload_intent_internal", {
        p_actor_id: actor.id,
        p_external_id: normalizeText(params.p_external_id, 140),
        p_files: Array.isArray(params.p_files) ? params.p_files : [],
      }) as Record<string, unknown>;
      const items = Array.isArray(intent?.items)
        ? intent.items as Array<Record<string, unknown>>
        : [];
      const uploads = await Promise.all(items
        .filter((item) => normalizeText(item.kind, 20) === "upload")
        .map(async (item) => {
          const bucket = normalizeText(item.bucket, 100);
          const path = normalizeText(item.path, 1024);
          const { data, error } = await serviceClient.storage
            .from(bucket)
            .createSignedUploadUrl(path);
          if (error || !data?.token) {
            throw error || new Error("DOKE_SERVICE_MEDIA_SIGNED_UPLOAD_UNAVAILABLE");
          }
          return { ...item, token: data.token };
        }));
      return jsonResponse(req, 200, { ...intent, uploads });
    }

    if (action === "submit_service_for_review") {
      const intentId = normalizeText(params.p_upload_intent_id, 80);
      if (!intentId) throw new Error("DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED");

      const intent = await rpc(serviceClient, "get_service_media_upload_intent_internal", {
        p_actor_id: actor.id,
        p_upload_intent_id: intentId,
      }) as Record<string, unknown>;
      const items = Array.isArray(intent?.items)
        ? intent.items as Array<Record<string, unknown>>
        : [];
      const publicUrls = items.map((item) => {
        if (normalizeText(item.kind, 20) === "retain") {
          const retainedUrl = normalizeText(item.url);
          if (!retainedUrl) throw new Error("DOKE_SERVICE_MEDIA_RETAIN_URL_INVALID");
          return retainedUrl;
        }
        const bucket = normalizeText(item.bucket, 100);
        const path = normalizeText(item.path, 1024);
        const publicResult = serviceClient.storage.from(bucket).getPublicUrl(path);
        const publicUrl = normalizeText(publicResult?.data?.publicUrl);
        if (!publicUrl) throw new Error("DOKE_SERVICE_MEDIA_PUBLIC_URL_UNAVAILABLE");
        return publicUrl;
      });

      const result = await rpc(serviceClient, "submit_service_for_review_with_media_internal", {
        p_actor_id: actor.id,
        p_external_id: normalizeText(params.p_external_id, 140),
        p_snapshot: params.p_snapshot,
        p_change_class: normalizeText(params.p_change_class, 20) || "major",
        p_upload_intent_id: intentId,
        p_public_urls: publicUrls,
      });
      return jsonResponse(req, 200, result ?? {});
    }

    const result = await rpc(serviceClient, "execute_self_service_operation_internal", {
      p_actor_id: actor.id,
      p_operation: action,
      p_payload: params,
    });
    return jsonResponse(req, 200, result ?? {});
  } catch (error) {
    const code = normalizeOperationError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code, actorId: actor.id }));
    return jsonResponse(req, statusForOperationError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
