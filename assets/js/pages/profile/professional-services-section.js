(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});
  var ownerFilterState = { status: 'all', sort: 'updated_desc', services: [] };
  var ownerActionsBound = false;
  var ownerSelectionState = { active: false, selected: new Set() };
  var OWNER_LONG_PRESS_MS = 560;

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function money(service) {
    var explicit = clean(service.priceLabel);
    if (explicit) {
      var normalized = explicit.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
      var explicitNumeric = Number(normalized);
      if (/^[R$\s0-9.,-]+$/.test(explicit) && Number.isFinite(explicitNumeric) && explicitNumeric > 0) {
        return explicitNumeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
      return explicit;
    }
    var numeric = Number(service.priceValue || service.price);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return 'Sob orçamento';
  }


  function firstValue() {
    for (var index = 0; index < arguments.length; index += 1) {
      var value = clean(arguments[index]);
      if (value) return value;
    }
    return '';
  }

  function attendanceLabel(service) {
    var explicit = firstValue(
      service.attendanceModeLabel,
      service.serviceModeLabel,
      service.attendanceMode,
      service.serviceMode,
      service.deliveryMode
    );
    if (explicit) return explicit;
    if (service.online === true) return 'Online';
    if (service.inPerson === true || service.presential === true) return 'Presencial';
    return '';
  }

  function calculatedResponseLabel(service) {
    var explicit = firstValue(service.averageResponseTimeLabel, service.calculatedResponseTimeLabel);
    if (explicit) return explicit;
    var minutes = Number(service.averageResponseTimeMinutes || service.calculatedResponseTimeMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) return '';
    if (minutes < 60) return 'Em média, ' + Math.round(minutes) + ' min';
    var hours = minutes / 60;
    return 'Em média, ' + hours.toLocaleString('pt-BR', {
      minimumFractionDigits: Number.isInteger(hours) ? 0 : 1,
      maximumFractionDigits: 1
    }) + (hours === 1 ? ' hora' : ' horas');
  }

  function scheduleLabel(service) {
    var schedule = Array.isArray(service.availabilitySchedule) ? service.availabilitySchedule : [];
    if (!schedule.length) return '';
    var valid = schedule.filter(function (item) {
      return item && clean(item.label || item.day) && clean(item.start) && clean(item.end);
    });
    if (!valid.length) return '';
    if (valid.length === 1) {
      return clean(valid[0].label || valid[0].day) + ', ' + clean(valid[0].start) + '–' + clean(valid[0].end);
    }
    var sameHours = valid.every(function (item) {
      return clean(item.start) === clean(valid[0].start) && clean(item.end) === clean(valid[0].end);
    });
    if (sameHours) {
      return clean(valid[0].label || valid[0].day) + ' a ' + clean(valid[valid.length - 1].label || valid[valid.length - 1].day) + ', ' + clean(valid[0].start) + '–' + clean(valid[0].end);
    }
    return valid.length + ' dias com horários definidos';
  }

  function includedLabel(service) {
    var raw = service.includedItems || service.included || service.whatsIncluded;
    if (Array.isArray(raw)) return raw.map(clean).filter(Boolean).slice(0, 2).join(' · ');
    return clean(raw).split(/[\n,;]+/).map(clean).filter(Boolean).slice(0, 2).join(' · ');
  }

  function createDetailItem(label, value, iconPath) {
    if (!clean(value)) return null;
    var item = document.createElement('div');
    item.className = 'profile-service-card__detail';
    var icon = document.createElement('span');
    icon.className = 'profile-service-card__detail-icon';
    icon.appendChild(svg(iconPath));
    var copy = document.createElement('span');
    copy.className = 'profile-service-card__detail-copy';
    var title = document.createElement('strong');
    title.textContent = label;
    var text = document.createElement('span');
    text.textContent = value;
    copy.appendChild(title);
    copy.appendChild(text);
    item.appendChild(icon);
    item.appendChild(copy);
    return item;
  }

  function svg(path) {
    var element = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    element.setAttribute('viewBox', '0 0 24 24');
    element.setAttribute('aria-hidden', 'true');
    var shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    shape.setAttribute('d', path);
    element.appendChild(shape);
    return element;
  }

  function serviceSpec(service, label) {
    return clean(service && service.specs && service.specs[label]);
  }

  function firstCount() {
    for (var index = 0; index < arguments.length; index += 1) {
      var numeric = Number(arguments[index]);
      if (Number.isFinite(numeric) && numeric >= 0) return numeric;
    }
    return 0;
  }

  function formatCount(value) {
    return firstCount(value).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  }

  function averageDeadlineLabel(service) {
    return firstValue(
      service.deadlineLabel,
      service.averageDeadlineLabel,
      service.deliveryTimeLabel,
      service.durationLabel,
      service.turnaroundTime,
      service.estimatedDuration,
      serviceSpec(service, 'Prazo médio')
    );
  }

  function guaranteeLabel(service) {
    return firstValue(
      service.guaranteeLabel,
      service.serviceGuarantee,
      service.guarantee,
      serviceSpec(service, 'Garantia')
    );
  }

  function updatedLabel(service) {
    var raw = firstValue(service.updatedAt, service.createdAt);
    if (!raw) return '';
    var date = new Date(raw);
    if (Number.isNaN(date.getTime())) return '';
    var months = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    return String(date.getDate()).padStart(2, '0') + ' ' + months[date.getMonth()] + ' ' + date.getFullYear();
  }

  function providerName(service) {
    return firstValue(
      service.providerName,
      service.professionalName,
      service.sellerName,
      document.querySelector('[data-professional-name], [data-public-professional-name]') &&
        document.querySelector('[data-professional-name], [data-public-professional-name]').textContent,
      'Profissional Doke'
    );
  }

  function providerAvatar(service) {
    var profileImage = document.querySelector('[data-professional-avatar-image], [data-public-professional-avatar-image]');
    return firstValue(
      service.providerAvatar,
      service.providerAvatarUrl,
      service.avatarUrl,
      service.professionalAvatar,
      profileImage && profileImage.getAttribute('src')
    );
  }

  function serviceImages(service) {
    var list = [];
    if (Array.isArray(service.images)) {
      list = list.concat(service.images);
    }
    list = list.concat([
      service.image,
      service.imageUrl,
      service.coverImage,
      service.coverImageUrl,
      service.thumbnail,
      service.thumbnailUrl
    ]);

    var seen = Object.create(null);
    return list.map(function (item) { return clean(item); }).filter(function (item) {
      if (!item) return false;
      if (/(?:doke-logo|logo-sidebar|logo-lockup)/i.test(item)) return false;
      if (seen[item]) return false;
      seen[item] = true;
      return true;
    });
  }

  function initialsFromName(value) {
    var parts = clean(value).split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.map(function (part) { return part.charAt(0).toUpperCase(); }).join('') || 'DK';
  }

  function createSeller(service, options) {
    var seller = document.createElement('div');
    seller.className = 'doke-ad-card__seller';

    var avatar = document.createElement('span');
    avatar.className = 'doke-ad-card__avatar';
    var avatarUrl = providerAvatar(service);
    if (avatarUrl) {
      avatar.classList.add('has-image');
      var image = document.createElement('img');
      image.className = 'doke-ad-card__avatar-image';
      image.src = avatarUrl;
      image.alt = '';
      image.loading = 'lazy';
      avatar.appendChild(image);
    } else {
      avatar.classList.add('has-initials');
      avatar.textContent = firstValue(
        service.providerInitials,
        service.avatarInitials,
        initialsFromName(providerName(service))
      );
    }

    var copy = document.createElement('span');
    copy.className = 'doke-ad-card__seller-copy';
    var name = document.createElement('strong');
    name.className = 'doke-ad-card__seller-name';
    name.textContent = providerName(service);
    copy.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'doke-ad-card__seller-meta profile-service-card__performance';
    var rating = Number(service.rating || service.averageRating || 0);
    var reviewCount = Number(service.reviewCount || service.reviewsCount || 0);
    var jobs = Number(service.completedJobs || service.completedServices || service.jobsCount || 0);
    if (rating > 0) {
      var ratingItem = document.createElement('span');
      ratingItem.className = 'profile-service-card__rating';
      ratingItem.textContent = '★ ' + rating.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      meta.appendChild(ratingItem);
    }
    if (reviewCount > 0) {
      var reviewsItem = document.createElement('span');
      reviewsItem.textContent = reviewCount + (reviewCount === 1 ? ' avaliação' : ' avaliações');
      meta.appendChild(reviewsItem);
    }
    if (jobs > 0) {
      var jobsItem = document.createElement('span');
      jobsItem.textContent = jobs + (jobs === 1 ? ' trabalho' : ' trabalhos');
      meta.appendChild(jobsItem);
    }
    if (!meta.childNodes.length && options && options.owner) {
      var emptyMeta = document.createElement('span');
      emptyMeta.className = 'profile-service-card__seller-empty-meta';
      emptyMeta.textContent = 'Sem avaliações';
      meta.appendChild(emptyMeta);
    }
    if (meta.childNodes.length) copy.appendChild(meta);

    seller.appendChild(avatar);
    seller.appendChild(copy);
    return seller;
  }

  function ownerViews(service) {
    return firstCount(
      service.viewsCount,
      service.viewCount,
      service.views,
      service.metrics && service.metrics.views,
      service.analytics && service.analytics.views
    );
  }

  function ownerContacts(service) {
    return firstCount(
      service.contactsCount,
      service.contactCount,
      service.leadsCount,
      service.inquiriesCount,
      service.metrics && service.metrics.contacts,
      service.analytics && service.analytics.contacts
    );
  }

  function createOwnerInsight(label, value, iconPath, compact) {
    if (!clean(value)) return null;
    var item = document.createElement('div');
    item.className = 'profile-service-card__insight' + (compact ? ' profile-service-card__insight--compact' : '');

    var icon = document.createElement('span');
    icon.className = 'profile-service-card__insight-icon';
    icon.appendChild(svg(iconPath));

    var copy = document.createElement('span');
    copy.className = 'profile-service-card__insight-copy';
    var title = document.createElement('span');
    title.textContent = label;
    var text = document.createElement('strong');
    text.textContent = value;
    copy.appendChild(title);
    copy.appendChild(text);

    item.appendChild(icon);
    item.appendChild(copy);
    return item;
  }

  function moderationPresentation(service) {
    var moderation = clean(service && (service.moderationStatus || service.moderation_status)).toLowerCase();
    var publicStatus = clean(service && service.status).toLowerCase();
    var map = {
      draft: { key: 'draft', label: 'Rascunho', tone: 'neutral', message: 'Este anúncio ainda não foi enviado para análise.' },
      pending_review: { key: 'pending-review', label: 'Em análise', tone: 'info', message: 'A Doke está analisando este anúncio antes da publicação.' },
      changes_pending_review: { key: 'changes-pending-review', label: 'Alterações em análise', tone: 'info', message: 'A versão aprovada continua pública enquanto as alterações são revisadas.' },
      changes_required: { key: 'changes-required', label: 'Ajustes solicitados', tone: 'warning', message: clean(service && service.reviewReason) || 'A equipe solicitou ajustes antes de aprovar esta versão.' },
      rejected: { key: 'rejected', label: 'Não aprovado', tone: 'danger', message: clean(service && service.reviewReason) || 'Esta versão não foi aprovada. Revise o anúncio antes de reenviar.' },
      suspended: { key: 'suspended', label: 'Suspenso', tone: 'danger', message: clean(service && service.reviewReason) || 'O anúncio foi suspenso pela plataforma.' },
      published: { key: 'published', label: publicStatus === 'inactive' ? 'Inativo' : 'Publicado', tone: publicStatus === 'inactive' ? 'neutral' : 'success', message: '' }
    };
    if (publicStatus === 'archived') return { key: 'archived', label: 'Arquivado', tone: 'neutral', message: '' };
    if (publicStatus === 'inactive' && moderation !== 'changes_pending_review') return { key: 'inactive', label: 'Inativo', tone: 'neutral', message: '' };
    return map[moderation] || map.draft;
  }

  function createModerationNotice(service) {
    var presentation = moderationPresentation(service);
    if (!presentation.message || presentation.key === 'published') return null;
    var notice = document.createElement('div');
    notice.className = 'profile-service-card__moderation-notice profile-service-card__moderation-notice--' + presentation.tone;
    notice.setAttribute('role', presentation.tone === 'danger' ? 'alert' : 'status');
    var title = document.createElement('strong');
    title.textContent = presentation.label;
    var copy = document.createElement('span');
    copy.textContent = presentation.message;
    notice.appendChild(title);
    notice.appendChild(copy);
    return notice;
  }

  function createModerationProgress(service) {
    var presentation = moderationPresentation(service);
    if (['pending-review', 'changes-pending-review'].indexOf(presentation.key) === -1) return null;

    var wrapper = document.createElement('section');
    wrapper.className = 'profile-service-card__review-progress';
    wrapper.setAttribute('aria-label', 'Andamento da análise do anúncio');

    var heading = document.createElement('div');
    heading.className = 'profile-service-card__review-progress-heading';
    var icon = document.createElement('span');
    icon.className = 'profile-service-card__review-progress-lock';
    icon.appendChild(svg('M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v10H5Z'));
    var copy = document.createElement('div');
    var title = document.createElement('strong');
    title.textContent = presentation.key === 'pending-review' ? 'Publicação bloqueada durante a análise' : 'Alterações bloqueadas durante a análise';
    var description = document.createElement('span');
    description.textContent = presentation.key === 'pending-review'
      ? 'O anúncio só ficará disponível para clientes depois da aprovação.'
      : 'A versão pública aprovada continua ativa até a decisão.';
    copy.appendChild(title);
    copy.appendChild(description);
    heading.appendChild(icon);
    heading.appendChild(copy);

    var steps = document.createElement('ol');
    steps.className = 'profile-service-card__review-steps';
    [
      { label: 'Enviado', state: 'done' },
      { label: 'Em análise', state: 'current' },
      { label: 'Decisão', state: 'upcoming' }
    ].forEach(function (step, index) {
      var item = document.createElement('li');
      item.className = 'profile-service-card__review-step is-' + step.state;
      if (step.state === 'current') item.setAttribute('aria-current', 'step');
      var marker = document.createElement('span');
      marker.className = 'profile-service-card__review-step-marker';
      marker.textContent = step.state === 'done' ? '✓' : String(index + 1);
      var label = document.createElement('span');
      label.textContent = step.label;
      item.appendChild(marker);
      item.appendChild(label);
      steps.appendChild(item);
    });

    wrapper.appendChild(heading);
    wrapper.appendChild(steps);
    return wrapper;
  }

  function createReviewLockOverlay(service) {
    var presentation = moderationPresentation(service);
    if (presentation.key !== 'pending-review') return null;
    var overlay = document.createElement('div');
    overlay.className = 'profile-service-card__review-lock-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    var lock = document.createElement('span');
    lock.className = 'profile-service-card__review-lock-icon';
    lock.appendChild(svg('M7 10V7a5 5 0 0 1 10 0v3 M5 10h14v10H5Z'));
    overlay.appendChild(lock);
    return overlay;
  }

  function menuItem(service, config) {
    var item;
    if (config.href) {
      item = document.createElement('a');
      item.href = config.href;
    } else {
      item = document.createElement('button');
      item.type = 'button';
    }
    item.className = 'profile-service-card__menu-item' + (config.modifier ? ' profile-service-card__menu-item--' + config.modifier : '');
    item.setAttribute('role', 'menuitem');
    item.textContent = config.label;
    if (config.dataName) item.dataset[config.dataName] = clean(service.id);
    return item;
  }

  function createOwnerMenu(service) {
    var wrapper = document.createElement('div');
    wrapper.className = 'profile-service-card__menu';
    wrapper.dataset.profileServiceMenu = '';

    var menuId = 'profile-service-menu-' + clean(service.id).replace(/[^a-zA-Z0-9_-]+/g, '-');
    var trigger = document.createElement('button');
    trigger.className = 'profile-service-card__menu-trigger doke-icon-btn doke-icon-btn--soft';
    trigger.type = 'button';
    trigger.dataset.profileServiceMenuTrigger = '';
    trigger.setAttribute('aria-label', 'Abrir ações do anúncio');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', menuId);
    trigger.title = 'Mais ações';
    var dots = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    dots.setAttribute('viewBox', '0 0 24 24');
    dots.setAttribute('aria-hidden', 'true');
    [6, 12, 18].forEach(function (cx) {
      var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', String(cx));
      circle.setAttribute('cy', '12');
      circle.setAttribute('r', '1.45');
      dots.appendChild(circle);
    });
    trigger.appendChild(dots);

    var menu = document.createElement('div');
    menu.className = 'profile-service-card__menu-popover';
    menu.id = menuId;
    menu.dataset.profileServiceMenuPopover = '';
    menu.setAttribute('role', 'menu');
    menu.hidden = true;

    var moderation = moderationPresentation(service);
    if (moderation.key === 'pending-review') {
      var lockedEdit = menuItem(service, { label: 'Edição bloqueada durante análise' });
      lockedEdit.disabled = true;
      lockedEdit.setAttribute('aria-disabled', 'true');
      lockedEdit.classList.add('is-disabled');
      menu.appendChild(lockedEdit);
    } else {
      menu.appendChild(menuItem(service, {
        label: 'Editar anúncio',
        href: 'anunciar-servico.html?mode=edit&edit=' + encodeURIComponent(service.id)
      }));
    }

    menu.appendChild(menuItem(service, {
      label: 'Selecionar anúncio',
      dataName: 'profileServiceSelect'
    }));

    var canChangePublicStatus = ['published', 'changes-pending-review', 'inactive'].indexOf(moderation.key) !== -1;
    if (canChangePublicStatus && service.status === 'inactive') {
      menu.appendChild(menuItem(service, {
        label: 'Reativar anúncio',
        dataName: 'profileServiceReactivate',
        modifier: 'success'
      }));
    } else if (canChangePublicStatus && service.status === 'active') {
      menu.appendChild(menuItem(service, {
        label: 'Desativar anúncio',
        dataName: 'profileServiceDeactivate',
        modifier: 'danger'
      }));
    }

    if (service.status !== 'archived') {
      menu.appendChild(menuItem(service, {
        label: 'Arquivar anúncio',
        dataName: 'profileServiceArchive',
        modifier: 'danger'
      }));
    }

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    return wrapper;
  }

  function createOwnerSide(service) {
    var side = document.createElement('aside');
    side.className = 'profile-service-card__owner-side';
    side.setAttribute('aria-label', 'Desempenho, preço e ações do anúncio');

    var insights = document.createElement('div');
    insights.className = 'profile-service-card__insights';

    var insightItems = [
      createOwnerInsight('Visualizações', formatCount(ownerViews(service)), 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Zm10 3.2A3.2 3.2 0 1 0 12 8.8a3.2 3.2 0 0 0 0 6.4Z', true),
      createOwnerInsight('Contatos', formatCount(ownerContacts(service)), 'M4 5h16v11H8l-4 3V5Z', true),
      createOwnerInsight('Atualizado', updatedLabel(service), 'M4 4v5h5M20 20v-5h-5M5.6 17.8A8 8 0 0 0 19 12M18.4 6.2A8 8 0 0 0 5 12', true)
    ].filter(Boolean);
    insightItems.forEach(function (item) { insights.appendChild(item); });
    insights.dataset.insightCount = String(insightItems.length);

    var controls = document.createElement('div');
    controls.className = 'profile-service-card__owner-controls';
    var menu = createOwnerMenu(service);
    if (menu) controls.appendChild(menu);

    var priceBlock = document.createElement('div');
    priceBlock.className = 'profile-service-card__price-block';
    var priceCaption = document.createElement('span');
    var price = document.createElement('strong');
    price.className = 'doke-ad-card__price';
    var resolvedPrice = money(service);
    priceCaption.textContent = resolvedPrice === 'Sob orçamento' ? 'Valor do serviço' : 'A partir de';
    price.textContent = resolvedPrice;
    priceBlock.appendChild(priceCaption);
    priceBlock.appendChild(price);

    var moderation = moderationPresentation(service);
    var view;
    if (moderation.key === 'pending-review') {
      view = document.createElement('button');
      view.type = 'button';
      view.disabled = true;
      view.className = 'profile-service-card__view doke-ad-card__cta doke-btn doke-btn--neutral is-review-locked';
      view.setAttribute('aria-label', 'Anúncio bloqueado durante análise');
      view.textContent = 'Aguardando análise';
    } else {
      view = document.createElement('a');
      view.className = 'profile-service-card__view doke-ad-card__cta doke-btn doke-btn--success';
      view.href = service.href || ('detalhe-anuncio.html?id=' + encodeURIComponent(service.id));
      view.setAttribute('aria-label', 'Ver anúncio ' + (clean(service.title) || 'do serviço'));
      view.textContent = 'Ver anúncio';
    }

    controls.appendChild(priceBlock);
    controls.appendChild(view);
    side.appendChild(insights);
    side.appendChild(controls);
    return side;
  }

  function createCard(service, options) {
    options = options || {};
    var article = document.createElement('article');
    article.className = 'doke-ad-card profile-service-card profile-service-card--horizontal' + (options.owner ? ' profile-service-card--owner doke-ad-card--index-compact-parity' : ' profile-service-card--public');
    article.dataset.serviceId = clean(service.id);
    article.dataset.serviceStatus = clean(service.status || 'active');
    article.classList.add('is-status-' + clean(service.status || 'active'));
    if (options.owner) {
      var moderation = moderationPresentation(service);
      article.dataset.serviceModerationStatus = moderation.key;
      article.classList.add('is-moderation-' + moderation.key);
      article.dataset.profileServiceOwnerCard = '';
      var selectionButton = document.createElement('button');
      selectionButton.className = 'profile-service-card__selection doke-selection-check';
      selectionButton.type = 'button';
      selectionButton.dataset.profileServiceSelectionToggle = clean(service.id);
      selectionButton.setAttribute('aria-label', 'Selecionar anúncio ' + (clean(service.title) || 'do serviço'));
      selectionButton.setAttribute('aria-pressed', ownerSelectionState.selected.has(clean(service.id)) ? 'true' : 'false');
      selectionButton.classList.toggle('is-selected', ownerSelectionState.selected.has(clean(service.id)));
      selectionButton.appendChild(document.createElement('span'));
      article.appendChild(selectionButton);
      article.classList.toggle('is-selected', ownerSelectionState.selected.has(clean(service.id)));
    }

    var media = document.createElement('div');
    media.className = 'doke-ad-card__media profile-service-card__media';
    var images = serviceImages(service);
    var imageUrl = images[0] || '';
    if (imageUrl) {
      var gallery = document.createElement('div');
      gallery.className = 'profile-service-card__media-gallery' + (images.length > 1 ? ' has-gallery' : ' is-single');

      var primaryFrame = document.createElement('div');
      primaryFrame.className = 'profile-service-card__media-primary';
      var image = document.createElement('img');
      image.className = 'profile-service-card__image';
      image.src = imageUrl;
      image.alt = 'Imagem do serviço ' + (clean(service.title) || 'profissional');
      primaryFrame.appendChild(image);
      gallery.appendChild(primaryFrame);

      if (images.length > 1) {
        var secondaryFrame = document.createElement('div');
        secondaryFrame.className = 'profile-service-card__media-secondary';
        var secondaryImage = document.createElement('img');
        secondaryImage.className = 'profile-service-card__secondary-image';
        secondaryImage.src = images[1];
        secondaryImage.alt = '';
        secondaryImage.setAttribute('aria-hidden', 'true');
        secondaryFrame.appendChild(secondaryImage);

        var secondaryOverlay = document.createElement('span');
        secondaryOverlay.className = 'profile-service-card__media-more';
        var moreCount = images.length - 1;
        secondaryOverlay.textContent = '+' + String(moreCount) + ' ' + (moreCount === 1 ? 'foto' : 'fotos');
        secondaryFrame.appendChild(secondaryOverlay);
        gallery.appendChild(secondaryFrame);
      }

      media.appendChild(gallery);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'profile-service-card__placeholder';
      placeholder.appendChild(svg('M4 5h16v14H4Z M7 15l3-3 2 2 2-2 3 3 M9 9h.01'));
      var placeholderCopy = document.createElement('span');
      placeholderCopy.textContent = clean(service.category) || 'Imagem do anúncio';
      media.appendChild(placeholder);
      placeholder.appendChild(placeholderCopy);
    }

    var status = document.createElement('span');
    var statusPresentation = options.owner ? moderationPresentation(service) : moderationPresentation({ status: service.status, moderationStatus: 'published' });
    status.className = 'doke-ad-card__badge profile-service-card__status profile-service-card__status--' + statusPresentation.tone;
    status.textContent = statusPresentation.label;
    media.appendChild(status);

    if (!options.owner) {
      var favorite = document.createElement('button');
      favorite.className = 'doke-ad-card__favorite doke-icon-btn doke-icon-btn--soft';
      favorite.type = 'button';
      favorite.setAttribute('aria-label', 'Salvar anúncio');
      favorite.appendChild(svg('M20.8 8.6c0 5.4-8.8 10.2-8.8 10.2S3.2 14 3.2 8.6A4.7 4.7 0 0 1 12 6.2a4.7 4.7 0 0 1 8.8 2.4Z'));
      media.appendChild(favorite);
    }

    var body = document.createElement('div');
    body.className = 'doke-ad-card__body';

    var category = document.createElement('span');
    category.className = 'doke-ad-card__category';
    category.textContent = clean(service.category);

    var title = document.createElement('h3');
    title.className = 'doke-ad-card__title';
    title.textContent = clean(service.title);

    var seller = createSeller(service, options);

    var summary = document.createElement('p');
    summary.className = 'profile-service-card__summary';
    summary.textContent = clean(service.shortDescription || service.description);

    var tags = document.createElement('div');
    tags.className = 'doke-ad-card__tags';
    var tagItems = Array.isArray(service.tags) ? service.tags.filter(Boolean).slice(0, 2) : [];
    tagItems.forEach(function (tag) {
      var item = document.createElement('span');
      item.textContent = '#' + clean(tag).replace(/^#+/, '');
      tags.appendChild(item);
    });

    var location = document.createElement('div');
    location.className = 'doke-ad-card__location';
    var locationText = document.createElement('span');
    locationText.className = 'doke-ad-card__location-text';
    locationText.appendChild(svg('M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z'));
    var locationLabel = document.createElement('span');
    locationLabel.textContent = clean(service.location || service.serviceRegion);
    locationText.appendChild(locationLabel);
    location.appendChild(locationText);

    if (category.textContent) body.appendChild(category);
    if (title.textContent) body.appendChild(title);
    body.appendChild(seller);
    if (summary.textContent) body.appendChild(summary);
    if (options.owner) {
      var moderationNotice = createModerationNotice(service);
      if (moderationNotice) body.appendChild(moderationNotice);
      var moderationProgress = createModerationProgress(service);
      if (moderationProgress) body.appendChild(moderationProgress);
    }
    if (tagItems.length) body.appendChild(tags);
    if (locationLabel.textContent) body.appendChild(location);

    var footer = document.createElement('div');
    footer.className = 'doke-ad-card__footer' + (options.owner ? ' profile-service-card__compact-footer' : '');
    var footerPrice = document.createElement('strong');
    footerPrice.className = 'doke-ad-card__price';
    footerPrice.textContent = money(service);
    var compactModeration = options.owner ? moderationPresentation(service) : null;
    var footerCta;
    if (options.owner && compactModeration.key === 'pending-review') {
      footerCta = document.createElement('button');
      footerCta.type = 'button';
      footerCta.disabled = true;
      footerCta.className = 'doke-ad-card__cta doke-btn doke-btn--neutral is-review-locked';
      footerCta.setAttribute('aria-label', 'Anúncio bloqueado durante análise');
      footerCta.textContent = 'Em análise';
    } else {
      footerCta = document.createElement('a');
      footerCta.className = 'doke-ad-card__cta doke-btn doke-btn--success';
      footerCta.href = service.href || ('detalhe-anuncio.html?id=' + encodeURIComponent(service.id));
      footerCta.setAttribute('aria-label', 'Ver anúncio ' + (clean(service.title) || 'do serviço'));
      footerCta.textContent = 'Ver anúncio';
    }
    footer.appendChild(footerPrice);
    footer.appendChild(footerCta);
    body.appendChild(footer);

    article.appendChild(media);
    article.appendChild(body);

    if (options.owner) {
      article.appendChild(createOwnerSide(service));
      var reviewLockOverlay = createReviewLockOverlay(service);
      if (reviewLockOverlay) article.appendChild(reviewLockOverlay);
    } else {
      var details = document.createElement('aside');
      details.className = 'profile-service-card__details';
      details.setAttribute('aria-label', 'Detalhes do anúncio');
      var attendance = attendanceLabel(service);
      var response = calculatedResponseLabel(service);
      var availability = scheduleLabel(service);
      var included = includedLabel(service);
      var guarantee = firstValue(service.guaranteeLabel, service.serviceGuarantee, service.guarantee);
      var items = [
        createDetailItem('Atendimento', attendance, 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm-8 10a8 8 0 0 1 16 0'),
        createDetailItem('Tempo de resposta', response, 'M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 5v5.4l3.7 2.2-1 1.7L11 13.5V7Z'),
        createDetailItem('Disponibilidade', availability, 'M7 2v3M17 2v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2Z'),
        createDetailItem('Incluído', included, 'm9 12 2 2 4-5M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'),
        createDetailItem('Garantia', guarantee, 'M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5Z')
      ].filter(Boolean);
      items.slice(0, 4).forEach(function (item) { details.appendChild(item); });
      if (details.childNodes.length) article.appendChild(details);
    }
    return article;
  }

  function render(options) {
    options = options || {};
    var root = options.root || document;
    var list = root.querySelector(options.listSelector || '[data-professional-services-list]');
    var empty = root.querySelector(options.emptySelector || '[data-professional-services-empty]');
    var count = root.querySelector(options.countSelector || '[data-professional-services-count]');
    var sourceServices = Array.isArray(options.services) ? options.services.slice() : [];
    if (options.owner) ownerFilterState.services = sourceServices.slice();
    var statusFilter = options.owner ? ownerFilterState.status : 'active';
    var sortMode = options.owner ? ownerFilterState.sort : 'updated_desc';
    var services = sourceServices.filter(function (item) {
      if (!options.owner) return item.status === 'active';
      return statusFilter === 'all' || item.status === statusFilter;
    }).sort(function (a, b) {
      if (sortMode === 'created_asc') return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
      if (sortMode === 'created_desc') return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
      if (sortMode === 'title_asc') return String(a.title || '').localeCompare(String(b.title || ''), 'pt-BR');
      return String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || ''));
    });

    if (count) {
      var countSource = options.owner ? sourceServices : services;
      var activeCount = countSource.filter(function (item) { return item.status === 'active'; }).length;
      var inactiveCount = countSource.filter(function (item) { return item.status === 'inactive'; }).length;
      var archivedCount = countSource.filter(function (item) { return item.status === 'archived'; }).length;
      if (options.owner) {
        count.textContent = countSource.length + (countSource.length === 1 ? ' anúncio' : ' anúncios');
        count.setAttribute('aria-label', [
          activeCount + (activeCount === 1 ? ' anúncio ativo' : ' anúncios ativos'),
          inactiveCount + (inactiveCount === 1 ? ' inativo' : ' inativos'),
          archivedCount + (archivedCount === 1 ? ' arquivado' : ' arquivados')
        ].join(', '));
      } else {
        count.textContent = activeCount + (activeCount === 1 ? ' anúncio ativo' : ' anúncios ativos');
        count.removeAttribute('aria-label');
      }
    }
    if (list) {
      list.innerHTML = '';
      services.forEach(function (service) {
        list.appendChild(createCard(service, { owner: options.owner === true }));
      });
      list.hidden = !services.length;
      if (options.owner) updateOwnerSelectionUI(root);
    }
    if (empty) empty.hidden = Boolean(services.length);
    return services.length;
  }

  function bindOwnerFilters(options) {
    options = options || {};
    var root = options.root || document;
    var filters = root.querySelector('[data-professional-services-filters]');
    if (!filters || filters.dataset.bound === 'true') return;
    filters.dataset.bound = 'true';
    filters.addEventListener('click', function (event) {
      var button = event.target.closest('[data-service-status-filter]');
      if (!button) return;
      ownerFilterState.status = clean(button.dataset.serviceStatusFilter) || 'all';
      filters.querySelectorAll('[data-service-status-filter]').forEach(function (item) {
        item.classList.toggle('is-active', item === button);
      });
      render({ services: ownerFilterState.services, owner: true, countSelector: '[data-professional-services-count]' });
    });
    var status = filters.querySelector('[data-service-status-select]');
    if (status) status.addEventListener('change', function () {
      ownerFilterState.status = clean(status.value) || 'all';
      render({ services: ownerFilterState.services, owner: true, countSelector: '[data-professional-services-count]' });
    });
    var sort = filters.querySelector('[data-service-sort]');
    if (sort) sort.addEventListener('change', function () {
      ownerFilterState.sort = clean(sort.value) || 'updated_desc';
      render({ services: ownerFilterState.services, owner: true, countSelector: '[data-professional-services-count]' });
    });
  }

  function closeOwnerMenus(root, exceptWrapper) {
    (root || document).querySelectorAll('[data-profile-service-menu]').forEach(function (wrapper) {
      if (wrapper === exceptWrapper) return;
      var trigger = wrapper.querySelector('[data-profile-service-menu-trigger]');
      var popover = wrapper.querySelector('[data-profile-service-menu-popover]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      if (popover) popover.hidden = true;
      wrapper.classList.remove('is-open');
    });
  }

  function setOwnerMenuOpen(wrapper, open, root) {
    if (!wrapper) return;
    var trigger = wrapper.querySelector('[data-profile-service-menu-trigger]');
    var popover = wrapper.querySelector('[data-profile-service-menu-popover]');
    if (!trigger || !popover) return;
    closeOwnerMenus(root || document, open ? wrapper : null);
    trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
    popover.hidden = !open;
    wrapper.classList.toggle('is-open', open);
    if (open) {
      var firstItem = popover.querySelector('[role="menuitem"]');
      if (firstItem) window.setTimeout(function () { firstItem.focus(); }, 0);
    }
  }

  function ownerSelectionSection(root) {
    return (root || document).querySelector('#profile-ads') || (root || document);
  }

  function updateOwnerSelectionUI(root) {
    var scope = ownerSelectionSection(root);
    var selectedCount = ownerSelectionState.selected.size;
    ownerSelectionState.active = selectedCount > 0 || ownerSelectionState.active;
    scope.classList.toggle('is-service-selection-mode', ownerSelectionState.active);
    var bar = scope.querySelector('[data-profile-service-selection-bar]');
    var count = scope.querySelector('[data-profile-service-selection-count]');
    if (bar) bar.hidden = !ownerSelectionState.active;
    if (count) count.textContent = selectedCount + (selectedCount === 1 ? ' selecionado' : ' selecionados');
    scope.querySelectorAll('[data-profile-service-owner-card]').forEach(function (card) {
      var id = clean(card.dataset.serviceId);
      var selected = ownerSelectionState.selected.has(id);
      card.classList.toggle('is-selected', selected);
      var button = card.querySelector('[data-profile-service-selection-toggle]');
      if (button) {
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
    });
    var bulkArchive = scope.querySelector('[data-profile-service-bulk-archive]');
    if (bulkArchive) bulkArchive.disabled = selectedCount === 0;
  }

  function setOwnerCardSelected(card, selected, root) {
    if (!card) return;
    var id = clean(card.dataset.serviceId);
    if (!id) return;
    ownerSelectionState.active = true;
    if (selected) ownerSelectionState.selected.add(id);
    else ownerSelectionState.selected.delete(id);
    updateOwnerSelectionUI(root);
  }

  function cancelOwnerSelection(root) {
    ownerSelectionState.selected.clear();
    ownerSelectionState.active = false;
    updateOwnerSelectionUI(root);
  }

  function openOwnerCardMenu(card, root) {
    if (!card) return false;
    var wrapper = card.querySelector('[data-profile-service-menu]');
    if (!wrapper) return false;
    setOwnerMenuOpen(wrapper, true, root);
    return true;
  }

  function bindOwnerLongPress(root) {
    var timer = 0;
    var targetCard = null;
    var startX = 0;
    var startY = 0;

    function clearLongPress() {
      if (timer) window.clearTimeout(timer);
      timer = 0;
      targetCard = null;
    }

    root.addEventListener('pointerdown', function (event) {
      if (event.pointerType !== 'touch' && event.pointerType !== 'pen') return;
      if (event.target.closest('a, button, input, select, textarea, [role="menu"]')) return;
      var card = event.target.closest('[data-profile-service-owner-card]');
      if (!card) return;
      targetCard = card;
      startX = event.clientX;
      startY = event.clientY;
      timer = window.setTimeout(function () {
        if (!targetCard) return;
        openOwnerCardMenu(targetCard, root);
        if (navigator.vibrate) navigator.vibrate(24);
        targetCard.classList.add('is-long-pressed');
        window.setTimeout(function () { targetCard && targetCard.classList.remove('is-long-pressed'); }, 180);
        timer = 0;
      }, OWNER_LONG_PRESS_MS);
    }, { passive: true });

    root.addEventListener('pointermove', function (event) {
      if (!timer) return;
      if (Math.abs(event.clientX - startX) > 10 || Math.abs(event.clientY - startY) > 10) clearLongPress();
    }, { passive: true });
    root.addEventListener('pointerup', clearLongPress, { passive: true });
    root.addEventListener('pointercancel', clearLongPress, { passive: true });
    root.addEventListener('scroll', clearLongPress, true);
  }

  function bindOwnerActions(options) {
    options = options || {};
    var root = options.root || document;
    bindOwnerFilters({ root: root });
    if ((root === document && ownerActionsBound) || (root.dataset && root.dataset.professionalServicesActionsBound === 'true')) return;
    if (root === document) ownerActionsBound = true;
    if (root.dataset) root.dataset.professionalServicesActionsBound = 'true';
    bindOwnerLongPress(root);
    updateOwnerSelectionUI(root);

    root.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-profile-service-menu-trigger]');
      if (trigger) {
        event.preventDefault();
        event.stopPropagation();
        var wrapper = trigger.closest('[data-profile-service-menu]');
        setOwnerMenuOpen(wrapper, trigger.getAttribute('aria-expanded') !== 'true', root);
        return;
      }

      var selectionToggle = event.target.closest('[data-profile-service-selection-toggle]');
      if (selectionToggle) {
        event.preventDefault();
        event.stopPropagation();
        var selectionCard = selectionToggle.closest('[data-profile-service-owner-card]');
        setOwnerCardSelected(selectionCard, selectionToggle.getAttribute('aria-pressed') !== 'true', root);
        return;
      }

      var selectMenuItem = event.target.closest('[data-profile-service-select]');
      if (selectMenuItem) {
        event.preventDefault();
        closeOwnerMenus(root);
        setOwnerCardSelected(selectMenuItem.closest('[data-profile-service-owner-card]'), true, root);
        return;
      }

      var cancelSelection = event.target.closest('[data-profile-service-selection-cancel]');
      if (cancelSelection) {
        event.preventDefault();
        cancelOwnerSelection(root);
        return;
      }

      var bulkArchiveButton = event.target.closest('[data-profile-service-bulk-archive]');
      if (bulkArchiveButton) {
        event.preventDefault();
        var selectedIds = Array.from(ownerSelectionState.selected);
        var ownedService = Doke.services && Doke.services.services;
        if (!selectedIds.length || !ownedService || typeof ownedService.archiveOwned !== 'function') return;
        if (!window.confirm('Arquivar ' + selectedIds.length + (selectedIds.length === 1 ? ' anúncio selecionado?' : ' anúncios selecionados?'))) return;
        bulkArchiveButton.disabled = true;
        bulkArchiveButton.textContent = 'Arquivando...';
        Promise.all(selectedIds.map(function (id) {
          var source = ownerFilterState.services.find(function (item) { return clean(item.id) === id; });
          if (source && source.status === 'archived') return Promise.resolve(source);
          return Promise.resolve(ownedService.archiveOwned(id));
        })).then(function (updatedItems) {
          cancelOwnerSelection(root);
          updatedItems.forEach(function (updated) {
            window.dispatchEvent(new CustomEvent('doke:service-updated', { detail: { service: updated } }));
            if (typeof options.onChanged === 'function') options.onChanged(updated);
          });
        }).catch(function (error) {
          window.alert(error && error.message ? error.message : 'Não foi possível arquivar os anúncios selecionados.');
        }).finally(function () {
          bulkArchiveButton.disabled = false;
          bulkArchiveButton.textContent = 'Arquivar selecionados';
        });
        return;
      }

      if (!event.target.closest('[data-profile-service-menu-popover]')) closeOwnerMenus(root);

      var deactivateButton = event.target.closest('[data-profile-service-deactivate]');
      var reactivateButton = event.target.closest('[data-profile-service-reactivate]');
      var archiveButton = event.target.closest('[data-profile-service-archive]');
      var button = deactivateButton || reactivateButton || archiveButton;
      if (!button) return;

      closeOwnerMenus(root);
      var reactivate = Boolean(reactivateButton);
      var archiving = Boolean(archiveButton);
      var id = clean(archiving ? button.dataset.profileServiceArchive : (reactivate ? button.dataset.profileServiceReactivate : button.dataset.profileServiceDeactivate));
      var service = Doke.services && Doke.services.services;
      var method = archiving ? 'archiveOwned' : (reactivate ? 'reactivateOwned' : 'deactivateOwned');
      if (!id || !service || typeof service[method] !== 'function') return;
      if (archiving && !window.confirm('Arquivar este anúncio? Ele sairá das superfícies públicas e não poderá ser reativado nesta versão.')) return;
      if (!archiving && !reactivate && !window.confirm('Desativar este anúncio? Ele deixará de aparecer no perfil público e na busca.')) return;
      button.disabled = true;
      button.textContent = archiving ? 'Arquivando...' : (reactivate ? 'Reativando...' : 'Desativando...');
      Promise.resolve(service[method](id)).then(function (updated) {
        window.dispatchEvent(new CustomEvent('doke:service-updated', { detail: { service: updated } }));
        if (typeof options.onChanged === 'function') options.onChanged(updated);
      }).catch(function (error) {
        window.alert(error && error.message ? error.message : (archiving ? 'Não foi possível arquivar o anúncio.' : (reactivate ? 'Não foi possível reativar o anúncio.' : 'Não foi possível desativar o anúncio.')));
        button.disabled = false;
        button.textContent = archiving ? 'Arquivar anúncio' : (reactivate ? 'Reativar anúncio' : 'Desativar anúncio');
      });
    });

    root.addEventListener('contextmenu', function (event) {
      var card = event.target.closest('[data-profile-service-owner-card]');
      if (!card) return;
      event.preventDefault();
      openOwnerCardMenu(card, root);
    });

    root.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      if (ownerSelectionState.active) {
        cancelOwnerSelection(root);
        return;
      }
      var openTrigger = root.querySelector('[data-profile-service-menu-trigger][aria-expanded="true"]');
      closeOwnerMenus(root);
      if (openTrigger) openTrigger.focus();
    });
  }


  Doke.professionalServicesSection = Object.freeze({
    render: render,
    bindOwnerActions: bindOwnerActions,
    bindOwnerFilters: bindOwnerFilters
  });
})();
