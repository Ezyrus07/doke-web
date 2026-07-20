(() => {
  const TYPE_LABELS = {
    short_text: 'Resposta curta', long_text: 'Resposta longa', single_choice: 'Escolha única',
    multiple_choice: 'Múltipla escolha', yes_no: 'Sim ou não', number: 'Número', date: 'Data'
  };
  const clamp = (value, max) => String(value || '').trim().slice(0, max);
  const uid = () => `question_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  function mount(root = document) {
    const host = root.querySelector('[data-quote-template-builder]');
    if (!host || host.dataset.ready === 'true') return null;
    host.dataset.ready = 'true';
    const input = host.querySelector('[data-quote-template-json]');
    const list = host.querySelector('[data-quote-question-list]');
    const preview = host.querySelector('[data-quote-template-preview]');
    const empty = host.querySelector('[data-quote-template-empty]');
    const add = host.querySelector('[data-quote-question-add]');
    let questions = [];

    const normalize = (item, index) => ({
      id: clamp(item?.id, 80) || uid(),
      type: TYPE_LABELS[item?.type] ? item.type : 'short_text',
      label: clamp(item?.label, 120),
      helpText: clamp(item?.helpText, 180),
      required: item?.required === true,
      position: index,
      options: Array.isArray(item?.options) ? item.options.map((v) => clamp(typeof v === 'object' ? (v.label || v.value) : v, 80)).filter(Boolean).slice(0, 5) : [],
      maxLength: Math.min(1000, Math.max(1, Number(item?.maxLength) || (item?.type === 'long_text' ? 1000 : 180)))
    });

    const serialize = () => {
      questions = questions.slice(0, 10).map(normalize);
      const signature = JSON.stringify(questions);
      let hash = 2166136261;
      for (let index = 0; index < signature.length; index += 1) { hash ^= signature.charCodeAt(index); hash = Math.imul(hash, 16777619); }
      const value = { version: questions.length ? `v_${(hash >>> 0).toString(36)}` : 'default', status: questions.length ? 'active' : 'default', questions };
      input.value = JSON.stringify(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      return value;
    };

    const optionFields = (question, index) => {
      if (!['single_choice', 'multiple_choice'].includes(question.type)) return '';
      const values = [...question.options, '', '', '', '', ''].slice(0, 5);
      return `<div class="quote-builder__options"><span>Opções</span>${values.map((value, optionIndex) => `<input class="doke-input" maxlength="80" data-question-option="${index}:${optionIndex}" value="${value.replaceAll('&','&amp;').replaceAll('"','&quot;')}" placeholder="Opção ${optionIndex + 1}">`).join('')}</div>`;
    };

    const renderPreview = () => {
      preview.replaceChildren();
      questions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = 'quote-builder-preview__item';
        const title = document.createElement('strong');
        title.textContent = `${index + 1}. ${question.label || 'Pergunta sem título'}${question.required ? ' *' : ''}`;
        const meta = document.createElement('small');
        meta.textContent = TYPE_LABELS[question.type];
        item.append(title, meta);
        preview.appendChild(item);
      });
    };

    const render = () => {
      list.innerHTML = questions.map((question, index) => `<article class="quote-builder__question" data-question-index="${index}">
        <div class="quote-builder__question-head"><strong>Pergunta ${index + 1}</strong><div class="quote-builder__actions">
          <button type="button" class="doke-icon-btn" data-question-up="${index}" aria-label="Mover para cima">↑</button>
          <button type="button" class="doke-icon-btn" data-question-down="${index}" aria-label="Mover para baixo">↓</button>
          <button type="button" class="doke-icon-btn" data-question-duplicate="${index}" aria-label="Duplicar pergunta">⧉</button>
          <button type="button" class="doke-icon-btn" data-question-remove="${index}" aria-label="Remover pergunta">×</button>
        </div></div>
        <div class="quote-builder__grid">
          <label class="doke-field quote-builder__wide"><span>Pergunta</span><input class="doke-input" maxlength="120" data-question-label="${index}" value="${question.label.replaceAll('&','&amp;').replaceAll('"','&quot;')}" placeholder="Ex.: Quantos cômodos serão atendidos?"></label>
          <label class="doke-field"><span>Tipo</span><select class="doke-select" data-question-type="${index}">${Object.entries(TYPE_LABELS).map(([value,label]) => `<option value="${value}" ${value === question.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
          <label class="doke-field"><span>Obrigatória</span><select class="doke-select" data-question-required="${index}"><option value="false" ${!question.required ? 'selected' : ''}>Não</option><option value="true" ${question.required ? 'selected' : ''}>Sim</option></select></label>
          <label class="doke-field quote-builder__wide"><span>Texto auxiliar <em>Opcional</em></span><input class="doke-input" maxlength="180" data-question-help="${index}" value="${question.helpText.replaceAll('&','&amp;').replaceAll('"','&quot;')}" placeholder="Explique o que o cliente deve informar."></label>
          ${optionFields(question, index)}
        </div>
      </article>`).join('');
      empty.hidden = questions.length > 0;
      add.disabled = questions.length >= 10;
      renderPreview();
      serialize();
    };

    const load = (template) => {
      const source = template?.questions || template || [];
      questions = Array.isArray(source) ? source.slice(0, 10).map(normalize) : [];
      render();
    };

    host.addEventListener('input', (event) => {
      const index = Number(event.target.dataset.questionLabel ?? event.target.dataset.questionType ?? event.target.dataset.questionRequired ?? event.target.dataset.questionHelp);
      if (Number.isInteger(index) && questions[index]) {
        if (event.target.dataset.questionLabel != null) questions[index].label = clamp(event.target.value, 120);
        if (event.target.dataset.questionType != null) questions[index].type = event.target.value;
        if (event.target.dataset.questionRequired != null) questions[index].required = event.target.value === 'true';
        if (event.target.dataset.questionHelp != null) questions[index].helpText = clamp(event.target.value, 180);
        serialize(); renderPreview();
      }
      if (event.target.dataset.questionOption) {
        const [questionIndex, optionIndex] = event.target.dataset.questionOption.split(':').map(Number);
        questions[questionIndex].options[optionIndex] = clamp(event.target.value, 80);
        serialize();
      }
    });
    host.addEventListener('change', (event) => {
      if (event.target.matches('[data-question-type]')) render();
    });
    host.addEventListener('click', (event) => {
      if (event.target.closest('[data-quote-question-add]')) { questions.push(normalize({}, questions.length)); render(); return; }
      const action = event.target.closest('[data-question-up],[data-question-down],[data-question-duplicate],[data-question-remove]');
      if (!action) return;
      const key = ['questionUp','questionDown','questionDuplicate','questionRemove'].find((name) => action.dataset[name] != null);
      const index = Number(action.dataset[key]);
      if (key === 'questionUp' && index > 0) [questions[index - 1], questions[index]] = [questions[index], questions[index - 1]];
      if (key === 'questionDown' && index < questions.length - 1) [questions[index + 1], questions[index]] = [questions[index], questions[index + 1]];
      if (key === 'questionDuplicate' && questions.length < 10) questions.splice(index + 1, 0, normalize({ ...questions[index], id: uid(), label: `${questions[index].label} (cópia)` }, index + 1));
      if (key === 'questionRemove') questions.splice(index, 1);
      render();
    });

    try { load(JSON.parse(input.value || '{}')); } catch (_) { load([]); }
    const validate = () => {
      const value = serialize();
      value.questions.forEach((question, index) => {
        if (!question.label) throw new Error(`Informe o texto da pergunta ${index + 1}.`);
        if (['single_choice', 'multiple_choice'].includes(question.type) && question.options.filter(Boolean).length < 2) {
          throw new Error(`Adicione pelo menos duas opções na pergunta ${index + 1}.`);
        }
      });
      return value;
    };
    const api = { getValue: serialize, validate, load };
    window.DokeServiceQuoteTemplateBuilder = api;
    return api;
  }
  window.DokeInitServiceQuoteTemplateBuilder = () => mount(document);
  document.addEventListener('DOMContentLoaded', () => mount(document), { once: true });
})();
