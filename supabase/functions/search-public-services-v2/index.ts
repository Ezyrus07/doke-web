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
  buildObservation,
  classifySearchError,
  normalizeSearchError,
  statusForSearchError,
} from "./operations.mjs";

const FUNCTION_NAME = "search-public-services-v2";
const MAX_BODY_BYTES = 16_384;
const readPlatformKeys = (pluralName: string, singularName: string, legacyName: string) => {
  const keys: string[] = [];
  const append = (value: unknown) => {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (normalized && !keys.includes(normalized)) keys.push(normalized);
  };
  const raw = Deno.env.get(pluralName) || "";
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      append(parsed.default);
      append(parsed.doke);
      Object.values(parsed).forEach(append);
    } catch {
      // Compatibility variables below remain authoritative for malformed or legacy configuration.
    }
  }
  append(Deno.env.get(singularName));
  append(Deno.env.get(legacyName));
  return keys;
};

const readPlatformKey = (pluralName: string, singularName: string, legacyName: string) =>
  readPlatformKeys(pluralName, singularName, legacyName)[0] || "";

const bearerJwt = (authorization: string) => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim() || "";
  return token.split(".").length === 3 ? token : "";
};

const RATE_LIMIT = 120;
const RATE_WINDOW_SECONDS = 60;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type SupabaseClient = ReturnType<typeof createClient>;
type Context = {
  actorClass: "anon" | "authenticated";
  rateLimitActorId: string;
  requestClient: SupabaseClient;
  serviceClient: SupabaseClient;
};

const resolveRequestId = (req: Request) => {
  const candidate = (req.headers.get("x-doke-request-id") || "").trim();
  return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : crypto.randomUUID();
};

const withRequestId = (req: Request, requestId: string) => {
  const headers = new Headers(req.headers);
  headers.set("x-doke-request-id", requestId);
  return new Request(req, { headers });
};

const firstHeaderValue = (value: string) => value.split(",", 1)[0]?.trim().slice(0, 160) || "";

