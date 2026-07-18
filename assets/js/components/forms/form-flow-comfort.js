(function () {
  'use strict';

  var supportedPages = [
    'orcamento', 'anunciar-servico', 'tornar-profissional',
    'verificacao-profissional', 'pagamento-profissional', 'avaliacao-profissional'
  ];

  function pageIsSupported() {
    return Boolean(document.body && supportedPages.indexOf(document.body.dataset.page) >= 0);
  }

  function autoSize(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.max(textarea.scrollHeight, textarea.hasAttribute('data-form-comfort-long') ? 116 : 88) + 'px';
  }

  function setupTextareas() {
    document.querySelectorAll('textarea').forEach(function (textarea) {
      textarea.classList.add('doke-textarea');
      if (textarea.maxLength > 300 || textarea.name === 'descricao_completa' || textarea.name === 'detalhes') {
        textarea.setAttribute('data-form-comfort-long', '');
      }
      autoSize(textarea);
      textarea.addEventListener('input', function () { autoSize(textarea); });
    });
  }

  function init() {
    if (!pageIsSupported()) return;
    document.body.classList.add('doke-form-comfort-ready');
    setupTextareas();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
}());
