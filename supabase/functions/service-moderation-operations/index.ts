import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import {
  enforceActorRateLimit,
  jsonResponse,
  preflightResponse,
  readJsonObject,
  rejectDisallowedOrigin,
} from "../_shared/http-security.ts";
import {
  normalizeAction,
  normalizeLimit,
  normalizeModerationError,
  normalizeText,
  statusForModerationError,
} from "./operations.mjs";

const FUNCTION_NAME = "service-moderation-operations";
const MAX_BODY_BYTES = 32_000;

type SupabaseClient = ReturnType<typeof createClient>;
type Context = { actorId: string; role: string; serviceClient: SupabaseClient };

const createContext = async (req: Request): Promise<Context | Response> => {
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
    return jsonResponse(req, 401, { error: "DOKE_SERVICE_MODERATION_AUTH_REQUIRED" });
  }

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !["admin", "moderator"].includes(role)) {
    return jsonResponse(req, 403, { error: "DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const rpc = async (context: Context, name: string, params: Record<string, unknown>) => {
  const { data, error } = await context.serviceClient.rpc(name, params);
  if (error) throw error;
  return data;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const originRejection = rejectDisallowedOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "METHOD_NOT_ALLOWED" });

  const bodyResult = await readJsonObject(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;

  const context = await createContext(req);
  if (context instanceof Response) return context;
  const body = bodyResult.value;
  const action = normalizeAction(body.action);

  const rateLimitResponse = await enforceActorRateLimit({
    req,
    client: context.serviceClient,
    functionName: FUNCTION_NAME,
    actorId: context.actorId,
    action: action || "reject",
    limit: 60,
    windowSeconds: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (action === "list") {
      const result = await rpc(context, "list_service_review_queue_internal", { p_actor_id: context.actorId });
      return jsonResponse(req, 200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "detail") {
      const result = await rpc(context, "get_service_review_detail_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
      });
      return jsonResponse(req, 200, { item: result || null });
    }
    if (action === "audit") {
      const result = await rpc(context, "list_service_moderation_audit_internal", {
        p_actor_id: context.actorId,
        p_limit: normalizeLimit(body.limit),
      });
      return jsonResponse(req, 200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "approve") {
      const result = await rpc(context, "approve_service_version_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
      });
      return jsonResponse(req, 200, result || {});
    }
    if (action === "request_changes") {
      const result = await rpc(context, "request_service_version_changes_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
        p_reason: normalizeText(body.reason, 500),
      });
      return jsonResponse(req, 200, result || {});
    }
    const result = await rpc(context, "reject_service_version_internal", {
      p_actor_id: context.actorId,
      p_version_id: normalizeText(body.versionId, 80),
      p_reason: normalizeText(body.reason, 500),
    });
    return jsonResponse(req, 200, result || {});
  } catch (error) {
    const code = normalizeModerationError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code }));
    return jsonResponse(req, statusForModerationError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
