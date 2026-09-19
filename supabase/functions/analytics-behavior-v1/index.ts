import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import {
  enforceActorRateLimit,
  jsonResponse,
  preflightResponse,
  readJsonObject,
  rejectDisallowedOrigin,
} from "../_shared/http-security.ts";
import { sha256Hex, signAnalyticsEnvelope, verifyAnalyticsEnvelope } from "../_shared/analytics-proof.ts";

const FUNCTION_NAME = "analytics-behavior-v1";
const MAX_BODY_BYTES = 12_288;
const readPlatformKey = (pluralName: string, singularName: string, legacyName: string) => {
  const raw = Deno.env.get(pluralName) || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const name of ["default", "doke"]) {
        const value = typeof parsed[name] === "string" ? String(parsed[name]) : "";
        if (value) return value;
      }
      for (const value of Object.values(parsed)) {
        if (typeof value === "string" && value) return value;
      }
    } catch {
      // Fall through to compatibility variables.
    }
  }
  return Deno.env.get(singularName) || Deno.env.get(legacyName) || "";
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_EVENTS = new Set([
  "search.result_impression","search.result_clicked","service.detail_viewed",
  "service.budget_cta_clicked","service.message_cta_clicked","quote.started",
  "quote.progressed","quote.completed","quote.submitted",
]);

const envInt = (name: string, min: number, max: number) => {
  const value = Number(Deno.env.get(name) || "");
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
};

const bytesToUuid = (input: Uint8Array) => {
  const bytes = input.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

const pseudonymousRateLimitActor = async (req: Request, secret: string) => {
  const networkHint = (req.headers.get("cf-connecting-ip")
    || req.headers.get("x-forwarded-for")
    || req.headers.get("x-real-ip")
    || "unknown-network").split(",", 1)[0].trim().slice(0, 160);
  const material = [
    FUNCTION_NAME,
    networkHint,
    (req.headers.get("user-agent") || "unknown-agent").slice(0, 240),
    (req.headers.get("origin") || "no-origin").slice(0, 240),
  ].join("\n");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  return bytesToUuid(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(material))));
};

type Context = {
  actorId: string | null;
  actorClass: "anon" | "authenticated";
  rateLimitActorId: string;
  requestClient: ReturnType<typeof createClient>;
  serviceClient: ReturnType<typeof createClient>;
};

const createContext = async (req: Request): Promise<Context | Response> => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const publicKey = readPlatformKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
  const secretKey = readPlatformKey("SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("authorization") || "";
  if (!url || !publicKey || !secretKey) return jsonResponse(req, 503, { error:"SERVER_CONFIGURATION_MISSING" });
  if (!authorization) return jsonResponse(req, 401, { error:"DOKE_ANALYTICS_AUTHORIZATION_REQUIRED" });

  const requestClient = createClient(url, publicKey, {
    global:{ headers:{ Authorization:authorization } },
    auth:{ persistSession:false, autoRefreshToken:false },
  });
  const serviceClient = createClient(url, secretKey, { auth:{ persistSession:false, autoRefreshToken:false } });
  const { data, error } = await requestClient.auth.getUser();
  const actorId = !error && data?.user?.id && UUID_PATTERN.test(data.user.id) ? data.user.id : null;
  const rateSecret = Deno.env.get("DOKE_EDGE_RATE_LIMIT_SECRET") || secretKey;
  const rateLimitActorId = actorId || await pseudonymousRateLimitActor(req, rateSecret);
  return { actorId, actorClass:actorId ? "authenticated" : "anon", rateLimitActorId, requestClient, serviceClient };
};

