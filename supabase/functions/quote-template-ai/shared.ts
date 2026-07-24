export const MAX_QUESTIONS = 10;
export const MAX_SUGGESTIONS = 8;
export const MAX_BODY_BYTES = 48_000;

export const ALLOWED_TYPES = new Set([
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "yes_no",
  "number",
  "date",
]);

export const ALLOWED_ACTIONS = new Set([
  "rewrite",
  "shorten",
  "make_optional",
  "change_type",
  "merge",
  "remove",
  "reorder",
  "add",
]);

export const ALLOWED_TEMPLATE_SOURCES = new Set([
  "default",
  "custom",
  "custom_ai_optimized",
  "preset",
  "preset_customized",
  "preset_ai_customized",
  "personal_template",
  "personal_template_customized",
  "personal_template_ai_customized",
]);

export const text = (value: unknown, max = 200) => String(value ?? "").trim().slice(0, max);

export const integer = (value: unknown, min: number, max: number) => {
  const number = Number(value);
  return Math.min(max, Math.max(min, Number.isFinite(number) ? Math.round(number) : min));
};

export const normalizeComparable = (value: unknown) => text(value, 240)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, " ")
  .trim();

export const sanitizeQuestion = (input: Record<string, unknown>, position: number) => {
  const typeValue = text(input.type, 40).toLowerCase();
  const type = ALLOWED_TYPES.has(typeValue) ? typeValue : "short_text";
  const options = Array.isArray(input.options)
    ? input.options.map((item) => text(item, 80)).filter(Boolean).slice(0, 5)
    : [];
  return {
    id: text(input.id, 80) || `question_${position + 1}`,
    type,
    label: text(input.label, 120),
    helpText: text(input.helpText, 180),
    required: Boolean(input.required),
    options: ["single_choice", "multiple_choice"].includes(type) ? options : [],
    position,
    maxLength: integer(input.maxLength, 1, type === "long_text" ? 1000 : 180),
  };
};

export type SanitizedQuestion = ReturnType<typeof sanitizeQuestion>;

export const sanitizeSuggestions = (raw: unknown, questions: SanitizedQuestion[]) => {
  const source = Array.isArray(raw) ? raw : [];
  const ids = new Set(questions.map((item) => item.id));
  const used = new Set<string>();
  const result: Record<string, unknown>[] = [];

  for (const item of source) {
    if (!item || typeof item !== "object") continue;
    const value = item as Record<string, unknown>;
    let action = text(value.action, 30).toLowerCase();
    if (action === "convert_type") action = "change_type";
    if (!ALLOWED_ACTIONS.has(action)) continue;

    const targetQuestionId = text(value.targetQuestionId, 80);
    if (action !== "add" && !ids.has(targetQuestionId)) continue;
    if (action === "add" && questions.length + result.filter((entry) => entry.action === "add").length >= MAX_QUESTIONS) continue;

    const relatedQuestionIds = [...new Set(
      (Array.isArray(value.relatedQuestionIds) ? value.relatedQuestionIds : [])
        .map((relatedId) => text(relatedId, 80))
        .filter((relatedId) => relatedId && relatedId !== targetQuestionId && ids.has(relatedId)),
    )].slice(0, MAX_QUESTIONS - 1);
    if (action === "merge" && !relatedQuestionIds.length) continue;

    const targetPosition = action === "add"
      ? questions.length
      : Math.max(0, questions.findIndex((entry) => entry.id === targetQuestionId));
    const proposed = sanitizeQuestion(
      value.proposedQuestion && typeof value.proposedQuestion === "object"
        ? value.proposedQuestion as Record<string, unknown>
        : {},
      targetPosition,
    );
    if (action !== "add") proposed.id = targetQuestionId;

    const id = text(value.id, 80) || `${action}-${targetQuestionId || result.length + 1}`;
    if (used.has(id)) continue;
    used.add(id);
    result.push({
      id,
      action,
      targetQuestionId,
      relatedQuestionIds: action === "merge" ? relatedQuestionIds : [],
      title: text(value.title, 100) || "Melhoria sugerida",
      reason: text(value.reason, 240),
      evidence: text(value.evidence, 240),
      confidence: ["low", "medium", "high"].includes(text(value.confidence, 20))
        ? text(value.confidence, 20)
        : "medium",
      proposedQuestion: proposed,
    });
    if (result.length >= MAX_SUGGESTIONS) break;
  }
  return result;
};
