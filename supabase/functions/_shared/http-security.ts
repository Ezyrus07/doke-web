const DEFAULT_ALLOWED_ORIGINS = new Set([
  "https://ezyrus07.github.io",
]);

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ALLOWED_HEADERS = "authorization, x-client-info, apikey, content-type, x-doke-request-id";
const ALLOWED_METHODS = "POST, OPTIONS";

// CORS is a browser origin boundary, not an authentication or network access control.
const localOriginsExplicitlyEnabled = () => Deno.env.get("DOKE_ALLOW_LOCAL_ORIGINS") === "true";

const parseExactOrigin = (value: string) => {
  try {
    const parsed = new URL(value);
    if (
      !["https:", "http:"].includes(parsed.protocol) ||
      parsed.origin !== value ||
      parsed.username ||
      parsed.password
    ) return null;
    return {
      value: parsed.origin,
      secure: parsed.protocol === "https:",
      loopback: LOOPBACK_HOSTS.has(parsed.hostname),
    };
  } catch {
    return null;
  }
};

const normalizedConfiguredOrigins = () => {
  const raw = (Deno.env.get("DOKE_ALLOWED_ORIGINS") || "").trim();
  if (!raw) return new Set<string>();

  const origins = raw.split(",").map((origin) => origin.trim());
  const allowed = new Set<string>();
  for (const value of origins) {
    const parsed = parseExactOrigin(value);
    if (
      !parsed ||
      (!parsed.secure && !parsed.loopback) ||
      (parsed.loopback && !localOriginsExplicitlyEnabled()) ||
      allowed.has(parsed.value)
    ) {
      // Reject the entire configured allowlist if any entry is ambiguous or insecure.
      return null;
    }
    allowed.add(parsed.value);
  }
  return allowed;
};

const requestOrigin = (req: Request) => (req.headers.get("origin") || "").trim();

export const resolveAllowedOrigin = (req: Request) => {
  const origin = requestOrigin(req);
  if (!origin) return ""; // Non-browser calls still require endpoint authorization.
  if (origin === "null") return null;

  const parsed = parseExactOrigin(origin);
  if (!parsed) return null;

  const configuredOrigins = normalizedConfiguredOrigins();
  if (!configuredOrigins) return null; // Invalid allowlist fails closed for all browser origins.

  if (parsed.loopback) {
    return localOriginsExplicitlyEnabled() ? origin : null;
  }
  if (!parsed.secure) return null;

  if (DEFAULT_ALLOWED_ORIGINS.has(origin)) return origin;
  if (configuredOrigins.has(origin)) return origin;
  return null;
};

const securityHeaders = () => ({
  "Cache-Control": "private, no-store, max-age=0",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",
  "Expires": "0",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Pragma": "no-cache",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

export const responseHeaders = (
  req: Request,
  extra: Record<string, string> = {},
) => {
  const headers = new Headers({
    ...securityHeaders(),
    ...extra,
  });
  // Callers may add ordinary response headers, but cannot bypass the CORS decision.
  for (const name of [
    "Access-Control-Allow-Origin",
    "Access-Control-Allow-Credentials",
    "Access-Control-Allow-Headers",
    "Access-Control-Allow-Methods",
    "Access-Control-Expose-Headers",
  ]) headers.delete(name);
  headers.set("Vary", "Origin");

  const allowedOrigin = resolveAllowedOrigin(req);
  if (allowedOrigin) {
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
    headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
    headers.set("Access-Control-Expose-Headers", "retry-after, x-doke-request-id, x-ratelimit-limit, x-ratelimit-remaining");
  }

  const requestId = (req.headers.get("x-doke-request-id") || "").trim().slice(0, 120)
    || crypto.randomUUID();
  headers.set("X-Doke-Request-Id", requestId);
  return headers;
};

export const jsonResponse = (
  req: Request,
  status: number,
  payload: unknown,
  extraHeaders: Record<string, string> = {},
) => new Response(JSON.stringify(payload), {
  status,
  headers: responseHeaders(req, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  }),
});

export const rejectDisallowedOrigin = (req: Request) => {
  const origin = requestOrigin(req);
  if (!origin || resolveAllowedOrigin(req)) return null;
  return jsonResponse(req, 403, { error: "DOKE_ORIGIN_NOT_ALLOWED" });
};

export const preflightResponse = (req: Request) => {
  const rejected = rejectDisallowedOrigin(req);
  if (rejected) return rejected;

  const headers = responseHeaders(req, {
    "Access-Control-Max-Age": "600",
  });
  return new Response(null, { status: 204, headers });
};

export type JsonObjectResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; response: Response };

