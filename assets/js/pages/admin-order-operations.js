/* Doke order event operations
 * Responsibility: authenticated admin/support projection for worker health,
 * queue inspection and controlled event reprocessing.
 */
(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var root = null;
  var dashboard = null;
  var initializedRoot = null;
  var loadPromise = null;
  var guarded = false;
  var eventsBound = false;
  var activeFilter = 'all';
  var searchTerm = '';
  var autoRefreshTimer = null;
  var activeRunbookPreview = null;
  var activePostIncidentReviewId = null;
  var activeChangeId = null;
  var activeChangeAction = '';
  var AUTO_REFRESH_MS = 60000;
  var OPERATIONS_TIMEOUT_MS = 12000;

  function q(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function clean(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function number(value) {
    var parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function repository() {
    return Doke.repositories && Doke.repositories.orderEventOperations || null;
  }

  function accessService() {
    return Doke.services && Doke.services.adminAccess || null;
  }

  function lifecycle() {
    return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null;
  }

  function refreshNodes() {
    root = q('[data-admin-ops-root]');
    return root;
  }

  function withTimeout(operation, message) {
    var timer = null;
    return Promise.race([
      Promise.resolve(operation),
      new Promise(function (_, reject) {
        timer = window.setTimeout(function () {
          reject(new Error(message || 'A operação demorou mais do que o esperado.'));
        }, OPERATIONS_TIMEOUT_MS);
      })
    ]).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function setSurface(state, message) {
    if (!root) return;
    var pending = q('[data-admin-ops-pending]', root);
    var content = q('[data-admin-ops-content]', root);
    var error = q('[data-admin-ops-error]', root);
    var busy = state === 'guard-pending' || state === 'loading' || state === 'refreshing';

    root.dataset.viewState = state;
    root.setAttribute('aria-busy', busy ? 'true' : 'false');
    if (pending) pending.hidden = !busy || state === 'refreshing';
    if (content) content.hidden = state === 'guard-pending' || state === 'loading' || state === 'error';
    if (error) error.hidden = state !== 'error';

    if (pending) {
      var title = q('[data-admin-ops-pending-title]', pending);
      var copy = q('[data-admin-ops-pending-message]', pending);
      if (state === 'guard-pending') {
        if (title) title.textContent = 'Validando acesso operacional';
        if (copy) copy.textContent = 'Confirmando sua sessão e as permissões de suporte.';
      } else if (state === 'loading') {
        if (title) title.textContent = 'Carregando saúde do worker';
        if (copy) copy.textContent = 'Consultando fila, tentativas, dead-letters e execuções recentes.';
      }
    }

    if (state === 'error' && error) {
      var errorMessage = q('[data-admin-ops-error-message]', error);
      if (errorMessage) errorMessage.textContent = message || 'Não foi possível carregar a operação de pedidos.';
      window.requestAnimationFrame(function () { error.focus(); });
    }
  }

  function beginPage(source) {
    var api = lifecycle();
    if (api && api.page) api.page.begin({ page: 'admin-pedidos-operacao', source: source || 'admin-order-operations' });
  }

  function readyPage() {
    var api = lifecycle();
    if (api && api.page) api.page.ready({
      page: 'admin-pedidos-operacao',
      source: 'admin-order-operations',
      hasItems: Boolean(dashboard && Array.isArray(dashboard.events) && dashboard.events.length)
    });
  }

  function failPage(error) {
    var api = lifecycle();
    if (api && api.page) api.page.fail(error, { page: 'admin-pedidos-operacao', source: 'admin-order-operations' });
  }

  function showToast(message, tone) {
    var toast = q('[data-admin-ops-toast]');
    if (!toast) return;
    toast.textContent = clean(message);
    toast.dataset.tone = tone || 'info';
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 4200);
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Não informado';
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatPercent(value) {
    if (value === null || value === undefined || value === '') return '—';
    return number(value).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + '%';
  }

  function formatDurationMs(value) {
    var ms = number(value);
    if (!ms) return '—';
    if (ms < 1000) return Math.round(ms) + ' ms';
    var seconds = ms / 1000;
    if (seconds < 60) return seconds.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' s';
    var minutes = Math.floor(seconds / 60);
    var remaining = Math.round(seconds % 60);
    return minutes + ' min' + (remaining ? ' ' + remaining + ' s' : '');
  }

  function deadlineLabel(value) {
    var date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Prazo não definido';
    var diff = date.getTime() - Date.now();
    var minutes = Math.round(Math.abs(diff) / 60000);
    if (diff < 0) return 'Prazo vencido há ' + Math.max(1, minutes) + ' min';
    if (minutes < 60) return 'Prazo em ' + Math.max(1, minutes) + ' min';
    return 'Prazo em ' + Math.round(minutes / 60) + ' h';
  }

  function formatDurationSeconds(value) {
    if (value === null || value === undefined || value === '') return '—';
    var seconds = Math.max(0, number(value));
    if (seconds < 60) return Math.round(seconds) + ' s';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var remaining = minutes % 60;
    return hours + ' h' + (remaining ? ' ' + remaining + ' min' : '');
  }

  function rootCauseLabel(value) {
    var labels = {
      code: 'Código',
      dependency: 'Dependência externa',
      data: 'Dados',
      configuration: 'Configuração',
      capacity: 'Capacidade',
      process: 'Processo',
      human: 'Ação humana',
      unknown: 'Não determinada'
    };
    return labels[clean(value).toLowerCase()] || statusLabel(value);
  }

  function statusLabel(value) {
    var labels = {
      ready: 'Pronto',
      failed: 'Retry',
      processing: 'Processando',
      completed: 'Concluído',
      dead_letter: 'Dead-letter',
      running: 'Executando',
      partial: 'Parcial',
      healthy: 'Saudável',
      working: 'Em processamento',
      degraded: 'Atenção',
      critical: 'Crítico',
      idle: 'Sem eventos',
      support: 'Suporte',
      admin: 'Administrador',
      unassigned: 'Sem responsável',
      acknowledged: 'Reconhecido',
      escalated: 'Escalonado',
      resolved: 'Resolvido',
      system: 'Automação',
      previewed: 'Prévia gerada',
      executing: 'Executando',
      succeeded: 'Concluído',
      verification_failed: 'Verificação pendente',
      expired: 'Prévia expirada',
      read_only: 'Somente leitura',
      low: 'Risco baixo',
      elevated: 'Risco elevado',
      draft: 'Rascunho',
      todo: 'A fazer',
      in_progress: 'Em andamento',
      done: 'Concluída',
      cancelled: 'Cancelada',
      met: 'Dentro da meta',
      breached: 'Fora da meta',
      no_data: 'Sem dados'
    };
    return labels[clean(value).toLowerCase()] || clean(value).replace(/_/g, ' ') || 'Não informado';
  }

  function statusTone(value) {
    var status = clean(value).toLowerCase();
    if (status === 'completed' || status === 'healthy') return 'success';
    if (status === 'failed' || status === 'partial' || status === 'degraded') return 'warning';
    if (status === 'dead_letter' || status === 'critical') return 'danger';
    return 'info';
  }

  function eventTypeLabel(value) {
    var labels = {
      'order.requested': 'Pedido solicitado',
      'order.accepted': 'Pedido aceito',
      'order.quoted': 'Orçamento enviado',
      'order.scheduled': 'Serviço agendado',
      'order.started': 'Serviço iniciado',
      'order.completed': 'Serviço concluído',
      'order.cancelled': 'Pedido cancelado',
      'order.disputed': 'Disputa aberta'
    };
    return labels[clean(value)] || clean(value).replace(/[._]/g, ' ');
  }

  function protectionStateLabel(value) {
    return ({ healthy: 'Saudável', warning: 'Atenção', restricted: 'Restrito', frozen: 'Congelado' })[clean(value)] || 'Desconhecido';
  }

  function changeDecisionLabel(value) {
    return ({ allow: 'Liberada', approval_required: 'Aprovação exigida', hard_block: 'Bloqueada' })[clean(value)] || 'Não avaliada';
  }

  function changeRiskLabel(value) {
    return ({ low: 'Baixo', medium: 'Médio', high: 'Alto', critical: 'Crítico' })[clean(value)] || 'Não informado';
  }

  function changeTypeLabel(value) {
    return ({ deploy: 'Deploy', migration: 'Migration', edge_function: 'Edge Function', configuration: 'Configuração', feature_flag: 'Feature flag', manual: 'Manual' })[clean(value)] || statusLabel(value);
  }

  function changeStatusLabel(value) {
    return ({
      registered: 'Registrada',
      evaluated: 'Avaliada',
      allowed: 'Liberada',
      approval_required: 'Aguardando aprovação',
      blocked: 'Bloqueada',
      approved: 'Aprovada',
      override_granted: 'Aprovação temporária concedida',
      override_expired: 'Aprovação temporária expirada',
      override_used: 'Aprovação temporária utilizada',
      released_auto: 'Liberada após recuperação',
      incident_correlated: 'Incidente correlacionado',
      started: 'Em execução',
      completed: 'Concluída',
      failed: 'Falhou',
      cancelled: 'Cancelada'
    })[clean(value)] || statusLabel(value);
  }

  function budgetValue(value, suffix) {
    if (value === null || value === undefined || value === '') return 'Sem dados';
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return 'Sem dados';
    return parsed.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + (suffix || '');
  }

  function appendText(parent, tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = clean(value);
    parent.appendChild(node);
    return node;
  }

  function setStat(name, value) {
    var node = q('[data-admin-ops-stat="' + name + '"]', root);
    if (node) node.textContent = String(value);
  }

  function renderSummary(data) {
    var summary = data.summary || {};
    var health = data.health || {};
    setStat('health', statusLabel(health.status));
    setStat('ready', number(summary.ready));
    setStat('failed', number(summary.failed));
    setStat('dead-letter', number(summary.deadLetter));
    setStat('active-alerts', number(((data.operationalAlerts || {}).summary || {}).active));
    setStat('success-rate', formatPercent(summary.successRate24h));

    var healthNode = q('[data-admin-ops-health]', root);
    if (healthNode) {
      healthNode.dataset.status = clean(health.status) || 'idle';
      var label = q('[data-admin-ops-health-label]', healthNode);
      if (label) label.textContent = statusLabel(health.status);
    }

    var description = q('[data-admin-ops-health-message]', root);
    if (description) description.textContent = clean(health.message) || 'Saúde operacional indisponível.';
    var updated = q('[data-admin-ops-updated]', root);
    if (updated) updated.textContent = 'Atualizado em ' + formatDate(data.generatedAt);

    var list = q('[data-admin-ops-health-details]', root);
    if (!list) return;
    list.replaceChildren();
    [
      ['Cron automático', health.cronActive ? 'Ativo' : 'Inativo'],
      ['Última execução do cron', health.cronLastRunAt ? formatDate(health.cronLastRunAt) : 'Ainda não registrada'],
      ['Último status do cron', health.cronLastStatus ? statusLabel(health.cronLastStatus) : 'Não informado'],
      ['Entregáveis agora', String(number(summary.deliverable))],
      ['Claims possivelmente travados', String(number(summary.staleProcessing))],
      ['Latência média em 24 h', formatDurationMs(summary.averageLatencyMs24h)],
      ['Última avaliação de alertas', ((data.operationalAlerts || {}).lastEvaluation || {}).evaluatedAt ? formatDate(data.operationalAlerts.lastEvaluation.evaluatedAt) : 'Ainda não registrada']
    ].forEach(function (item) {
      var row = document.createElement('div');
      row.className = 'admin-ops-summary-row';
      appendText(row, 'span', '', item[0]);
      appendText(row, 'strong', '', item[1]);
      list.appendChild(row);
    });
  }

  function filteredEvents() {
    var items = dashboard && Array.isArray(dashboard.events) ? dashboard.events : [];
    return items.filter(function (item) {
      var status = clean(item.deliveryStatus).toLowerCase();
      if (activeFilter !== 'all' && status !== activeFilter) return false;
      if (!searchTerm) return true;
      var haystack = [item.eventKey, item.eventType, item.orderExternalId, item.lastErrorCode]
        .map(clean)
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(searchTerm) >= 0;
    });
  }

  function renderQueue() {
    var body = q('[data-admin-ops-events]', root);
    if (!body) return;
    body.replaceChildren();
    var items = filteredEvents();
    var count = q('[data-admin-ops-event-count]', root);
    if (count) count.textContent = String(items.length);

    if (!items.length) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 6;
      var empty = document.createElement('p');
      empty.className = 'admin-empty admin-ops-empty';
      empty.textContent = searchTerm || activeFilter !== 'all'
        ? 'Nenhum evento corresponde ao filtro atual.'
        : 'A fila operacional está vazia.';
      cell.appendChild(empty);
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('tr');

      var eventCell = document.createElement('td');
      appendText(eventCell, 'strong', 'admin-ops-event-key', item.eventKey);
      var eventMeta = document.createElement('span');
      eventMeta.className = 'admin-ops-event-meta';
      appendText(eventMeta, 'span', '', eventTypeLabel(item.eventType));
      appendText(eventMeta, 'span', '', 'Criado em ' + formatDate(item.createdAt));
      eventCell.appendChild(eventMeta);
      row.appendChild(eventCell);

      var orderCell = document.createElement('td');
      appendText(orderCell, 'strong', '', item.orderExternalId || item.orderId || 'Pedido');
      appendText(orderCell, 'span', 'admin-ops-event-meta', 'Status: ' + statusLabel(item.orderStatus));
      row.appendChild(orderCell);

      var statusCell = document.createElement('td');
      var badge = appendText(statusCell, 'span', 'admin-status admin-ops-run-status', statusLabel(item.deliveryStatus));
      var tone = statusTone(item.deliveryStatus);
      if (tone !== 'info') badge.classList.add('admin-status--' + tone);
      if (item.lastErrorCode) appendText(statusCell, 'span', 'admin-ops-event-meta', item.lastErrorCode);
      row.appendChild(statusCell);

      var attemptCell = document.createElement('td');
      appendText(attemptCell, 'strong', '', number(item.deliveryAttempts) + ' / ' + number(item.maxDeliveryAttempts));
      appendText(attemptCell, 'span', 'admin-ops-event-meta', number(item.manualRequeueCount) + ' reprocessamento(s) manual(is)');
      row.appendChild(attemptCell);

      var availabilityCell = document.createElement('td');
      var dateValue = item.deadLetteredAt || item.claimedAt || item.availableAt;
      appendText(availabilityCell, 'strong', '', formatDate(dateValue));
      appendText(availabilityCell, 'span', 'admin-ops-event-meta', item.deliveryStatus === 'dead_letter'
        ? 'Entrada em dead-letter'
        : item.deliveryStatus === 'processing'
          ? 'Claim do worker'
          : 'Próxima disponibilidade');
      row.appendChild(availabilityCell);

      var actionCell = document.createElement('td');
      actionCell.className = 'admin-ops-event-actions';
      if (item.deliveryStatus === 'failed' || item.deliveryStatus === 'dead_letter') {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'doke-btn doke-btn--ghost';
        button.dataset.adminOpsRequeue = clean(item.eventKey);
        button.textContent = 'Reprocessar';
        actionCell.appendChild(button);
      } else {
        appendText(actionCell, 'span', 'admin-ops-event-meta', 'Sem ação manual');
      }
      row.appendChild(actionCell);

      body.appendChild(row);
    });
  }

  function renderRuns(data) {
    var body = q('[data-admin-ops-runs]', root);
    if (!body) return;
    body.replaceChildren();
    var runs = Array.isArray(data.runs) ? data.runs : [];
    if (!runs.length) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 7;
      appendText(cell, 'p', 'admin-empty admin-ops-empty', 'Nenhuma execução do worker foi registrada.');
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    runs.forEach(function (item) {
      var row = document.createElement('tr');
      var started = document.createElement('td');
      appendText(started, 'strong', '', formatDate(item.startedAt));
      appendText(started, 'span', 'admin-ops-event-meta', clean(item.source) || 'manual');
      row.appendChild(started);

      var statusCell = document.createElement('td');
      var badge = appendText(statusCell, 'span', 'admin-status admin-ops-run-status', statusLabel(item.status));
      var tone = statusTone(item.status);
      if (tone !== 'info') badge.classList.add('admin-status--' + tone);
      row.appendChild(statusCell);

      [item.claimedCount, item.completedCount, item.failedCount, item.deadLetterCount].forEach(function (value) {
        var cell = document.createElement('td');
        cell.textContent = String(number(value));
        row.appendChild(cell);
      });

      var duration = document.createElement('td');
      duration.textContent = formatDurationMs(item.durationMs);
      row.appendChild(duration);
      body.appendChild(row);
    });
  }

  function renderRecentCompleted(data) {
    var body = q('[data-admin-ops-completed]', root);
    if (!body) return;
    body.replaceChildren();
    var items = Array.isArray(data.recentCompleted) ? data.recentCompleted : [];
    if (!items.length) {
      var row = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 4;
      appendText(cell, 'p', 'admin-empty admin-ops-empty', 'Nenhuma entrega concluída foi registrada.');
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }

    items.forEach(function (item) {
      var row = document.createElement('tr');
      var event = document.createElement('td');
      appendText(event, 'strong', 'admin-ops-event-key', item.eventKey);
      appendText(event, 'span', 'admin-ops-event-meta', eventTypeLabel(item.eventType));
      row.appendChild(event);
      appendText(row, 'td', '', item.orderExternalId || 'Pedido');
      appendText(row, 'td', '', formatDurationMs(item.latencyMs));
      appendText(row, 'td', '', formatDate(item.deliveredAt));
      body.appendChild(row);
    });
  }

  function renderOperationalAlerts(data) {
    var list = q('[data-admin-ops-alerts]', root);
    if (!list) return;
    list.replaceChildren();
    var projection = data.operationalAlerts || {};
    var runbookProjection = data.operationalRunbooks || {};
    var runbookByAlert = {};
    (Array.isArray(runbookProjection.active) ? runbookProjection.active : []).forEach(function (entry) {
      runbookByAlert[clean(entry.alertId)] = entry.descriptor || {};
    });
    var items = Array.isArray(projection.active) ? projection.active : [];
    var actorRole = clean(projection.actorRole).toLowerCase();
    var count = q('[data-admin-ops-alert-count]', root);
    if (count) count.textContent = String(items.length);

    if (!items.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhum incidente operacional está ativo.');
      return;
    }

    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'admin-ops-alert-item';
      card.dataset.severity = clean(item.severity) || 'warning';
      card.dataset.workflow = clean(item.workflowStatus) || 'unassigned';

      var top = document.createElement('div');
      top.className = 'admin-ops-alert-item__top';
      appendText(top, 'strong', '', item.title || 'Alerta operacional');
      appendText(top, 'span', 'admin-ops-alert-item__severity', statusLabel(item.severity));
      card.appendChild(top);

      appendText(card, 'p', 'admin-ops-alert-item__body', item.body || 'A saúde do worker exige acompanhamento.');

      var runbookDescriptor = runbookByAlert[clean(item.id)] || {};
      if (runbookDescriptor.id) {
        var runbookInfo = document.createElement('div');
        runbookInfo.className = 'admin-ops-alert-item__runbook';
        appendText(runbookInfo, 'strong', '', runbookDescriptor.title || 'Runbook operacional');
        appendText(runbookInfo, 'span', '', (runbookDescriptor.summary || 'Diagnóstico e ação segura disponíveis.') + ' · ' + statusLabel(runbookDescriptor.riskLevel));
        card.appendChild(runbookInfo);
      }

      var ownership = document.createElement('div');
      ownership.className = 'admin-ops-alert-item__ownership';
      appendText(ownership, 'span', 'admin-ops-alert-item__workflow', statusLabel(item.workflowStatus));
      appendText(ownership, 'strong', '', item.ownerName ? 'Responsável: ' + item.ownerName : 'Sem responsável');
      card.appendChild(ownership);

      var meta = document.createElement('div');
      meta.className = 'admin-ops-alert-item__meta';
      appendText(meta, 'span', '', 'Aberto: ' + formatDate(item.openedAt));
      appendText(meta, 'span', '', deadlineLabel(item.responseDueAt || item.acknowledgementDueAt));
      if (number(item.escalationCount) > 0) appendText(meta, 'span', '', 'Escalonamentos: ' + number(item.escalationCount));
      card.appendChild(meta);

      var actions = document.createElement('div');
      actions.className = 'admin-ops-alert-item__actions';
      if (!item.ownerId) {
        var acknowledge = document.createElement('button');
        acknowledge.type = 'button';
        acknowledge.className = 'doke-btn doke-btn--primary doke-btn--sm';
        acknowledge.dataset.adminOpsIncident = item.id;
        acknowledge.dataset.adminOpsIncidentAction = 'acknowledge';
        acknowledge.textContent = 'Assumir';
        actions.appendChild(acknowledge);
      }
      var note = document.createElement('button');
      note.type = 'button';
      note.className = 'doke-btn doke-btn--ghost doke-btn--sm';
      note.dataset.adminOpsIncident = item.id;
      note.dataset.adminOpsIncidentAction = 'note';
      note.textContent = 'Observação';
      actions.appendChild(note);

      if (actorRole === 'admin') {
        var assign = document.createElement('button');
        assign.type = 'button';
        assign.className = 'doke-btn doke-btn--ghost doke-btn--sm';
        assign.dataset.adminOpsIncident = item.id;
        assign.dataset.adminOpsIncidentAction = 'assign';
        assign.textContent = item.ownerId ? 'Reatribuir' : 'Atribuir';
        actions.appendChild(assign);
      }
      if (runbookDescriptor.id) {
        var runbook = document.createElement('button');
        runbook.type = 'button';
        runbook.className = 'doke-btn doke-btn--secondary doke-btn--sm';
        runbook.dataset.adminOpsRunbook = item.id;
        runbook.textContent = runbookDescriptor.actionLabel || 'Ver runbook';
        actions.appendChild(runbook);
      }
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function renderErrors(data) {
    var list = q('[data-admin-ops-errors]', root);
    if (!list) return;
    list.replaceChildren();
    var items = Array.isArray(data.errors) ? data.errors : [];
    if (!items.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhum código de falha está ativo na fila.');
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'admin-ops-error-item';
      var top = document.createElement('div');
      top.className = 'admin-ops-error-item__top';
      appendText(top, 'strong', 'admin-ops-code', item.code);
      appendText(top, 'span', 'admin-ops-count', item.count);
      card.appendChild(top);
      appendText(card, 'span', '', 'Última ocorrência: ' + formatDate(item.lastSeenAt));
      list.appendChild(card);
    });
  }

  function renderCacheTags(data) {
    var list = q('[data-admin-ops-cache-tags]', root);
    if (!list) return;
    list.replaceChildren();
    var items = Array.isArray(data.cacheTags) ? data.cacheTags : [];
    if (!items.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhuma tag de cache foi versionada ainda.');
      return;
    }
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'admin-ops-cache-item';
      var top = document.createElement('div');
      top.className = 'admin-ops-cache-item__top';
      appendText(top, 'strong', 'admin-ops-code', item.cacheTag);
      appendText(top, 'span', 'admin-panel__count', item.version);
      card.appendChild(top);
      appendText(card, 'span', '', 'Atualizada em ' + formatDate(item.updatedAt));
      list.appendChild(card);
    });
  }

  function sloValueLabel(item) {
    if (!item || item.value === null || item.value === undefined || item.value === '') return 'Sem dados';
    if (item.unit === 'percent') return formatPercent(item.value);
    if (item.unit === 'seconds') return formatDurationSeconds(item.value);
    return String(number(item.value));
  }

  function sloTargetLabel(item) {
    if (!item) return 'Meta não informada';
    var operator = item.comparison === 'gte' ? '≥ ' : '≤ ';
    if (item.unit === 'percent') return operator + formatPercent(item.target);
    if (item.unit === 'seconds') return operator + formatDurationSeconds(item.target);
    return operator + number(item.target);
  }

  function renderSlo(data) {
    var projection = data.postIncident || {};
    var list = q('[data-admin-ops-slo]', root);
    var report = q('[data-admin-ops-slo-report]', root);
    var status = q('[data-admin-ops-slo-status]', root);
    var targets = Array.isArray(projection.targets30d) ? projection.targets30d : [];
    if (list) {
      list.replaceChildren();
      if (!targets.length) {
        appendText(list, 'p', 'admin-empty', 'Ainda não há dados suficientes para calcular os SLOs.');
      } else {
        targets.forEach(function (item) {
          var card = document.createElement('article');
          card.className = 'admin-ops-slo-item';
          card.dataset.status = clean(item.status) || 'no_data';
          var top = document.createElement('div');
          top.className = 'admin-ops-slo-item__top';
          appendText(top, 'strong', '', item.title);
          var badge = appendText(top, 'span', 'admin-ops-slo-badge', statusLabel(item.status));
          badge.dataset.status = clean(item.status) || 'no_data';
          card.appendChild(top);
          appendText(card, 'span', 'admin-ops-slo-value', sloValueLabel(item));
          appendText(card, 'span', '', 'Meta: ' + sloTargetLabel(item));
          list.appendChild(card);
        });
      }
    }
    if (status) {
      var breached = targets.filter(function (item) { return item.status === 'breached'; }).length;
      status.textContent = targets.length ? (breached ? breached + ' fora da meta' : 'Metas atendidas') : 'Sem dados';
      status.dataset.tone = breached ? 'danger' : 'success';
    }
    if (report) {
      report.replaceChildren();
      var reports = Array.isArray(projection.reports) ? projection.reports.slice(0, 2) : [];
      if (!reports.length) {
        appendText(report, 'p', 'admin-empty', 'O primeiro relatório diário ainda não foi gerado.');
      } else {
        reports.forEach(function (item) {
          var row = document.createElement('article');
          row.className = 'admin-ops-slo-report__item';
          var copy = document.createElement('div');
          copy.className = 'admin-ops-slo-report__top';
          appendText(copy, 'strong', '', 'Relatório de ' + number(item.windowDays) + ' dias');
          appendText(copy, 'span', '', 'Gerado em ' + formatDate(item.generatedAt));
          row.appendChild(copy);
          var breached = (Array.isArray(item.targets) ? item.targets : []).filter(function (target) { return target.status === 'breached'; }).length;
          appendText(row, 'span', 'admin-ops-slo-badge', breached ? breached + ' violações' : 'Sem violações').dataset.status = breached ? 'breached' : 'met';
          report.appendChild(row);
        });
      }
    }
  }

  function renderPostIncidents(data) {
    var projection = data.postIncident || {};
    var list = q('[data-admin-ops-post-incidents]', root);
    var count = q('[data-admin-ops-post-incident-count]', root);
    var reviews = Array.isArray(projection.reviews) ? projection.reviews : [];
    if (count) count.textContent = String(reviews.filter(function (item) { return item.reviewStatus === 'draft'; }).length);
    if (!list) return;
    list.replaceChildren();
    if (!reviews.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhum incidente resolvido exige análise neste momento.');
      return;
    }
    reviews.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'admin-ops-post-incident-item';
      var top = document.createElement('div');
      top.className = 'admin-ops-post-incident-item__top';
      var copy = document.createElement('div');
      appendText(copy, 'strong', '', item.title || item.alertKey);
      appendText(copy, 'span', '', 'Ciclo ' + number(item.cycleCount) + ' · ' + statusLabel(item.severity) + ' · ' + rootCauseLabel(item.rootCauseCategory));
      top.appendChild(copy);
      var badge = appendText(top, 'span', 'admin-ops-post-incident-status', statusLabel(item.reviewStatus));
      badge.dataset.status = clean(item.reviewStatus);
      card.appendChild(top);
      var metrics = document.createElement('div');
      metrics.className = 'admin-ops-post-incident-item__metrics';
      [['MTTA', formatDurationSeconds(item.mttaSeconds)], ['MTTR', formatDurationSeconds(item.mttrSeconds)], ['Escalonamentos', String(number(item.escalationCount))]].forEach(function (entry) {
        var metric = document.createElement('div');
        appendText(metric, 'span', '', entry[0]);
        appendText(metric, 'strong', '', entry[1]);
        metrics.appendChild(metric);
      });
      card.appendChild(metrics);
      appendText(card, 'p', '', item.impactSummary || (item.reviewStatus === 'draft' ? 'Documentação de impacto e causa raiz pendente.' : 'Análise concluída sem resumo disponível.'));
      var actions = document.createElement('div');
      actions.className = 'admin-ops-post-incident-item__actions';
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'doke-btn doke-btn--secondary doke-btn--sm';
      button.dataset.adminOpsPostIncident = item.reviewId;
      button.textContent = item.reviewStatus === 'completed' ? 'Revisar análise' : 'Documentar incidente';
      actions.appendChild(button);
      card.appendChild(actions);
      list.appendChild(card);
    });
  }

  function renderPreventionActions(data) {
    var projection = data.postIncident || {};
    var list = q('[data-admin-ops-prevention-actions]', root);
    var count = q('[data-admin-ops-prevention-count]', root);
    var actorId = clean(projection.actorId);
    var actorRole = clean(projection.actorRole);
    var items = Array.isArray(projection.preventionActions) ? projection.preventionActions : [];
    var openItems = items.filter(function (item) { return item.status === 'todo' || item.status === 'in_progress'; });
    if (count) count.textContent = String(openItems.length);
    if (!list) return;
    list.replaceChildren();
    if (!items.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhuma ação preventiva foi registrada.');
      return;
    }
    items.slice(0, 12).forEach(function (item) {
      var overdue = item.dueAt && new Date(item.dueAt + 'T23:59:59').getTime() < Date.now() && item.status !== 'done';
      var card = document.createElement('article');
      card.className = 'admin-ops-prevention-item';
      var top = document.createElement('div');
      top.className = 'admin-ops-prevention-item__top';
      var copy = document.createElement('div');
      appendText(copy, 'strong', '', item.title);
      appendText(copy, 'span', '', (item.ownerName || 'Operador Doke') + ' · ' + (item.dueAt ? 'prazo ' + new Date(item.dueAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'sem prazo'));
      top.appendChild(copy);
      var badge = appendText(top, 'span', 'admin-ops-prevention-status', overdue ? 'Vencida' : statusLabel(item.status));
      badge.dataset.status = overdue ? 'overdue' : clean(item.status);
      card.appendChild(top);
      appendText(card, 'p', '', item.incidentTitle || item.alertKey || 'Incidente operacional');
      if (item.status !== 'done' && item.status !== 'cancelled' && (actorRole === 'admin' || clean(item.ownerId) === actorId)) {
        var actions = document.createElement('div');
        actions.className = 'admin-ops-prevention-item__actions';
        if (item.status === 'todo') {
          var start = document.createElement('button');
          start.type = 'button';
          start.className = 'doke-btn doke-btn--ghost doke-btn--sm';
          start.dataset.adminOpsPreventionAction = item.id;
          start.dataset.adminOpsPreventionReview = item.reviewId;
          start.dataset.adminOpsPreventionCommand = 'start';
          start.textContent = 'Iniciar';
          actions.appendChild(start);
        }
        var complete = document.createElement('button');
        complete.type = 'button';
        complete.className = 'doke-btn doke-btn--success doke-btn--sm';
        complete.dataset.adminOpsPreventionAction = item.id;
        complete.dataset.adminOpsPreventionReview = item.reviewId;
        complete.dataset.adminOpsPreventionCommand = 'complete';
        complete.textContent = 'Concluir';
        actions.appendChild(complete);
        card.appendChild(actions);
      }
      list.appendChild(card);
    });
  }

  function renderChangeProtection(data) {
    var projection = data.changeProtection || {};
    var current = projection.current || {};
    var state = clean(current.protectionState) || 'healthy';
    var stateNode = q('[data-admin-ops-change-state]', root);
    var summaryNode = q('[data-admin-ops-change-summary]', root);
    var windowNode = q('[data-admin-ops-budget-windows]', root);
    var changesNode = q('[data-admin-ops-changes]', root);
    var decisionsNode = q('[data-admin-ops-change-decisions]', root);
    var actorRole = clean(projection.actorRole);

    if (stateNode) {
      stateNode.textContent = protectionStateLabel(state);
      stateNode.dataset.tone = state === 'healthy' ? 'success' : state === 'warning' ? 'warning' : 'danger';
    }

    if (summaryNode) {
      summaryNode.replaceChildren();
      summaryNode.dataset.state = state;
      appendText(summaryNode, 'strong', '', 'Estado de proteção: ' + protectionStateLabel(state));
      var reasons = Array.isArray(current.reasons) ? current.reasons : [];
      var reasonLabels = {
        within_budget: 'Todos os sinais com amostra suficiente estão dentro do orçamento.',
        critical_incident_escalated: 'Há incidente crítico escalonado.',
        fast_burn_multi_window: 'O orçamento está sendo consumido rapidamente nas janelas curtas.',
        monthly_budget_exhausted: 'O orçamento mensal foi esgotado.',
        critical_incident_open: 'Há incidente crítico aberto.',
        sustained_error_budget_burn: 'O consumo permanece acima da taxa sustentável.',
        monthly_budget_near_exhaustion: 'Mais de 80% do orçamento mensal foi consumido.',
        budget_burn_above_sustainable_rate: 'A taxa atual de consumo exige atenção.',
        monthly_budget_half_consumed: 'Mais da metade do orçamento mensal foi consumida.'
      };
      appendText(summaryNode, 'p', '', reasons.map(function (item) { return reasonLabels[item] || statusLabel(item); }).join(' · '));
      appendText(summaryNode, 'span', '', 'Incidentes críticos abertos: ' + number(current.openCriticalIncidents) + ' · Burn rate curto: ' + budgetValue(current.worstShortBurnRate, '×'));
    }

    if (windowNode) {
      windowNode.replaceChildren();
      var windows = current.windows || {};
      ['1h', '6h', '24h', '30d'].forEach(function (key) {
        var item = windows[key] || {};
        var card = document.createElement('article');
        card.className = 'admin-ops-budget-window';
        var top = document.createElement('div');
        top.className = 'admin-ops-budget-window__top';
        appendText(top, 'strong', '', 'Janela ' + key);
        appendText(top, 'span', 'admin-ops-change-badge', item.worstBurnRate === null || item.worstBurnRate === undefined ? 'Sem amostra' : 'Burn ' + budgetValue(item.worstBurnRate, '×'));
        card.appendChild(top);
        appendText(card, 'span', 'admin-ops-budget-window__value', budgetValue(item.maximumConsumedPercent, '%'));
        appendText(card, 'span', '', 'Maior consumo do orçamento nesta janela');
        windowNode.appendChild(card);
      });
    }

    if (changesNode) {
      changesNode.replaceChildren();
      var changes = Array.isArray(projection.changes) ? projection.changes : [];
      if (!changes.length) {
        appendText(changesNode, 'p', 'admin-empty', 'Nenhuma mudança foi registrada no gate de confiabilidade.');
      } else {
        changes.forEach(function (item) {
          var card = document.createElement('article');
          card.className = 'admin-ops-change-item';
          var top = document.createElement('div');
          top.className = 'admin-ops-change-item__top';
          var copy = document.createElement('div');
          appendText(copy, 'strong', '', item.title || item.externalKey);
          appendText(copy, 'span', 'admin-ops-code', item.externalKey);
          top.appendChild(copy);
          var badge = appendText(top, 'span', 'admin-ops-change-badge', changeStatusLabel(item.status));
          badge.dataset.status = clean(item.status);
          card.appendChild(top);
          var meta = document.createElement('div');
          meta.className = 'admin-ops-change-item__meta';
          appendText(meta, 'span', '', changeTypeLabel(item.changeType));
          appendText(meta, 'span', '', 'Risco ' + changeRiskLabel(item.riskLevel));
          var decision = appendText(meta, 'span', 'admin-ops-change-badge', changeDecisionLabel(item.gateDecision));
          decision.dataset.decision = clean(item.gateDecision);
          var stateBadge = appendText(meta, 'span', 'admin-ops-change-badge', protectionStateLabel(item.protectionState));
          stateBadge.dataset.state = clean(item.protectionState);
          card.appendChild(meta);
          if (item.description) appendText(card, 'p', '', item.description);
          if (item.overrideExpiresAt) appendText(card, 'span', '', 'Exceção válida até ' + formatDate(item.overrideExpiresAt));
          if (Array.isArray(item.correlations) && item.correlations.length) appendText(card, 'span', '', item.correlations.length + ' incidente(s) correlacionado(s) após a mudança.');

          var actions = document.createElement('div');
          actions.className = 'admin-ops-change-item__actions';
          if (item.gateDecision === 'approval_required' && item.status === 'approval_required' && actorRole === 'admin') {
            var approve = document.createElement('button');
            approve.type = 'button';
            approve.className = 'doke-btn doke-btn--secondary doke-btn--sm';
            approve.dataset.adminOpsChangeAction = 'approve';
            approve.dataset.adminOpsChangeId = item.id;
            approve.textContent = 'Aprovar temporariamente';
            actions.appendChild(approve);
          }
          if (item.gateDecision === 'allow' && (item.status === 'evaluated' || item.status === 'approved')) {
            var start = document.createElement('button');
            start.type = 'button';
            start.className = 'doke-btn doke-btn--primary doke-btn--sm';
            start.dataset.adminOpsChangeAction = 'start';
            start.dataset.adminOpsChangeId = item.id;
            start.textContent = 'Liberar execução';
            actions.appendChild(start);
          }
          if (item.status === 'started') {
            var finish = document.createElement('button');
            finish.type = 'button';
            finish.className = 'doke-btn doke-btn--success doke-btn--sm';
            finish.dataset.adminOpsChangeAction = 'complete';
            finish.dataset.adminOpsChangeId = item.id;
            finish.textContent = 'Registrar resultado';
            actions.appendChild(finish);
          }
          if (actions.childNodes.length) card.appendChild(actions);
          changesNode.appendChild(card);
        });
      }
    }

    if (decisionsNode) {
      decisionsNode.replaceChildren();
      var decisions = Array.isArray(projection.decisions) ? projection.decisions.slice(0, 12) : [];
      if (!decisions.length) {
        appendText(decisionsNode, 'p', 'admin-empty', 'O histórico de decisões aparecerá após a primeira mudança.');
      } else {
        appendText(decisionsNode, 'strong', '', 'Histórico imutável de decisões');
        decisions.forEach(function (item) {
          var row = document.createElement('article');
          row.className = 'admin-ops-change-decision';
          var top = document.createElement('div');
          top.className = 'admin-ops-change-decision__top';
          appendText(top, 'strong', '', changeStatusLabel(item.action));
          appendText(top, 'span', '', formatDate(item.createdAt));
          row.appendChild(top);
          appendText(row, 'span', 'admin-ops-code', item.externalKey);
          if (item.reason) appendText(row, 'p', '', item.reason);
          appendText(row, 'span', '', (item.actorName || 'Automação Doke') + ' · ' + protectionStateLabel(item.protectionState));
          decisionsNode.appendChild(row);
        });
      }
    }
  }

  function renderActions(data) {
    var list = q('[data-admin-ops-actions]', root);
    if (!list) return;
    list.replaceChildren();
    var workerActions = Array.isArray(data.operatorActions) ? data.operatorActions.map(function (item) {
      return Object.assign({ source: 'worker' }, item);
    }) : [];
    var incidentActions = data.operationalAlerts && Array.isArray(data.operationalAlerts.history)
      ? data.operationalAlerts.history.map(function (item) { return Object.assign({ source: 'incident' }, item); })
      : [];
    var runbookActions = data.operationalRunbooks && Array.isArray(data.operationalRunbooks.recentExecutions)
      ? data.operationalRunbooks.recentExecutions.map(function (item) {
          return Object.assign({
            source: 'runbook',
            action: 'runbook_' + clean(item.status),
            createdAt: item.completedAt || item.executedAt || item.createdAt
          }, item);
        })
      : [];
    var postIncidentActions = data.postIncident && Array.isArray(data.postIncident.history)
      ? data.postIncident.history.map(function (item) { return Object.assign({ source: 'post-incident' }, item); })
      : [];
    var items = workerActions.concat(incidentActions, runbookActions, postIncidentActions).sort(function (a, b) {
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    }).slice(0, 20);
    if (!items.length) {
      appendText(list, 'p', 'admin-empty', 'Nenhuma ação operacional foi registrada.');
      return;
    }
    var actionLabels = {
      requeue: 'Evento reprocessado',
      run_now: 'Worker executado manualmente',
      opened_auto: 'Incidente aberto automaticamente',
      reopened_auto: 'Incidente reaberto automaticamente',
      acknowledge: 'Incidente assumido',
      assign: 'Responsável atribuído',
      note: 'Observação registrada',
      escalate_auto: 'Incidente escalonado',
      resolved_auto: 'Incidente resolvido automaticamente',
      runbook_succeeded: 'Runbook concluído',
      runbook_verification_failed: 'Runbook executado com verificação pendente',
      runbook_failed: 'Runbook falhou',
      runbook_expired: 'Prévia de runbook expirada',
      created_auto: 'Análise pós-incidente criada',
      saved: 'Análise pós-incidente salva',
      completed: 'Análise pós-incidente concluída',
      reopened: 'Análise pós-incidente reaberta',
      prevention_created: 'Ação preventiva criada',
      prevention_updated: 'Ação preventiva atualizada',
      prevention_completed: 'Ação preventiva concluída',
      prevention_cancelled: 'Ação preventiva cancelada'
    };
    items.forEach(function (item) {
      var card = document.createElement('article');
      card.className = 'admin-ops-action-item';
      var top = document.createElement('div');
      top.className = 'admin-ops-action-item__top';
      appendText(top, 'strong', '', actionLabels[item.action] || 'Ação operacional');
      appendText(top, 'span', '', formatDate(item.createdAt));
      card.appendChild(top);
      if (item.eventKey || item.alertKey || item.runbookId) appendText(card, 'span', 'admin-ops-code', item.eventKey || item.alertKey || item.runbookId);
      if (item.selectedEventKey) appendText(card, 'span', 'admin-ops-code', item.selectedEventKey);
      if (item.note) appendText(card, 'p', '', item.note);
      appendText(card, 'span', '', (item.actorName ? item.actorName + ' · ' : '') + 'Papel: ' + statusLabel(item.actorRole));
      list.appendChild(card);
    });
  }

  function render(data) {
    dashboard = data || {};
    renderSummary(dashboard);
    renderQueue();
    renderRuns(dashboard);
    renderRecentCompleted(dashboard);
    renderOperationalAlerts(dashboard);
    renderChangeProtection(dashboard);
    renderSlo(dashboard);
    renderPostIncidents(dashboard);
    renderPreventionActions(dashboard);
    renderErrors(dashboard);
    renderCacheTags(dashboard);
    renderActions(dashboard);
  }

  function scheduleAutoRefresh() {
    window.clearTimeout(autoRefreshTimer);
    if (!root || !root.isConnected || document.hidden) return;
    autoRefreshTimer = window.setTimeout(function () {
      if (!root || !root.isConnected || document.hidden) return;
      load({ refresh: true, silent: true }).finally(scheduleAutoRefresh);
    }, AUTO_REFRESH_MS);
  }

  function load(options) {
    options = options || {};
    refreshNodes();
    if (!root) return Promise.resolve(null);
    if (loadPromise) return loadPromise;

    var repo = repository();
    var access = accessService();
    var hasData = Boolean(dashboard);
    beginPage(options.refresh ? 'admin-order-operations-refresh' : 'admin-order-operations-load');
    setSurface(guarded ? (hasData ? 'refreshing' : 'loading') : 'guard-pending');

    var guardTask = guarded
      ? Promise.resolve({ allowed: true })
      : access && typeof access.guardPage === 'function'
        ? withTimeout(access.guardPage({
            name: 'admin-order-operations-access',
            source: 'admin-pedidos-operacao.html',
            deniedRedirect: 'pedidos.html',
            loginRedirect: 'auth/login.html'
          }), 'A validação de acesso demorou mais do que o esperado.')
        : Promise.reject(new Error('O serviço de acesso administrativo não está disponível.'));

    loadPromise = guardTask.then(function (result) {
      if (!result || result.allowed !== true) return null;
      guarded = true;
      if (!repo || typeof repo.getDashboard !== 'function') {
        throw new Error('O repositório operacional de pedidos não está disponível.');
      }
      setSurface(hasData ? 'refreshing' : 'loading');
      return withTimeout(repo.getDashboard({ eventLimit: 70, runLimit: 20 }), 'O carregamento da saúde do worker demorou mais do que o esperado.');
    }).then(function (data) {
      if (!data) return null;
      render(data);
      setSurface('ready');
      readyPage();
      if (!options.silent) showToast('Operação de pedidos atualizada.', 'success');
      return data;
    }).catch(function (error) {
      console.error('[Doke][admin-order-operations]', error);
      failPage(error);
      if (hasData) {
        setSurface('ready');
        showToast(error && error.message || 'Não foi possível atualizar o painel.', 'danger');
        return dashboard;
      }
      setSurface('error', error && error.message || 'Não foi possível carregar a operação de pedidos.');
      return null;
    }).finally(function () {
      loadPromise = null;
      scheduleAutoRefresh();
    });

    return loadPromise;
  }

  function openRequeueDialog(eventKey) {
    var dialog = q('[data-admin-ops-requeue-dialog]');
    if (!dialog) return;
    dialog.dataset.eventKey = clean(eventKey);
    var key = q('[data-admin-ops-requeue-event]', dialog);
    var note = q('[data-admin-ops-requeue-note]', dialog);
    if (key) key.textContent = clean(eventKey);
    if (note) note.value = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    window.requestAnimationFrame(function () { if (note) note.focus(); });
  }

  function closeRequeueDialog() {
    var dialog = q('[data-admin-ops-requeue-dialog]');
    if (!dialog) return;
    dialog.dataset.eventKey = '';
    if (dialog.open) dialog.close();
  }

  function setMutationBusy(key, busy) {
    document.querySelectorAll('[data-admin-ops-requeue], [data-admin-ops-requeue-submit], [data-admin-ops-run-now], [data-admin-ops-refresh], [data-admin-ops-incident], [data-admin-ops-incident-submit], [data-admin-ops-runbook], [data-admin-ops-runbook-submit], [data-admin-ops-post-incident], [data-admin-ops-post-incident-save], [data-admin-ops-post-incident-complete], [data-admin-ops-prevention-create], [data-admin-ops-prevention-action], [data-admin-ops-change-register], [data-admin-ops-change-submit], [data-admin-ops-change-action], [data-admin-ops-change-action-submit]').forEach(function (button) {
      button.disabled = busy;
      if (busy) button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    });
    if (root) root.dataset.mutation = busy ? key : '';
  }

  function submitRequeue() {
    var dialog = q('[data-admin-ops-requeue-dialog]');
    var repo = repository();
    if (!dialog || !repo) return Promise.resolve();
    var eventKey = clean(dialog.dataset.eventKey);
    var noteInput = q('[data-admin-ops-requeue-note]', dialog);
    var note = clean(noteInput && noteInput.value);
    if (note.length < 10) {
      showToast('Informe um motivo com pelo menos 10 caracteres.', 'warning');
      if (noteInput) noteInput.focus();
      return Promise.resolve();
    }

    setMutationBusy('requeue', true);
    return withTimeout(repo.requeue(eventKey, note), 'O reprocessamento demorou mais do que o esperado.').then(function (result) {
      closeRequeueDialog();
      showToast(result && result.workerRequested
        ? 'Evento recolocado na fila e worker acionado.'
        : 'Evento recolocado na fila. O cron fará o processamento.', 'success');
      return new Promise(function (resolve) { window.setTimeout(resolve, 700); });
    }).then(function () {
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível reprocessar o evento.', 'danger');
    }).finally(function () {
      setMutationBusy('', false);
    });
  }

  function openIncidentDialog(alertId, action) {
    var dialog = q('[data-admin-ops-incident-dialog]');
    if (!dialog) return;
    var projection = dashboard && dashboard.operationalAlerts || {};
    var alerts = Array.isArray(projection.active) ? projection.active : [];
    var alert = alerts.find(function (item) { return clean(item.id) === clean(alertId); });
    if (!alert) {
      showToast('O incidente não está mais disponível.', 'warning');
      return;
    }

    dialog.dataset.alertId = clean(alert.id);
    dialog.dataset.incidentAction = clean(action);
    var title = q('[data-admin-ops-incident-title]', dialog);
    var subject = q('[data-admin-ops-incident-subject]', dialog);
    var note = q('[data-admin-ops-incident-note]', dialog);
    var assigneeWrap = q('[data-admin-ops-incident-assignee-wrap]', dialog);
    var assignee = q('[data-admin-ops-incident-assignee]', dialog);
    var submit = q('[data-admin-ops-incident-submit]', dialog);
    var labels = { acknowledge: 'Assumir incidente', assign: 'Atribuir responsável', note: 'Registrar observação' };

    if (title) title.textContent = labels[action] || 'Gerenciar incidente';
    if (subject) subject.textContent = alert.title || alert.alertKey || 'Incidente operacional';
    if (note) note.value = '';
    if (assigneeWrap) assigneeWrap.hidden = action !== 'assign';
    if (submit) submit.textContent = action === 'acknowledge' ? 'Assumir incidente' : action === 'assign' ? 'Atribuir' : 'Registrar';

    if (assignee) {
      assignee.replaceChildren();
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Selecione um operador';
      assignee.appendChild(placeholder);
      (Array.isArray(projection.operators) ? projection.operators : []).forEach(function (operator) {
        var option = document.createElement('option');
        option.value = clean(operator.id);
        option.textContent = clean(operator.name) + ' · ' + statusLabel(operator.role);
        if (clean(alert.ownerId) === clean(operator.id)) option.selected = true;
        assignee.appendChild(option);
      });
    }

    if (typeof dialog.showModal === 'function') dialog.showModal();
    window.requestAnimationFrame(function () {
      if (action === 'assign' && assignee) assignee.focus();
      else if (note) note.focus();
    });
  }

  function closeIncidentDialog() {
    var dialog = q('[data-admin-ops-incident-dialog]');
    if (!dialog) return;
    dialog.dataset.alertId = '';
    dialog.dataset.incidentAction = '';
    if (dialog.open) dialog.close();
  }

  function submitIncidentUpdate() {
    var dialog = q('[data-admin-ops-incident-dialog]');
    var repo = repository();
    if (!dialog || !repo || typeof repo.updateIncident !== 'function') return Promise.resolve();
    var alertId = clean(dialog.dataset.alertId);
    var action = clean(dialog.dataset.incidentAction);
    var noteInput = q('[data-admin-ops-incident-note]', dialog);
    var assigneeInput = q('[data-admin-ops-incident-assignee]', dialog);
    var note = clean(noteInput && noteInput.value);
    var assigneeId = clean(assigneeInput && assigneeInput.value);

    if (note.length < 5) {
      showToast('Registre uma observação com pelo menos 5 caracteres.', 'warning');
      if (noteInput) noteInput.focus();
      return Promise.resolve();
    }
    if (action === 'assign' && !assigneeId) {
      showToast('Selecione um responsável.', 'warning');
      if (assigneeInput) assigneeInput.focus();
      return Promise.resolve();
    }

    setMutationBusy('incident-update', true);
    return withTimeout(repo.updateIncident(alertId, action, note, assigneeId), 'A atualização do incidente demorou mais do que o esperado.').then(function () {
      closeIncidentDialog();
      showToast(action === 'acknowledge' ? 'Incidente assumido com sucesso.' : action === 'assign' ? 'Responsável atualizado.' : 'Observação registrada.', 'success');
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível atualizar o incidente.', 'danger');
    }).finally(function () {
      setMutationBusy('', false);
    });
  }

  function runbookDescriptorForAlert(alertId) {
    var projection = dashboard && dashboard.operationalRunbooks || {};
    var entries = Array.isArray(projection.active) ? projection.active : [];
    var entry = entries.find(function (item) { return clean(item.alertId) === clean(alertId); });
    return entry && entry.descriptor || null;
  }

  function appendImpactItem(parent, label, value) {
    var item = document.createElement('div');
    item.className = 'admin-ops-runbook-impact__item';
    appendText(item, 'span', '', label);
    appendText(item, 'strong', '', value);
    parent.appendChild(item);
  }

  function renderRunbookPreview(result) {
    var dialog = q('[data-admin-ops-runbook-dialog]');
    if (!dialog) return;
    activeRunbookPreview = result || null;
    var descriptor = result && result.descriptor || {};
    var preview = result && result.preview || {};
    var overview = q('[data-admin-ops-runbook-overview]', dialog);
    var state = q('[data-admin-ops-runbook-state]', dialog);
    var name = q('[data-admin-ops-runbook-name]', dialog);
    var summary = q('[data-admin-ops-runbook-summary]', dialog);
    var risk = q('[data-admin-ops-runbook-risk]', dialog);
    var steps = q('[data-admin-ops-runbook-steps]', dialog);
    var impact = q('[data-admin-ops-runbook-impact]', dialog);
    var eventWrap = q('[data-admin-ops-runbook-event-wrap]', dialog);
    var eventSelect = q('[data-admin-ops-runbook-event]', dialog);
    var phraseWrap = q('[data-admin-ops-runbook-confirmation-wrap]', dialog);
    var phrase = q('[data-admin-ops-runbook-phrase]', dialog);
    var guard = q('[data-admin-ops-runbook-guard]', dialog);
    var submit = q('[data-admin-ops-runbook-submit]', dialog);

    if (state) {
      state.textContent = 'Prévia gerada em ' + formatDate(preview.observedAt) + ' e válida até ' + formatDate(result.expiresAt) + '.';
      state.dataset.tone = 'success';
    }
    if (overview) overview.hidden = false;
    if (name) name.textContent = descriptor.title || 'Runbook operacional';
    if (summary) summary.textContent = descriptor.summary || 'Remediação segura disponível.';
    if (risk) {
      risk.textContent = statusLabel(descriptor.riskLevel);
      risk.dataset.risk = clean(descriptor.riskLevel) || 'low';
    }
    if (steps) {
      steps.replaceChildren();
      (Array.isArray(descriptor.steps) ? descriptor.steps : []).forEach(function (step) {
        appendText(steps, 'li', '', step);
      });
    }
    if (impact) {
      impact.replaceChildren();
      appendImpactItem(impact, 'Impacto atual', String(number(preview.impactCount)) + ' item(ns)');
      appendImpactItem(impact, 'Aprovação', descriptor.requiresAdminApproval ? 'Administrador obrigatório' : 'Suporte ou administrador');
      var before = preview.before || {};
      if (before.deadLetter !== undefined) appendImpactItem(impact, 'Dead-letters', String(number(before.deadLetter)));
      if (before.staleProcessing !== undefined) appendImpactItem(impact, 'Claims travados', String(number(before.staleProcessing)));
      if (before.retryCount !== undefined) appendImpactItem(impact, 'Retries', String(number(before.retryCount)));
      if (before.deliverable !== undefined) appendImpactItem(impact, 'Entregáveis', String(number(before.deliverable)));
      if (before.claimed24h !== undefined) appendImpactItem(impact, 'Reivindicados em 24 h', String(number(before.claimed24h)));
    }

    var eligibleEvents = Array.isArray(preview.eligibleEvents) ? preview.eligibleEvents : [];
    if (eventWrap) eventWrap.hidden = !preview.requiresEventSelection;
    if (eventSelect) {
      eventSelect.replaceChildren();
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = eligibleEvents.length ? 'Selecione um evento' : 'Nenhum evento elegível';
      eventSelect.appendChild(placeholder);
      eligibleEvents.forEach(function (item) {
        var option = document.createElement('option');
        option.value = clean(item.eventKey);
        option.textContent = clean(item.eventKey) + (item.errorCode ? ' · ' + clean(item.errorCode) : '') + ' · ' + number(item.attempts) + '/' + number(item.maxAttempts);
        eventSelect.appendChild(option);
      });
    }
    if (phraseWrap) phraseWrap.hidden = false;
    if (phrase) phrase.textContent = clean(result.confirmationPhrase);

    var blocked = result.canExecute !== true || number(preview.impactCount) <= 0;
    if (guard) {
      guard.hidden = !blocked;
      guard.dataset.tone = blocked ? 'danger' : '';
      guard.textContent = result.canExecute !== true
        ? 'Esta remediação exige uma conta administrativa. A prévia pode ser revisada, mas a execução está bloqueada.'
        : 'O impacto atual é zero. Atualize o painel antes de gerar uma nova prévia.';
    }
    if (submit) {
      submit.disabled = blocked;
      submit.textContent = descriptor.requiresAdminApproval ? 'Aprovar e executar' : 'Executar runbook';
    }
  }

  function openRunbookDialog(alertId) {
    var dialog = q('[data-admin-ops-runbook-dialog]');
    var repo = repository();
    if (!dialog || !repo || typeof repo.previewRunbook !== 'function') return Promise.resolve();
    var projection = dashboard && dashboard.operationalAlerts || {};
    var alerts = Array.isArray(projection.active) ? projection.active : [];
    var alert = alerts.find(function (item) { return clean(item.id) === clean(alertId); });
    var descriptor = runbookDescriptorForAlert(alertId);
    if (!alert || !descriptor) {
      showToast('O runbook não está mais disponível para este incidente.', 'warning');
      return Promise.resolve();
    }

    activeRunbookPreview = null;
    dialog.dataset.alertId = clean(alertId);
    var subject = q('[data-admin-ops-runbook-subject]', dialog);
    var title = q('[data-admin-ops-runbook-title]', dialog);
    var state = q('[data-admin-ops-runbook-state]', dialog);
    var overview = q('[data-admin-ops-runbook-overview]', dialog);
    var eventWrap = q('[data-admin-ops-runbook-event-wrap]', dialog);
    var phraseWrap = q('[data-admin-ops-runbook-confirmation-wrap]', dialog);
    var guard = q('[data-admin-ops-runbook-guard]', dialog);
    var confirmation = q('[data-admin-ops-runbook-confirmation]', dialog);
    var note = q('[data-admin-ops-runbook-note]', dialog);
    var submit = q('[data-admin-ops-runbook-submit]', dialog);

    if (subject) subject.textContent = alert.title || alert.alertKey || 'Incidente operacional';
    if (title) title.textContent = descriptor.title || 'Preparar runbook';
    if (state) {
      state.textContent = 'Preparando diagnóstico e impacto...';
      state.dataset.tone = '';
    }
    if (overview) overview.hidden = true;
    if (eventWrap) eventWrap.hidden = true;
    if (phraseWrap) phraseWrap.hidden = true;
    if (guard) guard.hidden = true;
    if (confirmation) confirmation.value = '';
    if (note) note.value = '';
    if (submit) submit.disabled = true;
    if (typeof dialog.showModal === 'function') dialog.showModal();

    setMutationBusy('runbook-preview', true);
    return withTimeout(repo.previewRunbook(alertId), 'A prévia do runbook demorou mais do que o esperado.').then(function (result) {
      renderRunbookPreview(result);
      window.requestAnimationFrame(function () {
        var target = q('[data-admin-ops-runbook-event]', dialog);
        if (target && !target.closest('[hidden]')) target.focus();
        else if (confirmation) confirmation.focus();
      });
    }).catch(function (error) {
      if (state) {
        state.textContent = error && error.message || 'Não foi possível preparar a remediação.';
        state.dataset.tone = 'danger';
      }
      if (guard) {
        guard.hidden = false;
        guard.dataset.tone = 'danger';
        guard.textContent = 'Nenhuma alteração foi executada.';
      }
      showToast(error && error.message || 'Não foi possível preparar o runbook.', 'danger');
    }).finally(function () {
      setMutationBusy('', false);
      if (submit && activeRunbookPreview) submit.disabled = activeRunbookPreview.canExecute !== true || number((activeRunbookPreview.preview || {}).impactCount) <= 0;
    });
  }

  function closeRunbookDialog() {
    var dialog = q('[data-admin-ops-runbook-dialog]');
    if (!dialog) return;
    activeRunbookPreview = null;
    dialog.dataset.alertId = '';
    if (dialog.open) dialog.close();
  }

  function submitRunbook() {
    var dialog = q('[data-admin-ops-runbook-dialog]');
    var repo = repository();
    var preview = activeRunbookPreview;
    if (!dialog || !repo || typeof repo.executeRunbook !== 'function' || !preview) return Promise.resolve();
    var confirmationInput = q('[data-admin-ops-runbook-confirmation]', dialog);
    var noteInput = q('[data-admin-ops-runbook-note]', dialog);
    var eventInput = q('[data-admin-ops-runbook-event]', dialog);
    var confirmationText = clean(confirmationInput && confirmationInput.value);
    var note = clean(noteInput && noteInput.value);
    var selectedEventKey = clean(eventInput && eventInput.value);
    var requiresSelection = Boolean((preview.preview || {}).requiresEventSelection);

    if (confirmationText.toUpperCase() !== clean(preview.confirmationPhrase).toUpperCase()) {
      showToast('Digite exatamente a frase de confirmação exibida.', 'warning');
      if (confirmationInput) confirmationInput.focus();
      return Promise.resolve();
    }
    if (note.length < 10) {
      showToast('Informe uma justificativa com pelo menos 10 caracteres.', 'warning');
      if (noteInput) noteInput.focus();
      return Promise.resolve();
    }
    if (requiresSelection && !selectedEventKey) {
      showToast('Selecione o evento elegível para reprocessamento.', 'warning');
      if (eventInput) eventInput.focus();
      return Promise.resolve();
    }

    setMutationBusy('runbook-execute', true);
    return withTimeout(repo.executeRunbook({
      previewId: preview.previewId,
      approvalToken: preview.approvalToken,
      confirmationText: confirmationText,
      note: note,
      selectedEventKey: selectedEventKey
    }), 'A execução do runbook demorou mais do que o esperado.').then(function (result) {
      closeRunbookDialog();
      showToast(result && result.status === 'verification_failed'
        ? 'Runbook executado, mas a recuperação ainda precisa ser acompanhada.'
        : 'Runbook executado e verificado com sucesso.', result && result.status === 'verification_failed' ? 'warning' : 'success');
      return new Promise(function (resolve) { window.setTimeout(resolve, 850); });
    }).then(function () {
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível executar o runbook.', 'danger');
    }).finally(function () {
      setMutationBusy('', false);
    });
  }

  function runNow() {
    var repo = repository();
    if (!repo || typeof repo.runNow !== 'function') return Promise.resolve();
    setMutationBusy('run-now', true);
    return withTimeout(repo.runNow('Execução manual solicitada pelo painel operacional.'), 'A solicitação de execução demorou mais do que o esperado.').then(function (result) {
      showToast(result && result.requested
        ? 'Worker acionado. A fila será atualizada automaticamente.'
        : 'Não havia eventos entregáveis na fila.', result && result.requested ? 'success' : 'info');
      return new Promise(function (resolve) { window.setTimeout(resolve, 850); });
    }).then(function () {
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível executar o worker.', 'danger');
    }).finally(function () {
      setMutationBusy('', false);
    });
  }

  function navigateBack() {
    if (typeof window.DokeNavigate === 'function') {
      return Promise.resolve(window.DokeNavigate('admin.html', { source: 'admin-order-operations-back' }));
    }
    window.location.assign('admin.html');
    return Promise.resolve();
  }

  function postIncidentReview(reviewId) {
    var projection = dashboard && dashboard.postIncident || {};
    var reviews = Array.isArray(projection.reviews) ? projection.reviews : [];
    return reviews.find(function (item) { return clean(item.reviewId) === clean(reviewId); }) || null;
  }

  function renderPostIncidentDialog(review) {
    var dialog = q('[data-admin-ops-post-incident-dialog]');
    if (!dialog || !review) return;
    var projection = dashboard && dashboard.postIncident || {};
    var alertsProjection = dashboard && dashboard.operationalAlerts || {};
    var actorRole = clean(projection.actorRole);
    var completed = review.reviewStatus === 'completed';
    var subject = q('[data-admin-ops-post-incident-subject]', dialog);
    var title = q('[data-admin-ops-post-incident-dialog-title]', dialog);
    var metrics = q('[data-admin-ops-post-incident-metrics]', dialog);
    var category = q('[data-admin-ops-root-cause-category]', dialog);
    var impact = q('[data-admin-ops-impact-summary]', dialog);
    var rootCause = q('[data-admin-ops-root-cause]', dialog);
    var factors = q('[data-admin-ops-contributing-factors]', dialog);
    var detection = q('[data-admin-ops-detection-assessment]', dialog);
    var prevention = q('[data-admin-ops-prevention-summary]', dialog);
    var lessons = q('[data-admin-ops-lessons-learned]', dialog);
    var owner = q('[data-admin-ops-prevention-owner]', dialog);
    var actionList = q('[data-admin-ops-post-incident-actions]', dialog);
    var guard = q('[data-admin-ops-post-incident-guard]', dialog);
    var save = q('[data-admin-ops-post-incident-save]', dialog);
    var complete = q('[data-admin-ops-post-incident-complete]', dialog);

    if (subject) subject.textContent = review.title || review.alertKey;
    if (title) title.textContent = completed ? 'Revisar análise pós-incidente' : 'Documentar análise pós-incidente';
    if (metrics) {
      metrics.replaceChildren();
      [['Duração', formatDurationSeconds(review.mttrSeconds)], ['MTTA', formatDurationSeconds(review.mttaSeconds)], ['Resolvido em', formatDate(review.resolvedAt)]].forEach(function (entry) {
        var item = document.createElement('div');
        appendText(item, 'span', '', entry[0]);
        appendText(item, 'strong', '', entry[1]);
        metrics.appendChild(item);
      });
    }
    if (category) category.value = clean(review.rootCauseCategory) || 'unknown';
    if (impact) impact.value = clean(review.impactSummary);
    if (rootCause) rootCause.value = clean(review.rootCause);
    if (factors) factors.value = (Array.isArray(review.contributingFactors) ? review.contributingFactors : []).join('\n');
    if (detection) detection.value = clean(review.detectionAssessment);
    if (prevention) prevention.value = clean(review.preventionSummary);
    if (lessons) lessons.value = clean(review.lessonsLearned);
    [category, impact, rootCause, factors, detection, prevention, lessons].forEach(function (field) { if (field) field.disabled = completed; });

    if (owner) {
      owner.replaceChildren();
      (Array.isArray(alertsProjection.operators) ? alertsProjection.operators : []).forEach(function (operator) {
        var option = document.createElement('option');
        option.value = clean(operator.id);
        option.textContent = clean(operator.name) + ' · ' + statusLabel(operator.role);
        if (clean(operator.id) === clean(projection.actorId)) option.selected = true;
        owner.appendChild(option);
      });
      owner.disabled = completed;
    }
    var createTitle = q('[data-admin-ops-prevention-title]', dialog);
    var createDue = q('[data-admin-ops-prevention-due]', dialog);
    var createButton = q('[data-admin-ops-prevention-create]', dialog);
    if (createTitle) { createTitle.value = ''; createTitle.disabled = completed; }
    if (createDue) { createDue.value = ''; createDue.disabled = completed; }
    if (createButton) createButton.disabled = completed;

    if (actionList) {
      actionList.replaceChildren();
      var actions = Array.isArray(review.preventionActions) ? review.preventionActions : [];
      if (!actions.length) appendText(actionList, 'p', 'admin-empty', 'Nenhuma ação preventiva adicionada.');
      actions.forEach(function (item) {
        var card = document.createElement('article');
        card.className = 'admin-ops-prevention-item';
        var top = document.createElement('div');
        top.className = 'admin-ops-prevention-item__top';
        var copy = document.createElement('div');
        appendText(copy, 'strong', '', item.title);
        appendText(copy, 'span', '', (item.ownerName || 'Operador Doke') + ' · ' + (item.dueAt ? new Date(item.dueAt + 'T12:00:00').toLocaleDateString('pt-BR') : 'sem prazo'));
        top.appendChild(copy);
        appendText(top, 'span', 'admin-ops-prevention-status', statusLabel(item.status)).dataset.status = clean(item.status);
        card.appendChild(top);
        if (item.status !== 'done' && item.status !== 'cancelled' && (actorRole === 'admin' || clean(item.ownerId) === clean(projection.actorId))) {
          var row = document.createElement('div');
          row.className = 'admin-ops-prevention-item__actions';
          var done = document.createElement('button');
          done.type = 'button';
          done.className = 'doke-btn doke-btn--success doke-btn--sm';
          done.dataset.adminOpsPreventionAction = item.id;
          done.dataset.adminOpsPreventionReview = review.reviewId;
          done.dataset.adminOpsPreventionCommand = 'complete';
          done.textContent = 'Concluir';
          row.appendChild(done);
          card.appendChild(row);
        }
        actionList.appendChild(card);
      });
    }

    if (guard) {
      guard.hidden = actorRole === 'admin' || !completed;
      guard.textContent = completed ? 'Somente administradores podem reabrir uma análise concluída.' : '';
    }
    if (save) save.hidden = completed;
    if (complete) {
      complete.hidden = completed && actorRole !== 'admin';
      complete.textContent = completed ? 'Reabrir análise' : 'Concluir análise';
      complete.dataset.adminOpsPostIncidentCommand = completed ? 'reopen' : 'complete';
      complete.disabled = !completed && actorRole !== 'admin';
    }
  }

  function openPostIncidentDialog(reviewId) {
    var dialog = q('[data-admin-ops-post-incident-dialog]');
    var review = postIncidentReview(reviewId);
    if (!dialog || !review) {
      showToast('A análise pós-incidente não está mais disponível.', 'warning');
      return;
    }
    activePostIncidentReviewId = clean(reviewId);
    dialog.dataset.reviewId = activePostIncidentReviewId;
    renderPostIncidentDialog(review);
    if (typeof dialog.showModal === 'function' && !dialog.open) dialog.showModal();
  }

  function closePostIncidentDialog() {
    var dialog = q('[data-admin-ops-post-incident-dialog]');
    activePostIncidentReviewId = null;
    if (dialog && dialog.open) dialog.close();
  }

  function postIncidentPayload() {
    var dialog = q('[data-admin-ops-post-incident-dialog]');
    var factorsField = q('[data-admin-ops-contributing-factors]', dialog);
    var lines = String(factorsField && factorsField.value || '')
      .split(/\n+/).map(clean).filter(Boolean).slice(0, 12);
    return {
      rootCauseCategory: clean(q('[data-admin-ops-root-cause-category]', dialog) && q('[data-admin-ops-root-cause-category]', dialog).value) || 'unknown',
      impactSummary: clean(q('[data-admin-ops-impact-summary]', dialog) && q('[data-admin-ops-impact-summary]', dialog).value),
      rootCause: clean(q('[data-admin-ops-root-cause]', dialog) && q('[data-admin-ops-root-cause]', dialog).value),
      contributingFactors: lines,
      detectionAssessment: clean(q('[data-admin-ops-detection-assessment]', dialog) && q('[data-admin-ops-detection-assessment]', dialog).value),
      preventionSummary: clean(q('[data-admin-ops-prevention-summary]', dialog) && q('[data-admin-ops-prevention-summary]', dialog).value),
      lessonsLearned: clean(q('[data-admin-ops-lessons-learned]', dialog) && q('[data-admin-ops-lessons-learned]', dialog).value)
    };
  }

  function submitPostIncident(command) {
    var repo = repository();
    var reviewId = activePostIncidentReviewId;
    if (!repo || typeof repo.updatePostIncident !== 'function' || !reviewId) return Promise.resolve();
    setMutationBusy('post-incident', true);
    return withTimeout(repo.updatePostIncident(reviewId, command, postIncidentPayload()), 'A análise pós-incidente demorou mais do que o esperado.').then(function () {
      showToast(command === 'complete' ? 'Análise pós-incidente concluída.' : command === 'reopen' ? 'Análise reaberta para edição.' : 'Rascunho salvo.', 'success');
      return load({ refresh: true, silent: true });
    }).then(function () {
      var review = postIncidentReview(reviewId);
      if (review) renderPostIncidentDialog(review);
      else closePostIncidentDialog();
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível atualizar a análise.', 'danger');
    }).finally(function () { setMutationBusy('', false); });
  }

  function createPreventionAction() {
    var dialog = q('[data-admin-ops-post-incident-dialog]');
    var repo = repository();
    if (!dialog || !repo || typeof repo.updatePreventionAction !== 'function' || !activePostIncidentReviewId) return Promise.resolve();
    var title = clean(q('[data-admin-ops-prevention-title]', dialog) && q('[data-admin-ops-prevention-title]', dialog).value);
    var ownerId = clean(q('[data-admin-ops-prevention-owner]', dialog) && q('[data-admin-ops-prevention-owner]', dialog).value);
    var dueAt = clean(q('[data-admin-ops-prevention-due]', dialog) && q('[data-admin-ops-prevention-due]', dialog).value);
    if (title.length < 10) {
      showToast('Descreva a ação preventiva com pelo menos 10 caracteres.', 'warning');
      return Promise.resolve();
    }
    if (!dueAt) {
      showToast('Defina um prazo para a ação preventiva.', 'warning');
      return Promise.resolve();
    }
    setMutationBusy('prevention-create', true);
    return withTimeout(repo.updatePreventionAction(activePostIncidentReviewId, null, 'create', { title: title, ownerId: ownerId, dueAt: dueAt }), 'A criação da ação preventiva demorou mais do que o esperado.').then(function () {
      showToast('Ação preventiva adicionada.', 'success');
      return load({ refresh: true, silent: true });
    }).then(function () {
      var review = postIncidentReview(activePostIncidentReviewId);
      if (review) renderPostIncidentDialog(review);
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível criar a ação preventiva.', 'danger');
    }).finally(function () { setMutationBusy('', false); });
  }

  function updatePreventionAction(reviewId, actionId, command) {
    var repo = repository();
    if (!repo || typeof repo.updatePreventionAction !== 'function') return Promise.resolve();
    setMutationBusy('prevention-update', true);
    return withTimeout(repo.updatePreventionAction(reviewId, actionId, command, {}), 'A atualização da ação preventiva demorou mais do que o esperado.').then(function () {
      showToast(command === 'complete' ? 'Ação preventiva concluída.' : 'Ação preventiva atualizada.', 'success');
      return load({ refresh: true, silent: true });
    }).then(function () {
      if (activePostIncidentReviewId) {
        var review = postIncidentReview(activePostIncidentReviewId);
        if (review) renderPostIncidentDialog(review);
      }
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível atualizar a ação preventiva.', 'danger');
    }).finally(function () { setMutationBusy('', false); });
  }

  function changeById(changeId) {
    var projection = dashboard && dashboard.changeProtection || {};
    var changes = Array.isArray(projection.changes) ? projection.changes : [];
    return changes.find(function (item) { return clean(item.id) === clean(changeId); }) || null;
  }

  function openChangeRegisterDialog() {
    var dialog = q('[data-admin-ops-change-dialog]');
    if (!dialog) return;
    ['key', 'name', 'reference', 'description'].forEach(function (field) {
      var input = q('[data-admin-ops-change-' + field + ']', dialog);
      if (input) input.value = '';
    });
    var type = q('[data-admin-ops-change-type]', dialog);
    var risk = q('[data-admin-ops-change-risk]', dialog);
    if (type) type.value = 'deploy';
    if (risk) risk.value = 'medium';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    window.requestAnimationFrame(function () { var key = q('[data-admin-ops-change-key]', dialog); if (key) key.focus(); });
  }

  function closeChangeRegisterDialog() {
    var dialog = q('[data-admin-ops-change-dialog]');
    if (dialog && dialog.open) dialog.close();
  }

  function submitChangeRegister() {
    var dialog = q('[data-admin-ops-change-dialog]');
    var repo = repository();
    if (!dialog || !repo || typeof repo.registerChange !== 'function') return Promise.resolve();
    var payload = {
      externalKey: clean(q('[data-admin-ops-change-key]', dialog) && q('[data-admin-ops-change-key]', dialog).value),
      changeType: clean(q('[data-admin-ops-change-type]', dialog) && q('[data-admin-ops-change-type]', dialog).value),
      riskLevel: clean(q('[data-admin-ops-change-risk]', dialog) && q('[data-admin-ops-change-risk]', dialog).value),
      title: clean(q('[data-admin-ops-change-name]', dialog) && q('[data-admin-ops-change-name]', dialog).value),
      changeReference: clean(q('[data-admin-ops-change-reference]', dialog) && q('[data-admin-ops-change-reference]', dialog).value),
      description: clean(q('[data-admin-ops-change-description]', dialog) && q('[data-admin-ops-change-description]', dialog).value)
    };
    if (payload.externalKey.length < 6 || payload.title.length < 5) {
      showToast('Informe uma chave válida e um título com pelo menos 5 caracteres.', 'warning');
      return Promise.resolve();
    }
    setMutationBusy('change-register', true);
    return withTimeout(repo.registerChange(payload), 'A avaliação da mudança demorou mais do que o esperado.').then(function () {
      closeChangeRegisterDialog();
      showToast('Mudança registrada e avaliada pelo error budget.', 'success');
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível registrar a mudança.', 'danger');
    }).finally(function () { setMutationBusy('', false); });
  }

  function openChangeActionDialog(changeId, action) {
    var dialog = q('[data-admin-ops-change-action-dialog]');
    var item = changeById(changeId);
    if (!dialog || !item) return;
    activeChangeId = clean(changeId);
    activeChangeAction = clean(action);
    var title = q('[data-admin-ops-change-action-title]', dialog);
    var subject = q('[data-admin-ops-change-action-subject]', dialog);
    var state = q('[data-admin-ops-change-action-state]', dialog);
    var approval = q('[data-admin-ops-change-approval-fields]', dialog);
    var start = q('[data-admin-ops-change-start-fields]', dialog);
    var complete = q('[data-admin-ops-change-complete-fields]', dialog);
    if (approval) approval.hidden = activeChangeAction !== 'approve';
    if (start) start.hidden = activeChangeAction !== 'start';
    if (complete) complete.hidden = activeChangeAction !== 'complete';
    if (title) title.textContent = activeChangeAction === 'approve' ? 'Aprovar exceção temporária' : activeChangeAction === 'start' ? 'Liberar execução' : 'Registrar resultado';
    if (subject) subject.textContent = item.title + ' · ' + item.externalKey;
    if (state) {
      state.replaceChildren();
      appendText(state, 'strong', '', changeDecisionLabel(item.gateDecision) + ' · ' + protectionStateLabel(item.protectionState));
      appendText(state, 'span', '', 'Risco ' + changeRiskLabel(item.riskLevel) + ' · ' + changeTypeLabel(item.changeType));
    }
    var phrase = q('[data-admin-ops-change-confirmation-phrase]', dialog);
    var confirmation = q('[data-admin-ops-change-confirmation]', dialog);
    if (phrase) phrase.textContent = item.confirmationPhrase || ('LIBERAR ' + item.externalKey);
    if (confirmation) confirmation.value = '';
    var reason = q('[data-admin-ops-change-approval-reason]', dialog);
    var note = q('[data-admin-ops-change-completion-note]', dialog);
    if (reason) reason.value = '';
    if (note) note.value = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  function closeChangeActionDialog() {
    var dialog = q('[data-admin-ops-change-action-dialog]');
    activeChangeId = null;
    activeChangeAction = '';
    if (dialog && dialog.open) dialog.close();
  }

  function submitChangeAction() {
    var dialog = q('[data-admin-ops-change-action-dialog]');
    var repo = repository();
    var item = changeById(activeChangeId);
    if (!dialog || !repo || !item) return Promise.resolve();
    var operation;
    if (activeChangeAction === 'approve') {
      var reason = clean(q('[data-admin-ops-change-approval-reason]', dialog) && q('[data-admin-ops-change-approval-reason]', dialog).value);
      var minutes = number(q('[data-admin-ops-change-approval-minutes]', dialog) && q('[data-admin-ops-change-approval-minutes]', dialog).value) || 60;
      if (reason.length < 20) {
        showToast('Explique a exceção com pelo menos 20 caracteres.', 'warning');
        return Promise.resolve();
      }
      operation = repo.approveChange(activeChangeId, reason, minutes);
    } else if (activeChangeAction === 'start') {
      var confirmation = clean(q('[data-admin-ops-change-confirmation]', dialog) && q('[data-admin-ops-change-confirmation]', dialog).value);
      var reference = clean(q('[data-admin-ops-change-execution-reference]', dialog) && q('[data-admin-ops-change-execution-reference]', dialog).value);
      operation = repo.startChange(activeChangeId, confirmation, reference);
    } else {
      var outcome = clean(q('[data-admin-ops-change-outcome]', dialog) && q('[data-admin-ops-change-outcome]', dialog).value) || 'completed';
      var note = clean(q('[data-admin-ops-change-completion-note]', dialog) && q('[data-admin-ops-change-completion-note]', dialog).value);
      if (note.length < 10) {
        showToast('Registre o resultado com pelo menos 10 caracteres.', 'warning');
        return Promise.resolve();
      }
      operation = repo.completeChange(activeChangeId, outcome, note);
    }
    setMutationBusy('change-action', true);
    return withTimeout(operation, 'A decisão da mudança demorou mais do que o esperado.').then(function () {
      closeChangeActionDialog();
      showToast('Decisão operacional registrada.', 'success');
      return load({ refresh: true, silent: true });
    }).catch(function (error) {
      showToast(error && error.message || 'Não foi possível atualizar a mudança.', 'danger');
    }).finally(function () { setMutationBusy('', false); });
  }

  function bind() {
    if (eventsBound) return;
    eventsBound = true;

    document.addEventListener('click', function (event) {
      var back = event.target.closest('[data-admin-ops-back]');
      if (back) {
        event.preventDefault();
        navigateBack();
        return;
      }

      var retry = event.target.closest('[data-admin-ops-retry], [data-admin-ops-refresh]');
      if (retry) {
        event.preventDefault();
        load({ refresh: true });
        return;
      }

      var runButton = event.target.closest('[data-admin-ops-run-now]');
      if (runButton) {
        event.preventDefault();
        runNow();
        return;
      }

      var filter = event.target.closest('[data-admin-ops-filter]');
      if (filter) {
        event.preventDefault();
        activeFilter = clean(filter.dataset.adminOpsFilter) || 'all';
        document.querySelectorAll('[data-admin-ops-filter]').forEach(function (button) {
          button.setAttribute('aria-pressed', button === filter ? 'true' : 'false');
        });
        renderQueue();
        return;
      }

      if (event.target.closest('[data-admin-ops-change-register]')) {
        event.preventDefault();
        openChangeRegisterDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-change-close]')) {
        event.preventDefault();
        closeChangeRegisterDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-change-submit]')) {
        event.preventDefault();
        submitChangeRegister();
        return;
      }

      var changeAction = event.target.closest('[data-admin-ops-change-action]');
      if (changeAction) {
        event.preventDefault();
        openChangeActionDialog(changeAction.dataset.adminOpsChangeId, changeAction.dataset.adminOpsChangeAction);
        return;
      }

      if (event.target.closest('[data-admin-ops-change-action-close]')) {
        event.preventDefault();
        closeChangeActionDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-change-action-submit]')) {
        event.preventDefault();
        submitChangeAction();
        return;
      }

      var postIncident = event.target.closest('[data-admin-ops-post-incident]');
      if (postIncident) {
        event.preventDefault();
        openPostIncidentDialog(postIncident.dataset.adminOpsPostIncident);
        return;
      }

      if (event.target.closest('[data-admin-ops-post-incident-close]')) {
        event.preventDefault();
        closePostIncidentDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-post-incident-save]')) {
        event.preventDefault();
        submitPostIncident('save');
        return;
      }

      var postIncidentComplete = event.target.closest('[data-admin-ops-post-incident-complete]');
      if (postIncidentComplete) {
        event.preventDefault();
        submitPostIncident(clean(postIncidentComplete.dataset.adminOpsPostIncidentCommand) || 'complete');
        return;
      }

      if (event.target.closest('[data-admin-ops-prevention-create]')) {
        event.preventDefault();
        createPreventionAction();
        return;
      }

      var preventionAction = event.target.closest('[data-admin-ops-prevention-action]');
      if (preventionAction) {
        event.preventDefault();
        updatePreventionAction(preventionAction.dataset.adminOpsPreventionReview, preventionAction.dataset.adminOpsPreventionAction, preventionAction.dataset.adminOpsPreventionCommand);
        return;
      }

      var runbook = event.target.closest('[data-admin-ops-runbook]');
      if (runbook) {
        event.preventDefault();
        openRunbookDialog(runbook.dataset.adminOpsRunbook);
        return;
      }

      if (event.target.closest('[data-admin-ops-runbook-close]')) {
        event.preventDefault();
        closeRunbookDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-runbook-submit]')) {
        event.preventDefault();
        submitRunbook();
        return;
      }

      var incident = event.target.closest('[data-admin-ops-incident]');
      if (incident) {
        event.preventDefault();
        openIncidentDialog(incident.dataset.adminOpsIncident, incident.dataset.adminOpsIncidentAction);
        return;
      }

      if (event.target.closest('[data-admin-ops-incident-close]')) {
        event.preventDefault();
        closeIncidentDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-incident-submit]')) {
        event.preventDefault();
        submitIncidentUpdate();
        return;
      }

      var requeue = event.target.closest('[data-admin-ops-requeue]');
      if (requeue) {
        event.preventDefault();
        openRequeueDialog(requeue.dataset.adminOpsRequeue);
        return;
      }

      if (event.target.closest('[data-admin-ops-requeue-close]')) {
        event.preventDefault();
        closeRequeueDialog();
        return;
      }

      if (event.target.closest('[data-admin-ops-requeue-submit]')) {
        event.preventDefault();
        submitRequeue();
      }
    });

    document.addEventListener('input', function (event) {
      var search = event.target.closest('[data-admin-ops-search]');
      if (!search) return;
      searchTerm = clean(search.value).toLowerCase();
      renderQueue();
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) window.clearTimeout(autoRefreshTimer);
      else scheduleAutoRefresh();
    });

    document.addEventListener('doke:session-changed', function () {
      guarded = false;
      dashboard = null;
      activeRunbookPreview = null;
      activePostIncidentReviewId = null;
      activeChangeId = null;
      activeChangeAction = '';
      load({ silent: true });
    });
  }

  function init() {
    var activeRoot = refreshNodes();
    if (!activeRoot) return Promise.resolve(null);
    if (initializedRoot === activeRoot) return Promise.resolve(dashboard);
    initializedRoot = activeRoot;
    dashboard = null;
    guarded = false;
    activeFilter = 'all';
    searchTerm = '';
    activeRunbookPreview = null;
    activePostIncidentReviewId = null;
    activeChangeId = null;
    activeChangeAction = '';
    bind();
    return load({ silent: true });
  }

  window.DokeInitAdminOrderOperations = init;

  function bootstrap() {
    Promise.resolve(init()).catch(function (error) {
      console.error('[Doke][admin-order-operations] Falha na inicialização', error);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
}());
