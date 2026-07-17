(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  function clean(value) {
    return String(value == null ? '' : value).trim();
  }

  function money(service) {
    if (clean(service.priceLabel)) return clean(service.priceLabel);
    var numeric = Number(service.priceValue || service.price);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return 'Sob orçamento';
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

  function createCard(service, options) {
    options = options || {};
    var article = document.createElement('article');
    article.className = 'doke-ad-card doke-ad-card--featured profile-service-card' + (options.owner ? ' profile-service-card--owner' : '');
    article.dataset.serviceId = clean(service.id);

    var media = document.createElement('div');
    media.className = 'doke-ad-card__media profile-service-card__media';
    var imageUrl = clean(service.image || (Array.isArray(service.images) && service.images[0]));
    if (imageUrl) {
      var image = document.createElement('img');
      image.className = 'profile-service-card__image';
      image.src = imageUrl;
      image.alt = 'Imagem do serviço ' + (clean(service.title) || 'profissional');
      media.appendChild(image);
    } else {
      var placeholder = document.createElement('span');
      placeholder.className = 'profile-service-card__placeholder';
      placeholder.textContent = clean(service.category) || 'Serviço';
      media.appendChild(placeholder);
    }

    var status = document.createElement('span');
    status.className = 'doke-ad-card__badge';
    status.textContent = service.status === 'inactive' ? 'Inativo' : 'Publicado';
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
    category.textContent = clean(service.category) || 'Serviço';

    var title = document.createElement('h3');
    title.className = 'doke-ad-card__title';
    title.textContent = clean(service.title) || 'Serviço profissional';

    var summary = document.createElement('p');
    summary.className = 'profile-service-card__summary';
    summary.textContent = clean(service.shortDescription || service.description) || 'Descrição ainda não informada.';

    var tags = document.createElement('div');
    tags.className = 'doke-ad-card__tags';
    var tagItems = Array.isArray(service.tags) ? service.tags.filter(Boolean).slice(0, 3) : [];
    tagItems.forEach(function (tag) {
      var item = document.createElement('span');
      item.textContent = '#' + clean(tag).replace(/^#+/, '');
      tags.appendChild(item);
    });
    if (!tagItems.length) tags.hidden = true;

    var location = document.createElement('div');
    location.className = 'doke-ad-card__location';
    var avatar = document.createElement('span');
    avatar.className = 'doke-ad-card__avatar';
    avatar.textContent = clean(service.providerInitials) || 'DK';
    var locationText = document.createElement('span');
    locationText.className = 'doke-ad-card__location-text';
    locationText.appendChild(svg('M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7Zm0 9.7A2.7 2.7 0 1 1 12 6.3a2.7 2.7 0 0 1 0 5.4Z'));
    var locationLabel = document.createElement('span');
    locationLabel.textContent = clean(service.location || service.serviceRegion) || 'Atendimento a combinar';
    locationText.appendChild(locationLabel);
    location.appendChild(avatar);
    location.appendChild(locationText);

    var footer = document.createElement('div');
    footer.className = 'doke-ad-card__footer';
    var price = document.createElement('strong');
    price.className = 'doke-ad-card__price';
    price.textContent = money(service);
    footer.appendChild(price);

    if (options.owner) {
      var actions = document.createElement('div');
      actions.className = 'profile-service-card__actions';
      var view = document.createElement('a');
      view.className = 'doke-btn doke-btn--ghost doke-btn--sm';
      view.href = service.href || ('detalhe-anuncio.html?id=' + encodeURIComponent(service.id));
      view.textContent = 'Visualizar';
      var deactivate = document.createElement('button');
      deactivate.className = 'doke-btn doke-btn--danger doke-btn--sm';
      deactivate.type = 'button';
      deactivate.dataset.profileServiceDeactivate = clean(service.id);
      deactivate.textContent = 'Desativar';
      actions.appendChild(view);
      actions.appendChild(deactivate);
      footer.appendChild(actions);
    } else {
      var cta = document.createElement('a');
      cta.className = 'doke-ad-card__cta doke-btn doke-btn--success';
      cta.href = service.href || ('detalhe-anuncio.html?id=' + encodeURIComponent(service.id));
      cta.textContent = 'Ver anúncio';
      footer.appendChild(cta);
    }

    body.appendChild(category);
    body.appendChild(title);
    body.appendChild(summary);
    body.appendChild(tags);
    body.appendChild(location);
    body.appendChild(footer);
    article.appendChild(media);
    article.appendChild(body);
    return article;
  }

  function render(options) {
    options = options || {};
    var root = options.root || document;
    var list = root.querySelector(options.listSelector || '[data-professional-services-list]');
    var empty = root.querySelector(options.emptySelector || '[data-professional-services-empty]');
    var count = root.querySelector(options.countSelector || '[data-professional-services-count]');
    var services = Array.isArray(options.services) ? options.services.filter(function (item) {
      return options.owner || item.status === 'active';
    }) : [];

    if (count) count.textContent = String(services.length) + (services.length === 1 ? ' anúncio ativo' : ' anúncios ativos');
    if (list) {
      list.innerHTML = '';
      services.forEach(function (service) {
        list.appendChild(createCard(service, { owner: options.owner === true }));
      });
      list.hidden = !services.length;
    }
    if (empty) empty.hidden = Boolean(services.length);
    return services.length;
  }

  function bindOwnerActions(options) {
    options = options || {};
    var root = options.root || document;
    if (root.dataset && root.dataset.professionalServicesActionsBound === 'true') return;
    if (root.dataset) root.dataset.professionalServicesActionsBound = 'true';
    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-profile-service-deactivate]');
      if (!button) return;
      var id = clean(button.dataset.profileServiceDeactivate);
      var service = Doke.services && Doke.services.services;
      if (!id || !service || typeof service.deactivateOwned !== 'function') return;
      if (!window.confirm('Desativar este anúncio? Ele deixará de aparecer no perfil público e na busca.')) return;
      button.disabled = true;
      button.textContent = 'Desativando...';
      Promise.resolve(service.deactivateOwned(id)).then(function (updated) {
        window.dispatchEvent(new CustomEvent('doke:service-updated', { detail: { service: updated } }));
        if (typeof options.onChanged === 'function') options.onChanged(updated);
      }).catch(function (error) {
        window.alert(error && error.message ? error.message : 'Não foi possível desativar o anúncio.');
        button.disabled = false;
        button.textContent = 'Desativar';
      });
    });
  }

  Doke.professionalServicesSection = Object.freeze({
    render: render,
    bindOwnerActions: bindOwnerActions
  });
})();
