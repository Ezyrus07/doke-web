const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html','resultados.html','pedidos.html','mensagens.html','comunidade.html',
  'comunidade.html','perfil.html','carteira.html','notificacoes.html','configuracoes.html'
];

const rules = [
  { re: /(?:service|servico|servi[cç]o|anuncio|an[úu]ncio|recommendation|result-card|professional-card|provider-card|listing-card)/i, cls: 'doke-service-card' },
  { re: /(?:worker|before-after|antes|depois|media-card|video-card|reel)/i, cls: 'doke-worker-card doke-media-card' },
  { re: /(?:order|pedido|request|budget|orcamento|orçamento|quote)/i, cls: 'doke-order-card' },
  { re: /(?:message|mensagem|chat|thread|conversation|inbox)/i, cls: 'doke-message-card' },
  { re: /(?:community|comunidade|member-card)/i, cls: 'doke-community-card' },
  { re: /(?:wallet|carteira|transaction|statement|payout|withdraw|balance|bank-card|summary-card)/i, cls: 'doke-wallet-card' },
  { re: /(?:notification|notificacao|notificação|alert)/i, cls: 'doke-notification-card' },
  { re: /(?:profile|perfil|avatar-card|bio-card)/i, cls: 'doke-profile-card' },
  { re: /(?:stat|metric|kpi|summary)/i, cls: 'doke-stat-card' }
];

const domainClasses = new Set(rules.flatMap(r => r.cls.split(/\s+/)));
const eligibleTags = /^(article|section|li|div|a|button)$/i;

function uniqueClassList(value) {
  return Array.from(new Set(value.trim().split(/\s+/).filter(Boolean))).join(' ');
}

function shouldTreatAsSurface(tag, classes) {
  if (!eligibleTags.test(tag)) return false;
  if (/\bdoke-(?:btn|icon-btn|input|select|textarea|label|chip|badge|avatar|menu|popover|modal|drawer|overlay)\b/.test(classes)) return false;
  if (/\b(?:svg|icon|label|input|select|textarea|field|form|actions?|meta|title|text|body|header|footer|row|col|grid|list|wrap|avatar|badge|chip|button|btn)\b/i.test(classes) && !/\b(?:card|item|panel|surface|tile|summary|preview|result|entry)\b/i.test(classes)) return false;
  return /\b(?:card|item|panel|surface|tile|summary|preview|result|entry)\b/i.test(classes);
}

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) continue;
  let html = fs.readFileSync(file, 'utf8');
  html = html.replace(/<([a-z][a-z0-9-]*)\b([^>]*?)class="([^"]*)"([^>]*)>/gi, (match, tag, before, cls, after) => {
    if (!shouldTreatAsSurface(tag, cls)) return match;
    const additions = [];
    for (const rule of rules) {
      if (rule.re.test(cls)) additions.push(...rule.cls.split(/\s+/));
    }
    if (!additions.length) return match;
    let next = uniqueClassList(cls + ' ' + additions.join(' '));
    if (!/\bdoke-card\b/.test(next) && !/\bdoke-surface\b/.test(next)) {
      next = uniqueClassList(next + ' doke-card');
    }
    return `<${tag}${before}class="${next}"${after}>`;
  });
  fs.writeFileSync(file, html);
}
