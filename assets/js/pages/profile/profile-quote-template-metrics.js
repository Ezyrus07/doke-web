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
      return minutes + (minutes === 1 ? ' min' : ' min');
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

    function createRow(metric, dropoff) {
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
        createMetricCell('Aplicações', number(metric.applicationsCount)),
        createMetricCell('Iniciados', number(metric.formsStarted)),
        createMetricCell('Concluídos', number(metric.formsCompleted)),
        createMetricCell('Pedidos', number(metric.requestsSubmitted), 'positive'),
        createMetricCell('Abandonos', number(metric.abandonedCount), metric.abandonedCount ? 'warning' : ''),
        createMetricCell('Tempo médio', duration(metric.avgCompletionSeconds))
      );

      var insight = document.createElement('p');
      insight.className = 'quote-template-metric-row__insight';
      if (dropoff) {
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

    function render(data) {
      var metrics = Array.isArray(data && data.metrics) ? data.metrics : [];
      var dropoffs = Array.isArray(data && data.dropoff) ? data.dropoff : [];
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

      rows.replaceChildren.apply(rows, meaningful.map(function (metric) {
        return createRow(metric, dropoffByIdentity[metric.templateIdentity] || null);
      }));
      setState('ready');
    }

    function load() {
      var service = root.Doke && root.Doke.services && root.Doke.services.quoteTemplateMetrics;
      if (!service || typeof service.getOwnerDashboard !== 'function') {
        setState('error', 'O serviço de métricas ainda não foi carregado. Atualize a página e tente novamente.');
        return Promise.resolve();
      }
      setState('loading');
      if (refresh) refresh.disabled = true;
      return service.getOwnerDashboard().then(render).catch(function (loadError) {
        setState('error', loadError && loadError.message || 'Não foi possível carregar as métricas agora.');
      }).finally(function () {
        if (refresh) refresh.disabled = false;
      });
    }

    refresh && refresh.addEventListener('click', load);
    document.addEventListener('doke:supabase-sdk-ready', load);
    root.addEventListener('doke:quote-template-metric-recorded', load);
    load();
  }

  document.addEventListener('DOMContentLoaded', mount, { once: true });
  root.DokeInitProfileQuoteTemplateMetrics = mount;
})(window);
