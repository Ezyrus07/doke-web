(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var root = null;
  var current = null;
  var activeAction = '';
  var decisionBusy = false;
  var initializedRoot = null;
  var eventsBound = false;
  var REVIEW_TIMEOUT_MS = 9000;

  function q(selector) { return document.querySelector(selector); }
  function clean(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim(); }
  function repository() { return Doke.repositories && Doke.repositories.serviceModeration || null; }
  function accessService() { return Doke.services && Doke.services.adminAccess || null; }
  function lifecycle() { return window.DokeNavigationLifecycle || Doke.navigationLifecycle || null; }

  function withTimeout(operation, timeoutMs, message) {
    var timer = null;
    return Promise.race([
      Promise.resolve(operation),
      new Promise(function (_, reject) {
        timer = window.setTimeout(function () { reject(new Error(message)); }, timeoutMs);
      })
    ]).finally(function () {
      if (timer) window.clearTimeout(timer);
    });
  }

  function showToast(message) {
    var toast = q('[data-admin-ad-review-toast]');
    if (!toast) return;
    toast.textContent = clean(message);
    toast.hidden = false;
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(function () { toast.hidden = true; }, 3600);
  }

  function formatDate(value) {
    var date = value ? new Date(value) : null;
    return !date || Number.isNaN(date.getTime())
      ? 'Não informado'
      : date.toLocaleString('pt-BR', {
          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
  }

  function formatDuration(value) {
    var seconds = Math.max(0, Number(value || 0));
    if (!Number.isFinite(seconds)) return 'Não informado';
    if (seconds < 60) return Math.round(seconds) + ' s';
    var minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + ' min';
    var hours = Math.floor(minutes / 60);
    var remainingMinutes = minutes % 60;
    if (hours < 24) return hours + ' h' + (remainingMinutes ? ' ' + remainingMinutes + ' min' : '');
    var days = Math.floor(hours / 24);
    var remainingHours = hours % 24;
    return days + ' d' + (remainingHours ? ' ' + remainingHours + ' h' : '');
  }

  function sourceLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'create') return 'Novo anúncio';
    if (key === 'resubmit') return 'Reenvio após ajustes';
    return 'Alteração de anúncio';
  }

  function changeClassLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'critical') return 'Alteração crítica';
    if (key === 'minor') return 'Alteração pequena';
    return 'Alteração relevante';
  }

  function visibilityLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'take_down_until_decision') return 'Fora do ar durante a análise';
    if (key === 'not_public_until_approved') return 'Ainda não publicado';
    return 'Versão pública permanece ativa';
  }

  function reviewStatusLabel(value) {
    var key = clean(value).toLowerCase();
    if (key === 'approved') return 'Aprovada';
    if (key === 'changes_required') return 'Ajustes solicitados';
    if (key === 'rejected') return 'Rejeitada';
    if (key === 'superseded') return 'Substituída por outra versão';
    return 'Aguardando decisão';
  }

  function eventLabel(value) {
    var labels = {
      version_submitted: 'Versão enviada para análise',
      version_resubmitted: 'Versão reenviada após ajustes',
      version_approved: 'Versão aprovada',
      changes_requested: 'Ajustes solicitados',
      version_rejected: 'Versão rejeitada',
      version_superseded: 'Versão substituída',
      listing_paused: 'Anúncio retirado temporariamente do ar',
      listing_published: 'Anúncio publicado',
      listing_restored: 'Versão pública restaurada',
      listing_unpublished: 'Anúncio retirado do catálogo'
    };
    return labels[clean(value)] || clean(value).replace(/_/g, ' ');
  }

  function eventTone(value) {
    var key = clean(value);
    if (key === 'version_approved' || key === 'listing_published' || key === 'listing_restored') return 'success';
    if (key === 'version_rejected' || key === 'listing_paused' || key === 'listing_unpublished') return 'danger';
    if (key === 'changes_requested' || key === 'version_superseded') return 'warning';
    return 'info';
  }

  function reasonLabel(value) {
    var labels = {
      new_listing: 'Primeira publicação do anúncio',
      category_changed: 'Categoria principal alterada',
      service_mode_changed: 'Modalidade de atendimento alterada',
      state_changed: 'Estado de atendimento alterado',
      external_contact_detected: 'Possível contato externo detectado',
      external_payment_detected: 'Possível pagamento externo detectado',
      regulated_service_detected: 'Possível serviço regulado ou de maior risco',
      listing_identity_shift: 'Título, descrição e imagens mudaram em conjunto',
      commercial_content_changed: 'Oferta comercial ou conteúdo relevante alterado',
      operational_details_changed: 'Somente dados operacionais foram alterados',
      no_material_change: 'Nenhuma mudança material detectada'
    };
    return labels[clean(value)] || clean(value).replace(/_/g, ' ');
  }

  function appendText(parent, tag, className, value) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = clean(value);
    parent.appendChild(node);
    return node;
  }

  function renderImpact(item) {
    var surface = q('[data-admin-ad-review-impact]');
    if (!surface) return;
    surface.replaceChildren();

    var pending = clean(item.reviewStatus) === 'pending_review';
    var visibility = clean(item.visibilityAction) || 'keep_public';
    surface.dataset.tone = pending ? (clean(item.changeClass) || 'major') : eventTone(
      item.reviewStatus === 'approved' ? 'version_approved'
        : item.reviewStatus === 'rejected' ? 'version_rejected'
          : item.reviewStatus === 'changes_required' ? 'changes_requested'
            : 'version_superseded'
    );

    if (pending) {
      appendText(surface, 'strong', '', visibilityLabel(visibility));
      appendText(surface, 'p', '', visibility === 'take_down_until_decision'
        ? 'O anúncio aprovado está temporariamente indisponível porque a edição altera identidade, risco ou regras críticas.'
        : visibility === 'not_public_until_approved'
          ? 'Este é um anúncio novo e só ficará disponível depois da aprovação.'
          : 'A última versão aprovada continua visível enquanto esta alteração é analisada.');
    } else {
      appendText(surface, 'strong', '', reviewStatusLabel(item.reviewStatus));
      var decisionCopy = item.reviewedAt
        ? 'Decisão registrada em ' + formatDate(item.reviewedAt) + ' por ' + clean(item.reviewedByName || 'Equipe Doke') + '.'
        : 'Esta versão já não está pendente de decisão.';
      appendText(surface, 'p', '', decisionCopy);
      if (clean(item.reviewReason)) appendText(surface, 'p', 'admin-ad-review__decision-reason', item.reviewReason);
    }

    var reasons = Array.isArray(item.classificationReasons) ? item.classificationReasons : [];
    if (reasons.length) {
      var list = document.createElement('ul');
      reasons.forEach(function (reason) { appendText(list, 'li', '', reasonLabel(reason)); });
      surface.appendChild(list);
    }
  }

  function quoteModeLabel(snapshot) {
    var mode = clean(snapshot && snapshot.quoteMode).toLowerCase();
    if (mode === 'custom') return 'Formulário personalizado';
    if (mode === 'disabled') return 'Somente conversa';
    return 'Modelo Doke';
  }

  function setSurface(state, message) {
    var busy = state === 'guard-pending' || state === 'loading';
    root.dataset.viewState = state;
    root.setAttribute('aria-busy', busy ? 'true' : 'false');

    var pending = q('[data-admin-ad-review-pending]');
    var content = q('[data-admin-ad-review-content]');
    var error = q('[data-admin-ad-review-error]');
    if (pending) pending.hidden = !busy;
    if (content) content.hidden = state !== 'ready';
    if (error) error.hidden = state !== 'error';

    if (state === 'loading') {
      q('[data-admin-ad-review-pending-title]').textContent = 'Carregando comparação e histórico';
      q('[data-admin-ad-review-pending-message]').textContent = 'Buscando versões, decisões e o rastro de auditoria deste anúncio.';
    }
    if (error && message) q('[data-admin-ad-review-error-message]').textContent = message;
    if (state === 'error' && error) window.requestAnimationFrame(function () { error.focus(); });
  }

  function beginPage() {
    var api = lifecycle();
    if (api && api.page) api.page.begin({ page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller' });
  }

  function readyPage() {
    var api = lifecycle();
    if (api && api.page) api.page.ready({ page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller', hasItems: true });
  }

  function failPage(error) {
    var api = lifecycle();
    if (api && api.page) api.page.fail(error, { page: 'admin-anuncio-revisao', source: 'admin-ad-review-controller' });
  }

  function goBack(replace) {
    var target = 'admin.html';
    if (typeof window.DokeNavigate === 'function') {
      return Promise.resolve(window.DokeNavigate(target, { source: 'admin-ad-review-back', replace: replace === true }));
    }
    if (replace) window.location.replace(target);
    else window.location.assign(target);
    return Promise.resolve();
  }

  function normalizedValue(snapshot, key) {
    var value = snapshot && snapshot[key];
    if (key === 'quoteMode') return quoteModeLabel(snapshot);
    if (key === 'price') return clean(snapshot && (snapshot.priceLabel || snapshot.priceValue)) || 'Sob orçamento';
    if (key === 'description') return clean(snapshot && (snapshot.description || snapshot.fullDescription)) || 'Não informado';
    if (key === 'images') return Array.isArray(value) ? String(value.length) + ' imagem(ns)' : '0 imagens';
    if (key === 'quoteTemplate') {
      var questions = value && Array.isArray(value.questions) ? value.questions : [];
      return questions.length ? String(questions.length) + ' pergunta(s)' : 'Sem perguntas personalizadas';
    }
    if (Array.isArray(value)) return value.length ? value.join(', ') : 'Não informado';
    if (value && typeof value === 'object') return JSON.stringify(value);
    return clean(value) || 'Não informado';
  }

  function valuesEqual(a, b) { return clean(a) === clean(b); }

  function comparisonRow(label, key, approved, pending) {
    var beforeValue = normalizedValue(approved, key);
    var afterValue = normalizedValue(pending, key);
    var changed = !valuesEqual(beforeValue, afterValue);
    var row = document.createElement('article');
    row.className = 'admin-ad-review__row';
    row.dataset.changed = changed ? 'true' : 'false';
    appendText(row, 'h3', 'admin-ad-review__field-title', label);

    var columns = document.createElement('div');
    columns.className = 'admin-ad-review__columns';
    var before = document.createElement('div');
    before.className = 'admin-ad-review__value';
    appendText(before, 'span', '', approved ? 'Versão-base' : 'Sem versão pública');
    appendText(before, 'p', '', approved ? beforeValue : 'Novo anúncio');
    var after = document.createElement('div');
    after.className = 'admin-ad-review__value admin-ad-review__value--new';
    appendText(after, 'span', '', changed ? 'Versão enviada · alterado' : 'Versão enviada · sem alteração');
    appendText(after, 'p', '', afterValue);
    columns.append(before, after);
    row.appendChild(columns);
    return row;
  }

  var sections = [
    { id: 'review-basic', eyebrow: 'Conteúdo principal', title: 'Identificação do serviço', fields: [['Título', 'title'], ['Categoria', 'category'], ['Descrição curta', 'shortDescription'], ['Descrição completa', 'description']] },
    { id: 'review-offer', eyebrow: 'Oferta comercial', title: 'Preço e atendimento', fields: [['Preço', 'price'], ['Modalidade', 'serviceMode'], ['Cidade', 'city'], ['Estado', 'state'], ['Área de atendimento', 'serviceArea'], ['Disponibilidade', 'availability']] },
    { id: 'review-scope', eyebrow: 'Escopo', title: 'Inclusões e diferenciais', fields: [['Itens incluídos', 'includedItems'], ['Diferenciais', 'differentials']] },
    { id: 'review-quote', eyebrow: 'Conversão', title: 'Formulário de orçamento', fields: [['Modo de orçamento', 'quoteMode'], ['Perguntas personalizadas', 'quoteTemplate']] }
  ];

  function createSection(config, approved, pending) {
    var section = document.createElement('section');
    section.className = 'admin-ad-review__section';
    section.id = config.id;
    var header = document.createElement('header');
    header.className = 'admin-ad-review__section-header';
    var copy = document.createElement('div');
    appendText(copy, 'span', '', config.eyebrow);
    appendText(copy, 'h2', '', config.title);
    var rows = document.createElement('div');
    rows.className = 'admin-ad-review__rows';
    var changedCount = 0;
    config.fields.forEach(function (field) {
      var row = comparisonRow(field[0], field[1], approved, pending);
      if (row.dataset.changed === 'true') changedCount += 1;
      rows.appendChild(row);
    });
    appendText(header, 'strong', 'admin-ad-review__section-count', changedCount + ' alteração(ões)');
    header.prepend(copy);
    section.append(header, rows);
    section.dataset.changedCount = String(changedCount);
    return section;
  }

  function imageSection(approved, pending) {
    var section = document.createElement('section');
    section.className = 'admin-ad-review__section';
    section.id = 'review-images';
    var oldImages = approved && Array.isArray(approved.images) ? approved.images : [];
    var newImages = pending && Array.isArray(pending.images) ? pending.images : [];
    var changed = JSON.stringify(oldImages) !== JSON.stringify(newImages);
    section.dataset.changedCount = changed ? '1' : '0';

    var header = document.createElement('header');
    header.className = 'admin-ad-review__section-header';
    var copy = document.createElement('div');
    appendText(copy, 'span', '', 'Mídia');
    appendText(copy, 'h2', '', 'Imagens do anúncio');
    appendText(header, 'strong', 'admin-ad-review__section-count', changed ? 'Alterado' : 'Sem alteração');
    header.prepend(copy);
    section.appendChild(header);

    var columns = document.createElement('div');
    columns.className = 'admin-ad-review__media-columns';
    [
      { label: approved ? 'Versão-base' : 'Sem versão pública', images: oldImages },
      { label: 'Versão enviada', images: newImages }
    ].forEach(function (group) {
      var block = document.createElement('div');
      block.className = 'admin-ad-review__media-group';
      appendText(block, 'strong', '', group.label);
      var grid = document.createElement('div');
      grid.className = 'admin-ad-review__media-grid';
      if (!group.images.length) appendText(grid, 'span', 'admin-ad-review__empty-copy', 'Nenhuma imagem');
      group.images.slice(0, 3).forEach(function (url, index) {
        var figure = document.createElement('figure');
        var img = document.createElement('img');
        img.src = clean(url);
        img.alt = group.label + ' — imagem ' + (index + 1);
        img.loading = 'lazy';
        figure.appendChild(img);
        appendText(figure, 'figcaption', '', index === 0 ? 'Principal' : 'Extra ' + index);
        grid.appendChild(figure);
      });
      block.appendChild(grid);
      columns.appendChild(block);
    });
    section.appendChild(columns);
    return section;
  }

  function questionGroup(snapshot, label) {
    var block = document.createElement('div');
    block.className = 'admin-ad-review__question-group';
    appendText(block, 'strong', '', label);
    var questions = snapshot && snapshot.quoteTemplate && Array.isArray(snapshot.quoteTemplate.questions)
      ? snapshot.quoteTemplate.questions
      : [];
    if (!questions.length) {
      appendText(block, 'p', 'admin-ad-review__empty-copy', 'Sem perguntas personalizadas.');
      return block;
    }
    var list = document.createElement('ol');
    questions.forEach(function (question) {
      var item = document.createElement('li');
      appendText(item, 'span', '', question && question.label || 'Pergunta sem título');
      appendText(item, 'small', '', clean(question && question.type) + (question && question.required ? ' · obrigatória' : ' · opcional'));
      list.appendChild(item);
    });
    block.appendChild(list);
    return block;
  }

  function questionSection(approved, pending) {
    var oldQuestions = approved && approved.quoteTemplate && Array.isArray(approved.quoteTemplate.questions)
      ? approved.quoteTemplate.questions
      : [];
    var newQuestions = pending && pending.quoteTemplate && Array.isArray(pending.quoteTemplate.questions)
      ? pending.quoteTemplate.questions
      : [];
    var section = document.createElement('section');
    section.className = 'admin-ad-review__section';
    section.id = 'review-questions';
    var changed = JSON.stringify(oldQuestions) !== JSON.stringify(newQuestions);
    section.dataset.changedCount = changed ? '1' : '0';
    var header = document.createElement('header');
    header.className = 'admin-ad-review__section-header';
    var copy = document.createElement('div');
    appendText(copy, 'span', '', 'Diagnóstico');
    appendText(copy, 'h2', '', 'Perguntas do orçamento');
    appendText(header, 'strong', 'admin-ad-review__section-count', changed ? 'Alterado' : 'Sem alteração');
    header.prepend(copy);
    section.appendChild(header);
    var columns = document.createElement('div');
    columns.className = 'admin-ad-review__question-columns';
    columns.append(
      questionGroup(approved, approved ? 'Versão-base' : 'Sem versão pública'),
      questionGroup(pending, 'Versão enviada')
    );
    section.appendChild(columns);
    return section;
  }

  function versionStatusClass(value) {
    var key = clean(value);
    if (key === 'approved') return 'success';
    if (key === 'rejected') return 'danger';
    if (key === 'changes_required' || key === 'superseded') return 'warning';
    return 'info';
  }

  function versionsOverview(versions, currentVersionId) {
    var wrap = document.createElement('div');
    wrap.className = 'admin-ad-review__versions';
    (Array.isArray(versions) ? versions : []).forEach(function (version) {
      var card = document.createElement('article');
      card.className = 'admin-ad-review__version-card';
      card.dataset.tone = versionStatusClass(version.reviewStatus);
      if (clean(version.versionId) === clean(currentVersionId)) card.dataset.current = 'true';
      appendText(card, 'strong', '', 'Versão ' + clean(version.versionNumber));
      appendText(card, 'span', '', reviewStatusLabel(version.reviewStatus));
      appendText(card, 'small', '', formatDate(version.submittedAt));
      wrap.appendChild(card);
    });
    return wrap;
  }

  function historySection(history, versions, currentVersionId) {
    var events = Array.isArray(history) ? history : [];
    var section = document.createElement('section');
    section.className = 'admin-ad-review__section admin-ad-review__history';
    section.id = 'review-history';
    section.dataset.filterPersistent = 'true';

    var header = document.createElement('header');
    header.className = 'admin-ad-review__section-header';
    var copy = document.createElement('div');
    appendText(copy, 'span', '', 'Rastro imutável');
    appendText(copy, 'h2', '', 'Histórico e auditoria');
    appendText(header, 'strong', 'admin-ad-review__section-count', events.length + ' evento(s)');
    header.prepend(copy);
    section.appendChild(header);
    section.appendChild(versionsOverview(versions, currentVersionId));

    var timeline = document.createElement('ol');
    timeline.className = 'admin-ad-review__timeline';
    if (!events.length) {
      var empty = document.createElement('li');
      empty.className = 'admin-ad-review__timeline-empty';
      appendText(empty, 'strong', '', 'Nenhum evento registrado');
      appendText(empty, 'span', '', 'O histórico começará no próximo envio ou decisão.');
      timeline.appendChild(empty);
    }

    events.forEach(function (event) {
      var item = document.createElement('li');
      item.className = 'admin-ad-review__timeline-item';
      item.dataset.tone = eventTone(event.eventType);
      if (clean(event.versionId) === clean(currentVersionId)) item.dataset.current = 'true';

      var marker = document.createElement('span');
      marker.className = 'admin-ad-review__timeline-marker';
      marker.setAttribute('aria-hidden', 'true');
      var body = document.createElement('div');
      body.className = 'admin-ad-review__timeline-body';
      var top = document.createElement('div');
      top.className = 'admin-ad-review__timeline-top';
      var title = document.createElement('div');
      appendText(title, 'strong', '', eventLabel(event.eventType));
      appendText(title, 'span', '', 'Versão ' + clean(event.versionNumber || '—'));
      appendText(top, 'time', '', formatDate(event.occurredAt));
      top.prepend(title);
      body.appendChild(top);

      var meta = document.createElement('p');
      meta.className = 'admin-ad-review__timeline-meta';
      meta.textContent = 'Responsável: ' + clean(event.actorName || 'Sistema Doke')
        + (event.reviewDurationSeconds != null ? ' · Tempo em análise: ' + formatDuration(event.reviewDurationSeconds) : '');
      body.appendChild(meta);

      if (clean(event.reason)) appendText(body, 'p', 'admin-ad-review__timeline-reason', event.reason);

      var badges = document.createElement('div');
      badges.className = 'admin-ad-review__timeline-badges';
      if (clean(event.changeClass)) appendText(badges, 'span', '', changeClassLabel(event.changeClass));
      if (clean(event.visibilityAction)) appendText(badges, 'span', '', visibilityLabel(event.visibilityAction));
      if (clean(event.publicStatusBefore) || clean(event.publicStatusAfter)) {
        appendText(badges, 'span', '', clean(event.publicStatusBefore || '—') + ' → ' + clean(event.publicStatusAfter || '—'));
      }
      if (badges.childElementCount) body.appendChild(badges);

      item.append(marker, body);
      timeline.appendChild(item);
    });

    section.appendChild(timeline);
    return section;
  }

  function identityItem(label, value) {
    var item = document.createElement('div');
    item.className = 'admin-ad-review__identity-item';
    appendText(item, 'span', '', label);
    appendText(item, 'strong', '', value || 'Não informado');
    return item;
  }

  function appendSummaryRow(list, label, value) {
    var row = document.createElement('div');
    appendText(row, 'dt', '', label);
    appendText(row, 'dd', '', value);
    list.appendChild(row);
  }

  function addNavLink(nav, id, label) {
    var link = document.createElement('a');
    link.className = 'admin-ad-review__section-link';
    link.href = '#' + id;
    link.textContent = label;
    nav.appendChild(link);
  }

  function render(item) {
    current = item;
    var pending = item.snapshot || {};
    var approved = item.approvedSnapshot && Object.keys(item.approvedSnapshot).length ? item.approvedSnapshot : null;
    var isPending = clean(item.reviewStatus) === 'pending_review';

    q('[data-admin-ad-review-eyebrow]').textContent = sourceLabel(item.source) + ' · versão ' + clean(item.versionNumber);
    q('[data-admin-ad-review-title]').textContent = pending.title || 'Anúncio sem título';
    q('[data-admin-ad-review-description]').textContent = isPending
      ? 'Compare cada alteração com a versão-base antes de tomar uma decisão.'
      : 'Consulte a comparação, a decisão registrada e todo o histórico de moderação desta versão.';

    var status = q('[data-admin-ad-review-status]');
    status.replaceChildren();
    var badge = appendText(status, 'span', 'admin-ad-review__status-badge', changeClassLabel(item.changeClass));
    badge.dataset.tone = clean(item.changeClass) || 'major';
    appendText(status, 'small', '', reviewStatusLabel(item.reviewStatus));
    appendText(status, 'small', '', isPending ? 'Enviado em ' + formatDate(item.submittedAt) : 'Decidido em ' + formatDate(item.reviewedAt));

    renderImpact(item);

    var identity = q('[data-admin-ad-review-identity]');
    identity.replaceChildren(
      identityItem('Profissional', item.professionalName || 'Profissional Doke'),
      identityItem('E-mail', item.professionalEmail || 'Não informado'),
      identityItem('Versões', approved
        ? 'Base ' + clean(item.approvedVersionNumber || '—') + ' → enviada ' + clean(item.versionNumber)
        : 'Primeira versão')
    );

    var main = q('[data-admin-ad-review-main]');
    var nav = q('[data-admin-ad-review-nav]');
    main.replaceChildren();
    nav.replaceChildren();
    var totalChanged = 0;

    sections.forEach(function (config) {
      var section = createSection(config, approved, pending);
      totalChanged += Number(section.dataset.changedCount || 0);
      main.appendChild(section);
      addNavLink(nav, config.id, config.title);
    });

    var media = imageSection(approved, pending);
    totalChanged += Number(media.dataset.changedCount || 0);
    main.appendChild(media);
    addNavLink(nav, 'review-images', 'Imagens');

    var questions = questionSection(approved, pending);
    totalChanged += Number(questions.dataset.changedCount || 0);
    main.appendChild(questions);
    addNavLink(nav, 'review-questions', 'Perguntas');

    var history = historySection(item.history, item.versions, item.versionId);
    main.appendChild(history);
    addNavLink(nav, 'review-history', 'Histórico');

    var summary = q('[data-admin-ad-review-summary]');
    summary.replaceChildren();
    appendSummaryRow(summary, 'Classificação original', changeClassLabel(item.changeClass));
    appendSummaryRow(summary, 'Impacto original', visibilityLabel(item.visibilityAction));
    appendSummaryRow(summary, 'Status da versão', reviewStatusLabel(item.reviewStatus));
    appendSummaryRow(summary, 'Campos alterados', String(totalChanged));
    appendSummaryRow(summary, 'Versão enviada', String(item.versionNumber || '1'));
    appendSummaryRow(summary, 'Versão-base', approved ? String(item.approvedVersionNumber || 'Aprovada') : 'Nenhuma');
    appendSummaryRow(summary, 'Tempo em análise', formatDuration(item.reviewDurationSeconds));
    if (!isPending) appendSummaryRow(summary, 'Responsável', item.reviewedByName || 'Equipe Doke');

    var actions = q('[data-admin-ad-review-actions]');
    if (actions) actions.hidden = !isPending;
    var decisionEyebrow = q('[data-admin-ad-review-decision-eyebrow]');
    var decisionTitle = q('[data-admin-ad-review-decision-title]');
    if (decisionEyebrow) decisionEyebrow.textContent = isPending ? 'Decisão' : 'Auditoria';
    if (decisionTitle) decisionTitle.textContent = isPending ? 'Resumo da análise' : 'Decisão registrada';

    var filter = q('[data-admin-ad-review-changed-only]');
    if (filter) filter.checked = true;
    applyChangedFilter(true);
    setSurface('ready');
    readyPage();
  }

  function applyChangedFilter(changedOnly) {
    document.querySelectorAll('.admin-ad-review__section').forEach(function (section) {
      if (section.dataset.filterPersistent === 'true') {
        section.hidden = false;
        return;
      }
      var visibleRows = 0;
      section.querySelectorAll('.admin-ad-review__row').forEach(function (row) {
        var hide = changedOnly && row.dataset.changed !== 'true';
        row.hidden = hide;
        if (!hide) visibleRows += 1;
      });
      var structural = section.id === 'review-images' || section.id === 'review-questions';
      section.hidden = changedOnly && (structural ? Number(section.dataset.changedCount || 0) === 0 : visibleRows === 0);
    });
  }

  function setDecisionBusy(busy) {
    decisionBusy = busy;
    var actions = q('[data-admin-ad-review-actions]');
    if (actions) actions.setAttribute('aria-busy', busy ? 'true' : 'false');
    document.querySelectorAll('[data-admin-ad-review-action], [data-admin-ad-review-dialog-submit], [data-admin-ad-review-dialog-close]').forEach(function (button) {
      button.disabled = busy;
    });
  }

  function closeDialog() {
    var dialog = q('[data-admin-ad-review-dialog]');
    if (dialog && dialog.open) dialog.close();
    activeAction = '';
    var input = q('[data-admin-ad-review-reason]');
    if (input) input.value = '';
  }

  function openReasonDialog(action) {
    if (!current || clean(current.reviewStatus) !== 'pending_review') return;
    activeAction = action;
    var changes = action === 'changes';
    q('[data-admin-ad-review-dialog-title]').textContent = changes ? 'Solicitar ajustes' : 'Rejeitar versão';
    q('[data-admin-ad-review-dialog-description]').textContent = changes
      ? 'Explique o que o profissional precisa corrigir antes de reenviar.'
      : 'Informe por que esta versão não pode ser aprovada.';
    var submit = q('[data-admin-ad-review-dialog-submit]');
    submit.textContent = changes ? 'Enviar solicitação' : 'Confirmar rejeição';
    submit.className = 'doke-btn ' + (changes ? 'doke-btn--primary' : 'doke-btn--danger');
    var dialog = q('[data-admin-ad-review-dialog]');
    if (dialog && typeof dialog.showModal === 'function') dialog.showModal();
    window.requestAnimationFrame(function () { q('[data-admin-ad-review-reason]').focus(); });
  }

  function resolve(action, reason) {
    if (decisionBusy || !current || clean(current.reviewStatus) !== 'pending_review') return Promise.resolve();
    var repo = repository();
    if (!repo) return Promise.reject(new Error('A autoridade de moderação não está disponível.'));
    var operation = action === 'approve'
      ? repo.approve(current.versionId)
      : action === 'changes'
        ? repo.requestChanges(current.versionId, reason)
        : repo.reject(current.versionId, reason);

    setDecisionBusy(true);
    return Promise.resolve(operation).then(function () {
      closeDialog();
      showToast(action === 'approve'
        ? 'Anúncio aprovado e decisão registrada.'
        : action === 'changes'
          ? 'Ajustes solicitados e decisão registrada.'
          : 'Versão rejeitada e decisão registrada.');
      return new Promise(function (done) { window.setTimeout(done, 220); });
    }).then(function () {
      setDecisionBusy(false);
      return load();
    }).catch(function (error) {
      setDecisionBusy(false);
      showToast(error && error.message || 'Não foi possível concluir a análise.');
    });
  }

  function load() {
    setSurface('guard-pending');
    beginPage();
    var access = accessService();
    if (!access || typeof access.guardPage !== 'function') {
      return Promise.reject(new Error('O serviço de acesso administrativo não está disponível.'));
    }

    return withTimeout(access.guardPage({
      name: 'admin-ad-review-access',
      source: 'admin-anuncio-revisao.html',
      deniedRedirect: 'pedidos.html',
      loginRedirect: 'auth/login.html'
    }), REVIEW_TIMEOUT_MS, 'A validação de acesso demorou mais do que o esperado.').then(function (result) {
      if (!result || result.allowed !== true) throw new Error('Acesso restrito ao suporte Doke.');
      setSurface('loading');
      var versionId = new URLSearchParams(window.location.search).get('version') || clean(root && root.dataset.versionId);
      var repo = repository();
      if (!versionId) throw new Error('A versão para análise não foi informada.');
      if (!repo || typeof repo.getReviewDetail !== 'function') throw new Error('O repositório de moderação não está disponível.');
      return withTimeout(repo.getReviewDetail(versionId), REVIEW_TIMEOUT_MS, 'O carregamento do histórico demorou mais do que o esperado.');
    }).then(function (item) {
      if (!item) throw new Error('A versão solicitada não foi encontrada.');
      render(item);
      return item;
    }).catch(function (error) {
      console.error('[Doke][admin-anuncio-revisao]', error);
      setSurface('error', error && error.message || 'Não foi possível carregar esta análise.');
      failPage(error);
      return null;
    });
  }

  function bind() {
    if (eventsBound) return;
    eventsBound = true;
    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-admin-ad-review-back]')) {
        event.preventDefault();
        goBack(false);
        return;
      }
      if (event.target.closest('[data-admin-ad-review-retry]')) {
        event.preventDefault();
        load();
        return;
      }
      var action = event.target.closest('[data-admin-ad-review-action]');
      if (action) {
        event.preventDefault();
        var name = clean(action.dataset.adminAdReviewAction);
        if (name === 'approve') {
          if (window.confirm('Aprovar esta versão e publicá-la?')) resolve('approve');
        } else {
          openReasonDialog(name);
        }
        return;
      }
      if (event.target.closest('[data-admin-ad-review-dialog-close]')) {
        event.preventDefault();
        closeDialog();
        return;
      }
      if (event.target.closest('[data-admin-ad-review-dialog-submit]')) {
        event.preventDefault();
        var reason = clean(q('[data-admin-ad-review-reason]').value);
        if (reason.length < 10) {
          showToast('Informe um motivo com pelo menos 10 caracteres.');
          q('[data-admin-ad-review-reason]').focus();
          return;
        }
        resolve(activeAction, reason);
      }
    });

    document.addEventListener('change', function (event) {
      var filter = event.target.closest('[data-admin-ad-review-changed-only]');
      if (filter) applyChangedFilter(filter.checked);
    });
  }

  function init() {
    var activeRoot = q('[data-admin-ad-review-root]');
    if (!activeRoot) return Promise.resolve(null);
    if (initializedRoot === activeRoot) return Promise.resolve(current);
    initializedRoot = activeRoot;
    root = activeRoot;
    bind();
    return load();
  }

  window.DokeInitAdminAdReview = init;

  function bootstrap() {
    Promise.resolve(init()).catch(function (error) {
      console.error('[Doke][admin-anuncio-revisao] Falha na inicialização', error);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  else bootstrap();
}());