const requireRuntimePolicy = (req: Request) => {
  const sessionSecret = Deno.env.get("DOKE_ANALYTICS_SESSION_SECRET") || "";
  const exposureSecret = Deno.env.get("DOKE_ANALYTICS_EXPOSURE_SECRET") || "";
  const sessionTtl = envInt("DOKE_ANALYTICS_SESSION_TTL_SECONDS", 300, 86400);
  const quoteTtl = envInt("DOKE_ANALYTICS_QUOTE_SESSION_TTL_SECONDS", 300, 86400);
  const rateLimit = envInt("DOKE_ANALYTICS_RATE_LIMIT", 10, 5000);
  const rateWindow = envInt("DOKE_ANALYTICS_RATE_WINDOW_SECONDS", 10, 3600);
  const dedupWindow = envInt("DOKE_ANALYTICS_DEDUP_WINDOW_SECONDS", 30, 86400);
  if (sessionSecret.length < 16 || exposureSecret.length < 16 || !sessionTtl || !quoteTtl || !rateLimit || !rateWindow || !dedupWindow) {
    return jsonResponse(req, 503, { error:"DOKE_ANALYTICS_POLICY_CONFIGURATION_MISSING" });
  }
  return { sessionSecret, exposureSecret, sessionTtl, quoteTtl, rateLimit, rateWindow, dedupWindow };
};

const verifyBoundSession = async (token: string, secret: string, context: Context) => {
  const payload = await verifyAnalyticsEnvelope(token, "ana_session_v1", secret);
  const expiresAt = Date.parse(String(payload.expiresAt || ""));
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("DOKE_ANALYTICS_SESSION_EXPIRED");
  if (String(payload.actorClass || "") !== context.actorClass) throw new Error("DOKE_ANALYTICS_SESSION_CLASS_MISMATCH");
  if (context.actorClass === "authenticated" && String(payload.actorId || "") !== context.actorId) throw new Error("DOKE_ANALYTICS_SESSION_ACTOR_MISMATCH");
  if (context.actorClass === "anon" && payload.actorId) throw new Error("DOKE_ANALYTICS_SESSION_ACTOR_MISMATCH");
  if (!UUID_PATTERN.test(String(payload.analyticsSessionId || ""))) throw new Error("DOKE_ANALYTICS_SESSION_INVALID");
  return payload;
};

const resolveService = async (context: Context, serviceId: string) => {
  if (!UUID_PATTERN.test(serviceId)) throw new Error("DOKE_ANALYTICS_SERVICE_INVALID");
  const { data, error } = await context.serviceClient.from("services")
    .select("id,professional_id,status,approved_version_id").eq("id", serviceId).maybeSingle();
  if (error || !data || data.status !== "published" || !data.approved_version_id) throw new Error("DOKE_ANALYTICS_SERVICE_UNAVAILABLE");
  if (context.actorId && data.professional_id === context.actorId) throw new Error("DOKE_ANALYTICS_OWNER_TRAFFIC_EXCLUDED");
  return data;
};

