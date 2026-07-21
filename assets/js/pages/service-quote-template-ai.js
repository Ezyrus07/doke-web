(function (root) {
  'use strict';

  var ACTION_LABELS = Object.freeze({
    rewrite: 'Reescrever',
    shorten: 'Encurtar',
    make_optional: 'Tornar opcional',
    change_type: 'Mudar tipo',
    merge: 'Unificar',
    remove: 'Remover',
    reorder: 'Reordenar',
    add: 'Adicionar'
  });

  var TYPE_LABELS = Object.freeze({
    short_text: 'Resposta curta',
    long_text: 'Resposta longa',
    single_choice: 'Escolha única',
    multiple_choice: 'Múltipla escolha',
    yes_no: 'Sim ou não',
    number: 'Número',
    date: 'Data'
  });

  function text(value, maxLength) {
    return String(value || '').trim().slice(0, maxLength || 200);
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function normalizeQuestion(raw, index) {
    raw = raw || {};
    var type = TYPE_LABELS[raw.type] ? raw.type : 'short_text';
    return {
      id: text(raw.id, 80) || ('question_' + (index + 1)),
      type: type,
      label: text(raw.label, 120),
      helpText: text(raw.helpText, 180),
      required: raw.required === true,
      position: index,
      options: (Array.isArray(raw.options) ? raw.options : []).map(function (option) {
        return text(typeof option === 'object' ? option.label || option.value : option, 80);
      }).filter(Boolean).slice(0, 5),
      maxLength: Math.min(1000, Math.max(1, Number(raw.maxLength) || (type === 'long_text' ? 1000 : 180)))
    };
  }

  function questionsSignature(questions) {
    var source = JSON.stringify((Array.isArray(questions) ? questions : []).map(normalizeQuestion));
    var hash = 2166136261;
    for (var index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return 'v_' + (hash >>> 0).toString(36);
  }

  function templateIdentity(value) {
    value = value || {};
    var kind = text(value.templateKind, 30).toLowerCase();
    var id = text(value.templateId, 180);
    var source = text(value.source, 50).toLowerCase();
    if (source.indexOf('personal_template') === 0) source = 'personal_template';
    else if (source.indexOf('preset') === 0) source = 'preset';
    else source = 'custom';
    return kind && id ? kind + ':' + id + ':' + source : 'custom';
  }

  function getServiceExternalId() {
    var query = new URLSearchParams(root.location.search);
    return text(query.get('id') || query.get('service') || query.get('serviceId'), 180);
  }

  function getCategory() {
    var field = document.querySelector('[name="category"]');
    return text(field && field.value, 100);
  }

  function createText(tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }

  function appendQuestionSnapshot(host, question, emptyLabel) {
    host.replaceChildren();
    if (!question) {
      host.appendChild(createText('p', 'quote-ai-suggestion__empty', emptyLabel));
      return;
    }
    host.appendChild(createText('strong', 'quote-ai-suggestion__question', question.label || 'Pergunta sem título'));
    var meta = TYPE_LABELS[question.type] || TYPE_LABELS.short_text;
    meta += question.required ? ' · obrigatória' : ' · opcional';
    host.appendChild(createText('small', 'quote-ai-suggestion__meta', meta));
    if (question.helpText) host.appendChild(createText('p', 'quote-ai-suggestion__help', question.helpText));
    if (Array.isArray(question.options) && question.options.length) {
      var options = document.createElement('ul');
      options.className = 'quote-ai-suggestion__options';
      question.options.forEach(function (option) {
        options.appendChild(createText('li', '', option));
      });
      host.appendChild(options);
    }
  }

  function applySuggestions(sourceQuestions, suggestions) {
    var questions = (Array.isArray(sourceQuestions) ? sourceQuestions : []).map(normalizeQuestion);
    var additions = [];
    var removals = new Set();

    suggestions.forEach(function (suggestion) {
      var action = suggestion.action;
      var targetId = suggestion.targetQuestionId;
      if (action === 'remove') {
        removals.add(targetId);
        return;
      }
      if (action === 'add') {
        additions.push(normalizeQuestion(suggestion.proposedQuestion || {}, questions.length + additions.length));
        return;
      }
      var index = questions.findIndex(function (question) { return question.id === targetId; });
      if (index < 0) return;
      var proposed = normalizeQuestion(suggestion.proposedQuestion || questions[index], index);
      proposed.id = questions[index].id;
      questions[index] = proposed;
      if (action === 'merge') {
        (Array.isArray(suggestion.relatedQuestionIds) ? suggestion.relatedQuestionIds : []).forEach(function (relatedId) {
          if (relatedId && relatedId !== targetId) removals.add(relatedId);
        });
      }
    });

    questions = questions.filter(function (question) { return !removals.has(question.id); });
    additions.forEach(function (question) {
      if (questions.length < 10 && question.label) questions.push(question);
    });
    questions.sort(function (a, b) { return Number(a.position || 0) - Number(b.position || 0); });
    return questions.slice(0, 10).map(normalizeQuestion).filter(function (question) { return Boolean(question.label); });
  }

  function mount(rootNode) {
    var host = rootNode.querySelector('[data-quote-ai-supervision]');
    if (!host || host.dataset.mounted === 'true') return null;
    host.dataset.mounted = 'true';

    var generateButton = host.querySelector('[data-quote-ai-generate]');
    var status = host.querySelector('[data-quote-ai-status]');
    var result = host.querySelector('[data-quote-ai-result]');
    var engine = host.querySelector('[data-quote-ai-engine]');
    var summary = host.querySelector('[data-quote-ai-summary]');
    var list = host.querySelector('[data-quote-ai-list]');
    var applyButton = host.querySelector('[data-quote-ai-apply]');
    var discardButton = host.querySelector('[data-quote-ai-discard]');
    var undoButton = host.querySelector('[data-quote-ai-undo]');
    var applied = host.querySelector('[data-quote-ai-applied]');

    var currentRun = null;
    var baselineSignature = '';
    var baselineQuestions = [];
    var undoSnapshot = null;
    var pending = false;

    function builder() {
      var value = root.DokeServiceQuoteTemplateBuilder;
      if (!value || typeof value.getValue !== 'function' || typeof value.applyAiOptimization !== 'function') {
        throw new Error('O construtor de perguntas ainda não está pronto.');
      }
      return value;
    }

    function service() {
      var value = root.Doke && root.Doke.services && root.Doke.services.quoteTemplateAi;
      if (!value) throw new Error('O serviço de otimização assistida não foi carregado.');
      return value;
    }

    function setStatus(message, tone) {
      if (!status) return;
      status.textContent = message || '';
      status.dataset.tone = tone || 'neutral';
      status.hidden = !message;
    }

    function setPending(value) {
      pending = Boolean(value);
      if (generateButton) {
        generateButton.disabled = pending;
        generateButton.textContent = pending ? 'Analisando perguntas…' : 'Gerar sugestões com IA';
      }
      if (applyButton) applyButton.disabled = pending || !selectedSuggestions().length;
      if (discardButton) discardButton.disabled = pending;
      host.setAttribute('aria-busy', pending ? 'true' : 'false');
    }

    function selectedSuggestions() {
      if (!list || !currentRun) return [];
      var selectedIds = Array.from(list.querySelectorAll('[data-quote-ai-select]:checked')).map(function (input) {
        return input.value;
      });
      return currentRun.suggestions.filter(function (item) { return selectedIds.includes(item.id); });
    }

    function refreshApplyState() {
      if (applyButton) applyButton.disabled = pending || !selectedSuggestions().length;
    }

    function renderSuggestion(suggestion) {
      var card = document.createElement('article');
      card.className = 'quote-ai-suggestion';
      card.dataset.suggestionId = suggestion.id;
      card.dataset.targetQuestionId = suggestion.targetQuestionId || '';
      card.dataset.affectedQuestionIds = [suggestion.targetQuestionId].concat(suggestion.relatedQuestionIds || []).filter(Boolean).join(' ');

      var head = document.createElement('header');
      head.className = 'quote-ai-suggestion__head';
      var choice = document.createElement('label');
      choice.className = 'quote-ai-suggestion__choice';
      var checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = suggestion.id;
      checkbox.dataset.quoteAiSelect = '';
      checkbox.setAttribute('aria-label', 'Selecionar ' + suggestion.title);
      choice.appendChild(checkbox);
      var identity = document.createElement('span');
      identity.appendChild(createText('strong', '', suggestion.title));
      identity.appendChild(createText('small', '', ACTION_LABELS[suggestion.action] || 'Melhoria'));
      choice.appendChild(identity);
      head.appendChild(choice);
      head.appendChild(createText('span', 'quote-ai-suggestion__confidence', 'Confiança ' + (suggestion.confidence || 'média')));
      card.appendChild(head);

      var comparison = document.createElement('div');
      comparison.className = 'quote-ai-suggestion__comparison';
      var before = document.createElement('section');
      before.className = 'quote-ai-suggestion__side';
      before.appendChild(createText('span', 'quote-ai-suggestion__eyebrow', suggestion.action === 'add' ? 'Antes' : 'Atual'));
      var original = baselineQuestions.find(function (question) { return question.id === suggestion.targetQuestionId; }) || null;
      appendQuestionSnapshot(before, original, suggestion.action === 'add' ? 'Esta pergunta ainda não existe.' : 'Pergunta não encontrada.');

      var after = document.createElement('section');
      after.className = 'quote-ai-suggestion__side quote-ai-suggestion__side--proposed';
      after.appendChild(createText('span', 'quote-ai-suggestion__eyebrow', 'Sugestão'));
      appendQuestionSnapshot(after, suggestion.action === 'remove' ? null : suggestion.proposedQuestion, suggestion.action === 'remove' ? 'Remover esta pergunta do formulário.' : 'Sem alteração válida.');
      comparison.append(before, after);
      card.appendChild(comparison);

      var rationale = document.createElement('div');
      rationale.className = 'quote-ai-suggestion__rationale';
      if (suggestion.reason) rationale.appendChild(createText('p', '', suggestion.reason));
      if (suggestion.evidence) rationale.appendChild(createText('small', '', suggestion.evidence));
      card.appendChild(rationale);
      return card;
    }

    function renderRun(run) {
      currentRun = run;
      if (engine) {
        engine.textContent = run.engine === 'openai' ? 'IA OpenAI' : 'Análise segura por regras';
        engine.dataset.engine = run.engine || 'rules';
      }
      if (summary) summary.textContent = run.summary || 'Analise cada proposta antes de aplicar.';
      if (list) list.replaceChildren.apply(list, run.suggestions.map(renderSuggestion));
      if (result) result.hidden = false;
      if (applied) applied.hidden = true;
      if (undoButton) undoButton.hidden = true;
      refreshApplyState();
      if (run.engine !== 'openai') {
        setStatus('A IA generativa não respondeu com uma saída válida; a Doke exibiu apenas sugestões determinísticas seguras.', 'warning');
      } else {
        setStatus('Nenhuma sugestão está pré-selecionada. Compare antes e depois e escolha somente as mudanças úteis.', 'neutral');
      }
    }

    function resetRun(message) {
      currentRun = null;
      baselineSignature = '';
      baselineQuestions = [];
      if (list) list.replaceChildren();
      if (result) result.hidden = true;
      if (applyButton) applyButton.disabled = true;
      if (message) setStatus(message, 'neutral');
      else setStatus('', 'neutral');
    }

    async function generate() {
      if (pending) return;
      try {
        var value = builder().getValue();
        var questions = Array.isArray(value.questions) ? value.questions.map(normalizeQuestion) : [];
        if (!questions.length) {
          setStatus('Adicione ou aplique um modelo com pelo menos uma pergunta antes de usar a IA.', 'error');
          return;
        }
        baselineQuestions = clone(questions);
        baselineSignature = questionsSignature(questions);
        undoSnapshot = null;
        if (undoButton) undoButton.hidden = true;
        setPending(true);
        setStatus('A Doke está analisando somente as perguntas e métricas agregadas. Nenhuma resposta de cliente é enviada.', 'loading');
        var run = await service().generate({
          serviceExternalId: getServiceExternalId(),
          category: getCategory(),
          templateIdentity: templateIdentity(value),
          templateSource: value.source || 'custom',
          questions: questions
        });
        renderRun(run);
      } catch (error) {
        resetRun();
        setStatus(error && error.message || 'Não foi possível gerar sugestões.', 'error');
      } finally {
        setPending(false);
      }
    }

    async function applySelected() {
      if (pending || !currentRun) return;
      var selected = selectedSuggestions();
      if (!selected.length) return;
      try {
        var currentValue = builder().getValue();
        var currentQuestions = Array.isArray(currentValue.questions) ? currentValue.questions.map(normalizeQuestion) : [];
        if (questionsSignature(currentQuestions) !== baselineSignature) {
          setStatus('As perguntas mudaram depois da análise. Gere novas sugestões para evitar aplicar uma comparação desatualizada.', 'error');
          return;
        }
        var nextQuestions = applySuggestions(currentQuestions, selected);
        if (!nextQuestions.length) {
          setStatus('A seleção removeria todas as perguntas. Mantenha pelo menos uma pergunta no formulário.', 'error');
          return;
        }
        var nextSignature = questionsSignature(nextQuestions);
        setPending(true);
        await service().markApplied(currentRun.runId, selected.map(function (item) { return item.id; }), nextSignature);
        undoSnapshot = clone(currentValue);
        builder().applyAiOptimization(nextQuestions, { runId: currentRun.runId });
        if (result) result.hidden = true;
        if (applied) {
          applied.hidden = false;
          applied.querySelector('[data-quote-ai-applied-copy]').textContent = selected.length + ' sugestão(ões) aplicada(s). Revise as perguntas antes de enviar o anúncio para moderação.';
        }
        if (undoButton) undoButton.hidden = false;
        setStatus('As alterações foram aplicadas somente após sua confirmação.', 'success');
      } catch (error) {
        setStatus(error && error.message || 'Não foi possível aplicar as sugestões.', 'error');
      } finally {
        setPending(false);
      }
    }

    function undo() {
      if (!undoSnapshot || pending) return;
      try {
        builder().load(clone(undoSnapshot));
        undoSnapshot = null;
        if (undoButton) undoButton.hidden = true;
        if (applied) applied.hidden = true;
        setStatus('As perguntas anteriores foram restauradas. A análise continua registrada para auditoria.', 'success');
      } catch (error) {
        setStatus(error && error.message || 'Não foi possível restaurar as perguntas.', 'error');
      }
    }

    generateButton && generateButton.addEventListener('click', generate);
    applyButton && applyButton.addEventListener('click', applySelected);
    discardButton && discardButton.addEventListener('click', function () {
      resetRun('Sugestões descartadas. Nenhuma pergunta foi alterada.');
    });
    undoButton && undoButton.addEventListener('click', undo);

    list && list.addEventListener('change', function (event) {
      var input = event.target.closest('[data-quote-ai-select]');
      if (!input || !input.checked) {
        refreshApplyState();
        return;
      }
      var card = input.closest('[data-target-question-id]');
      var affectedIds = new Set(String(card && card.dataset.affectedQuestionIds || '').split(/\s+/).filter(Boolean));
      if (affectedIds.size) {
        list.querySelectorAll('[data-affected-question-ids] [data-quote-ai-select]:checked').forEach(function (other) {
          if (other === input) return;
          var otherCard = other.closest('[data-affected-question-ids]');
          var otherIds = String(otherCard && otherCard.dataset.affectedQuestionIds || '').split(/\s+/).filter(Boolean);
          if (otherIds.some(function (id) { return affectedIds.has(id); })) other.checked = false;
        });
      }
      refreshApplyState();
    });

    root.addEventListener('doke:service-quote-template-changed', function () {
      if (!currentRun) return;
      var value = builder().getValue();
      if (questionsSignature(value.questions || []) !== baselineSignature) {
        setStatus('O formulário foi alterado depois da análise. Gere novamente antes de aplicar sugestões.', 'warning');
      }
    });

    return Object.freeze({ generate: generate, reset: resetRun });
  }

  root.DokeInitServiceQuoteTemplateAi = function () { return mount(document); };
  document.addEventListener('DOMContentLoaded', function () { mount(document); }, { once: true });
})(window);
