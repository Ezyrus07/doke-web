const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pages = [
  'index.html','resultados.html','pedidos.html','mensagens.html','comunidade.html',
  'comunidade-interna.html','perfil.html','carteira.html','notificacoes.html','configuracoes.html'
];
const cssPath = 'assets/css/components/domain/doke-domain-cards.css';
const requiredLink = 'assets/css/components/domain/doke-domain-cards.css';
const domainClasses = [
  'doke-service-card','doke-worker-card','doke-order-card','doke-message-card','doke-community-card',
  'doke-wallet-card','doke-notification-card','doke-profile-card','doke-media-card','doke-stat-card'
];
const legacyGroups = [
  { keys: ['service','servico','serviço','anuncio','anúncio','recommendation','result-card','professional-card','provider-card','listing-card'], domains: ['doke-service-card'] },
  { keys: ['worker','before-after','media-card','video-card','reel'], domains: ['doke-worker-card','doke-media-card'] },
  { keys: ['order','pedido','request','budget','orcamento','orçamento','quote'], domains: ['doke-order-card'] },
  { keys: ['message','mensagem','chat','thread','conversation','inbox'], domains: ['doke-message-card'] },
  { keys: ['community','comunidade','member-card'], domains: ['doke-community-card'] },
  { keys: ['wallet','carteira','transaction','statement','payout','withdraw','balance','bank-card','summary-card'], domains: ['doke-wallet-card'] },
  { keys: ['notification','notificacao','notificação','alert'], domains: ['doke-notification-card'] },
  { keys: ['profile','perfil','bio-card'], domains: ['doke-profile-card'] }
];
const ignoreTokens = ['grid','panels','sidepanel','doke-btn','doke-icon-btn','doke-input','doke-select','doke-textarea','doke-label','doke-chip','doke-badge','doke-avatar','doke-menu','doke-popover','doke-modal','doke-drawer','doke-overlay'];
const surfaceTokens = ['card','panel','surface','tile','summary','preview','result','entry'];

function hasAny(str, arr) { const s = str.toLowerCase(); return arr.some(x => s.includes(x.toLowerCase())); }
function countClass(html, cls) { return html.split(cls).length - 1; }

const violations = [];
const coverage = Object.fromEntries(domainClasses.map(c => [c, 0]));
if (!fs.existsSync(path.join(root, cssPath))) violations.push(`${cssPath} não existe.`);

for (const page of pages) {
  const file = path.join(root, page);
  if (!fs.existsSync(file)) continue;
  const html = fs.readFileSync(file, 'utf8');
  if (!html.includes(requiredLink)) violations.push(`${page}: não carrega ${cssPath}.`);
  for (const cls of domainClasses) coverage[cls] += countClass(html, cls);
  const lines = html.split(/\r?\n/);
  lines.forEach((line, index) => {
    const m = line.match(/class="([^"]*)"/);
    if (!m) return;
    const classes = m[1];
    if (classes.includes('__')) return;
    if (!hasAny(classes, surfaceTokens)) return;
    if (hasAny(classes, ignoreTokens)) return;
    for (const group of legacyGroups) {
      if (hasAny(classes, group.keys) && !hasAny(classes, group.domains)) {
        violations.push(`${page}:${index + 1} superfície de domínio sem classe canônica: "${classes.slice(0, 140)}"`);
      }
    }
  });
}

const report = [
  '# Domain Card Contract Audit',
  '',
  `Data: ${new Date().toISOString()}`,
  '',
  `Violações: ${violations.length}`,
  '',
  '## Cobertura',
  '',
  ...Object.entries(coverage).map(([k,v]) => `- ${k}: ${v}`),
  '',
  '## Violações',
  '',
  ...(violations.length ? violations.map(v => `- ${v}`) : ['- Nenhuma violação encontrada.'])
].join('\n');
fs.writeFileSync(path.join(root, 'docs/validation/domain-card-contract-audit-report.md'), report);
if (violations.length) { console.error(report); process.exit(1); }
console.log(`Domain card contracts OK. Classes detectadas: ${Object.values(coverage).reduce((a,b)=>a+b,0)}.`);
