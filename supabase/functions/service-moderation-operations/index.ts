import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import {
  normalizeAction,
  normalizeLimit,
  normalizeModerationError,
  normalizeText,
  statusForModerationError,
} from "./operations.mjs";

const FUNCTION_NAME = "service-moderation-operations";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: unknown) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

type SupabaseClient = ReturnType<typeof createClient>;
type Context = { actorId: string; role: string; serviceClient: SupabaseClient };

const createContext = async (req: Request): Promise<Context | Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !publicKey || !secretKey) return jsonResponse(503, { error: "SERVER_CONFIGURATION_MISSING" });

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
  if (authError || !actor?.id) return jsonResponse(401, { error: "DOKE_SERVICE_MODERATION_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !["admin", "moderator"].includes(role)) {
    return jsonResponse(403, { error: "DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const rpc = async (context: Context, name: string, params: Record<string, unknown>) => {
  const { data, error } = await context.serviceClient.rpc(name, params);
  if (error) throw error;
  return data;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });

  const context = await createContext(req);
  if (context instanceof Response) return context;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = normalizeAction(body.action);

  try {
    if (action === "list") {
      const result = await rpc(context, "list_service_review_queue_internal", { p_actor_id: context.actorId });
      return jsonResponse(200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "detail") {
      const result = await rpc(context, "get_service_review_detail_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
      });
      return jsonResponse(200, { item: result || null });
    }
    if (action === "audit") {
      const result = await rpc(context, "list_service_moderation_audit_internal", {
        p_actor_id: context.actorId,
        p_limit: normalizeLimit(body.limit),
      });
      return jsonResponse(200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "approve") {
      const result = await rpc(context, "approve_service_version_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
      });
      return jsonResponse(200, result || {});
    }
    if (action === "request_changes") {
      const result = await rpc(context, "request_service_version_changes_internal", {
        p_actor_id: context.actorId,
        p_version_id: normalizeText(body.versionId, 80),
        p_reason: normalizeText(body.reason, 500),
      });
      return jsonResponse(200, result || {});
    }
    const result = await rpc(context, "reject_service_version_internal", {
      p_actor_id: context.actorId,
      p_version_id: normalizeText(body.versionId, 80),
      p_reason: normalizeText(body.reason, 500),
    });
    return jsonResponse(200, result || {});
  } catch (error) {
    const code = normalizeModerationError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code }));
    return jsonResponse(statusForModerationError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
