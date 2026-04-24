document.addEventListener('DOMContentLoaded', () => {
  const messages = document.querySelector('[data-community-room-messages]');
  const form = document.querySelector('[data-community-room-form]');
  const input = document.querySelector('[data-community-room-input]');
  const submit = document.querySelector('[data-community-room-submit]');
  if (!messages) return;

  const scrollToLatest = () => {
    messages.scrollTop = messages.scrollHeight;
  };

  const syncSubmitState = () => {
    if (!input || !submit) return;
    submit.disabled = input.value.trim().length === 0;
  };

  const autoResizeComposer = () => {
    if (!input || input.tagName !== 'TEXTAREA') return;
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 132)}px`;
  };

  const createOwnMessage = (text) => {
    const article = document.createElement('article');
    article.className = 'community-message community-message--own';
    article.innerHTML = `
      <span class="community-message__avatar">DK</span>
      <div class="community-message__content">
        <div class="community-message__meta"><strong>Gabriel</strong><span>Você • agora</span></div>
        <p></p>
        <div class="community-message__actions"><button type="button">Editar</button><button type="button">Responder</button></div>
      </div>
    `;
    article.querySelector('p').textContent = text;
    return article;
  };

  input?.addEventListener('input', () => {
    syncSubmitState();
    autoResizeComposer();
  });

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;
    messages.appendChild(createOwnMessage(value));
    input.value = '';
    syncSubmitState();
    autoResizeComposer();
    scrollToLatest();
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      autoResizeComposer();
      scrollToLatest();
    });
  });

  syncSubmitState();
  autoResizeComposer();
  window.addEventListener('load', scrollToLatest, { once: true });
  window.addEventListener('resize', () => {
    autoResizeComposer();
    scrollToLatest();
  });
});
