import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  enforceActorRateLimit,
  jsonResponse,
  preflightResponse,
  readJsonObject,
  rejectDisallowedOrigin,
} from "../_shared/http-security.ts";
import { callOpenAI, normalizeOpenAIError } from "./openai.ts";
import { rulesSuggestions } from "./recommendations.ts";
import {
  ALLOWED_TEMPLATE_SOURCES,
  MAX_BODY_BYTES,
  MAX_QUESTIONS,
  MAX_SUGGESTIONS,
  sanitizeQuestion,
  sanitizeSuggestions,
  text,
} from "./shared.ts";

const FUNCTION_NAME = "quote-template-ai";

type SupabaseClient = ReturnType<typeof createClient>;
type ProfessionalContext = { userId: string; serviceClient: SupabaseClient };

const createContext = async (req: Request): Promise<ProfessionalContext | Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
    || Deno.env.get("SUPABASE_ANON_KEY")
    || "";
  const secretKey = Deno.env.get("SUPABASE_SECRET_KEY")
    || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    || "";

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
  const user = authData?.user;
  if (authError || !user?.id) return jsonResponse(req, 401, { error: "AUTH_REQUIRED" });

  const [{ data: account }, { data: profile }] = await Promise.all([
    serviceClient.from("users").select("role,status").eq("id", user.id).maybeSingle(),
    serviceClient.from("professional_profiles")
      .select("setup_status,verification_status,document_status")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const professionalAllowed = account?.status === "active"
    && account?.role === "professional"
    && profile?.setup_status === "active"
    && profile?.verification_status === "verified"
    && profile?.document_status === "verified";

  if (!professionalAllowed) {
    return jsonResponse(req, 403, { error: "PROFESSIONAL_VERIFICATION_REQUIRED" });
  }
  return { userId: user.id, serviceClient };
};

const resolveOwnedService = async (
  serviceClient: SupabaseClient,
  userId: string,
  serviceExternalId: string,
) => {
  if (!serviceExternalId) return null;
  const { data: service } = await serviceClient.from("services")
    .select("id,professional_id")
    .eq("external_id", serviceExternalId)
    .maybeSingle();
  if (!service) throw new Error("SERVICE_NOT_FOUND");
  if (service.professional_id !== userId) throw new Error("SERVICE_OWNERSHIP_REQUIRED");
  return service.id;
};

const handleApply = async (
  req: Request,
  context: ProfessionalContext,
  body: Record<string, unknown>,
) => {
  const runId = text(body.runId, 80);
  const selectedIds = Array.isArray(body.selectedSuggestionIds)
    ? [...new Set(body.selectedSuggestionIds.map((item) => text(item, 80)).filter(Boolean))].slice(0, MAX_SUGGESTIONS)
    : [];
  const signature = text(body.appliedTemplateSignature, 180);
  if (!runId || !selectedIds.length || !signature) {
    return jsonResponse(req, 400, { error: "APPLICATION_AUDIT_INPUT_REQUIRED" });
  }

  const { data: run, error: readError } = await context.serviceClient
    .from("quote_template_ai_runs")
    .select("id,professional_id,status,suggestions,selected_suggestion_ids,applied_at")
    .eq("id", runId)
    .eq("professional_id", context.userId)
    .maybeSingle();
  if (readError || !run) return jsonResponse(req, 404, { error: "AI_RUN_NOT_FOUND" });
  if (run.status !== "completed") return jsonResponse(req, 409, { error: "AI_RUN_NOT_APPLICABLE" });

  const allowedIds = new Set((Array.isArray(run.suggestions) ? run.suggestions : [])
    .map((item: Record<string, unknown>) => text(item?.id, 80))
    .filter(Boolean));
  if (selectedIds.some((id) => !allowedIds.has(id))) {
    return jsonResponse(req, 400, { error: "UNKNOWN_SUGGESTION_SELECTED" });
  }

  if (run.applied_at) {
    const previous = Array.isArray(run.selected_suggestion_ids) ? run.selected_suggestion_ids : [];
    const sameSelection = JSON.stringify(previous) === JSON.stringify(selectedIds);
    return sameSelection
      ? jsonResponse(req, 200, { applied: true, runId, idempotent: true })
      : jsonResponse(req, 409, { error: "AI_RUN_ALREADY_APPLIED" });
  }

  const { error: updateError } = await context.serviceClient
    .from("quote_template_ai_runs")
    .update({
      selected_suggestion_ids: selectedIds,
      applied_template_signature: signature,
      applied_at: new Date().toISOString(),
    })
    .eq("id", runId)
    .eq("professional_id", context.userId);
  if (updateError) return jsonResponse(req, 500, { error: "APPLICATION_AUDIT_FAILED" });
  return jsonResponse(req, 200, { applied: true, runId, selectedSuggestionIds: selectedIds });
};

const loadMetrics = async (
  serviceClient: SupabaseClient,
  userId: string,
  templateIdentity: string,
  category: string,
) => {
  const [{ data: recommendationRows }, { data: benchmarkRows }] = await Promise.all([
    serviceClient.from("quote_template_smart_recommendations")
      .select("recommendation_code,forms_started,completion_rate,submission_rate,recommended_question_count,top_dropoff_question_id,top_dropoff_question_label,top_dropoff_count,confidence")
      .eq("professional_id", userId)
      .eq("template_identity", templateIdentity)
      .order("priority", { ascending: true })
      .limit(8),
    category
      ? serviceClient.from("quote_template_category_benchmarks")
        .select("forms_started,completion_rate,submission_rate,recommended_question_count")
        .eq("professional_id", userId)
        .eq("template_category", category)
        .limit(1)
      : Promise.resolve({ data: [] }),
  ]);

  const recommendation = recommendationRows?.[0] || {};
  const benchmark = benchmarkRows?.[0] || {};
  return {
    recommendationCodes: (recommendationRows || []).map((item) => item.recommendation_code),
    formsStarted: Number(recommendation.forms_started || benchmark.forms_started || 0),
    completionRate: Number(recommendation.completion_rate || 0),
    submissionRate: Number(recommendation.submission_rate || 0),
    recommendedQuestionCount: Number(recommendation.recommended_question_count || benchmark.recommended_question_count || 6),
    topDropoffQuestionId: text(recommendation.top_dropoff_question_id, 80),
    topDropoffQuestionLabel: text(recommendation.top_dropoff_question_label, 140),
    topDropoffCount: Number(recommendation.top_dropoff_count || 0),
    confidence: text(recommendation.confidence, 20) || "low",
    benchmarkCompletionRate: Number(benchmark.completion_rate || 0),
    benchmarkSubmissionRate: Number(benchmark.submission_rate || 0),
  };
};

const enforceRateLimit = async (req: Request, serviceClient: SupabaseClient, userId: string) => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [{ count: recentCount }, { count: dailyCount }] = await Promise.all([
    serviceClient.from("quote_template_ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", userId)
      .gte("created_at", fiveMinutesAgo),
    serviceClient.from("quote_template_ai_runs")
      .select("id", { count: "exact", head: true })
      .eq("professional_id", userId)
      .gte("created_at", dayAgo),
  ]);
  if ((recentCount || 0) >= 3) return jsonResponse(req, 429, { error: "RATE_LIMIT_SHORT", retryAfterSeconds: 300 });
  if ((dailyCount || 0) >= 20) return jsonResponse(req, 429, { error: "RATE_LIMIT_DAILY", retryAfterSeconds: 86400 });
  return null;
};