const bytesToUuid = (input: Uint8Array) => {
  const bytes = input.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

const pseudonymousRateLimitActor = async (req: Request, secret: string) => {
  const networkHint = firstHeaderValue(
    req.headers.get("cf-connecting-ip")
      || req.headers.get("x-forwarded-for")
      || req.headers.get("x-real-ip")
      || "unknown-network",
  );
  const userAgent = (req.headers.get("user-agent") || "unknown-agent").slice(0, 240);
  const origin = (req.headers.get("origin") || "no-origin").slice(0, 240);
  const material = `${FUNCTION_NAME}\n${networkHint}\n${userAgent}\n${origin}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(material)));
  return bytesToUuid(signature);
};

const createContext = async (req: Request): Promise<Context | Response> => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const publicKeys = readPlatformKeys("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_ANON_KEY");
  const publicKey = publicKeys[0] || "";
  const secretKey = readPlatformKey("SUPABASE_SECRET_KEYS", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  const presentedApiKey = (req.headers.get("apikey") || "").trim();
  const userJwt = bearerJwt(req.headers.get("authorization") || "");

  if (!supabaseUrl || !publicKey || !secretKey) {
    return jsonResponse(req, 503, { error: "SERVER_CONFIGURATION_MISSING" });
  }
  if (!presentedApiKey || !publicKeys.includes(presentedApiKey)) {
    return jsonResponse(req, 401, { error: "DOKE_SEARCH_API_KEY_INVALID" });
  }

  const authClient = createClient(supabaseUrl, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const userResult = userJwt
    ? await authClient.auth.getUser(userJwt)
    : { data: { user: null }, error: null };
  const actorId = !userResult.error && userResult.data?.user?.id && UUID_PATTERN.test(userResult.data.user.id)
    ? userResult.data.user.id
    : null;

  const requestClient = createClient(supabaseUrl, publicKey, {
    global: { headers: actorId && userJwt ? { Authorization: `Bearer ${userJwt}` } : {} },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const rateLimitActorId = actorId
    || await pseudonymousRateLimitActor(
      req,
      Deno.env.get("DOKE_EDGE_RATE_LIMIT_SECRET") || secretKey,
    );

  return {
    actorClass: actorId ? "authenticated" : "anon",
    rateLimitActorId,
    requestClient,
    serviceClient,
  };
};

const recordObservation = async (
  serviceClient: SupabaseClient,
  observation: Record<string, unknown>,
) => {
  const { error } = await serviceClient.rpc("record_service_search_observation_v2", {
    p_observation: observation,
  });
  if (error) {
    console.error(JSON.stringify({
      function: FUNCTION_NAME,
      requestId: observation.requestId,
      code: "DOKE_SEARCH_OBSERVABILITY_WRITE_FAILED",
    }));
    return false;
  }
  return true;
};

Deno.serve(async (incomingRequest: Request) => {
  const requestId = resolveRequestId(incomingRequest);
  const req = withRequestId(incomingRequest, requestId);
  const functionStartedAt = performance.now();

  if (req.method === "OPTIONS") return preflightResponse(req);
  const originRejection = rejectDisallowedOrigin(req);
  if (originRejection) return originRejection;
  if (req.method !== "POST") return jsonResponse(req, 405, { error: "METHOD_NOT_ALLOWED", requestId });

  const bodyResult = await readJsonObject(req, MAX_BODY_BYTES);
  if (!bodyResult.ok) return bodyResult.response;
  const searchRequest = bodyResult.value;

  const context = await createContext(req);
  if (context instanceof Response) return context;

  const rateLimitResponse = await enforceActorRateLimit({
    req,
    client: context.serviceClient,
    functionName: FUNCTION_NAME,
    actorId: context.rateLimitActorId,
    action: "search",
    limit: RATE_LIMIT,
    windowSeconds: RATE_WINDOW_SECONDS,
  });

  if (rateLimitResponse) {
    const code = rateLimitResponse.status === 429 ? "DOKE_RATE_LIMITED" : "DOKE_RATE_LIMIT_UNAVAILABLE";
    await recordObservation(context.serviceClient, buildObservation({
      requestId,
      actorClass: context.actorClass,
      outcome: "error",
      latencyMs: performance.now() - functionStartedAt,
      request: searchRequest,
      errorCode: code,
      errorClass: classifySearchError(code),
    }));
    return rateLimitResponse;
  }

  const rpcStartedAt = performance.now();
  const { data, error } = await context.requestClient.rpc("search_public_services_v2", {
    p_request: searchRequest,
  });
  const rpcLatencyMs = performance.now() - rpcStartedAt;

  if (error) {
    const code = normalizeSearchError(error);
    const errorClass = classifySearchError(code);
    await recordObservation(context.serviceClient, buildObservation({
      requestId,
      actorClass: context.actorClass,
      outcome: "error",
      latencyMs: rpcLatencyMs,
      request: searchRequest,
      errorCode: code,
      errorClass,
    }));
    console.error(JSON.stringify({ function: FUNCTION_NAME, requestId, code, errorClass }));
    return jsonResponse(req, statusForSearchError(code), { error: code, requestId });
  }

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const code = "DOKE_SEARCH_RESPONSE_INVALID";
    await recordObservation(context.serviceClient, buildObservation({
      requestId,
      actorClass: context.actorClass,
      outcome: "error",
      latencyMs: rpcLatencyMs,
      request: searchRequest,
      errorCode: code,
      errorClass: "server",
    }));
    return jsonResponse(req, 502, { error: code, requestId });
  }

  await recordObservation(context.serviceClient, buildObservation({
    requestId,
    actorClass: context.actorClass,
    outcome: "success",
    latencyMs: rpcLatencyMs,
    request: searchRequest,
    response: data,
  }));

  return jsonResponse(req, 200, data);
});

console.info(`${FUNCTION_NAME} loaded`);
