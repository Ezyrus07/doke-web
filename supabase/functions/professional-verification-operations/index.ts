import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  normalizeAction,
  normalizeKycError,
  normalizeLimit,
  normalizeText,
  statusForKycError,
} from "./operations.mjs";

const FUNCTION_NAME = "professional-verification-operations";
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
type KycContext = {
  actorId: string;
  role: string;
  serviceClient: SupabaseClient;
};

const createContext = async (req: Request): Promise<KycContext | Response> => {
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
  if (authError || !actor?.id) return jsonResponse(401, { error: "DOKE_KYC_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !role) {
    return jsonResponse(403, { error: "DOKE_KYC_APPLICANT_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const assertApplicant = (context: KycContext): Response | null =>
  context.role === "client" ? null : jsonResponse(403, { error: "DOKE_KYC_APPLICANT_REQUIRED" });
const assertReviewer = (context: KycContext): Response | null =>
  ["admin", "moderator"].includes(context.role) ? null : jsonResponse(403, { error: "DOKE_KYC_REVIEWER_REQUIRED" });

const rpc = async (context: KycContext, name: string, params: Record<string, unknown>) => {
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
    if (action === "prepare_uploads") {
      const denied = assertApplicant(context); if (denied) return denied;
      const intent = await rpc(context, "create_professional_kyc_upload_intent_internal", {
        p_actor_id: context.actorId,
        p_verification_type: normalizeText(body.verificationType, 20),
        p_files: Array.isArray(body.files) ? body.files : [],
      }) as Record<string, unknown>;
      const uploads = Array.isArray(intent?.uploads) ? intent.uploads as Array<Record<string, unknown>> : [];
      const prepared = await Promise.all(uploads.map(async (upload) => {
        const bucket = normalizeText(upload.bucket, 100);
        const path = normalizeText(upload.path, 1024);
        const { data, error } = await context.serviceClient.storage.from(bucket).createSignedUploadUrl(path);
        if (error || !data?.token) throw error || new Error("DOKE_KYC_SIGNED_UPLOAD_UNAVAILABLE");
        return { ...upload, token: data.token };
      }));
      return jsonResponse(200, { ...intent, uploads: prepared });
    }

    if (action === "submit") {
      const denied = assertApplicant(context); if (denied) return denied;
      const result = await rpc(context, "submit_professional_identity_verification_internal", {
        p_actor_id: context.actorId,
        p_upload_intent_id: normalizeText(body.uploadIntentId, 80) || null,
        p_payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      });
      return jsonResponse(200, result || {});
    }

    const denied = assertReviewer(context); if (denied) return denied;
    if (action === "list") {
      const result = await rpc(context, "list_professional_identity_verifications_internal", {
        p_actor_id: context.actorId,
        p_status: normalizeText(body.status, 40) || null,
        p_limit: normalizeLimit(body.limit),
      });
      return jsonResponse(200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "detail") {
      const result = await rpc(context, "get_professional_identity_verification_internal", {
        p_actor_id: context.actorId,
        p_verification_id: normalizeText(body.verificationId, 120),
      });
      return jsonResponse(200, { item: result || null });
    }
    if (action === "start") {
      const result = await rpc(context, "start_professional_identity_review_internal", {
        p_actor_id: context.actorId,
        p_verification_id: normalizeText(body.verificationId, 120),
      });
      return jsonResponse(200, result || {});
    }
    const result = await rpc(context, "decide_professional_identity_verification_internal", {
      p_actor_id: context.actorId,
      p_verification_id: normalizeText(body.verificationId, 120),
      p_decision: normalizeText(body.decision, 20),
      p_rejection_reason: normalizeText(body.rejectionReason, 500) || null,
    });
    return jsonResponse(200, result || {});
  } catch (error) {
    const code = normalizeKycError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code }));
    return jsonResponse(statusForKycError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