export const readJsonObject = async (
  req: Request,
  maxBytes: number,
): Promise<JsonObjectResult> => {
  const normalizedLimit = Math.min(Math.max(Math.trunc(maxBytes), 1_024), 1_048_576);
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > normalizedLimit) {
    return { ok: false, response: jsonResponse(req, 413, { error: "DOKE_REQUEST_TOO_LARGE" }) };
  }

  const contentType = (req.headers.get("content-type") || "").toLowerCase();
  if (contentType && !contentType.startsWith("application/json")) {
    return { ok: false, response: jsonResponse(req, 415, { error: "DOKE_JSON_CONTENT_TYPE_REQUIRED" }) };
  }

  const buffer = await req.arrayBuffer();
  if (buffer.byteLength > normalizedLimit) {
    return { ok: false, response: jsonResponse(req, 413, { error: "DOKE_REQUEST_TOO_LARGE" }) };
  }
  if (!buffer.byteLength) {
    return { ok: false, response: jsonResponse(req, 400, { error: "DOKE_JSON_BODY_REQUIRED" }) };
  }

  try {
    const parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, response: jsonResponse(req, 400, { error: "DOKE_INVALID_JSON_OBJECT" }) };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, response: jsonResponse(req, 400, { error: "DOKE_INVALID_JSON" }) };
  }
};

type RpcClient = {
  rpc: (
    name: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
};

type ActorRateLimitInput = {
  req: Request;
  client: RpcClient;
  functionName: string;
  actorId: string;
  action: string;
  limit: number;
  windowSeconds: number;
};

export const enforceActorRateLimit = async ({
  req,
  client,
  functionName,
  actorId,
  action,
  limit,
  windowSeconds,
}: ActorRateLimitInput) => {
  const normalizedLimit = Math.min(Math.max(Math.trunc(limit), 1), 1_000);
  const normalizedWindow = Math.min(Math.max(Math.trunc(windowSeconds), 1), 86_400);
  const { data, error } = await client.rpc("consume_edge_function_rate_limit_internal", {
    p_function_name: functionName,
    p_actor_id: actorId,
    p_action_name: action || "default",
    p_limit: normalizedLimit,
    p_window_seconds: normalizedWindow,
  });

  if (error || !data || typeof data !== "object") {
    console.error(JSON.stringify({
      function: functionName,
      action,
      code: "DOKE_RATE_LIMIT_UNAVAILABLE",
    }));
    return jsonResponse(req, 503, { error: "DOKE_RATE_LIMIT_UNAVAILABLE" });
  }

  const result = data as Record<string, unknown>;
  const allowed = result.allowed === true;
  const retryAfter = Math.max(1, Number(result.retryAfterSeconds) || normalizedWindow);
  const remaining = Math.max(0, Number(result.remaining) || 0);
  if (allowed) return null;

  return jsonResponse(req, 429, {
    error: "DOKE_RATE_LIMITED",
    retryAfterSeconds: retryAfter,
  }, {
    "Retry-After": String(retryAfter),
    "X-RateLimit-Limit": String(normalizedLimit),
    "X-RateLimit-Remaining": String(remaining),
  });
};
