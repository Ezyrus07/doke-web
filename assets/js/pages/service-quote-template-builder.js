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
    const smartGuidance = host.querySelector('[data-quote-smart-guidance]');
    const smartGuidanceLabel = host.querySelector('[data-quote-smart-guidance-label]');
    const smartGuidanceTitle = host.querySelector('[data-quote-smart-guidance-title]');
    const smartGuidanceBody = host.querySelector('[data-quote-smart-guidance-body]');
    const smartGuidanceConfidence = host.querySelector('[data-quote-smart-guidance-confidence]');
    const presetHost = root.querySelector('[data-quote-template-presets]');
    const presetList = root.querySelector('[data-quote-template-list]');
    const presetSearch = root.querySelector('[data-quote-template-search]');
    const presetEmpty = root.querySelector('[data-quote-template-recommendation-empty]');
    const presetBrowser = root.querySelector('[data-quote-template-browser]');
    const recommendation = root.querySelector('[data-quote-template-recommendation]');
    const recommendationTitle = root.querySelector('[data-quote-template-recommendation-title]');
    const recommendationSummary = root.querySelector('[data-quote-template-recommendation-summary]');
    const recommendationAction = root.querySelector('[data-quote-template-use-recommended]');
    const selection = root.querySelector('[data-quote-template-selection]');
    const selectionTitle = root.querySelector('[data-quote-template-selection-title]');
    const selectionMeta = root.querySelector('[data-quote-template-selection-meta]');
    const categoryField = root.querySelector('[name="category"]');

    const personalHost = root.querySelector('[data-personal-quote-templates]');
    const personalList = root.querySelector('[data-personal-template-list]');
    const personalLoading = root.querySelector('[data-personal-template-loading]');
    const personalEmpty = root.querySelector('[data-personal-template-empty]');
    const personalError = root.querySelector('[data-personal-template-error]');
    const personalSave = root.querySelector('[data-personal-template-save]');
    const personalUpdate = root.querySelector('[data-personal-template-update]');
    const personalDialog = root.querySelector('[data-personal-template-dialog]');
    const personalForm = root.querySelector('[data-personal-template-form]');
    const personalName = root.querySelector('[data-personal-template-name]');
    const personalDialogTitle = root.querySelector('[data-personal-template-dialog-title]');
    const personalDialogDescription = root.querySelector('[data-personal-template-dialog-description]');
    const personalDialogError = root.querySelector('[data-personal-template-dialog-error]');
    const personalDialogSubmit = root.querySelector('[data-personal-template-dialog-submit]');
    const personalDialogCancel = root.querySelector('[data-personal-template-dialog-cancel]');

    let questions = [];
    let selectedPreset = { ...EMPTY_PRESET, kind: '' };
    let presetCustomized = false;
    let recommendedTemplateId = '';
    let catalogExpanded = true;
    let personalTemplates = [];
    let personalState = 'loading';
    let personalMutationPending = false;
    let dialogMode = 'create';
    let dialogTemplateId = '';
    let smartGuidanceTimer = 0;
    let smartGuidanceRequest = 0;
    let aiOptimizationRunId = '';


    const getPersonalService = () => window.Doke?.services?.professionalQuoteTemplates || null;
    const getMetricsService = () => window.Doke?.services?.quoteTemplateMetrics || null;
    const getEditingServiceId = () => {
      const query = new URLSearchParams(window.location.search);
      return query.get('edit') || query.get('id') || root.querySelector('[data-service-edit-id]')?.value || '';
    };
    const recordTemplateApplication = (template, kind) => {
      const metrics = getMetricsService();
      if (!metrics?.recordApplication || !template?.id) return;
      metrics.recordApplication({
        templateId: template.id,
        templateKind: kind,
        templateLabel: template.title || template.name || 'Modelo de formulário',
        templateCategory: template.category || categoryField?.value || '',
        questionCount: Array.isArray(template.questions)
          ? template.questions.length
          : (Array.isArray(template.template?.questions) ? template.template.questions.length : 0),
        serviceExternalId: getEditingServiceId()
      }).catch((error) => {
        window.console?.warn?.('[Doke quote metrics] Não foi possível registrar a aplicação do modelo.', error);
      });
    };
    const smartCopy = (item) => {
      const copies = {
        collect_more_data: {
          title: 'Aguarde uma amostra maior',
          body: `Há ${item.formsStarted || 0} início(s) registrados. Use pelo menos 10 antes de alterar o formulário com base na taxa.`
        },
        investigate_dropoff_question: {
          title: 'Revise uma pergunta com saídas concentradas',
          body: `“${item.topDropoffQuestionLabel || 'Pergunta não identificada'}” aparece como último ponto em ${item.topDropoffCount || 0} abandono(s). Considere simplificar, tornar opcional ou mover para o final.`
        },
        reduce_question_count: {
          title: 'Considere reduzir perguntas',
          body: `Este formulário possui ${questions.length}. Seus formulários mais eficientes desta categoria usam cerca de ${item.recommendedQuestionCount || 6}.`
        },
        improve_completion: {
          title: 'Facilite a conclusão',
          body: `Sua conclusão está em ${item.completionRate || 0}%, abaixo da referência de ${item.benchmarkCompletionRate || 0}%. Evite perguntas repetidas e obrigatórias sem necessidade.`
        },
        improve_review_to_submit: {
          title: 'Reduza dúvidas antes do envio',
          body: `Apenas ${item.completedToSubmissionRate || 0}% de quem chega à revisão envia o pedido. Torne as perguntas e o escopo mais claros.`
        },
        keep_current: {
          title: 'Mantenha a estrutura atual',
          body: `A conversão de ${item.submissionRate || 0}% está igual ou acima da referência dos seus formulários da categoria.`
        }
      };
      return copies[item?.code] || null;
    };

    const setSmartGuidance = (item, fallback) => {
      if (!smartGuidance) return;
      const copy = item ? smartCopy(item) : fallback;
      smartGuidance.hidden = !copy;
      if (!copy) return;
      smartGuidance.dataset.tone = item?.tone || fallback?.tone || 'neutral';
      if (smartGuidanceLabel) smartGuidanceLabel.textContent = item ? 'Sugestão baseada nos seus dados' : 'Referência da categoria';
      if (smartGuidanceTitle) smartGuidanceTitle.textContent = copy.title || '';
      if (smartGuidanceBody) smartGuidanceBody.textContent = copy.body || '';
      if (smartGuidanceConfidence) {
        const confidence = item?.confidence;
        smartGuidanceConfidence.textContent = confidence === 'high'
          ? 'Alta confiança'
          : confidence === 'medium'
            ? 'Confiança média'
            : (item ? 'Amostra inicial' : 'Referência inicial');
      }
    };

    const refreshSmartGuidance = () => {
      window.clearTimeout(smartGuidanceTimer);
      smartGuidanceTimer = window.setTimeout(() => {
        const service = getMetricsService();
        if (!service?.getBuilderGuidance || !smartGuidance) return;
        const source = selectedPreset.kind === 'personal'
          ? (presetCustomized ? 'personal_template_customized' : 'personal_template')
          : selectedPreset.kind === 'doke'
            ? (presetCustomized ? 'preset_customized' : 'preset')
            : (questions.length ? 'custom' : 'default');
        const requestId = ++smartGuidanceRequest;
        service.getBuilderGuidance({
          templateKind: selectedPreset.kind || (questions.length ? 'custom' : 'default'),
          templateId: selectedPreset.id || '',
          source,
          category: categoryField?.value || selectedPreset.category || '',
          questionCount: questions.length
        }).then((result) => {
          if (requestId !== smartGuidanceRequest) return;
          const recommendation = Array.isArray(result?.recommendations)
            ? result.recommendations.slice().sort((a, b) => a.priority - b.priority)[0]
            : null;
          if (recommendation) {
            setSmartGuidance(recommendation);
            return;
          }
          const benchmark = result?.benchmark;
          if (benchmark && benchmark.formsStarted >= 10 && questions.length) {
            const recommended = benchmark.recommendedQuestionCount || 6;
            setSmartGuidance(null, {
              tone: questions.length > recommended ? 'warning' : 'positive',
              title: questions.length > recommended ? 'Seu formulário está acima da referência' : 'Quantidade alinhada à categoria',
              body: `Seus formulários de ${benchmark.templateCategory || 'esta categoria'} com melhor desempenho usam cerca de ${recommended} pergunta(s). A referência atual de envio é ${benchmark.submissionRate || 0}%.`
            });
            return;
          }
          setSmartGuidance(null, null);
        }).catch(() => setSmartGuidance(null, null));
      }, 280);
    };

    const getTemplateById = (templateId) => TEMPLATE_CATALOG.find((template) => template.id === templateId) || null;
    const getPersonalTemplateById = (templateId) => personalTemplates.find((template) => template.id === templateId) || null;

    const markCustomized = () => {
      if (selectedPreset.id) presetCustomized = true;
    };

    const serialize = (options = {}) => {
      questions = questions.slice(0, 10).map(normalizeQuestion);
      const signature = JSON.stringify(questions);
      let hash = 2166136261;
      for (let index = 0; index < signature.length; index += 1) {
        hash ^= signature.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      const hasQuestions = questions.length > 0;
      let source = hasQuestions ? 'custom' : 'default';
      if (selectedPreset.kind === 'personal') source = presetCustomized ? 'personal_template_customized' : 'personal_template';
      else if (selectedPreset.kind === 'doke') source = presetCustomized ? 'preset_customized' : 'preset';
      if (aiOptimizationRunId) {
        if (selectedPreset.kind === 'personal') source = 'personal_template_ai_customized';
        else if (selectedPreset.kind === 'doke') source = 'preset_ai_customized';
        else source = 'custom_ai_optimized';
      }
      const value = {
        version: hasQuestions ? `v_${(hash >>> 0).toString(36)}` : 1,
        status: hasQuestions ? 'active' : 'default',
        source,
        templateKind: selectedPreset.kind || null,
        templateId: selectedPreset.id || null,
        personalTemplateId: selectedPreset.kind === 'personal' ? selectedPreset.id : null,
        templateLabel: selectedPreset.title || null,
        templateCategory: selectedPreset.category || null,
        aiOptimizationRunId: aiOptimizationRunId || null,
        questions
      };
      const emit = options.emit !== false;
      if (input) {
        input.value = JSON.stringify(value);
        if (emit) input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (emit) {
        window.dispatchEvent(new CustomEvent('doke:service-quote-template-changed', {
          detail: {
            templateId: value.templateId,
            templateKind: value.templateKind,
            templateLabel: value.templateLabel,
            source: value.source,
            questionCount: questions.length
          }
        }));
      }
      return value;
    };

    const reusablePayload = () => ({
      version: 1,
      status: 'active',
      source: 'personal_template',
      questions: questions.slice(0, 10).map(normalizeQuestion)
    });

    const optionFields = (question, index) => {
      if (!['single_choice', 'multiple_choice'].includes(question.type)) return '';
      const values = [...question.options, '', '', '', '', ''].slice(0, 5);
      const filledCount = values.filter((value) => String(value || '').trim()).length;
      const countLabel = filledCount
        ? `${filledCount} ${filledCount === 1 ? 'opção cadastrada' : 'opções cadastradas'}`
        : 'Adicione pelo menos duas opções';
      return `<details class="quote-builder__options quote-builder__wide" ${filledCount < 2 ? 'open' : ''}>
        <summary><span>Opções de resposta</span><small>${countLabel}</small></summary>
        <div class="quote-builder__options-grid">${values.map((value, optionIndex) => `<input class="doke-input" maxlength="80" data-question-option="${index}:${optionIndex}" value="${escapeAttribute(value)}" placeholder="Opção ${optionIndex + 1}">`).join('')}</div>
      </details>`;
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
      if (personalSave) personalSave.disabled = !total || personalMutationPending;
      if (personalUpdate) personalUpdate.disabled = !total || personalMutationPending;
    };

    const renderPresetSelection = () => {
      const hasPreset = Boolean(selectedPreset.id);
      if (selection) selection.hidden = !hasPreset;
      if (presetBrowser) presetBrowser.hidden = hasPreset && !catalogExpanded;
      if (selectionTitle) selectionTitle.textContent = selectedPreset.title || '';
      if (selectionMeta) {
        const ownerLabel = selectedPreset.kind === 'personal' ? 'Seu modelo salvo' : 'Modelo da Doke';
        selectionMeta.textContent = hasPreset
          ? `${questions.length} perguntas · ${presetCustomized ? `${ownerLabel} personalizado neste anúncio` : ownerLabel}`
          : '';
      }
      if (personalUpdate) personalUpdate.hidden = selectedPreset.kind !== 'personal';
      presetList?.querySelectorAll('[data-quote-template-card]').forEach((card) => {
        const active = selectedPreset.kind === 'doke' && card.dataset.quoteTemplateCard === selectedPreset.id;
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
      action.textContent = selectedPreset.kind === 'doke' && selectedPreset.id === template.id ? 'Modelo aplicado' : 'Usar modelo';
      footer.append(time, action);

      card.append(top, title, summary, questionPreview, footer);
      return card;
    };

    const renderPresetCatalog = () => {
      const selectedCategory = normalizeText(categoryField?.value);
      const recommended = TEMPLATE_CATALOG.find((template) => normalizeText(template.category) === selectedCategory) || null;
      recommendedTemplateId = recommended?.id || '';

      if (recommendation) recommendation.hidden = !recommended;
      if (recommendationTitle) recommendationTitle.textContent = recommended?.title || '';
      if (recommendationSummary) recommendationSummary.textContent = recommended?.summary || '';
      if (recommendationAction) recommendationAction.disabled = !recommended;
      if (presetEmpty) presetEmpty.hidden = Boolean(recommended);
      if (presetList) presetList.replaceChildren();
      renderPresetSelection();
    };

    const setPersonalError = (message) => {
      if (!personalError) return;
      personalError.textContent = message || '';
      personalError.hidden = !message;
    };

    const createPersonalCard = (template) => {
      const card = document.createElement('article');
      card.className = 'quote-personal-template-card';
      card.dataset.personalTemplateCard = template.id;
      const active = selectedPreset.kind === 'personal' && selectedPreset.id === template.id;
      card.classList.toggle('is-active', active);
      card.setAttribute('aria-current', active ? 'true' : 'false');

      const head = document.createElement('div');
      head.className = 'quote-personal-template-card__head';
      const identity = document.createElement('div');
      const eyebrow = document.createElement('span');
      eyebrow.textContent = template.category || 'Sem categoria';
      const title = document.createElement('h4');
      title.textContent = template.name;
      identity.append(eyebrow, title);
      const badge = document.createElement('small');
      badge.textContent = `${template.questionCount} ${template.questionCount === 1 ? 'pergunta' : 'perguntas'}`;
      head.append(identity, badge);

      const previewList = document.createElement('ul');
      previewList.className = 'quote-personal-template-card__questions';
      (template.template?.questions || []).slice(0, 3).forEach((question) => {
        const item = document.createElement('li');
        item.textContent = question.label;
        previewList.appendChild(item);
      });

      const actions = document.createElement('footer');
      actions.className = 'quote-personal-template-card__actions';
      const use = document.createElement('button');
      use.type = 'button';
      use.className = 'doke-btn doke-btn--soft';
      use.dataset.personalTemplateApply = template.id;
      use.textContent = active ? 'Modelo aplicado' : 'Usar modelo';
      const manage = document.createElement('div');
      const rename = document.createElement('button');
      rename.type = 'button';
      rename.className = 'doke-btn doke-btn--ghost doke-btn--sm';
      rename.dataset.personalTemplateRename = template.id;
      rename.textContent = 'Renomear';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'doke-btn doke-btn--danger doke-btn--sm';
      remove.dataset.personalTemplateDelete = template.id;
      remove.textContent = 'Excluir';
      manage.append(rename, remove);
      actions.append(use, manage);
      card.append(head, previewList, actions);
      return card;
    };

    const renderPersonalTemplates = () => {
      if (!personalHost) return;
      if (personalLoading) personalLoading.hidden = personalState !== 'loading';
      if (personalList) personalList.hidden = personalState !== 'ready' || personalTemplates.length === 0;
      if (personalEmpty) personalEmpty.hidden = personalState !== 'ready' || personalTemplates.length > 0;
      if (personalList && personalState === 'ready') {
        personalList.replaceChildren(...personalTemplates.map(createPersonalCard));
      }
      renderPresetSelection();
    };

    const render = () => {
      if (list) {
        list.innerHTML = questions.map((question, index) => `<article class="quote-builder__question" data-question-index="${index}">
          <div class="quote-builder__question-head">
            <div class="quote-builder__question-identity">
              <strong>Pergunta ${index + 1}</strong>
              <span>${TYPE_LABELS[question.type]}</span>
            </div>
            <div class="quote-builder__actions" aria-label="Ações da pergunta ${index + 1}">
              <button type="button" class="doke-icon-btn quote-builder__action" data-question-up="${index}" aria-label="Mover para cima" title="Mover para cima"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg></button>
              <button type="button" class="doke-icon-btn quote-builder__action" data-question-down="${index}" aria-label="Mover para baixo" title="Mover para baixo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg></button>
              <button type="button" class="doke-icon-btn quote-builder__action" data-question-duplicate="${index}" aria-label="Duplicar pergunta" title="Duplicar"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="10" height="10" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg></button>
              <button type="button" class="doke-icon-btn quote-builder__action quote-builder__action--danger" data-question-remove="${index}" aria-label="Remover pergunta" title="Remover"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></svg></button>
            </div>
          </div>
          <div class="quote-builder__grid">
            <label class="doke-field quote-builder__wide"><span>Texto da pergunta</span><input class="doke-input" maxlength="120" data-question-label="${index}" value="${escapeAttribute(question.label)}" placeholder="Ex.: Quantos cômodos serão atendidos?"></label>
            <div class="quote-builder__settings quote-builder__wide">
              <label class="doke-field"><span>Tipo de resposta</span><select class="doke-select" data-ui-select data-question-type="${index}">${Object.entries(TYPE_LABELS).map(([value, label]) => `<option value="${value}" ${value === question.type ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
              <label class="quote-builder__required">
                <span class="quote-builder__required-copy"><strong>Obrigatória</strong><small>O cliente precisa responder para continuar.</small></span>
                <input type="checkbox" data-question-required="${index}" value="true" ${question.required ? 'checked' : ''}>
                <span class="quote-builder__switch" aria-hidden="true"></span>
              </label>
            </div>
            <details class="quote-builder__helper quote-builder__wide" ${question.helpText ? 'open' : ''}>
              <summary>Adicionar orientação ao cliente <span>Opcional</span></summary>
              <label class="doke-field"><span>Texto auxiliar</span><input class="doke-input" maxlength="180" data-question-help="${index}" value="${escapeAttribute(question.helpText)}" placeholder="Explique brevemente o que o cliente deve informar."></label>
            </details>
            ${optionFields(question, index)}
          </div>
        </article>`).join('');
        window.DokeUiSelect?.refresh?.(list);
      }
      if (empty) empty.hidden = questions.length > 0;
      if (add) add.disabled = questions.length >= 10;
      renderPreview();
      renderQuality();
      renderPresetSelection();
      renderPersonalTemplates();
      serialize();
      refreshSmartGuidance();
    };

    const load = (template) => {
      const source = template?.questions || template || [];
      questions = Array.isArray(source) ? source.slice(0, 10).map(normalizeQuestion) : [];
      const catalogTemplate = getTemplateById(clamp(template?.templateId, 80));
      const isPersonal = template?.templateKind === 'personal'
        || String(template?.source || '').startsWith('personal_template')
        || Boolean(template?.personalTemplateId);
      if (catalogTemplate && !isPersonal) {
        selectedPreset = { id: catalogTemplate.id, title: catalogTemplate.title, category: catalogTemplate.category, summary: catalogTemplate.summary, kind: 'doke' };
      } else {
        selectedPreset = {
          id: clamp(template?.personalTemplateId || template?.templateId, 80),
          title: clamp(template?.templateLabel, 120),
          category: clamp(template?.templateCategory, 80),
          summary: '',
          kind: isPersonal ? 'personal' : (template?.templateId ? 'doke' : '')
        };
      }
      const loadedSource = clamp(template?.source, 50);
      const loadedFromAi = ['preset_ai_customized', 'personal_template_ai_customized', 'custom_ai_optimized'].includes(loadedSource);
      presetCustomized = ['preset_customized', 'personal_template_customized'].includes(loadedSource) || loadedFromAi;
      aiOptimizationRunId = loadedFromAi ? clamp(template?.aiOptimizationRunId, 80) : '';
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
        summary: template.summary,
        kind: 'doke'
      };
      presetCustomized = false;
      aiOptimizationRunId = '';
      catalogExpanded = false;
      render();
      if (options.track !== false) recordTemplateApplication(template, 'doke');
      host.scrollIntoView?.({ block: 'start', behavior: options.behavior || 'smooth' });
      return true;
    };

    const applyPersonalTemplateById = (templateId, options = {}) => {
      const template = getPersonalTemplateById(templateId);
      if (!template) return false;
      if (!options.force && !shouldReplaceQuestions(template.id)) return false;
      questions = (template.template?.questions || []).map((question, index) => normalizeQuestion({
        ...question,
        id: `personal_${template.id}_${index}_${question.id || 'question'}`.slice(0, 80)
      }, index));
      selectedPreset = {
        id: template.id,
        title: template.name,
        category: template.category,
        summary: '',
        kind: 'personal'
      };
      presetCustomized = false;
      aiOptimizationRunId = '';
      catalogExpanded = false;
      render();
      if (options.track !== false) recordTemplateApplication(template, 'personal');
      host.scrollIntoView?.({ block: 'start', behavior: options.behavior || 'smooth' });
      return true;
    };

    const clearTemplate = (options = {}) => {
      if (!options.force && questions.length && typeof window.confirm === 'function' && !window.confirm('Remover todas as perguntas e começar do zero?')) return false;
      questions = [];
      selectedPreset = { ...EMPTY_PRESET, kind: '' };
      presetCustomized = false;
      aiOptimizationRunId = '';
      catalogExpanded = true;
      render();
      return true;
    };

    const closePersonalDialog = () => {
      if (!personalDialog) return;
      if (typeof personalDialog.close === 'function' && personalDialog.open) personalDialog.close();
      else personalDialog.removeAttribute('open');
      if (personalDialogError) {
        personalDialogError.hidden = true;
        personalDialogError.textContent = '';
      }
    };

    const openPersonalDialog = (mode, templateId = '') => {
      if (!personalDialog || !personalName) return;
      dialogMode = mode;
      dialogTemplateId = templateId;
      const existing = getPersonalTemplateById(templateId);
      if (mode === 'rename') {
        if (personalDialogTitle) personalDialogTitle.textContent = 'Renomear meu modelo';
        if (personalDialogDescription) personalDialogDescription.textContent = 'O novo nome aparecerá somente na sua biblioteca de modelos.';
        if (personalDialogSubmit) personalDialogSubmit.textContent = 'Salvar nome';
        personalName.value = existing?.name || '';
      } else {
        if (personalDialogTitle) personalDialogTitle.textContent = 'Salvar como meu modelo';
        if (personalDialogDescription) personalDialogDescription.textContent = 'Dê um nome fácil de reconhecer. O modelo ficará disponível somente para sua conta.';
        if (personalDialogSubmit) personalDialogSubmit.textContent = 'Salvar modelo';
        personalName.value = selectedPreset.title
          ? `${selectedPreset.title} personalizado`
          : `${categoryField?.value || 'Meu formulário'} personalizado`;
      }
      if (personalDialogError) {
        personalDialogError.hidden = true;
        personalDialogError.textContent = '';
      }
      if (typeof personalDialog.showModal === 'function') personalDialog.showModal();
      else personalDialog.setAttribute('open', '');
      window.setTimeout(() => personalName.focus(), 0);
    };

    const setPersonalMutation = (pending) => {
      personalMutationPending = pending;
      if (personalDialogSubmit) personalDialogSubmit.disabled = pending;
      renderQuality();
    };

    const loadPersonalTemplates = () => {
      const service = getPersonalService();
      if (!service?.list) {
        personalState = 'error';
        setPersonalError('Seus modelos não estão disponíveis nesta sessão. Atualize a página e tente novamente.');
        renderPersonalTemplates();
        return Promise.resolve([]);
      }
      personalState = 'loading';
      setPersonalError('');
      renderPersonalTemplates();
      return service.list().then((items) => {
        personalTemplates = Array.isArray(items) ? items : [];
        personalState = 'ready';
        const selected = selectedPreset.kind === 'personal' ? getPersonalTemplateById(selectedPreset.id) : null;
        if (selected) {
          selectedPreset.title = selected.name;
          selectedPreset.category = selected.category;
        }
        renderPersonalTemplates();
        return personalTemplates;
      }).catch((error) => {
        personalState = 'error';
        setPersonalError(error?.message || 'Não foi possível carregar seus modelos.');
        renderPersonalTemplates();
        return [];
      });
    };

    const saveCurrentAsPersonal = (name) => {
      const service = getPersonalService();
      if (!service?.create) return Promise.reject(new Error('O salvamento de modelos não está disponível.'));
      return service.create({
        name,
        category: categoryField?.value || selectedPreset.category || '',
        template: reusablePayload()
      }).then((saved) => {
        personalTemplates = [saved, ...personalTemplates.filter((item) => item.id !== saved.id)];
        personalState = 'ready';
        selectedPreset = { id: saved.id, title: saved.name, category: saved.category, summary: '', kind: 'personal' };
        presetCustomized = false;
        catalogExpanded = false;
        render();
        window.dispatchEvent(new CustomEvent('doke:personal-quote-templates-changed', { detail: { action: 'created', template: saved } }));
        return saved;
      });
    };

    const renamePersonal = (templateId, name) => {
      const service = getPersonalService();
      if (!service?.rename) return Promise.reject(new Error('A edição de modelos não está disponível.'));
      return service.rename(templateId, name).then((saved) => {
        personalTemplates = personalTemplates.map((item) => item.id === saved.id ? saved : item);
        if (selectedPreset.kind === 'personal' && selectedPreset.id === saved.id) selectedPreset.title = saved.name;
        render();
        window.dispatchEvent(new CustomEvent('doke:personal-quote-templates-changed', { detail: { action: 'renamed', template: saved } }));
        return saved;
      });
    };

    const updateSelectedPersonal = () => {
      const service = getPersonalService();
      if (selectedPreset.kind !== 'personal' || !selectedPreset.id) return Promise.reject(new Error('Aplique um modelo pessoal antes de atualizá-lo.'));
      if (!service?.updateTemplate) return Promise.reject(new Error('A atualização de modelos não está disponível.'));
      setPersonalMutation(true);
      setPersonalError('');
      return service.updateTemplate(selectedPreset.id, {
        category: categoryField?.value || selectedPreset.category || '',
        template: reusablePayload()
      }).then((saved) => {
        personalTemplates = personalTemplates.map((item) => item.id === saved.id ? saved : item);
        selectedPreset.title = saved.name;
        selectedPreset.category = saved.category;
        presetCustomized = false;
        render();
        window.dispatchEvent(new CustomEvent('doke:personal-quote-templates-changed', { detail: { action: 'updated', template: saved } }));
        return saved;
      }).catch((error) => {
        setPersonalError(error?.message || 'Não foi possível atualizar o modelo.');
        throw error;
      }).finally(() => setPersonalMutation(false));
    };

    const deletePersonal = (templateId) => {
      const template = getPersonalTemplateById(templateId);
      if (!template) return Promise.resolve(false);
      if (typeof window.confirm === 'function' && !window.confirm(`Excluir o modelo “${template.name}”? Os anúncios que já usam essas perguntas não serão alterados.`)) return Promise.resolve(false);
      const service = getPersonalService();
      if (!service?.remove) return Promise.reject(new Error('A exclusão de modelos não está disponível.'));
      personalMutationPending = true;
      setPersonalError('');
      renderQuality();
      return service.remove(templateId).then(() => {
        personalTemplates = personalTemplates.filter((item) => item.id !== templateId);
        if (selectedPreset.kind === 'personal' && selectedPreset.id === templateId) {
          selectedPreset = { ...EMPTY_PRESET, kind: '' };
          presetCustomized = false;
        }
        render();
        window.dispatchEvent(new CustomEvent('doke:personal-quote-templates-changed', { detail: { action: 'deleted', templateId } }));
        return true;
      }).catch((error) => {
        setPersonalError(error?.message || 'Não foi possível excluir o modelo.');
        throw error;
      }).finally(() => {
        personalMutationPending = false;
        renderQuality();
      });
    };

    host.addEventListener('input', (event) => {
      const index = Number(event.target.dataset.questionLabel ?? event.target.dataset.questionType ?? event.target.dataset.questionRequired ?? event.target.dataset.questionHelp);
      if (Number.isInteger(index) && questions[index]) {
        if (event.target.dataset.questionLabel != null) questions[index].label = clamp(event.target.value, 120);
        if (event.target.dataset.questionType != null) questions[index].type = event.target.value;
        if (event.target.dataset.questionRequired != null) questions[index].required = event.target.type === 'checkbox' ? event.target.checked : event.target.value === 'true';
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
        recommendation?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
        return;
      }
      if (event.target.closest('[data-quote-template-clear]')) clearTemplate();
    });

    personalHost?.addEventListener('click', (event) => {
      const applyAction = event.target.closest('[data-personal-template-apply]');
      if (applyAction) {
        applyPersonalTemplateById(applyAction.dataset.personalTemplateApply);
        return;
      }
      const renameAction = event.target.closest('[data-personal-template-rename]');
      if (renameAction) {
        openPersonalDialog('rename', renameAction.dataset.personalTemplateRename);
        return;
      }
      const deleteAction = event.target.closest('[data-personal-template-delete]');
      if (deleteAction) {
        deletePersonal(deleteAction.dataset.personalTemplateDelete).catch(() => {});
        return;
      }
      if (event.target.closest('[data-personal-template-save]')) openPersonalDialog('create');
    });

    personalUpdate?.addEventListener('click', () => {
      updateSelectedPersonal().catch(() => {});
    });

    personalDialogCancel?.addEventListener('click', closePersonalDialog);
    personalDialog?.addEventListener('cancel', (event) => {
      event.preventDefault();
      closePersonalDialog();
    });
    personalForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = clamp(personalName?.value, 60);
      if (name.length < 3) {
        if (personalDialogError) {
          personalDialogError.textContent = 'Informe um nome com pelo menos 3 caracteres.';
          personalDialogError.hidden = false;
        }
        personalName?.focus();
        return;
      }
      setPersonalMutation(true);
      const operation = dialogMode === 'rename'
        ? renamePersonal(dialogTemplateId, name)
        : saveCurrentAsPersonal(name);
      operation.then(() => closePersonalDialog()).catch((error) => {
        if (personalDialogError) {
          personalDialogError.textContent = error?.message || 'Não foi possível salvar o modelo.';
          personalDialogError.hidden = false;
        }
      }).finally(() => setPersonalMutation(false));
    });

    presetSearch?.addEventListener('input', renderPresetCatalog);
    categoryField?.addEventListener('change', renderPresetCatalog);
    categoryField?.addEventListener('change', refreshSmartGuidance);

    try {
      load(JSON.parse(input?.value || '{}'));
    } catch (_) {
      load([]);
    }
    loadPersonalTemplates();

    const applyAiOptimization = (nextQuestions, metadata = {}) => {
      const source = Array.isArray(nextQuestions) ? nextQuestions : [];
      const normalized = source.slice(0, 10).map(normalizeQuestion).filter((question) => question.label);
      if (!normalized.length) throw new Error('A otimização não pode remover todas as perguntas.');
      questions = normalized;
      aiOptimizationRunId = clamp(metadata.runId, 80);
      if (!aiOptimizationRunId) throw new Error('A análise de IA não foi identificada.');
      if (selectedPreset.id) presetCustomized = true;
      render();
      return serialize();
    };

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
      getValue: () => serialize({ emit: false }),
      validate,
      load,
      applyTemplateById,
      applyPersonalTemplateById,
      clearTemplate,
      applyAiOptimization,
      reloadPersonalTemplates: loadPersonalTemplates,
      getCatalog: () => TEMPLATE_CATALOG,
      getPersonalTemplates: () => personalTemplates.map((template) => ({ ...template })),
      getSelectedTemplate: () => ({ ...selectedPreset, customized: presetCustomized })
    };
    window.DokeServiceQuoteTemplateBuilder = api;
    return api;
  }

  window.DokeServiceQuoteTemplateCatalog = TEMPLATE_CATALOG;
  window.DokeInitServiceQuoteTemplateBuilder = () => mount(document);
  document.addEventListener('DOMContentLoaded', () => mount(document), { once: true });
})();