const handleGenerate = async (
  req: Request,
  context: ProfessionalContext,
  body: Record<string, unknown>,
) => {
  const rawQuestions = Array.isArray(body.questions) ? body.questions : [];
  const questions = rawQuestions.slice(0, MAX_QUESTIONS).map((item, index) => sanitizeQuestion(
    item && typeof item === "object" ? item as Record<string, unknown> : {},
    index,
  )).filter((item) => item.label);
  if (!questions.length) return jsonResponse(req, 400, { error: "QUESTIONS_REQUIRED" });

  const category = text(body.category, 100);
  const serviceExternalId = text(body.serviceExternalId, 180);
  const templateIdentity = text(body.templateIdentity, 240) || "custom";
  const requestedSource = text(body.templateSource, 50).toLowerCase();
  const templateSource = ALLOWED_TEMPLATE_SOURCES.has(requestedSource) ? requestedSource : "custom";

  let serviceId: string | null = null;
  try {
    serviceId = await resolveOwnedService(context.serviceClient, context.userId, serviceExternalId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "SERVICE_LOOKUP_FAILED";
    if (code === "SERVICE_OWNERSHIP_REQUIRED") return jsonResponse(req, 403, { error: code });
    if (code === "SERVICE_NOT_FOUND") return jsonResponse(req, 404, { error: code });
    return jsonResponse(req, 500, { error: "SERVICE_LOOKUP_FAILED" });
  }

  const rateLimitResponse = await enforceRateLimit(req, context.serviceClient, context.userId);
  if (rateLimitResponse) return rateLimitResponse;

  const metrics = await loadMetrics(context.serviceClient, context.userId, templateIdentity, category);
  const inputSnapshot = { category, templateIdentity, templateSource, questions };
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify({ inputSnapshot, metrics })),
  );
  const inputHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  let engine = "rules";
  let model = "doke-rules-v2";
  let providerRequestId = "";
  let fallbackReason = "";
  let summary = "Analise as propostas e aplique somente as que fizerem sentido para o seu serviço.";
  let suggestions = rulesSuggestions(questions, metrics);
  const openAIKey = Deno.env.get("OPENAI_API_KEY") || "";
  const openAIModel = Deno.env.get("OPENAI_QUOTE_OPTIMIZER_MODEL") || "gpt-5-mini";

  if (openAIKey) {
    try {
      const generated = await callOpenAI(openAIKey, openAIModel, {
        objective: "Otimizar o formulário sem aumentar risco nem solicitar dados desnecessários.",
        category,
        questions,
        metrics,
        deterministicSignals: suggestions,
      });
      const generatedData = generated.data && typeof generated.data === "object"
        ? generated.data as Record<string, unknown>
        : {};
      const generatedSuggestions = sanitizeSuggestions(generatedData.suggestions, questions);
      if (generatedSuggestions.length) {
        engine = "openai";
        model = openAIModel;
        providerRequestId = generated.requestId;
        summary = text(generatedData.summary, 360) || summary;
        suggestions = generatedSuggestions;
      } else {
        fallbackReason = "OPENAI_NO_VALID_SUGGESTIONS";
      }
    } catch (error) {
      fallbackReason = normalizeOpenAIError(error);
    }
  } else {
    fallbackReason = "OPENAI_KEY_NOT_CONFIGURED";
  }

  const sanitizedSuggestions = sanitizeSuggestions(suggestions, questions);
  if (!sanitizedSuggestions.length) {
    summary = "O formulário já está objetivo. Não encontramos uma mudança segura e relevante para sugerir agora.";
  }

  const { data: run, error: insertError } = await context.serviceClient
    .from("quote_template_ai_runs")
    .insert({
      professional_id: context.userId,
      service_id: serviceId,
      service_external_id: serviceExternalId || null,
      template_identity: templateIdentity,
      template_source: templateSource,
      template_category: category || null,
      engine,
      model,
      status: "completed",
      input_hash: inputHash,
      input_snapshot: inputSnapshot,
      metrics_snapshot: metrics,
      suggestions: sanitizedSuggestions,
      provider_request_id: providerRequestId || null,
      error_code: fallbackReason || null,
    })
    .select("id,created_at")
    .single();
  if (insertError || !run) return jsonResponse(req, 500, { error: "AI_RUN_PERSISTENCE_FAILED" });

  return jsonResponse(req, 200, {
    runId: run.id,
    createdAt: run.created_at,
    engine,
    model,
    summary,
    suggestions: sanitizedSuggestions,
    fallbackReason: fallbackReason || null,
    supervisionRequired: true,
  });
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const originRejection = rejectDisallowedOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "METHOD_NOT_ALLOWED" });

  const bodyResult = await readJsonObject(req, MAX_BODY_BYTES);
  if (bodyResult.ok === false) return bodyResult.response;

  const context = await createContext(req);
  if (context instanceof Response) return context;
  const body = bodyResult.value;

  const action = text(body.action, 20).toLowerCase() || "generate";
  if (!["apply", "generate"].includes(action)) {
    return jsonResponse(req, 400, { error: "UNKNOWN_ACTION" });
  }

  const genericRateLimitResponse = await enforceActorRateLimit({
    req,
    client: context.serviceClient,
    functionName: FUNCTION_NAME,
    actorId: context.userId,
    action,
    limit: action === "generate" ? 20 : 60,
    windowSeconds: 60,
  });
  if (genericRateLimitResponse) return genericRateLimitResponse;

  if (action === "apply") return handleApply(req, context, body);
  return handleGenerate(req, context, body);
});

console.info(`${FUNCTION_NAME} loaded`);
