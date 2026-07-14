'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const failures = [];
const assert = (condition, message) => { if (!condition) failures.push(message); };

const paymentHtml = read('pagamento-profissional.html');
const paymentJs = read('assets/js/pages/pagamento-profissional.js');
const paymentCss = read('assets/css/pages/pagamento-profissional.css');
const messagesHtml = read('mensagens.html');
const messagesJs = read('assets/js/pages/mensagens.js');

assert(/data-state-empty[^>]*hidden[^>]*payment-context-state/.test(paymentHtml), 'checkout deve possuir empty contextual inicialmente oculto.');
assert(/Nenhuma cobrança selecionada/.test(paymentHtml) && /Ir para mensagens/.test(paymentHtml), 'empty do checkout deve orientar o próximo passo.');
assert(/revealReadyOnEmpty:\s*false/.test(paymentJs), 'checkout não pode revelar conteúdo ready junto do empty.');
assert(/if \(!hasRequestedPaymentContext\(\)\)\s*\{\s*settleEmptyPaymentContext\('route_context_missing'\);\s*hydration\?\.mark\('auth'\);\s*hydration\?\.mark\('payment-context'\);\s*accessTask = Promise\.resolve\(\{ allowed: true, empty: true \}\);/s.test(paymentJs), 'URL direta sem cobrança deve concluir imediatamente como empty sem depender de sessão/repository.');
assert(/else if \(!accountAccess\?\.guardPage\)/.test(paymentJs) && /accessTask = accountAccess\.guardPage/.test(paymentJs), 'URLs com contexto de cobrança devem continuar protegidas pelo guard de conta.');
assert(/if \(!validation\.valid\) return settleEmptyPaymentContext\(validation\.reason\)/.test(paymentJs), 'link obsoleto sem cobrança válida deve concluir como empty.');
assert(/status:\s*'context-error'/.test(paymentJs) && /throw error/.test(paymentJs), 'falha técnica deve continuar em error.');
assert(/\.payment-context-state\[hidden\]\s*\{\s*display:\s*none/.test(paymentCss), 'estado contextual oculto não pode ocupar layout.');

assert(/data-state-boundary="mensagens"[^>]*data-view-state="loading"[^>]*aria-busy="true"/.test(messagesHtml), 'mensagens deve iniciar em loading/busy.');
assert(/root\.dataset\.messagesReady = "initializing"/.test(messagesJs), 'mensagens deve registrar montagem intermediária.');
assert(/withMessagesAccessTimeout/.test(messagesJs) && /A sessão demorou demais para liberar as mensagens/.test(messagesJs), 'guard de mensagens deve possuir timeout recuperável.');
assert(/root\.dataset\.messagesReady = ['"]true['"]/.test(messagesJs), 'mensagens só deve marcar ready após autorização e hidratação local.');
assert(/root\.dataset\.messagesReady = "error"/.test(messagesJs), 'falha síncrona deve sair do estado initializing.');
assert(/window\.DokeCleanupMessages\?\.\(\)/.test(messagesJs) && /window\.DokeInitMessages\?\.\(\)/.test(messagesJs), 'retry de mensagens deve remontar a rota localmente.');
assert(/messages-receipt-modal-open/.test(messagesJs) && /messages-completion-modal-open/.test(messagesJs) && /orders-detail-open/.test(messagesJs), 'entrada em mensagens deve limpar locks de overlays anteriores.');
assert(!/initDesktopFiltersFallback/.test(messagesJs), 'fallback concorrente de filtros deve ser removido.');
assert(!/stopImmediatePropagation\(\)/.test(messagesJs), 'mensagens não deve bloquear os controles oficiais com stopImmediatePropagation.');

if (failures.length) {
  console.error('Payment empty + messages recovery contract: FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('Payment empty + messages recovery contract: PASS');
