const encoder = new TextEncoder();

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const object = value as Record<string, unknown>;
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${stable(object[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  bytes.forEach((byte) => binary += String.fromCharCode(byte));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const hmac = async (secret: string, material: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(material)));
};

export const sha256Hex = async (value: unknown) => {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(stable(value))));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

export const signAnalyticsEnvelope = async (
  type: string,
  payload: Record<string, unknown>,
  secret: string,
) => {
  if (!secret || secret.length < 16) throw new Error("DOKE_ANALYTICS_SIGNING_SECRET_INVALID");
  const body = { type, version: 1, payload };
  const signature = await hmac(secret, stable(body));
  return toBase64Url(encoder.encode(JSON.stringify({ ...body, signature: toBase64Url(signature) })));
};

export const verifyAnalyticsEnvelope = async (
  token: string,
  expectedType: string,
  secret: string,
) => {
  if (!secret || secret.length < 16) throw new Error("DOKE_ANALYTICS_SIGNING_SECRET_INVALID");
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(new TextDecoder().decode(fromBase64Url(token))) as Record<string, unknown>;
  } catch {
    throw new Error("DOKE_ANALYTICS_TOKEN_INVALID");
  }
  if (envelope.type !== expectedType || envelope.version !== 1 || !envelope.payload || typeof envelope.payload !== "object") {
    throw new Error("DOKE_ANALYTICS_TOKEN_INVALID");
  }
  const signatureText = typeof envelope.signature === "string" ? envelope.signature : "";
  if (!signatureText) throw new Error("DOKE_ANALYTICS_TOKEN_INVALID");
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const ok = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(signatureText),
    encoder.encode(stable({ type: envelope.type, version: envelope.version, payload: envelope.payload })),
  );
  if (!ok) throw new Error("DOKE_ANALYTICS_TOKEN_SIGNATURE_INVALID");
  return Object.freeze(envelope.payload as Record<string, unknown>);
};

const parsePositiveInteger = (value: string | undefined | null, min: number, max: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : null;
};

export const attachAnalyticsExposureProofs = async (
  response: Record<string, unknown>,
  requestId: string,
  secret: string | null,
  ttlSecondsText: string | null,
) => {
  const ttlSeconds = parsePositiveInteger(ttlSecondsText, 30, 3600);
  if (!secret || secret.length < 16 || !ttlSeconds) return response;
  const items = Array.isArray(response.items) ? response.items : [];
  const ranking = response.ranking && typeof response.ranking === "object"
    ? response.ranking as Record<string, unknown>
    : {};
  const rankingVersion = String(ranking.version || "");
  const asOf = String(ranking.asOf || "");
  if (!rankingVersion || !asOf) return response;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const signedItems = await Promise.all(items.map(async (raw, index) => {
    const item = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const serviceId = String(item.serviceId || item.remoteId || "");
    if (!serviceId) return item;
    const analyticsExposureProof = await signAnalyticsEnvelope("ana_exposure_v1", {
      searchRequestId: requestId,
      serviceId,
      resultPosition: index,
      rankingVersion,
      asOf,
      surface: "search",
      expiresAt,
    }, secret);
    return { ...item, analyticsExposureProof };
  }));
  return { ...response, items: signedItems };
};
