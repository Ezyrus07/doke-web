import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeAction,
  normalizeFinancialError,
  normalizeText,
  statusForFinancialError,
} from "./operations.mjs";

const FUNCTION_NAME = "financial-operations";
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
type FinancialContext = { actorId: string; role: string; serviceClient: SupabaseClient };

const createContext = async (req: Request): Promise<FinancialContext | Response> => {
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
  if (authError || !actor?.id) return jsonResponse(401, { error: "DOKE_FINANCIAL_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !["support", "admin"].includes(role)) {
    return jsonResponse(403, { error: "DOKE_FINANCIAL_OPERATOR_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const rpc = async (context: FinancialContext, name: string, params: Record<string, unknown>) => {
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
  if (!action) return jsonResponse(400, { error: "DOKE_FINANCIAL_ACTION_INVALID" });

  try {
    if (action === "resolve_withdrawal") {
      const result = await rpc(context, "resolve_wallet_withdrawal_internal", {
        p_actor_id: context.actorId,
        p_transaction_external_id: normalizeText(body.transactionId, 180),
        p_action: normalizeText(body.resolution || body.status, 30),
        p_reason: normalizeText(body.reason, 500) || null,
      });
      return jsonResponse(200, result || {});
    }

    const result = await rpc(context, "resolve_wallet_dispute_internal", {
      p_actor_id: context.actorId,
      p_dispute_external_id: normalizeText(body.disputeId, 180),
      p_resolution: normalizeText(body.resolution, 30),
      p_reason: normalizeText(body.reason, 500) || null,
    });
    return jsonResponse(200, result || {});
  } catch (error) {
    const code = normalizeFinancialError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code, actorId: context.actorId }));
    return jsonResponse(statusForFinancialError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
