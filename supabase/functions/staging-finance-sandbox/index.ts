import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  STAGING_PROJECT_REF,
  normalizeAction,
  normalizePayload,
  normalizeSandboxError,
  projectRefFromUrl,
  statusForSandboxError,
} from "./operations.mjs";

const FUNCTION_NAME = "staging-finance-sandbox";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (status: number, payload: unknown) => new Response(JSON.stringify(payload), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "METHOD_NOT_ALLOWED" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !publicKey || !secretKey) return jsonResponse(503, { error: "SERVER_CONFIGURATION_MISSING" });
  if (projectRefFromUrl(supabaseUrl) !== STAGING_PROJECT_REF) {
    return jsonResponse(403, { error: "DOKE_FINANCE_SANDBOX_DISABLED" });
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
  if (authError || !actor?.id) return jsonResponse(401, { error: "DOKE_FINANCE_SANDBOX_AUTH_REQUIRED" });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = normalizeAction(body.action);
  if (!action) return jsonResponse(400, { error: "DOKE_FINANCE_SANDBOX_ACTION_INVALID" });
  const payload = normalizePayload(body.payload);

  try {
    const { data, error } = await serviceClient.rpc("execute_staging_finance_sandbox_internal", {
      p_actor_id: actor.id,
      p_action: action,
      p_payload: payload,
    });
    if (error) throw error;
    return jsonResponse(200, data ?? {});
  } catch (error) {
    const code = normalizeSandboxError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code, actorId: actor.id }));
    return jsonResponse(statusForSandboxError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
