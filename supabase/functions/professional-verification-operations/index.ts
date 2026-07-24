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
  normalizeKycError,
  normalizeLimit,
  normalizeText,
  statusForKycError,
} from "./operations.mjs";

const FUNCTION_NAME = "professional-verification-operations";
const MAX_BODY_BYTES = 96_000;

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
  if (authError || !actor?.id) return jsonResponse(req, 401, { error: "DOKE_KYC_AUTH_REQUIRED" });

  const { data: account, error: accountError } = await serviceClient
    .from("users")
    .select("role,status")
    .eq("id", actor.id)
    .maybeSingle();
  const role = normalizeText(account?.role, 20).toLowerCase();
  if (accountError || account?.status !== "active" || !role) {
    return jsonResponse(req, 403, { error: "DOKE_KYC_APPLICANT_REQUIRED" });
  }
  return { actorId: actor.id, role, serviceClient };
};

const assertApplicant = (req: Request, context: KycContext): Response | null =>
  context.role === "client" ? null : jsonResponse(req, 403, { error: "DOKE_KYC_APPLICANT_REQUIRED" });
const assertReviewer = (req: Request, context: KycContext): Response | null =>
  ["admin", "moderator"].includes(context.role)
    ? null
    : jsonResponse(req, 403, { error: "DOKE_KYC_REVIEWER_REQUIRED" });

const rpc = async (context: KycContext, name: string, params: Record<string, unknown>) => {
  const { data, error } = await context.serviceClient.rpc(name, params);
  if (error) throw error;
  return data;
};

const ratePolicyForAction = (action: string) => {
  if (action === "submit") return { limit: 5, windowSeconds: 600 };
  if (action === "prepare_uploads") return { limit: 10, windowSeconds: 600 };
  return { limit: 60, windowSeconds: 60 };
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
  const policy = ratePolicyForAction(action);

  const rateLimitResponse = await enforceActorRateLimit({
    req,
    client: context.serviceClient,
    functionName: FUNCTION_NAME,
    actorId: context.actorId,
    action: action || "decision",
    limit: policy.limit,
    windowSeconds: policy.windowSeconds,
  });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    if (action === "prepare_uploads") {
      const denied = assertApplicant(req, context);
      if (denied) return denied;
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
      return jsonResponse(req, 200, { ...intent, uploads: prepared });
    }

    if (action === "submit") {
      const denied = assertApplicant(req, context);
      if (denied) return denied;
      const result = await rpc(context, "submit_professional_identity_verification_internal", {
        p_actor_id: context.actorId,
        p_upload_intent_id: normalizeText(body.uploadIntentId, 80) || null,
        p_payload: body.payload && typeof body.payload === "object" ? body.payload : {},
      });
      return jsonResponse(req, 200, result || {});
    }

    const denied = assertReviewer(req, context);
    if (denied) return denied;
    if (action === "list") {
      const result = await rpc(context, "list_professional_identity_verifications_internal", {
        p_actor_id: context.actorId,
        p_status: normalizeText(body.status, 40) || null,
        p_limit: normalizeLimit(body.limit),
      });
      return jsonResponse(req, 200, { items: Array.isArray(result) ? result : [] });
    }
    if (action === "detail") {
      const result = await rpc(context, "get_professional_identity_verification_internal", {
        p_actor_id: context.actorId,
        p_verification_id: normalizeText(body.verificationId, 120),
      });
      return jsonResponse(req, 200, { item: result || null });
    }
    if (action === "start") {
      const result = await rpc(context, "start_professional_identity_review_internal", {
        p_actor_id: context.actorId,
        p_verification_id: normalizeText(body.verificationId, 120),
      });
      return jsonResponse(req, 200, result || {});
    }
    const result = await rpc(context, "decide_professional_identity_verification_internal", {
      p_actor_id: context.actorId,
      p_verification_id: normalizeText(body.verificationId, 120),
      p_decision: normalizeText(body.decision, 20),
      p_rejection_reason: normalizeText(body.rejectionReason, 500) || null,
    });
    return jsonResponse(req, 200, result || {});
  } catch (error) {
    const code = normalizeKycError(error);
    console.error(JSON.stringify({ function: FUNCTION_NAME, action, code }));
    return jsonResponse(req, statusForKycError(code), { error: code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
