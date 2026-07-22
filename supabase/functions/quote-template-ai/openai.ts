import {
  ALLOWED_ACTIONS,
  ALLOWED_TYPES,
  MAX_QUESTIONS,
  MAX_SUGGESTIONS,
  text,
} from "./shared.ts";

export const OPENAI_FALLBACK_CODES = new Set([
  "OPENAI_KEY_NOT_CONFIGURED",
  "OPENAI_BILLING_QUOTA",
  "OPENAI_RATE_LIMIT",
  "OPENAI_AUTH_INVALID",
  "OPENAI_ACCESS_DENIED",
  "OPENAI_REQUEST_INVALID",
  "OPENAI_TIMEOUT",
  "OPENAI_UNAVAILABLE",
  "OPENAI_EMPTY_OUTPUT",
  "OPENAI_INVALID_OUTPUT",
  "OPENAI_NO_VALID_SUGGESTIONS",
  "OPENAI_FAILED",
]);

class OpenAIRequestError extends Error {
  code: string;
  status: number;

  constructor(code: string, status = 0) {
    super(code);
    this.name = "OpenAIRequestError";
    this.code = code;
    this.status = status;
  }
}

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "type", "label", "helpText", "required", "options", "position", "maxLength"],
  properties: {
    id: { type: "string" },
    type: { type: "string", enum: [...ALLOWED_TYPES] },
    label: { type: "string" },
    helpText: { type: "string" },
    required: { type: "boolean" },
    options: { type: "array", items: { type: "string" } },
    position: { type: "integer" },
    maxLength: { type: "integer" },
  },
};

const outputSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions"],
  properties: {
    summary: { type: "string" },
    suggestions: {
      type: "array",
      maxItems: MAX_SUGGESTIONS,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "action", "targetQuestionId", "relatedQuestionIds", "title", "reason", "evidence", "confidence", "proposedQuestion"],
        properties: {
          id: { type: "string" },
          action: { type: "string", enum: [...ALLOWED_ACTIONS] },
          targetQuestionId: { type: "string" },
          relatedQuestionIds: { type: "array", maxItems: MAX_QUESTIONS - 1, items: { type: "string" } },
          title: { type: "string" },
          reason: { type: "string" },
          evidence: { type: "string" },
          confidence: { type: "string", enum: ["low", "medium", "high"] },
          proposedQuestion: questionSchema,
        },
      },
    },
  },
};

const extractOutputText = (payload: Record<string, unknown>) => {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const content = Array.isArray(record.content) ? record.content as Record<string, unknown>[] : [];
    for (const part of content) {
      if (part.type === "output_text" && typeof part.text === "string") return part.text;
    }
  }
  return "";
};

const providerErrorCode = (status: number, payload: unknown) => {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const errorRecord = record.error && typeof record.error === "object"
    ? record.error as Record<string, unknown>
    : {};
  const providerCode = text(errorRecord.code, 80).toLowerCase();
  const providerType = text(errorRecord.type, 80).toLowerCase();
  const providerMessage = text(errorRecord.message, 240).toLowerCase();
  const combined = `${providerCode} ${providerType} ${providerMessage}`;

  if (status === 429 && /(insufficient_quota|billing|quota|credit)/.test(combined)) {
    return "OPENAI_BILLING_QUOTA";
  }
  if (status === 429) return "OPENAI_RATE_LIMIT";
  if (status === 401) return "OPENAI_AUTH_INVALID";
  if (status === 403) return "OPENAI_ACCESS_DENIED";
  if (status === 400 || status === 404 || status === 422) return "OPENAI_REQUEST_INVALID";
  if (status >= 500) return "OPENAI_UNAVAILABLE";
  return "OPENAI_FAILED";
};

export const normalizeOpenAIError = (error: unknown) => {
  if (error instanceof OpenAIRequestError && OPENAI_FALLBACK_CODES.has(error.code)) {
    return error.code;
  }
  const name = text(error && typeof error === "object" ? (error as Record<string, unknown>).name : "", 80);
  const message = text(error instanceof Error ? error.message : error, 180).toLowerCase();
  if (name === "TimeoutError" || name === "AbortError" || /timed?\s*out|timeout/.test(message)) {
    return "OPENAI_TIMEOUT";
  }
  if (OPENAI_FALLBACK_CODES.has(message.toUpperCase())) return message.toUpperCase();
  return "OPENAI_FAILED";
};

export const callOpenAI = async (
  apiKey: string,
  model: string,
  context: Record<string, unknown>,
) => {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: AbortSignal.timeout(25_000),
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        store: false,
        reasoning: { effort: "low" },
        max_output_tokens: 3200,
        instructions: [
          "Você otimiza formulários de orçamento de um marketplace brasileiro de serviços.",
          "Responda em português do Brasil e somente no schema solicitado.",
          "Priorize formulários curtos, objetivos, inclusivos e úteis para precificação.",
          "Nunca sugira telefone, e-mail, WhatsApp, Pix, links externos, documentos sensíveis ou pagamento fora da plataforma.",
          "Não invente métricas. Cite somente evidências presentes no contexto.",
          "Não aplique mudanças. Produza propostas independentes para seleção humana.",
          "Use somente os tipos permitidos e preserve o id da pergunta-alvo.",
          "Para merge, mantenha a pergunta principal em targetQuestionId e liste somente as perguntas absorvidas em relatedQuestionIds.",
          `Gere no máximo ${MAX_SUGGESTIONS} sugestões e evite mudanças cosméticas sem benefício claro.`,
        ].join("\n"),
        input: JSON.stringify(context),
        text: {
          format: {
            type: "json_schema",
            name: "quote_template_supervised_suggestions",
            strict: true,
            schema: outputSchema,
          },
        },
      }),
    });
  } catch (error) {
    throw new OpenAIRequestError(normalizeOpenAIError(error));
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new OpenAIRequestError(providerErrorCode(response.status, payload), response.status);
  }

  const outputText = extractOutputText(payload as Record<string, unknown>);
  if (!outputText) throw new OpenAIRequestError("OPENAI_EMPTY_OUTPUT", response.status);
  try {
    return {
      requestId: text((payload as Record<string, unknown>).id, 180),
      data: JSON.parse(outputText),
    };
  } catch (_) {
    throw new OpenAIRequestError("OPENAI_INVALID_OUTPUT", response.status);
  }
};
