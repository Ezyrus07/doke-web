(function () {
  const baseAttrs = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

  const icons = {
    electrician: `<svg ${baseAttrs}><path d="M9 7V4"></path><path d="M15 7V4"></path><path d="M8 7h8v4a4 4 0 0 1-8 0Z"></path><path d="M12 15v2.5"></path><path d="M10 18.5h4"></path><path d="M12 17.5v2.5"></path></svg>`,
    plumbing: `<svg ${baseAttrs}><path d="M7 6h6a3 3 0 0 1 3 3v1"></path><path d="M13 9H9a2 2 0 0 0-2 2v2"></path><path d="M17 10V6"></path><path d="M15.2 15.2c-1.2 1.4-1.9 2.4-1.9 3.4a1.9 1.9 0 0 0 3.8 0c0-1-.7-2-1.9-3.4Z"></path></svg>`,
    painting: `<svg ${baseAttrs}><path d="M6 7h8a2.5 2.5 0 0 1 0 5H9"></path><path d="M14 12v3"></path><path d="M14 15H9a2 2 0 0 0-2 2v1"></path><path d="M7 18v2"></path></svg>`,
    cleaning: `<svg ${baseAttrs}><path d="M10 5h4"></path><path d="M12 5v2"></path><path d="M9.5 7.2h5l1 3.1v7.2A1.5 1.5 0 0 1 14 19h-4a1.5 1.5 0 0 1-1.5-1.5v-7.2Z"></path><path d="M16 8.5h1.6l1 1.8"></path><path d="M18.4 5.8v1.4"></path><path d="M17.7 6.5h1.4"></path></svg>`,
    freight: `<svg ${baseAttrs}><path d="M3.5 9.5h10v5h-10Z"></path><path d="M13.5 11h3l2 2.2v1.3h-5"></path><circle cx="8" cy="17" r="1.5"></circle><circle cx="17" cy="17" r="1.5"></circle></svg>`,
    technology: `<svg ${baseAttrs}><rect x="5" y="6" width="14" height="9" rx="2"></rect><path d="M9 18h6"></path><path d="M12 15v3"></path></svg>`,
    lessons: `<svg ${baseAttrs}><path d="m3 10 9-4 9 4-9 4-9-4Z"></path><path d="M7 12.5v3c0 1 2.2 2 5 2s5-1 5-2v-3"></path><path d="M21 10v4"></path></svg>`,
    beauty: `<svg ${baseAttrs}><circle cx="8" cy="8" r="2"></circle><circle cx="8" cy="16" r="2"></circle><path d="M9.7 9.4 18.5 5"></path><path d="M9.7 14.6 18.5 19"></path><path d="M10 9.8 14 12"></path></svg>`,
    renovation: `<svg ${baseAttrs}><path d="m14.5 6.5 3 3"></path><path d="m13 8 3-3 4 4-3 3"></path><path d="M11 10 5 16"></path><path d="m4 20 2.2-5.2 3 3Z"></path></svg>`
  };

  const aliases = {
    electricity: 'electrician',
    eletricista: 'electrician',
    electrician: 'electrician',
    plumbing: 'plumbing',
    encanador: 'plumbing',
    pipe: 'plumbing',
    painting: 'painting',
    pintura: 'painting',
    cleaning: 'cleaning',
    limpeza: 'cleaning',
    freight: 'freight',
    frete: 'freight',
    technology: 'technology',
    tecnologia: 'technology',
    tech: 'technology',
    lessons: 'lessons',
    aulas: 'lessons',
    school: 'lessons',
    beauty: 'beauty',
    beleza: 'beauty',
    renovation: 'renovation',
    reforma: 'renovation',
    repair: 'renovation',
    paintingfinish: 'painting'
  };

  const normalize = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const keyFromLabel = (value) => {
    const label = normalize(value);
    if (!label) return 'renovation';

    if (label.includes('eletric')) return 'electrician';
    if (label.includes('encan') || label.includes('tub') || label.includes('hidraul')) return 'plumbing';
    if (label.includes('pint') || label.includes('acabament')) return 'painting';
    if (label.includes('limp') || label.includes('fax') || label.includes('diar')) return 'cleaning';
    if (label.includes('fret') || label.includes('mudanc') || label.includes('transporte')) return 'freight';
    if (label.includes('tecn') || label.includes('inform') || label.includes('comput') || label.includes('suporte')) return 'technology';
    if (label.includes('aula') || label.includes('curso') || label.includes('professor') || label.includes('ingles')) return 'lessons';
    if (label.includes('belez') || label.includes('sal') || label.includes('cabelo') || label.includes('barbear')) return 'beauty';
    if (label.includes('reform') || label.includes('obra') || label.includes('manut')) return 'renovation';

    return aliases[label.replace(/\s+/g, '')] || aliases[label] || 'renovation';
  };

  const iconMarkup = (keyOrLabel) => {
    const key = icons[keyOrLabel] ? keyOrLabel : keyFromLabel(keyOrLabel);
    return icons[key] || icons.renovation;
  };

  const hydrate = (root = document) => {
    root.querySelectorAll('[data-category-icon]').forEach((node) => {
      const requested = node.getAttribute('data-category-icon') || node.getAttribute('aria-label') || node.textContent;
      node.innerHTML = iconMarkup(requested);
    });
  };

  window.DokeCategoryIcons = { iconMarkup, keyFromLabel, hydrate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => hydrate(), { once: true });
  } else {
    hydrate();
  }
})();
