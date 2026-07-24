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
  normalizeFinancialError,
  normalizeText,
  statusForFinancialError,
} from "./operations.mjs";

const FUNCTION_NAME = "financial-operations";
const MAX_BODY_BYTES = 32_000;

type SupabaseClient = ReturnType<typeof createClient>;
type FinancialContext = { actorId: string; role: string; serviceClient: SupabaseClient };

const createContext = async (req: Request): Promise<FinancialContext | Response> => {
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
  if (authError || !actor?.id) return jsonResponse(req, 401, { error: "DOKE_FINANCIAL_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !["support", "admin"].includes(role)) {
    return jsonResponse(req, 403, { error: "DOKE_FINANCIAL_OPERATOR_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const rpc = async (context: FinancialContext, name: string, params: Record<string, unknown>) => {
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
  if (!action) return jsonResponse(req, 400, { error: "DOKE_FINANCIAL_ACTION_INVALID" });

  const rateLimitResponse = await enforceActorRateLimit({
    req,
    client: context.serviceClient,
    functionName: FUNCTION_NAME,
    actorId: context.actorId,
    action,
    limit: 20,
    windowSeconds: 60,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (action === "resolve_withdrawal") {
      const result = await rpc(context, "resolve_wallet_withdrawal_internal", {
        p_actor_id: context.actorId,
        p_transaction_external_id: normalizeText(body.transactionId, 180),
        p_action: normalizeText(body.resolution || body.status, 30),
        p_reason: normalizeText(body.reason, 500) || null,
      });
      return jsonResponse(req, 200, result || {});
    }

    const result = await rpc(context, "resolve_wallet_dispute_internal", {
      p_actor_id: context.actorId,
      p_dispute_external_id: normalizeText(body.disputeId, 180),
      p_resolution: normalizeText(body.resolution, 30),
      p_reason: normalizeText(body.reason, 500) || null,
    });
    return jsonResponse(req, 200, result || {});
  } catch (error) {
    const code = normalizeFinancialError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code, actorId: context.actorId }));
    return jsonResponse(req, statusForFinancialError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