const recordEvent = async (context: Context, event: Record<string, unknown>) => {
  const { data, error } = await context.serviceClient.rpc("record_analytics_behavior_event_v1", { p_event:event });
  if (error) {
    const code = String(error.message || "").includes("DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT")
      ? "DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT" : "DOKE_ANALYTICS_WRITE_FAILED";
    throw new Error(code);
  }
  return data;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return preflightResponse(req);
  const originRejection = rejectDisallowedOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return jsonResponse(req, 405, { error:"METHOD_NOT_ALLOWED" });

  const bodyResult = await readJsonObject(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;
  const body = bodyResult.value;
  const action = String(body.action || "").trim();
  const context = await createContext(req);
  if (context instanceof Response) return context;
  const policy = requireRuntimePolicy(req);
  if (policy instanceof Response) return policy;

  const limited = await enforceActorRateLimit({
    req, client:context.serviceClient, functionName:FUNCTION_NAME,
    actorId:context.rateLimitActorId, action:action || "unknown",
    limit:policy.rateLimit, windowSeconds:policy.rateWindow,
  });
  if (limited) return limited;

  try {
    if (action === "session") {
      const analyticsSessionId = crypto.randomUUID();
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + policy.sessionTtl * 1000).toISOString();
      const sessionToken = await signAnalyticsEnvelope("ana_session_v1", {
        analyticsSessionId, actorClass:context.actorClass, actorId:context.actorId, issuedAt, expiresAt,
      }, policy.sessionSecret);
      return jsonResponse(req, 200, { analyticsSessionId, actorClass:context.actorClass, expiresAt, sessionToken });
    }

    if (action === "quote_session") {
      const session = await verifyBoundSession(String(body.sessionToken || ""), policy.sessionSecret, context);
      const service = await resolveService(context, String(body.serviceId || ""));
      const quoteSessionId = crypto.randomUUID();
      const issuedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + policy.quoteTtl * 1000).toISOString();
      const quoteSessionToken = await signAnalyticsEnvelope("ana_quote_session_v1", {
        quoteSessionId, serviceId:service.id, analyticsSessionId:session.analyticsSessionId,
        actorClass:context.actorClass, actorId:context.actorId, issuedAt, expiresAt,
      }, policy.sessionSecret);
      return jsonResponse(req, 200, { quoteSessionId, serviceId:service.id, expiresAt, quoteSessionToken });
    }

    if (action !== "track") return jsonResponse(req, 400, { error:"DOKE_ANALYTICS_ACTION_INVALID" });

    const eventName = String(body.eventName || "");
    if (!ALLOWED_EVENTS.has(eventName)) return jsonResponse(req, 400, { error:"DOKE_ANALYTICS_EVENT_NAME_INVALID" });
    const clientEventId = String(body.clientEventId || "");
    if (!UUID_PATTERN.test(clientEventId)) return jsonResponse(req, 400, { error:"DOKE_ANALYTICS_CLIENT_EVENT_ID_INVALID" });

    const session = await verifyBoundSession(String(body.sessionToken || ""), policy.sessionSecret, context);
    const analyticsSessionId = String(session.analyticsSessionId);
    const sourceSurface = ["search","direct","service_detail","quote"].includes(String(body.sourceSurface || ""))
      ? String(body.sourceSurface) : "unknown";

    let serviceId: string | null = null;
    let searchRequestId: string | null = null;
    let quoteSessionId: string | null = null;
    let orderId: string | null = null;
    let dimensions: Record<string, unknown> = {};
    let semanticKey = "";

    if (eventName === "search.result_impression" || eventName === "search.result_clicked") {
      const exposure = await verifyAnalyticsEnvelope(String(body.exposureProof || ""), "ana_exposure_v1", policy.exposureSecret);
      if (Date.parse(String(exposure.expiresAt || "")) <= Date.now()) throw new Error("DOKE_ANALYTICS_EXPOSURE_EXPIRED");
      serviceId = String(exposure.serviceId || "");
      searchRequestId = String(exposure.searchRequestId || "");
      if (!UUID_PATTERN.test(serviceId) || !UUID_PATTERN.test(searchRequestId)) throw new Error("DOKE_ANALYTICS_EXPOSURE_INVALID");
      await resolveService(context, serviceId);
      dimensions = { resultPosition:Number(exposure.resultPosition), rankingVersion:String(exposure.rankingVersion || "") };
      semanticKey = [eventName, searchRequestId, serviceId].join(":");
    } else if (eventName.startsWith("quote.")) {
      const quote = await verifyAnalyticsEnvelope(String(body.quoteSessionToken || ""), "ana_quote_session_v1", policy.sessionSecret);
      if (Date.parse(String(quote.expiresAt || "")) <= Date.now()) throw new Error("DOKE_ANALYTICS_QUOTE_SESSION_EXPIRED");
      if (String(quote.analyticsSessionId || "") !== analyticsSessionId) throw new Error("DOKE_ANALYTICS_QUOTE_SESSION_MISMATCH");
      if (String(quote.actorClass || "") !== context.actorClass || (context.actorId && String(quote.actorId || "") !== context.actorId)) throw new Error("DOKE_ANALYTICS_QUOTE_SESSION_ACTOR_MISMATCH");
      serviceId = String(quote.serviceId || "");
      quoteSessionId = String(quote.quoteSessionId || "");
      await resolveService(context, serviceId);
      if (eventName === "quote.progressed") {
        const stepIndex = Number(body.stepIndex), questionCount = Number(body.questionCount), answeredQuestionCount = Number(body.answeredQuestionCount);
        if (![stepIndex,questionCount,answeredQuestionCount].every(Number.isInteger)
          || stepIndex < 0 || questionCount < 0 || answeredQuestionCount < 0 || answeredQuestionCount > questionCount) {
          throw new Error("DOKE_ANALYTICS_QUOTE_PROGRESS_INVALID");
        }
        dimensions = { stepIndex, questionCount, answeredQuestionCount };
        semanticKey = [eventName, quoteSessionId, stepIndex, answeredQuestionCount].join(":");
      } else if (eventName === "quote.submitted") {
        if (!context.actorId) throw new Error("DOKE_ANALYTICS_QUOTE_SUBMIT_AUTH_REQUIRED");
        orderId = String(body.orderId || "");
        if (!UUID_PATTERN.test(orderId)) throw new Error("DOKE_ANALYTICS_ORDER_INVALID");
        const { data:order, error } = await context.serviceClient.from("orders").select("id,client_id,service_id").eq("id", orderId).maybeSingle();
        if (error || !order || order.client_id !== context.actorId || order.service_id !== serviceId) throw new Error("DOKE_ANALYTICS_ORDER_MISMATCH");
        semanticKey = [eventName, quoteSessionId, orderId].join(":");
      } else {
        semanticKey = [eventName, quoteSessionId, serviceId].join(":");
      }
    } else {
      serviceId = String(body.serviceId || "");
      await resolveService(context, serviceId);

      if (eventName === "service.detail_viewed"
          && sourceSurface === "search"
          && String(body.exposureProof || "")) {
        const exposure = await verifyAnalyticsEnvelope(
          String(body.exposureProof || ""),
          "ana_exposure_v1",
          policy.exposureSecret,
        );
        if (Date.parse(String(exposure.expiresAt || "")) <= Date.now()) {
          throw new Error("DOKE_ANALYTICS_EXPOSURE_EXPIRED");
        }
        const exposureServiceId = String(exposure.serviceId || "");
        searchRequestId = String(exposure.searchRequestId || "");
        if (exposureServiceId !== serviceId || !UUID_PATTERN.test(searchRequestId)) {
          throw new Error("DOKE_ANALYTICS_EXPOSURE_MISMATCH");
        }
        dimensions = {
          resultPosition:Number(exposure.resultPosition),
          rankingVersion:String(exposure.rankingVersion || ""),
        };
        semanticKey = [eventName, analyticsSessionId, searchRequestId, serviceId].join(":");
      } else {
        const bucket = Math.floor(Date.now() / (policy.dedupWindow * 1000));
        semanticKey = [eventName, analyticsSessionId, serviceId, bucket].join(":");
      }
    }

    const canonical = {
      eventName,eventSchemaVersion:1,taxonomyVersion:"ana-event-taxonomy-v1",
      clientEventId,actorClass:context.actorClass,actorId:context.actorId,
      analyticsSessionId,serviceId,searchRequestId,quoteSessionId,orderId,
      sourceSurface,dimensions,
    };
    const payloadHash = await sha256Hex(canonical);
    const eventId = await recordEvent(context, { ...canonical, payloadHash, semanticKey });
    return jsonResponse(req, 202, { eventId, eventName, accepted:true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "DOKE_ANALYTICS_INTERNAL_ERROR";
    const status = code.includes("AUTH_REQUIRED") ? 401
      : code.includes("OWNER_TRAFFIC") ? 204
      : code.includes("IDEMPOTENCY_CONFLICT") ? 409
      : code.includes("UNAVAILABLE") ? 404
      : code.includes("WRITE_FAILED") ? 503
      : 400;
    if (status === 204) return new Response(null, { status:204 });
    return jsonResponse(req, status, { error:code });
  }
});

console.info(`${FUNCTION_NAME} loaded`);
