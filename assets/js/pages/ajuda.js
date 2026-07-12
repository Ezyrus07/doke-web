(() => {
  const initHelpCenter = () => {
    const root = document.querySelector('[data-help-center]');
    if (!root || root.dataset.ready === 'true') return;
    root.dataset.ready = 'true';

    window.DokeHomeDrawer?.create?.()();

    const filters = [...root.querySelectorAll('[data-help-filter]')];
    const cardsGrid = root.querySelector('[data-help-cards]');
    const cards = [...root.querySelectorAll('[data-help-card]')];
    const search = root.querySelector('[data-help-search]');
    const faqItems = [...root.querySelectorAll('[data-help-faq]')];
    const empty = document.createElement('div');
    empty.className = 'help-empty-state content-surface doke-empty-state doke-list-state';
    empty.textContent = 'Nenhum resultado encontrado. Tente buscar por outro termo ou abra um chamado com o suporte.';
    empty.hidden = true;
    empty.dataset.listState = 'empty';
    empty.setAttribute('role', 'status');
    empty.setAttribute('aria-live', 'polite');
    cardsGrid?.appendChild(empty);

    let activeCategory = 'all';

    const normalize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

    const applyFilter = () => {
      const term = normalize(search?.value);
      let visibleCount = 0;

      cards.forEach((card) => {
        const category = card.dataset.helpCategory || 'all';
        const text = normalize(card.textContent);
        const matchesCategory = activeCategory === 'all' || category === activeCategory;
        const matchesSearch = !term || text.includes(term);
        const visible = matchesCategory && matchesSearch;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });

      empty.hidden = visibleCount !== 0;
    };

    filters.forEach((button) => {
      button.addEventListener('click', () => {
        activeCategory = button.dataset.helpFilter || 'all';
        filters.forEach((item) => {
          const active = item === button;
          item.classList.toggle('is-active', active);
          item.setAttribute('aria-pressed', active ? 'true' : 'false');
        });
        applyFilter();
      });
    });

    const searchForm = root.querySelector('[data-help-search-form]');

    searchForm?.addEventListener('submit', (event) => {
      event.preventDefault();
      applyFilter();
    });

    search?.addEventListener('input', applyFilter);

    faqItems.forEach((details) => {
      details.addEventListener('toggle', () => {
        if (!details.open) return;
        faqItems.forEach((item) => {
          if (item !== details) item.open = false;
        });
      });
    });

    const requestedHash = window.location.hash.replace('#', '');
    if (requestedHash) {
      const target = document.getElementById(requestedHash);
      target?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }


    const supportExperience = window.Doke?.supportHelpExperience;
    const ticketModal = document.querySelector('[data-help-ticket-modal]');
    const ticketForm = document.querySelector('[data-help-ticket-form]');
    const ticketSubmit = document.querySelector('[data-help-ticket-submit]');
    const ticketFeedback = document.querySelector('[data-help-ticket-feedback]');
    const openTicketButtons = [...document.querySelectorAll('[data-help-open-ticket]')];
    const listTicketButtons = [...document.querySelectorAll('[data-help-list-tickets]')];
    const closeTicketButtons = [...document.querySelectorAll('[data-help-ticket-close]')];
    let lastTicketTrigger = null;
    let draftTimer = 0;

    const notifySupport = (title, body, category = 'support') => {
      const toast = window.Doke?.operationalEventToast;
      if (toast?.notify) {
        toast.notify({
          id: `support-${Date.now()}`,
          category,
          title,
          body,
          createdAt: new Date().toISOString()
        });
      }
    };

    const readTicketPayload = () => {
      if (!ticketForm) return {};
      const data = new FormData(ticketForm);
      return {
        subject: String(data.get('subject') || '').trim(),
        category: String(data.get('category') || '').trim(),
        message: String(data.get('message') || '').trim()
      };
    };

    const restoreTicketDraft = () => {
      const draft = supportExperience?.readDraft?.();
      if (!draft || !ticketForm) return;
      ['subject', 'category', 'message'].forEach((name) => {
        const field = ticketForm.elements.namedItem(name);
        if (field && typeof draft[name] === 'string') field.value = draft[name];
      });
    };

    const saveTicketDraft = () => {
      if (!supportExperience || !ticketForm) return;
      window.clearTimeout(draftTimer);
      draftTimer = window.setTimeout(() => {
        try { supportExperience.saveDraft(readTicketPayload()); } catch (error) {}
      }, 180);
    };

    const setTicketModalOpen = (open, trigger) => {
      if (!ticketModal) return;
      if (open) {
        lastTicketTrigger = trigger instanceof HTMLElement ? trigger : null;
        restoreTicketDraft();
        ticketModal.hidden = false;
        ticketModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('doke-overlay-open');
        requestAnimationFrame(() => ticketForm?.elements?.namedItem('subject')?.focus?.({ preventScroll: true }));
      } else {
        ticketModal.hidden = true;
        ticketModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('doke-overlay-open');
        lastTicketTrigger?.focus?.({ preventScroll: true });
      }
    };

    openTicketButtons.forEach((button) => {
      button.addEventListener('click', () => setTicketModalOpen(true, button));
    });

    closeTicketButtons.forEach((button) => {
      button.addEventListener('click', () => {
        saveTicketDraft();
        setTicketModalOpen(false);
      });
    });

    ticketForm?.addEventListener('input', saveTicketDraft);
    ticketForm?.addEventListener('change', saveTicketDraft);
    ticketForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!supportExperience || supportExperience.isSubmitting?.()) return;
      const originalText = ticketSubmit?.textContent || 'Enviar chamado';
      if (ticketFeedback) ticketFeedback.textContent = '';
      if (ticketSubmit) {
        ticketSubmit.disabled = true;
        ticketSubmit.setAttribute('aria-busy', 'true');
        ticketSubmit.textContent = 'Enviando chamado…';
      }
      try {
        const ticket = await supportExperience.submit(readTicketPayload());
        ticketForm.reset();
        setTicketModalOpen(false);
        notifySupport('Chamado enviado', `Protocolo ${ticket.id || ticket.ticketId} criado com sucesso.`);
      } catch (error) {
        const message = error?.message || 'Não foi possível enviar o chamado. Seu rascunho foi preservado.';
        if (ticketFeedback) ticketFeedback.textContent = message;
        notifySupport('Chamado não enviado', message);
      } finally {
        if (ticketSubmit) {
          ticketSubmit.disabled = false;
          ticketSubmit.removeAttribute('aria-busy');
          ticketSubmit.textContent = originalText;
        }
      }
    });

    listTicketButtons.forEach((button) => {
      button.addEventListener('click', async () => {
        if (!supportExperience) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        try {
          const tickets = await supportExperience.listTickets();
          document.dispatchEvent(new CustomEvent('doke:support-tickets-loaded', { detail: { tickets: Array.isArray(tickets) ? tickets : [] } }));
          notifySupport('Meus chamados', Array.isArray(tickets) && tickets.length ? `${tickets.length} chamado(s) encontrado(s).` : 'Nenhum chamado encontrado.');
        } catch (error) {
          notifySupport('Histórico indisponível', error?.message || 'Não foi possível consultar seus chamados.');
        } finally {
          button.disabled = false;
          button.removeAttribute('aria-busy');
        }
      });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && ticketModal && !ticketModal.hidden) {
        saveTicketDraft();
        setTicketModalOpen(false);
      }
    });

    supportExperience?.init?.();

    applyFilter();
  };

  window.DokeInitHelpCenter = initHelpCenter;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHelpCenter, { once: true });
  } else {
    initHelpCenter();
  }
})();
