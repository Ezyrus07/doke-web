(function (root) {
  'use strict';

  function mount() {
    var panel = document.querySelector('[data-quote-template-metrics]');
    if (!panel || panel.dataset.metricsInitialized === 'true') return;
    panel.dataset.metricsInitialized = 'true';

    var loading = panel.querySelector('[data-quote-metrics-loading]');
    var error = panel.querySelector('[data-quote-metrics-error]');
    var empty = panel.querySelector('[data-quote-metrics-empty]');
    var ready = panel.querySelector('[data-quote-metrics-ready]');
    var refresh = panel.querySelector('[data-quote-metrics-refresh]');
    var rows = panel.querySelector('[data-quote-metrics-list]');
    var sample = panel.querySelector('[data-quote-metrics-sample]');
    var smartHost = panel.querySelector('[data-quote-smart-insights]');
    var smartList = panel.querySelector('[data-quote-smart-insights-list]');
    var smartCount = panel.querySelector('[data-quote-smart-insights-count]');

    var summaryNodes = {
      applications: panel.querySelector('[data-quote-metrics-summary="applications"]'),
      started: panel.querySelector('[data-quote-metrics-summary="started"]'),
      completed: panel.querySelector('[data-quote-metrics-summary="completed"]'),
      submitted: panel.querySelector('[data-quote-metrics-summary="submitted"]'),
      conversion: panel.querySelector('[data-quote-metrics-summary="conversion"]')
    };

    function setState(state, message) {
      if (loading) loading.hidden = state !== 'loading';
      if (error) {
        error.hidden = state !== 'error';
        var copy = error.querySelector('[data-quote-metrics-error-copy]');
        if (copy) copy.textContent = message || 'Não foi possível carregar as métricas agora.';
      }
      if (empty) empty.hidden = state !== 'empty';
      if (ready) ready.hidden = state !== 'ready';
      panel.hidden = false;
      panel.dataset.metricsState = state;
    }

    function number(value) {
      return new Intl.NumberFormat('pt-BR').format(Number(value || 0));
    }

    function percent(value) {
      return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value || 0)) + '%';
    }

    function duration(seconds) {
      var value = Number(seconds || 0);
      if (!value) return '—';
      if (value < 60) return value + ' s';
      var minutes = Math.round(value / 60);
      return minutes + ' min';
    }

    function sourceLabel(metric) {
      var map = {
        preset: 'Modelo da Doke',
        preset_customized: 'Modelo Doke personalizado',
        personal_template: 'Modelo pessoal',
        personal_template_customized: 'Modelo pessoal personalizado',
        custom: 'Criado do zero',
        default: 'Formulário padrão'
      };
      return map[metric.templateSource] || 'Formulário';
    }

    function confidenceLabel(value) {
      return value === 'high' ? 'Alta confiança' : value === 'medium' ? 'Confiança média' : 'Amostra inicial';
    }

    function recommendationCopy(item) {
      var values = {
        collect_more_data: {
          title: 'Aguarde uma amostra maior',
          body: 'Este formulário ainda possui ' + number(item.formsStarted) + ' início(s). Use pelo menos 10 antes de alterar perguntas com base na taxa.',
          evidence: 'A recomendação ficará mais precisa conforme novos clientes avançarem no formulário.'
        },
        investigate_dropoff_question: {
          title: 'Revise uma pergunta com saídas concentradas',
          body: 'A pergunta “' + (item.topDropoffQuestionLabel || 'não identificada') + '” foi o último ponto registrado em ' + number(item.topDropoffCount) + ' abandono(s).',
          evidence: percent(item.topDropoffShare) + ' dos abandonos deste formulário terminaram nesse ponto. Simplifique o texto, torne-a opcional ou mova-a para o final.'
        },
        reduce_question_count: {
          title: 'Encurte o formulário',
          body: 'Este formulário possui ' + number(item.questionCount) + ' perguntas. Seus formulários mais eficientes desta categoria usam cerca de ' + number(item.recommendedQuestionCount) + '.',
          evidence: 'Conversão atual: ' + percent(item.submissionRate) + ' · referência da categoria: ' + percent(item.benchmarkSubmissionRate) + '.'
        },
        improve_completion: {
          title: 'Facilite a conclusão',
          body: 'A taxa de conclusão está abaixo da referência dos seus outros formulários da mesma categoria.',
          evidence: 'Conclusão atual: ' + percent(item.completionRate) + ' · referência: ' + percent(item.benchmarkCompletionRate) + '. Reduza campos obrigatórios e perguntas que repetem informações.'
        },
        improve_review_to_submit: {
          title: 'Reduza a hesitação antes do envio',
          body: 'Parte dos clientes chega à revisão, mas não envia o pedido.',
          evidence: percent(item.completedToSubmissionRate) + ' de quem concluiu efetivamente enviou. Deixe perguntas e expectativas mais claras antes da etapa final.'
        },
        keep_current: {
          title: 'Mantenha este formulário',
          body: 'O desempenho está igual ou acima da referência dos seus formulários da categoria.',
          evidence: 'Conversão atual: ' + percent(item.submissionRate) + ' · referência: ' + percent(item.benchmarkSubmissionRate) + '.'
        }
      };
      return values[item.code] || {
        title: 'Continue acompanhando',
        body: 'Os dados ainda não apontam uma mudança específica.',
        evidence: 'Atualize o painel quando houver mais preenchimentos.'
      };
    }

    function createMetricCell(label, value, tone) {
      var cell = document.createElement('div');
      cell.className = 'quote-template-metric-row__metric';
      if (tone) cell.dataset.tone = tone;
      var title = document.createElement('span');
      title.textContent = label;
      var strong = document.createElement('strong');
      strong.textContent = value;
      cell.append(title, strong);
      return cell;
    }

    function createRow(metric, dropoff, recommendation) {
      var article = document.createElement('article');
      article.className = 'quote-template-metric-row';

      var identity = document.createElement('header');
      identity.className = 'quote-template-metric-row__identity';
      var copy = document.createElement('div');
      var eyebrow = document.createElement('span');
      eyebrow.className = 'quote-template-metric-row__eyebrow';
      eyebrow.textContent = [metric.templateCategory, sourceLabel(metric)].filter(Boolean).join(' · ');
      var title = document.createElement('h4');
      title.textContent = metric.templateLabel;
      copy.append(eyebrow, title);
      var rate = document.createElement('span');
      rate.className = 'quote-template-metric-row__rate';
      rate.textContent = percent(metric.submissionRate);
      rate.title = 'Pedidos enviados entre os formulários iniciados';
      identity.append(copy, rate);

      var grid = document.createElement('div');
      grid.className = 'quote-template-metric-row__grid';
      grid.append(
        createMetricCell('Perguntas', number(metric.questionCount)),
        createMetricCell('Iniciados', number(metric.formsStarted)),
        createMetricCell('Concluídos', number(metric.formsCompleted)),
        createMetricCell('Pedidos', number(metric.requestsSubmitted), 'positive'),
        createMetricCell('Abandonos', number(metric.abandonedCount), metric.abandonedCount ? 'warning' : ''),
        createMetricCell('Tempo médio', duration(metric.avgCompletionSeconds))
      );

      var insight = document.createElement('p');
      insight.className = 'quote-template-metric-row__insight';
      if (recommendation) {
        var smartCopy = recommendationCopy(recommendation);
        insight.textContent = smartCopy.title + ': ' + smartCopy.evidence;
        insight.dataset.tone = recommendation.tone;
      } else if (dropoff) {
        insight.textContent = 'Última pergunta antes de ' + number(dropoff.abandonmentCount) + ' abandono(s): “' + dropoff.lastQuestionLabel + '”. Isso indica o ponto de saída, não prova que a pergunta causou o abandono.';
      } else if (metric.formsStarted < 5) {
        insight.textContent = 'Amostra inicial: aguarde mais preenchimentos antes de alterar o formulário com base nesta taxa.';
      } else if (metric.submissionRate >= 60) {
        insight.textContent = 'Boa conversão inicial: a maioria das pessoas que começa o formulário envia o pedido.';
      } else {
        insight.textContent = 'Há espaço para simplificar o formulário. Compare quantidade de perguntas, abandonos e tempo médio.';
      }

      article.append(identity, grid, insight);
      return article;
    }

    function createRecommendationCard(item) {
      var card = document.createElement('article');
      card.className = 'quote-template-insight-card';
      card.dataset.tone = item.tone || 'neutral';

      var top = document.createElement('div');
      top.className = 'quote-template-insight-card__top';
      var model = document.createElement('span');
      model.textContent = [item.templateCategory, item.templateLabel].filter(Boolean).join(' · ');
      var confidence = document.createElement('span');
      confidence.className = 'quote-template-insight-card__confidence';
      confidence.textContent = confidenceLabel(item.confidence);
      top.append(model, confidence);

      var copy = recommendationCopy(item);
      var title = document.createElement('h5');
      title.textContent = copy.title;
      var body = document.createElement('p');
      body.textContent = copy.body;
      var evidence = document.createElement('small');
      evidence.textContent = copy.evidence;

      card.append(top, title, body, evidence);
      if (item.sampleServiceExternalId && item.code !== 'collect_more_data' && item.code !== 'keep_current') {
        var action = document.createElement('a');
        action.className = 'doke-btn doke-btn--soft doke-btn--sm quote-template-insight-card__action';
        action.href = 'anunciar-servico.html?edit=' + encodeURIComponent(item.sampleServiceExternalId) + '#quote-template-builder';
        action.textContent = 'Revisar formulário';
        card.appendChild(action);
      }
      return card;
    }

    function renderRecommendations(items) {
      if (!smartHost || !smartList) return;
      var all = Array.isArray(items) ? items.slice() : [];
      var byTemplate = Object.create(null);
      all.sort(function (a, b) {
        return a.priority - b.priority || b.formsStarted - a.formsStarted;
      }).forEach(function (item) {
        if (!byTemplate[item.templateIdentity]) byTemplate[item.templateIdentity] = item;
      });
      var selected = Object.keys(byTemplate).map(function (key) { return byTemplate[key]; });
      var actionable = selected.filter(function (item) { return item.priority <= 2; });
      var visible = (actionable.length ? actionable : selected).slice(0, 3);
      smartHost.hidden = !visible.length;
      if (!visible.length) {
        smartList.replaceChildren();
        return;
      }
      if (smartCount) {
        var total = actionable.length;
        smartCount.textContent = total
          ? number(total) + (total === 1 ? ' oportunidade' : ' oportunidades')
          : 'Desempenho estável';
      }
      smartList.replaceChildren.apply(smartList, visible.map(createRecommendationCard));
    }

    function render(data) {
      var metrics = Array.isArray(data && data.metrics) ? data.metrics : [];
      var dropoffs = Array.isArray(data && data.dropoff) ? data.dropoff : [];
      var recommendations = Array.isArray(data && data.recommendations) ? data.recommendations : [];
      var meaningful = metrics.filter(function (item) {
        return item.applicationsCount || item.formsStarted || item.formsCompleted || item.requestsSubmitted;
      });
      if (!meaningful.length) {
        setState('empty');
        return;
      }

      var totals = meaningful.reduce(function (acc, item) {
        acc.applications += item.applicationsCount;
        acc.started += item.formsStarted;
        acc.completed += item.formsCompleted;
        acc.submitted += item.requestsSubmitted;
        return acc;
      }, { applications: 0, started: 0, completed: 0, submitted: 0 });
      var conversion = totals.started ? (totals.submitted / totals.started) * 100 : 0;

      if (summaryNodes.applications) summaryNodes.applications.textContent = number(totals.applications);
      if (summaryNodes.started) summaryNodes.started.textContent = number(totals.started);
      if (summaryNodes.completed) summaryNodes.completed.textContent = number(totals.completed);
      if (summaryNodes.submitted) summaryNodes.submitted.textContent = number(totals.submitted);
      if (summaryNodes.conversion) summaryNodes.conversion.textContent = percent(conversion);
      if (sample) {
        sample.textContent = totals.started < 20
          ? 'Amostra inicial · ' + number(totals.started) + ' início(s)'
          : 'Base consolidada · ' + number(totals.started) + ' início(s)';
        sample.dataset.tone = totals.started < 20 ? 'neutral' : 'positive';
      }

      var dropoffByIdentity = dropoffs.reduce(function (map, item) {
        if (!map[item.templateIdentity] || item.abandonmentCount > map[item.templateIdentity].abandonmentCount) {
          map[item.templateIdentity] = item;
        }
        return map;
      }, Object.create(null));
      var recommendationByIdentity = recommendations.reduce(function (map, item) {
        if (!map[item.templateIdentity] || item.priority < map[item.templateIdentity].priority) {
          map[item.templateIdentity] = item;
        }
        return map;
      }, Object.create(null));

      renderRecommendations(recommendations);
      rows.replaceChildren.apply(rows, meaningful.map(function (metric) {
        return createRow(
          metric,
          dropoffByIdentity[metric.templateIdentity] || null,
          recommendationByIdentity[metric.templateIdentity] || null
        );
      }));
      setState('ready');
    }

    function load(options) {
      var service = root.Doke && root.Doke.services && root.Doke.services.quoteTemplateMetrics;
      if (!service || typeof service.getOwnerDashboard !== 'function') {
        setState('error', 'O serviço de métricas ainda não foi carregado. Atualize a página e tente novamente.');
        return Promise.resolve();
      }
      setState('loading');
      if (refresh) refresh.disabled = true;
      return service.getOwnerDashboard(options || {}).then(render).catch(function (loadError) {
        setState('error', loadError && loadError.message || 'Não foi possível carregar as métricas agora.');
      }).finally(function () {
        if (refresh) refresh.disabled = false;
      });
    }

    refresh && refresh.addEventListener('click', function () { load({ force: true }); });
    document.addEventListener('doke:supabase-sdk-ready', load);
    root.addEventListener('doke:quote-template-metric-recorded', function () { load({ force: true }); });
    load();
  }

  document.addEventListener('DOMContentLoaded', mount, { once: true });
  root.DokeInitProfileQuoteTemplateMetrics = mount;
})(window);
