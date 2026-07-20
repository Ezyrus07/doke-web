(() => {
  'use strict';

  const TYPE_LABELS = Object.freeze({
    short_text: 'Resposta curta',
    long_text: 'Resposta longa',
    single_choice: 'Escolha única',
    multiple_choice: 'Múltipla escolha',
    yes_no: 'Sim ou não',
    number: 'Número',
    date: 'Data'
  });

  const TEMPLATE_CATALOG = Object.freeze([
    {
      id: 'limpeza-residencial',
      category: 'Limpeza',
      title: 'Limpeza residencial',
      summary: 'Para casas, apartamentos, escritórios e limpezas mais detalhadas.',
      estimatedMinutes: 2,
      questions: [
        { id: 'property_type', type: 'single_choice', label: 'Qual é o tipo do imóvel?', required: true, options: ['Casa', 'Apartamento', 'Escritório', 'Condomínio', 'Outro'] },
        { id: 'property_size', type: 'single_choice', label: 'Qual é o tamanho aproximado do imóvel?', required: true, options: ['Até 50 m²', '51 a 100 m²', '101 a 200 m²', 'Acima de 200 m²'] },
        { id: 'room_count', type: 'number', label: 'Quantos cômodos precisam de limpeza?', required: true, helpText: 'Considere quartos, salas, cozinha, banheiros e áreas adicionais.' },
        { id: 'furnished', type: 'yes_no', label: 'O imóvel está mobiliado?', required: true },
        { id: 'cleaning_level', type: 'single_choice', label: 'Qual tipo de limpeza você precisa?', required: true, options: ['Manutenção', 'Limpeza completa', 'Limpeza pesada', 'Pós-obra', 'Mudança'] },
        { id: 'special_attention', type: 'long_text', label: 'Existe algum ponto que merece atenção especial?', required: false, helpText: 'Ex.: gordura, mofo, vidros altos, pelos de animais ou superfícies delicadas.', maxLength: 600 }
      ]
    },
    {
      id: 'pintura-residencial',
      category: 'Pintura',
      title: 'Pintura residencial',
      summary: 'Para pintura interna, externa, retoques e renovação de ambientes.',
      estimatedMinutes: 2,
      questions: [
        { id: 'painting_area', type: 'multiple_choice', label: 'Quais áreas serão pintadas?', required: true, options: ['Áreas internas', 'Fachada', 'Muros', 'Portas e janelas', 'Teto'] },
        { id: 'room_count', type: 'number', label: 'Quantos cômodos ou ambientes serão atendidos?', required: true },
        { id: 'wall_condition', type: 'single_choice', label: 'Como estão as superfícies atualmente?', required: true, options: ['Boas, apenas renovar', 'Com furos ou trincas', 'Com mofo ou infiltração', 'Com tinta descascando', 'Não sei avaliar'] },
        { id: 'paint_material', type: 'yes_no', label: 'Você já possui as tintas e os materiais?', required: true },
        { id: 'finish_type', type: 'single_choice', label: 'Qual acabamento você deseja?', required: false, options: ['Fosco', 'Acetinado', 'Semibrilho', 'Texturizado', 'Preciso de orientação'] },
        { id: 'painting_details', type: 'long_text', label: 'Descreva cores, referências e outros detalhes importantes.', required: false, maxLength: 600 }
      ]
    },
    {
      id: 'eletrica-manutencao',
      category: 'Elétrica',
      title: 'Instalação e manutenção elétrica',
      summary: 'Para falhas elétricas, instalações, troca de componentes e diagnósticos.',
      estimatedMinutes: 2,
      questions: [
        { id: 'electrical_need', type: 'multiple_choice', label: 'Qual serviço elétrico você precisa?', required: true, options: ['Reparo de falha', 'Nova instalação', 'Troca de componente', 'Quadro elétrico', 'Inspeção'] },
        { id: 'power_outage', type: 'yes_no', label: 'O imóvel está sem energia total ou parcialmente?', required: true },
        { id: 'affected_points', type: 'number', label: 'Quantos pontos elétricos estão envolvidos?', required: false, helpText: 'Ex.: tomadas, interruptores, luminárias ou equipamentos.' },
        { id: 'risk_signs', type: 'multiple_choice', label: 'Você percebeu algum destes sinais?', required: false, options: ['Cheiro de queimado', 'Faíscas', 'Disjuntor desarmando', 'Aquecimento', 'Nenhum'] },
        { id: 'property_type', type: 'single_choice', label: 'Onde será realizado o serviço?', required: true, options: ['Casa', 'Apartamento', 'Comércio', 'Condomínio', 'Outro'] },
        { id: 'electrical_details', type: 'long_text', label: 'Explique quando o problema começou e o que já foi testado.', required: true, maxLength: 700 }
      ]
    },
    {
      id: 'encanamento-vazamentos',
      category: 'Encanador',
      title: 'Encanamento e vazamentos',
      summary: 'Para vazamentos, entupimentos, instalações hidráulicas e reparos.',
      estimatedMinutes: 2,
      questions: [
        { id: 'plumbing_need', type: 'single_choice', label: 'Qual é o principal problema?', required: true, options: ['Vazamento', 'Entupimento', 'Baixa pressão', 'Instalação', 'Outro'] },
        { id: 'active_leak', type: 'yes_no', label: 'Há vazamento ativo neste momento?', required: true },
        { id: 'water_control', type: 'yes_no', label: 'É possível fechar o registro de água do local?', required: false },
        { id: 'problem_location', type: 'multiple_choice', label: 'Onde está o problema?', required: true, options: ['Cozinha', 'Banheiro', 'Área de serviço', 'Área externa', 'Tubulação geral'] },
        { id: 'access_condition', type: 'single_choice', label: 'O ponto afetado está acessível?', required: false, options: ['Totalmente acessível', 'Atrás de móvel', 'Dentro da parede ou piso', 'Não sei informar'] },
        { id: 'plumbing_details', type: 'long_text', label: 'Descreva os sinais observados e há quanto tempo ocorrem.', required: true, maxLength: 700 }
      ]
    },
    {
      id: 'reforma-residencial',
      category: 'Reformas',
      title: 'Reforma residencial',
      summary: 'Para reformas parciais, renovação de ambientes e serviços integrados.',
      estimatedMinutes: 2,
      questions: [
        { id: 'renovation_scope', type: 'multiple_choice', label: 'Quais ambientes ou áreas fazem parte da reforma?', required: true, options: ['Cozinha', 'Banheiro', 'Quartos e salas', 'Área externa', 'Imóvel completo'] },
        { id: 'area_size', type: 'number', label: 'Qual é a área aproximada da reforma em m²?', required: false },
        { id: 'project_ready', type: 'yes_no', label: 'Você já possui projeto, planta ou referências definidas?', required: true },
        { id: 'materials_status', type: 'single_choice', label: 'Como será a compra dos materiais?', required: true, options: ['Já tenho os materiais', 'Quero incluir no orçamento', 'Compra compartilhada', 'Ainda não decidi'] },
        { id: 'property_occupancy', type: 'yes_no', label: 'O imóvel estará ocupado durante a obra?', required: true },
        { id: 'renovation_goal', type: 'long_text', label: 'Descreva o resultado esperado e as principais alterações.', required: true, maxLength: 800 }
      ]
    },
    {
      id: 'suporte-tecnico',
      category: 'Tecnologia',
      title: 'Suporte técnico',
      summary: 'Para computadores, celulares, redes, sistemas e configuração de equipamentos.',
      estimatedMinutes: 2,
      questions: [
        { id: 'device_type', type: 'single_choice', label: 'Qual equipamento ou sistema precisa de atendimento?', required: true, options: ['Computador', 'Notebook', 'Celular ou tablet', 'Rede ou internet', 'Outro'] },
        { id: 'brand_model', type: 'short_text', label: 'Informe a marca e o modelo, quando souber.', required: false },
        { id: 'problem_type', type: 'multiple_choice', label: 'Qual é o tipo de problema?', required: true, options: ['Não liga', 'Lentidão', 'Erro ou travamento', 'Configuração', 'Segurança ou vírus'] },
        { id: 'error_message', type: 'long_text', label: 'Aparece alguma mensagem de erro?', required: false, helpText: 'Copie a mensagem ou explique o que aparece na tela.', maxLength: 500 },
        { id: 'remote_service', type: 'yes_no', label: 'Você aceita atendimento remoto, quando possível?', required: true },
        { id: 'technical_context', type: 'long_text', label: 'Explique quando o problema começou e o que já tentou fazer.', required: true, maxLength: 700 }
      ]
    },
    {
      id: 'beleza-evento',
      category: 'Beleza',
      title: 'Beleza e produção para eventos',
      summary: 'Para maquiagem, cabelo, estética e atendimento individual ou em grupo.',
      estimatedMinutes: 2,
      questions: [
        { id: 'beauty_service', type: 'multiple_choice', label: 'Quais serviços você deseja?', required: true, options: ['Maquiagem', 'Penteado', 'Escova', 'Unhas', 'Outro'] },
        { id: 'occasion_type', type: 'single_choice', label: 'Para qual ocasião será o atendimento?', required: true, options: ['Casamento', 'Formatura', 'Ensaio', 'Evento social', 'Uso pessoal'] },
        { id: 'people_count', type: 'number', label: 'Quantas pessoas serão atendidas?', required: true },
        { id: 'service_location', type: 'single_choice', label: 'Onde prefere o atendimento?', required: true, options: ['No salão', 'Em domicílio', 'No local do evento', 'Ainda não decidi'] },
        { id: 'sensitivity', type: 'yes_no', label: 'Existe alguma alergia ou sensibilidade que deve ser considerada?', required: true },
        { id: 'beauty_references', type: 'long_text', label: 'Descreva o estilo desejado e referências importantes.', required: false, maxLength: 600 }
      ]
    },
    {
      id: 'aulas-particulares',
      category: 'Aulas',
      title: 'Aulas particulares',
      summary: 'Para reforço escolar, idiomas, preparação para provas e aprendizagem individual.',
      estimatedMinutes: 2,
      questions: [
        { id: 'subject', type: 'short_text', label: 'Qual matéria, habilidade ou idioma deseja aprender?', required: true },
        { id: 'student_level', type: 'single_choice', label: 'Qual é o nível atual do aluno?', required: true, options: ['Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Não sei avaliar'] },
        { id: 'learning_goal', type: 'multiple_choice', label: 'Qual é o principal objetivo?', required: true, options: ['Reforço escolar', 'Prova ou vestibular', 'Trabalho', 'Conversação', 'Desenvolvimento pessoal'] },
        { id: 'class_format', type: 'single_choice', label: 'Qual formato prefere?', required: true, options: ['Online', 'Presencial', 'Híbrido', 'Sem preferência'] },
        { id: 'weekly_frequency', type: 'single_choice', label: 'Qual frequência semanal deseja?', required: true, options: ['1 vez', '2 vezes', '3 vezes', 'Intensivo', 'A definir'] },
        { id: 'learning_context', type: 'long_text', label: 'Conte um pouco sobre as dificuldades, prazos e expectativas.', required: false, maxLength: 700 }
      ]
    },
    {
      id: 'frete-mudanca',
      category: 'Frete',
      title: 'Frete e mudança',
      summary: 'Para transporte de móveis, pequenas cargas, mudanças residenciais e comerciais.',
      estimatedMinutes: 2,
      questions: [
        { id: 'freight_type', type: 'single_choice', label: 'Qual serviço você precisa?', required: true, options: ['Pequeno frete', 'Mudança residencial', 'Mudança comercial', 'Retirada em loja', 'Outro'] },
        { id: 'origin', type: 'short_text', label: 'Informe o bairro ou região de retirada.', required: true },
        { id: 'destination', type: 'short_text', label: 'Informe o bairro ou região de entrega.', required: true },
        { id: 'cargo_description', type: 'long_text', label: 'Descreva os itens e o volume aproximado da carga.', required: true, maxLength: 800 },
        { id: 'building_access', type: 'multiple_choice', label: 'Existe alguma condição de acesso importante?', required: false, options: ['Escadas na origem', 'Escadas no destino', 'Elevador disponível', 'Acesso restrito', 'Nenhuma'] },
        { id: 'helper_needed', type: 'yes_no', label: 'Será necessário ajudante para carregar e descarregar?', required: true }
      ]
    }
  ].map((template) => Object.freeze({
    ...template,
    questions: Object.freeze(template.questions.map((question) => Object.freeze({
      ...question,
      options: Object.freeze([...(question.options || [])])
    })))
  })));

  const clamp = (value, max) => String(value || '').trim().slice(0, max);
  const normalizeText = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const uid = () => `question_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const EMPTY_PRESET = Object.freeze({ id: '', title: '', category: '', summary: '' });

  const normalizeQuestion = (item, index) => ({
    id: clamp(item?.id, 80) || uid(),
    type: TYPE_LABELS[item?.type] ? item.type : 'short_text',
    label: clamp(item?.label, 120),
    helpText: clamp(item?.helpText, 180),
    required: item?.required === true,
    position: index,
    options: Array.isArray(item?.options)
      ? item.options
        .map((value) => clamp(typeof value === 'object' ? (value.label || value.value) : value, 80))
        .filter(Boolean)
        .slice(0, 5)
      : [],
    maxLength: Math.min(1000, Math.max(1, Number(item?.maxLength) || (item?.type === 'long_text' ? 1000 : 180)))
  });

  const escapeAttribute = (value) => String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

  function mount(root = document) {
    const host = root.querySelector('[data-quote-template-builder]');
    if (!host || host.dataset.ready === 'true') return window.DokeServiceQuoteTemplateBuilder || null;
    host.dataset.ready = 'true';

    const input = host.querySelector('[data-quote-template-json]');
    const list = host.querySelector('[data-quote-question-list]');
    const preview = host.querySelector('[data-quote-template-preview]');
    const empty = host.querySelector('[data-quote-template-empty]');
    const add = host.querySelector('[data-quote-question-add]');
    const count = host.querySelector('[data-quote-question-count]');
    const duration = host.querySelector('[data-quote-template-duration]');
    const advice = host.querySelector('[data-quote-template-advice]');
    const presetHost = root.querySelector('[data-quote-template-presets]');
    const presetList = root.querySelector('[data-quote-template-list]');
    const presetSearch = root.querySelector('[data-quote-template-search]');
    const presetEmpty = root.querySelector('[data-quote-template-list-empty]');
    const presetBrowser = root.querySelector('[data-quote-template-browser]');
    const recommendation = root.querySelector('[data-quote-template-recommendation]');
    const recommendationTitle = root.querySelector('[data-quote-template-recommendation-title]');
    const recommendationSummary = root.querySelector('[data-quote-template-recommendation-summary]');
    const recommendationAction = root.querySelector('[data-quote-template-use-recommended]');
    const selection = root.querySelector('[data-quote-template-selection]');
    const selectionTitle = root.querySelector('[data-quote-template-selection-title]');
    const selectionMeta = root.querySelector('[data-quote-template-selection-meta]');
    const categoryField = root.querySelector('[name="category"]');

    let questions = [];
    let selectedPreset = { ...EMPTY_PRESET };
    let presetCustomized = false;
    let recommendedTemplateId = '';
    let catalogExpanded = true;

    const getTemplateById = (templateId) => TEMPLATE_CATALOG.find((template) => template.id === templateId) || null;

    const markCustomized = () => {
      if (selectedPreset.id) presetCustomized = true;
    };

    const serialize = () => {
      questions = questions.slice(0, 10).map(normalizeQuestion);
      const signature = JSON.stringify(questions);
      let hash = 2166136261;
      for (let index = 0; index < signature.length; index += 1) {
        hash ^= signature.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      const hasQuestions = questions.length > 0;
      const value = {
        version: hasQuestions ? `v_${(hash >>> 0).toString(36)}` : 1,
        status: hasQuestions ? 'active' : 'default',
        source: selectedPreset.id ? (presetCustomized ? 'preset_customized' : 'preset') : (hasQuestions ? 'custom' : 'default'),
        templateId: selectedPreset.id || null,
        templateLabel: selectedPreset.title || null,
        templateCategory: selectedPreset.category || null,
        questions
      };
      if (input) {
        input.value = JSON.stringify(value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      window.dispatchEvent(new CustomEvent('doke:service-quote-template-changed', {
        detail: {
          templateId: value.templateId,
          templateLabel: value.templateLabel,
          source: value.source,
          questionCount: questions.length
        }
      }));
      return value;
    };

    const optionFields = (question, index) => {
      if (!['single_choice', 'multiple_choice'].includes(question.type)) return '';
      const values = [...question.options, '', '', '', '', ''].slice(0, 5);
      return `<div class="quote-builder__options"><span>Opções</span>${values.map((value, optionIndex) => `<input class="doke-input" maxlength="80" data-question-option="${index}:${optionIndex}" value="${escapeAttribute(value)}" placeholder="Opção ${optionIndex + 1}">`).join('')}</div>`;
    };

    const renderPreview = () => {
      if (!preview) return;
      preview.replaceChildren();
      questions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = 'quote-builder-preview__item';
        const content = document.createElement('div');
        const title = document.createElement('strong');
        title.textContent = `${index + 1}. ${question.label || 'Pergunta sem título'}${question.required ? ' *' : ''}`;
        const helper = document.createElement('small');
        helper.textContent = question.helpText || (question.required ? 'Resposta obrigatória' : 'Resposta opcional');
        content.append(title, helper);
        const meta = document.createElement('span');
        meta.textContent = TYPE_LABELS[question.type];
        item.append(content, meta);
        preview.appendChild(item);
      });
    };

    const renderQuality = () => {
      const total = questions.length;
      if (count) count.textContent = String(total);
      if (duration) {
        const minutes = Math.max(1, Math.ceil(total / 4));
        duration.textContent = total ? `Cerca de ${minutes} min para responder` : 'Formulário ainda vazio';
      }
      if (advice) {
        advice.dataset.tone = total > 6 ? 'warning' : 'positive';
        advice.textContent = total > 6
          ? `Seu formulário possui ${total} perguntas. Formulários com até 6 perguntas tendem a ser concluídos com mais facilidade.`
          : (total
            ? 'Boa extensão: o cliente consegue fornecer contexto sem enfrentar um formulário longo.'
            : 'Escolha um modelo pronto ou adicione uma pergunta para começar.');
      }
    };

    const renderPresetSelection = () => {
      const hasPreset = Boolean(selectedPreset.id);
      if (selection) selection.hidden = !hasPreset;
      if (presetBrowser) presetBrowser.hidden = hasPreset && !catalogExpanded;
      if (selectionTitle) selectionTitle.textContent = selectedPreset.title || '';
      if (selectionMeta) {
        selectionMeta.textContent = hasPreset
          ? `${questions.length} perguntas · ${presetCustomized ? 'Modelo personalizado por você' : 'Modelo original da Doke'}`
          : '';
      }
      presetList?.querySelectorAll('[data-quote-template-card]').forEach((card) => {
        const active = card.dataset.quoteTemplateCard === selectedPreset.id;
        card.classList.toggle('is-active', active);
        card.setAttribute('aria-current', active ? 'true' : 'false');
        const action = card.querySelector('[data-quote-template-apply]');
        if (action) action.textContent = active ? 'Modelo aplicado' : 'Usar modelo';
      });
    };

    const createPresetCard = (template, recommended) => {
      const card = document.createElement('article');
      card.className = 'quote-template-card';
      card.dataset.quoteTemplateCard = template.id;
      if (recommended) card.dataset.recommended = 'true';

      const top = document.createElement('div');
      top.className = 'quote-template-card__top';
      const eyebrow = document.createElement('span');
      eyebrow.className = 'quote-template-card__category';
      eyebrow.textContent = template.category;
      const badge = document.createElement('span');
      badge.className = 'quote-template-card__badge';
      badge.textContent = recommended ? 'Recomendado' : `${template.questions.length} perguntas`;
      top.append(eyebrow, badge);

      const title = document.createElement('h4');
      title.textContent = template.title;
      const summary = document.createElement('p');
      summary.textContent = template.summary;

      const questionPreview = document.createElement('ul');
      questionPreview.className = 'quote-template-card__questions';
      template.questions.slice(0, 3).forEach((question) => {
        const item = document.createElement('li');
        item.textContent = question.label;
        questionPreview.appendChild(item);
      });

      const footer = document.createElement('footer');
      footer.className = 'quote-template-card__footer';
      const time = document.createElement('small');
      time.textContent = `~${template.estimatedMinutes} min para o cliente`;
      const action = document.createElement('button');
      action.className = 'doke-btn doke-btn--soft';
      action.type = 'button';
      action.dataset.quoteTemplateApply = template.id;
      action.textContent = selectedPreset.id === template.id ? 'Modelo aplicado' : 'Usar modelo';
      footer.append(time, action);

      card.append(top, title, summary, questionPreview, footer);
      return card;
    };

    const renderPresetCatalog = () => {
      if (!presetList) return;
      const selectedCategory = normalizeText(categoryField?.value);
      const search = normalizeText(presetSearch?.value);
      const recommended = TEMPLATE_CATALOG.find((template) => normalizeText(template.category) === selectedCategory) || null;
      recommendedTemplateId = recommended?.id || '';

      if (recommendation) recommendation.hidden = !recommended;
      if (recommendationTitle) recommendationTitle.textContent = recommended?.title || '';
      if (recommendationSummary) recommendationSummary.textContent = recommended?.summary || '';
      if (recommendationAction) recommendationAction.disabled = !recommended;

      const filtered = TEMPLATE_CATALOG
        .filter((template) => {
          if (!search) return true;
          const searchable = normalizeText([
            template.category,
            template.title,
            template.summary,
            ...template.questions.map((question) => question.label)
          ].join(' '));
          return searchable.includes(search);
        })
        .sort((first, second) => {
          if (first.id === recommendedTemplateId) return -1;
          if (second.id === recommendedTemplateId) return 1;
          return first.title.localeCompare(second.title, 'pt-BR');
        });

      presetList.replaceChildren(...filtered.map((template) => createPresetCard(template, template.id === recommendedTemplateId)));
      if (presetEmpty) presetEmpty.hidden = filtered.length > 0;
      renderPresetSelection();
    };

    const render = () => {
      if (list) {
        list.innerHTML = questions.map((question, index) => `<article class="quote-builder__question" data-question-index="${index}">
          <div class="quote-builder__question-head"><strong>Pergunta ${index + 1}</strong><div class="quote-builder__actions">
            <button type="button" class="doke-icon-btn" data-question-up="${index}" aria-label="Mover para cima">↑</button>
            <button type="button" class="doke-icon-btn" data-question-down="${index}" aria-label="Mover para baixo">↓</button>
            <button type="button" class="doke-icon-btn" data-question-duplicate="${index}" aria-label="Duplicar pergunta">⧉</button>
            <button type="button" class="doke-icon-btn" data-question-remove="${index}" aria-label="Remover pergunta">×</button>
          </div></div>
          <div class="quote-builder__grid">
            <label class="doke-field quote-builder__wide"><span>Pergunta</span><input class="doke-input" maxlength="120" data-question-label="${index}" value="${escapeAttribute(question.label)}" placeholder="Ex.: Quantos cômodos serão atendidos?"></label>
            <label class="doke-field"><span>Tipo</span><select class="doke-select" data-question-type="${index}">${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}" ${value === question.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
            <label class="doke-field"><span>Obrigatória</span><select class="doke-select" data-question-required="${index}"><option value="false" ${!question.required ? 'selected' : ''}>Não</option><option value="true" ${question.required ? 'selected' : ''}>Sim</option></select></label>
            <label class="doke-field quote-builder__wide"><span>Texto auxiliar <em>Opcional</em></span><input class="doke-input" maxlength="180" data-question-help="${index}" value="${escapeAttribute(question.helpText)}" placeholder="Explique o que o cliente deve informar."></label>
            ${optionFields(question, index)}
          </div>
        </article>`).join('');
      }
      if (empty) empty.hidden = questions.length > 0;
      if (add) add.disabled = questions.length >= 10;
      renderPreview();
      renderQuality();
      renderPresetSelection();
      serialize();
    };

    const load = (template) => {
      const source = template?.questions || template || [];
      questions = Array.isArray(source) ? source.slice(0, 10).map(normalizeQuestion) : [];
      const catalogTemplate = getTemplateById(clamp(template?.templateId, 80));
      selectedPreset = catalogTemplate
        ? { id: catalogTemplate.id, title: catalogTemplate.title, category: catalogTemplate.category, summary: catalogTemplate.summary }
        : {
          id: clamp(template?.templateId, 80),
          title: clamp(template?.templateLabel, 120),
          category: clamp(template?.templateCategory, 80),
          summary: ''
        };
      presetCustomized = template?.source === 'preset_customized';
      catalogExpanded = !selectedPreset.id;
      render();
      renderPresetCatalog();
    };

    const shouldReplaceQuestions = (templateId) => {
      if (!questions.length || selectedPreset.id === templateId) return true;
      if (typeof window.confirm !== 'function') return true;
      return window.confirm('Aplicar este modelo substituirá as perguntas atuais. Deseja continuar?');
    };

    const applyTemplateById = (templateId, options = {}) => {
      const template = getTemplateById(templateId);
      if (!template) return false;
      if (!options.force && !shouldReplaceQuestions(template.id)) return false;
      questions = template.questions.map((question, index) => normalizeQuestion({
        ...question,
        id: `${template.id}_${question.id}`
      }, index));
      selectedPreset = {
        id: template.id,
        title: template.title,
        category: template.category,
        summary: template.summary
      };
      presetCustomized = false;
      catalogExpanded = false;
      render();
      host.scrollIntoView?.({ block: 'start', behavior: options.behavior || 'smooth' });
      return true;
    };

    const clearTemplate = (options = {}) => {
      if (!options.force && questions.length && typeof window.confirm === 'function' && !window.confirm('Remover todas as perguntas e começar do zero?')) return false;
      questions = [];
      selectedPreset = { ...EMPTY_PRESET };
      presetCustomized = false;
      catalogExpanded = true;
      render();
      return true;
    };

    host.addEventListener('input', (event) => {
      const index = Number(event.target.dataset.questionLabel ?? event.target.dataset.questionType ?? event.target.dataset.questionRequired ?? event.target.dataset.questionHelp);
      if (Number.isInteger(index) && questions[index]) {
        if (event.target.dataset.questionLabel != null) questions[index].label = clamp(event.target.value, 120);
        if (event.target.dataset.questionType != null) questions[index].type = event.target.value;
        if (event.target.dataset.questionRequired != null) questions[index].required = event.target.value === 'true';
        if (event.target.dataset.questionHelp != null) questions[index].helpText = clamp(event.target.value, 180);
        markCustomized();
        serialize();
        renderPreview();
        renderQuality();
        renderPresetSelection();
      }
      if (event.target.dataset.questionOption) {
        const [questionIndex, optionIndex] = event.target.dataset.questionOption.split(':').map(Number);
        if (questions[questionIndex]) {
          questions[questionIndex].options[optionIndex] = clamp(event.target.value, 80);
          markCustomized();
          serialize();
          renderPresetSelection();
        }
      }
    });

    host.addEventListener('change', (event) => {
      if (event.target.matches('[data-question-type]')) render();
    });

    host.addEventListener('click', (event) => {
      if (event.target.closest('[data-quote-question-add]')) {
        questions.push(normalizeQuestion({}, questions.length));
        markCustomized();
        render();
        return;
      }
      const action = event.target.closest('[data-question-up],[data-question-down],[data-question-duplicate],[data-question-remove]');
      if (!action) return;
      const key = ['questionUp', 'questionDown', 'questionDuplicate', 'questionRemove'].find((name) => action.dataset[name] != null);
      const index = Number(action.dataset[key]);
      if (key === 'questionUp' && index > 0) [questions[index - 1], questions[index]] = [questions[index], questions[index - 1]];
      if (key === 'questionDown' && index < questions.length - 1) [questions[index + 1], questions[index]] = [questions[index], questions[index + 1]];
      if (key === 'questionDuplicate' && questions.length < 10) questions.splice(index + 1, 0, normalizeQuestion({ ...questions[index], id: uid(), label: `${questions[index].label} (cópia)` }, index + 1));
      if (key === 'questionRemove') questions.splice(index, 1);
      markCustomized();
      render();
    });

    presetHost?.addEventListener('click', (event) => {
      const applyAction = event.target.closest('[data-quote-template-apply]');
      if (applyAction) {
        applyTemplateById(applyAction.dataset.quoteTemplateApply);
        return;
      }
      if (event.target.closest('[data-quote-template-use-recommended]') && recommendedTemplateId) {
        applyTemplateById(recommendedTemplateId);
        return;
      }
      if (event.target.closest('[data-quote-template-change]')) {
        catalogExpanded = true;
        renderPresetSelection();
        renderPresetCatalog();
        presetHost.scrollIntoView?.({ block: 'start', behavior: 'smooth' });
        return;
      }
      if (event.target.closest('[data-quote-template-clear]')) clearTemplate();
    });

    presetSearch?.addEventListener('input', renderPresetCatalog);
    categoryField?.addEventListener('change', renderPresetCatalog);

    try {
      load(JSON.parse(input?.value || '{}'));
    } catch (_) {
      load([]);
    }

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

    const api = {
      getValue: serialize,
      validate,
      load,
      applyTemplateById,
      clearTemplate,
      getCatalog: () => TEMPLATE_CATALOG,
      getSelectedTemplate: () => ({ ...selectedPreset, customized: presetCustomized })
    };
    window.DokeServiceQuoteTemplateBuilder = api;
    return api;
  }

  window.DokeServiceQuoteTemplateCatalog = TEMPLATE_CATALOG;
  window.DokeInitServiceQuoteTemplateBuilder = () => mount(document);
  document.addEventListener('DOMContentLoaded', () => mount(document), { once: true });
})();
