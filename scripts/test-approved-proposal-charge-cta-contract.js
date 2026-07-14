const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'assets/js/pages/mensagens.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'mensagens.html'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(
  source.includes('const canIssueCharge = getFinancialActionKind(conversation) === "charge";'),
  'A proposta aprovada no modo profissional deve consultar a autoridade canônica da ação financeira.'
);
assert(
  source.includes('data-messages-charge-action>Enviar cobrança</button>'),
  'O card da proposta aprovada deve expor o CTA Enviar cobrança ao profissional elegível.'
);
assert(
  source.includes('data-message-pay>Pagar agora</button>'),
  'O CTA Pagar agora deve continuar pertencendo ao card de cobrança recebido pelo cliente.'
);
assert(
  source.includes('actionHtml: \'<span class="message-bubble__charge-meta">Aguardando cobrança</span>\''),
  'O cliente deve continuar aguardando uma cobrança separada após aprovar a proposta.'
);
assert(
  source.includes('const chargeActionButton = event.target.closest("[data-messages-charge-action]");'),
  'O CTA do card deve reutilizar o handler canônico de envio de cobrança.'
);
assert(
  html.includes('assets/js/pages/mensagens.js?v=20260714-approved-proposal-charge-cta-v1'),
  'mensagens.html deve invalidar o cache do controller alterado.'
);

console.log('Approved proposal charge CTA contract: OK');
