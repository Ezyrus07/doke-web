import {
  integer,
  MAX_QUESTIONS,
  MAX_SUGGESTIONS,
  normalizeComparable,
  type SanitizedQuestion,
  text,
} from "./shared.ts";

const shortenLabel = (label: string) => {
  let result = label
    .replace(/\b(por favor|você poderia|gostaríamos de saber|informe para nós|conte para nós)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (result.length <= 76) return result;
  const words = result.split(" ");
  result = "";
  for (const word of words) {
    if (`${result} ${word}`.trim().length > 76) break;
    result = `${result} ${word}`.trim();
  }
  return result.replace(/[,:;-]+$/, "").trim() || label.slice(0, 76).trim();
};

const suggestion = (
  id: string,
  action: string,
  targetQuestionId: string,
  title: string,
  reason: string,
  evidence: string,
  confidence: string,
  proposedQuestion: Record<string, unknown>,
  relatedQuestionIds: string[] = [],
) => ({ id, action, targetQuestionId, relatedQuestionIds, title, reason, evidence, confidence, proposedQuestion });

export const rulesSuggestions = (
  questions: SanitizedQuestion[],
  metrics: Record<string, unknown>,
) => {
  const suggestions: Record<string, unknown>[] = [];
  const seen = new Map<string, string>();
  const recommendedMetric = Number(metrics.recommendedQuestionCount || 0);
  const recommendedCount = recommendedMetric > 0 ? integer(recommendedMetric, 1, MAX_QUESTIONS) : 6;
  const dropoffId = text(metrics.topDropoffQuestionId, 80);
  const dropoffLabel = normalizeComparable(metrics.topDropoffQuestionLabel);
  const requiredCount = questions.filter((item) => item.required).length;

  for (const question of questions) {
    const comparable = normalizeComparable(question.label);
    if (comparable && seen.has(comparable)) {
      const primaryId = seen.get(comparable) || question.id;
      const primaryQuestion = questions.find((item) => item.id === primaryId) || question;
      suggestions.push(suggestion(
        `merge-duplicate-${primaryId}-${question.id}`,
        "merge",
        primaryId,
        "Unificar perguntas repetidas",
        "Duas perguntas solicitam essencialmente a mesma informação e podem virar uma única pergunta.",
        `A pergunta “${question.label}” repete “${primaryQuestion.label}”.`,
        "high",
        primaryQuestion,
        [question.id],
      ));
      continue;
    }
    if (comparable) seen.set(comparable, question.id);

    if (question.label.length > 84) {
      suggestions.push(suggestion(
        `shorten-${question.id}`,
        "shorten",
        question.id,
        "Encurtar a pergunta",
        "Perguntas longas exigem mais leitura e podem atrasar o preenchimento.",
        `${question.label.length} caracteres no texto atual.`,
        "medium",
        { ...question, label: shortenLabel(question.label) },
      ));
    }

    const yesNoIntent = /^(existe|há|voce possui|você possui|ja possui|já possui|aceita|precisa|deseja)\b/i.test(question.label);
    if (yesNoIntent && ["short_text", "long_text"].includes(question.type)) {
      suggestions.push(suggestion(
        `change-type-${question.id}`,
        "change_type",
        question.id,
        "Transformar em Sim ou Não",
        "A pergunta pede uma confirmação objetiva e pode ser respondida com menos esforço.",
        `Tipo atual: ${question.type === "long_text" ? "resposta longa" : "resposta curta"}.`,
        "high",
        { ...question, type: "yes_no", options: [], maxLength: 180 },
      ));
    }

    const isDropoff = (dropoffId && dropoffId === question.id)
      || (dropoffLabel && dropoffLabel === comparable);
    if (isDropoff && question.required) {
      suggestions.push(suggestion(
        `optional-dropoff-${question.id}`,
        "make_optional",
        question.id,
        "Testar como pergunta opcional",
        "Este ponto aparece associado a abandonos e atualmente bloqueia o avanço sem resposta.",
        `${integer(metrics.topDropoffCount, 0, 100000)} abandono(s) terminaram perto desta pergunta.`,
        text(metrics.confidence, 20) || "medium",
        { ...question, required: false },
      ));
    }
  }

  if (questions.length > recommendedCount) {
    const removable = [...questions].reverse().find((item) => !item.required && item.type === "long_text")
      || [...questions].reverse().find((item) => !item.required);
    if (removable) {
      suggestions.push(suggestion(
        `reduce-count-${removable.id}`,
        "remove",
        removable.id,
        "Reduzir o formulário",
        "O formulário está acima da quantidade que apresenta melhor desempenho na sua categoria.",
        `${questions.length} perguntas atualmente; referência aproximada: ${recommendedCount}.`,
        Number(metrics.formsStarted || 0) >= 30 ? "high" : "medium",
        removable,
      ));
    }
  }

  if (requiredCount > 6) {
    const candidate = [...questions].reverse().find((item) => item.required && item.type === "long_text");
    if (candidate && !suggestions.some((item) => item.targetQuestionId === candidate.id && item.action === "make_optional")) {
      suggestions.push(suggestion(
        `optional-${candidate.id}`,
        "make_optional",
        candidate.id,
        "Diminuir campos obrigatórios",
        "Muitos campos obrigatórios podem aumentar o abandono sem melhorar a precisão do orçamento.",
        `${requiredCount} das ${questions.length} perguntas são obrigatórias.`,
        "medium",
        { ...candidate, required: false },
      ));
    }
  }

  return suggestions.slice(0, MAX_SUGGESTIONS);
};
